// Run: node scripts/blocked.test.cjs (network/native bridge replaced locally).
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function moduleFrom(file, mocks) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => {
        assert.ok(name in mocks, `Unexpected dependency ${name}`);
        return mocks[name];
    }, Set, Map, Date, Promise });
    return exports;
}
const ids = photos => Array.from(photos, p => p.id);
const photo = id => ({ id, urls: { small: `https://images.example/${id}?w=400` } });
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('concurrent JS mutations migrate once, use atomic native operations, and keep legacy data untouched', async () => {
    const calls = [], events = [];
    let reads = 0;
    const legacy = JSON.stringify([{ id: 'old', small: 'image' }]);
    const blocked = moduleFrom('services/blocked.ts', {
        '@react-native-async-storage/async-storage': { default: { getItem: async () => { reads++; return legacy; } } },
        'react-native': { NativeModules: { WallpaperModule: {
            getBlockedPhotos: async json => { calls.push(['migrate', json]); return '[]'; },
            mutateBlockedPhotos: async (op, json) => { calls.push([op, JSON.parse(json)]); return '[]'; },
        } } },
    });
    const unsubscribe = blocked.subscribeBlocked(() => events.push('changed'));
    await Promise.all([blocked.blockPhoto({ id: 'a', small: 'a' }), blocked.blockPhoto({ id: 'b', small: 'b' })]);
    await blocked.unblockPhoto('a');
    await blocked.clearBlocked();
    await blocked.restoreBlocked([{ id: 'a', small: 'a' }]);
    assert.equal(reads, 1);
    assert.equal(calls[0][1], legacy);
    assert.deepEqual(calls.map(c => c[0]), ['migrate', 'add', 'add', 'remove', 'clear', 'add']);
    assert.equal(events.length, 5);
    unsubscribe();
    await blocked.blockPhoto({ id: 'c', small: 'c' });
    assert.equal(events.length, 5);
});

test('failed migration is retried, and failed mutation emits no successful update', async () => {
    let attempt = 0, updates = 0;
    const blocked = moduleFrom('services/blocked.ts', {
        '@react-native-async-storage/async-storage': { default: { getItem: async () => 'bad json' } },
        'react-native': { NativeModules: { WallpaperModule: {
            getBlockedPhotos: async json => { assert.equal(json, '[]'); if (++attempt === 1) throw Error('storage unavailable'); return '[]'; },
            mutateBlockedPhotos: async () => { throw Error('write failed'); },
        } } },
    });
    blocked.subscribeBlocked(() => updates++);
    await assert.rejects(blocked.getBlocked(), /storage unavailable/);
    assert.equal((await blocked.getBlocked()).length, 0);
    await assert.rejects(blocked.blockPhoto({ id: 'a', small: '' }), /write failed/);
    assert.equal(updates, 0);
});

test('collection cache survives restart; hide/unhide filters cached data without another API call', async () => {
    const storage = new Map();
    let network = 0;
    const { filterBlockedPhotos } = moduleFrom('services/blocked.ts', {
        '@react-native-async-storage/async-storage': {}, 'react-native': { NativeModules: {} },
    });
    const mocks = {
        '@react-native-async-storage/async-storage': { default: {
            getItem: async key => storage.get(key) ?? null,
            setItem: async (key, value) => storage.set(key, value),
        } },
        axios: { default: { get: async () => { network++; return { data: [photo('a'), photo('b')] }; } } },
        '../components/categories': { dedupAndCapByAuthor: photos => photos },
        './unsplashKey': { getUnsplashKey: async () => 'test' },
    };
    const first = moduleFrom('services/collectionService.ts', mocks);
    await Promise.all([first.getCollectionPhotos('test'), first.getCollectionPhotos('test')]);
    assert.equal(network, 1);
    const restarted = moduleFrom('services/collectionService.ts', mocks);
    const source = await restarted.getCollectionPhotos('test');
    assert.deepEqual(ids(filterBlockedPhotos(source, [{ id: 'a', small: '' }])), ['b']);
    assert.deepEqual(ids(filterBlockedPhotos(source, [{ id: 'a' }, { id: 'b' }])), []);
    // Рендер/Undo працює на тому самому джерелі, навіть коли мережа недоступна.
    mocks.axios.default.get = () => { throw Error('offline'); };
    assert.deepEqual(ids(filterBlockedPhotos(source, [])), ['a', 'b']);
    assert.equal(network, 1);
    assert.deepEqual(ids(JSON.parse(storage.values().next().value).value), ['a', 'b']);
});

