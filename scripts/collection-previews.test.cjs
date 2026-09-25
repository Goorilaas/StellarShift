// Run: node scripts/collection-previews.test.cjs — real cache + Row effects, mocked API and timers.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const options = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } };
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'services/collectionService.ts'), 'utf8'), options).outputText;
const source = ts.createSourceFile('collections.tsx', fs.readFileSync(path.join(root, 'app/collections.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const row = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'Row');
const effects = row.body.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === 'useEffect')
    .map(node => ts.transpileModule(`globalThis.effect = ${node.expression.arguments[0].getText(source)};`, options).outputText);
const settle = () => new Promise(resolve => setImmediate(resolve));
const photo = id => ({ id, urls: { small: id, regular: id }, user: { username: id } });
const key = id => `collection_cache_v1:photos:${id}:1:30`;
function setup({ storage = new Map(), read, fetch, now = 1_000_000_000 } = {}) {
    const calls = [], exports = {};
    const mocks = {
        '@react-native-async-storage/async-storage': { default: {
            getItem: read ?? (async name => storage.get(name) ?? null),
            setItem: async (name, value) => storage.set(name, value),
        } },
        axios: { default: { get: async (...args) => {
            calls.push(args);
            return { data: fetch ? await fetch() : [photo('a'), photo('b')] };
        } } },
        '../components/categories': { dedupAndCapByAuthor: photos => photos },
        './unsplashKey': { getUnsplashKey: async () => 'test' },
    };
    vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; }, Date: { now: () => now } });
    return { api: exports, calls, storage, now };
}
function mount(api, { visible = false, id = 'c' } = {}) {
    const timers = new Map(), state = { photos: [], updates: 0 };
    const context = vm.createContext({
        ...api, visible, meta: { id },
        setPhotos: photos => { state.photos = photos; state.updates++; },
        setTimeout: (fn, ms) => { const handle = {}; timers.set(handle, { fn, ms }); return handle; },
        clearTimeout: handle => timers.delete(handle),
    });
    const cleanups = effects.map(code => { vm.runInContext(code, context); return context.effect(); });
    return { state, timers, unmount: () => cleanups.forEach(fn => fn?.()),
        fire: () => { const tasks = [...timers.values()]; timers.clear(); tasks.forEach(task => task.fn()); } };
}
test('warm preview renders before visibility and without a timer or another API call', async () => {
    const { api, calls } = setup();
    await api.getCollectionPhotos('c');
    const row = mount(api);
    await settle();
    assert.deepEqual(row.state.photos.map(p => p.id), ['a', 'b']);
    assert.equal(row.timers.size, 0);
    assert.equal(calls.length, 1);
    row.unmount();
});
test('restart restores previews from disk before visibility with zero API requests', async () => {
    const first = setup(); await first.api.getCollectionPhotos('c');
    const restarted = setup({ storage: first.storage });
    const row = mount(restarted.api);
    await settle();
    assert.equal(row.state.photos.length, 2);
    assert.equal(restarted.calls.length, 0);
    row.unmount();
});
test('visible cached row shows photos before its timer; delayed grid/preview loads reuse cache', async () => {
    const { api, calls } = setup(); await api.getCollectionPhotos('c');
    const row = mount(api, { visible: true }); await settle();
    assert.equal(row.state.photos.length, 2);
    assert.equal(row.timers.size, 1);
    row.fire(); await api.getCollectionPhotos('c'); await settle();
    assert.equal(calls.length, 1);
    row.unmount();
});
test('missing, expired, future-dated and malformed caches never cause hidden rows to fetch', async () => {
    for (const stored of [null, '{bad json', JSON.stringify({ savedAt: 0, value: [photo('old')] }), JSON.stringify({ savedAt: 2_000_000_000, value: [photo('future')] })]) {
        const storage = new Map(stored === null ? [] : [[key('c'), stored]]);
        const { api, calls } = setup({ storage });
        const row = mount(api); await settle();
        assert.equal(row.state.photos.length, 0);
        assert.equal(row.timers.size, 0);
        assert.equal(calls.length, 0);
        row.unmount();
    }
});
test('uncached visible row waits for debounce; concurrent grid request shares a single fetch', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const { api, calls } = setup({ fetch: () => pending });
    const row = mount(api, { visible: true }); await settle();
    assert.equal(calls.length, 0);
    assert.equal([...row.timers.values()][0].ms, 150);
    row.fire(); const grid = api.getCollectionPhotos('c'); await settle();
    assert.equal(calls.length, 1);
    finish([photo('new')]); await grid; await settle();
    assert.equal(row.state.photos[0].id, 'new');
    row.unmount();
});
test('leaving before debounce cancels the fetch and late disk reads cannot update unmounted rows', async () => {
    let finish;
    const { api, calls, now } = setup({ read: () => new Promise(resolve => { finish = resolve; }) });
    const row = mount(api, { visible: true }); row.unmount();
    assert.equal(row.timers.size, 0);
    finish(JSON.stringify({ savedAt: now, value: [photo('late')] })); await settle();
    assert.equal(row.state.updates, 0);
    assert.equal(calls.length, 0);
});
test('empty cached pages are valid hits and do not waste requests', async () => {
    const { api, calls } = setup({ fetch: async () => [] });
    await api.getCollectionPhotos('c');
    assert.equal((await api.getCachedCollectionPhotos('c')).length, 0);
    await api.getCollectionPhotos('c');
    assert.equal(calls.length, 1);
});
test('failed local reads keep hidden rows offline and do not block a visible request', async () => {
    const { api, calls } = setup({ read: async () => { throw Error('storage'); } });
    assert.equal(await api.getCachedCollectionPhotos('c'), null);
    assert.equal(calls.length, 0);
    await api.getCollectionPhotos('c');
    assert.equal(calls.length, 1);
});
test('late disk snapshot cannot replace newly fetched memory cache', async () => {
    let finish, reads = 0;
    const { api, now } = setup({ read: async () => {
        reads++;
        if (reads === 1) return new Promise(resolve => { finish = resolve; });
        return null;
    } });
    const early = api.getCachedCollectionPhotos('c');
    await api.getCollectionPhotos('c');
    finish(JSON.stringify({ savedAt: now, value: [photo('old')] }));
    assert.deepEqual((await early).map(p => p.id), ['a', 'b']);
    assert.deepEqual((await api.getCachedCollectionPhotos('c')).map(p => p.id), ['a', 'b']);
});
test('metadata uses the same 24h cache after restart without extra API calls', async () => {
    const first = setup({ fetch: async () => ({ id: 'c', title: 'Space', total_photos: 7, cover_photo: { urls: { small: 'cover' } }, user: { name: 'Curator' } }) });
    const meta = await first.api.getCollectionMeta('c');
    assert.equal(meta.title, 'Space');
    const restarted = setup({ storage: first.storage });
    assert.equal((await restarted.api.getCollectionMeta('c')).cover, 'cover');
    assert.equal(restarted.calls.length, 0);
});
test('expired preview is refreshed only by delayed visible request', async () => {
    const storage = new Map([[key('c'), JSON.stringify({ savedAt: 0, value: [photo('old')] })]]);
    const { api, calls } = setup({ storage });
    const row = mount(api, { visible: true }); await settle();
    assert.equal(row.state.photos.length, 0);
    assert.equal(calls.length, 0);
    row.fire(); await settle();
    assert.equal(calls.length, 1);
    assert.equal(row.state.photos[0].id, 'a');
    row.unmount();
});
