// Run: node --test scripts/rotation.test.cjs
// Executes the real settings handlers with deferred storage/network/native calls.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('settings.tsx', fs.readFileSync(path.join(__dirname, '../app/settings.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name) {
    let found;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = node.initializer.getText(source);
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(found, name);
    return found;
}
function deferred() {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    return { promise, resolve };
}
function setup(overrides = {}) {
    const calls = [];
    const ctx = {
        autoChangeRef: { current: true }, rotationRequestRef: { current: 0 },
        appliedPoolKeyRef: { current: '' }, poolAbortRef: { current: new AbortController() },
        loadAndStartRef: { current: null }, reloadTimer: { current: null },
        activeCategories: ['space'], mixCategories: ['space'], interval: 60, applyTo: 'lock', notifyEnabled: false,
        getActiveCollections: async () => [], loadPhotoPool: async () => [{ id: 'a', url: 'image' }],
        getUnsplashKey: async () => 'fake-key', buildPoolRecipe: async () => '{}',
        setUnsplashKeyNative: async () => {}, setPoolRecipeNative: async () => {},
        startWallpaperRotation: async (...args) => { calls.push(['start', ...args]); },
        updateRotationSettingsNative: async (...args) => { calls.push(['settings', ...args]); return true; },
        refreshPoolNative: async () => { calls.push(['refresh']); return true; },
        stopWallpaperRotation: async () => { calls.push(['stop']); },
        isIgnoringBatteryOptimization: async () => true, requestIgnoreBatteryOptimization: async () => {},
        ensureNotifPermission: async () => true, setAutoChange: () => {},
        showToast: () => {}, t: key => key, clearTimeout,
        ...overrides,
    };
    vm.createContext(ctx);
    for (const name of ['poolKeyOf', 'loadAndStart', 'handleAutoChangeToggle']) {
        vm.runInContext(ts.transpileModule(`globalThis.${name} = ${initializer(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
    }
    ctx.loadAndStartRef.current = ctx.loadAndStart;
    return { ctx, calls };
}
for (const stage of ['getActiveCollections', 'loadPhotoPool', 'getUnsplashKey', 'setUnsplashKeyNative', 'buildPoolRecipe', 'setPoolRecipeNative']) {
    test(`OFF while awaiting ${stage} cannot restart rotation`, async () => {
        const gate = deferred(), entered = deferred();
        const values = { getActiveCollections: [], loadPhotoPool: [{ id: 'a', url: 'image' }], getUnsplashKey: 'fake', buildPoolRecipe: '{}' };
        const { ctx, calls } = setup({ [stage]: async () => { entered.resolve(); return gate.promise; } });
        const work = ctx.loadAndStart();
        await entered.promise;
        await ctx.handleAutoChangeToggle(false);
        gate.resolve(values[stage]);
        await work;
        assert.deepEqual(calls, [['stop']]);
        assert.equal(ctx.poolAbortRef.current.signal.aborted, true);
    });
}
test('collections receive selected interval and target before refresh', async () => {
    const { ctx, calls } = setup({ getActiveCollections: async () => ['collection'] });
    await ctx.loadAndStart();
    assert.deepEqual(calls, [['settings', 60, 'lock'], ['refresh']]);
});
test('interval/target-only change reuses pool without API or recipe rebuild', async () => {
    const unexpected = async () => { throw Error('Unexpected content reload'); };
    const { ctx, calls } = setup({ getActiveCollections: unexpected, loadPhotoPool: unexpected, buildPoolRecipe: unexpected, refreshPoolNative: unexpected });
    await ctx.loadAndStart(false);
    assert.deepEqual(calls, [['settings', 60, 'lock']]);
});
test('missing native pool falls back to a real load', async () => {
    const { ctx, calls } = setup({ updateRotationSettingsNative: async () => false });
    await ctx.loadAndStart(false);
    assert.equal(calls[0][0], 'start');
});
test('OFF during battery dialog cannot start later', async () => {
    const gate = deferred();
    const { ctx, calls } = setup({ isIgnoringBatteryOptimization: () => gate.promise });
    const work = ctx.handleAutoChangeToggle(true);
    await ctx.handleAutoChangeToggle(false);
    gate.resolve(true);
    await work;
    assert.deepEqual(calls, [['stop']]);
});
test('new request supersedes an older pending request', async () => {
    const gate = deferred(), entered = deferred();
    let first = true;
    const { ctx, calls } = setup({ getActiveCollections: async () => {
        if (first) { first = false; entered.resolve(); return gate.promise; }
        return [];
    } });
    const old = ctx.loadAndStart();
    await entered.promise;
    await ctx.loadAndStart();
    gate.resolve([]);
    await old;
    assert.equal(calls.filter(c => c[0] === 'start').length, 1);
});