test('old cover URLs match the same hidden image across Unsplash sizes', () => {
    const blocked = moduleFrom('services/blocked.ts', {
        '@react-native-async-storage/async-storage': {}, 'react-native': { NativeModules: {} },
    });
    const list = [{ id: 'a', small: 'https://images.unsplash.com/photo-a?w=400&q=80' }];
    assert.equal(blocked.isBlockedCover('https://images.unsplash.com/photo-a?w=1080', list), true);
    assert.equal(blocked.isBlockedCover('https://images.unsplash.com/photo-ab?w=400', list), false);
    assert.equal(blocked.isBlockedCover(undefined, list), false);
});

test('focused screen refreshes after shade/resume and ignores older reads and unmounted updates', async () => {
    let focus, listener;
    const events = new Map(), reads = [], updates = [];
    moduleFrom('services/useBlockedPhotos.ts', {
        'expo-router': { useFocusEffect: callback => { focus = callback; } },
        react: { useCallback: fn => fn, useState: () => [null, list => updates.push(ids(list))] },
        'react-native': { AppState: { addEventListener: (event, callback) => {
            events.set(event, callback); return { remove: () => events.delete(event) };
        } } },
        './blocked': {
            getBlocked: () => { const d = deferred(); reads.push(d); return d.promise; },
            subscribeBlocked: callback => { listener = callback; return () => { listener = null; }; },
        },
    }).useBlockedPhotos();
    const cleanup = focus();
    events.get('focus')();
    reads[1].resolve([{ id: 'shade' }]); await settle();
    reads[0].resolve([]); await settle();
    assert.deepEqual(updates, [['shade']]);
    events.get('change')('active');
    reads[2].resolve([{ id: 'resume' }]); await settle();
    listener(); cleanup(); reads[3].resolve([]); await settle();
    assert.deepEqual(updates, [['shade'], ['resume']]);
    assert.equal(events.size, 0);
    assert.equal(listener, null);
});

test('settings unblock/clear/Undo never reload Unsplash; Undo merges instead of replacing newer blocks', async () => {
    const source = ts.createSourceFile('settings.tsx', fs.readFileSync(path.join(root, 'app/settings.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = ['handleUnblock', 'undoUnblockOne', 'confirmClearBlocked', 'undoClearBlocked'];
    const handlers = {};
    function visit(node) {
        if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) handlers[node.name.getText(source)] = node.initializer.getText(source);
        ts.forEachChild(node, visit);
    }
    visit(source);
    const hidden = new Map([['a', { id: 'a', small: 'a' }]]), toasts = [];
    const ctx = vm.createContext({
        blocked: [...hidden.values()], autoChangeRef: { current: true },
        unblockPhoto: async id => hidden.delete(id),
        clearBlocked: async () => { const snapshot = [...hidden.values()]; hidden.clear(); return snapshot; },
        blockPhoto: async p => hidden.set(p.id, p), restoreBlocked: async list => list.forEach(p => hidden.set(p.id, p)),
        showToast: (_, action) => toasts.push(action), dismissToast: () => {}, t: key => key,
        setClearBlockedOpen: () => {},
        loadAndStart: () => { throw Error('Unexpected API pool rebuild'); },
    });
    for (const name of names) vm.runInContext(ts.transpileModule(`globalThis.${name} = ${handlers[name]};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, ctx);
    await ctx.handleUnblock('a'); assert.equal(hidden.size, 0);
    await toasts.pop().onPress(); assert.equal(hidden.has('a'), true);
    await ctx.confirmClearBlocked(); assert.equal(hidden.size, 0);
    hidden.set('shade', { id: 'shade', small: 'shade' });
    await toasts.pop().onPress();
    assert.deepEqual([...hidden.keys()].sort(), ['a', 'shade']);
});
