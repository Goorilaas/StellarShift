// Run: node scripts/photo-viewer.test.cjs — execute actual handlers with mocked native/storage boundaries.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const source = ts.createSourceFile('PhotoViewer.tsx', fs.readFileSync(path.join(root, 'components/PhotoViewer.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name) {
    let value;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) value = node.initializer.getText(source);
        ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(value, name); return value;
}
function setup({ apply = async () => {}, toggle = async () => {}, isFav = false } = {}) {
    const state = { setting: false, viewing: true, local: [], grid: [], haptics: [], hearts: 0, toggles: 0, calls: [] };
    const context = vm.createContext({
        photo: { id: 'photo', urls: { small: 'small', regular: 'regular' }, links: { download_location: 'tracking' } },
        isFav, favoritePending: { current: false }, lastTapRef: { current: 0 },
        Date: { now: () => 1000 },
        AsyncStorage: { getItem: async () => JSON.stringify({ applyTo: 'lock' }) },
        setSetting: value => { state.setting = value; },
        setWallpaperFromUrl: async (...args) => { state.calls.push(args); await apply(); },
        Haptics: {
            NotificationFeedbackType: { Success: 'success' }, ImpactFeedbackStyle: { Light: 'light' },
            notificationAsync: async type => { state.haptics.push(type); },
            impactAsync: async type => { state.haptics.push(type); },
        },
        showToast: message => state.local.push(message), t: key => key, randomCheer: () => 'cheer',
        onApplied: () => { state.viewing = false; state.grid.push('catalog.toast.applied'); },
        onToggleFav: async () => { state.toggles++; await toggle(); },
        triggerHeartAnim: () => { state.hearts++; },
    });
    for (const name of ['onSet', 'onFavPress', 'onImageTap']) {
        const code = ts.transpileModule(`globalThis.${name} = ${initializer(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
        vm.runInContext(code, context);
    }
    return { context, state };
}
test('successful wallpaper application closes viewer only after native completion and reports success to grid', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const { context, state } = setup({ apply: () => pending });
    const action = context.onSet();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state.viewing, true);
    assert.equal(state.setting, true);
    assert.deepEqual(state.local, ['cheer']);
    assert.equal(state.calls[0][0], 'regular');
    assert.equal(state.calls[0][1], 'lock');
    assert.equal(state.calls[0][2].downloadLocation, 'tracking');
    finish(); await action;
    assert.equal(state.viewing, false);
    assert.equal(state.setting, false);
    assert.deepEqual(state.grid, ['catalog.toast.applied']);
    assert.deepEqual(state.haptics, ['success']);
});
test('wallpaper failure keeps photo open without success feedback', async () => {
    const { context, state } = setup({ apply: async () => { throw Error('offline'); } });
    await context.onSet();
    assert.equal(state.viewing, true);
    assert.equal(state.setting, false);
    assert.deepEqual(state.local, ['cheer', 'catalog.toast.applyFail']);
    assert.deepEqual(state.grid, []);
    assert.deepEqual(state.haptics, []);
});
test('favorite button gives a single light haptic after storage succeeds; concurrent taps ignored', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const { context, state } = setup({ toggle: () => pending });
    const first = context.onFavPress();
    await context.onFavPress();
    assert.equal(state.toggles, 1);
    assert.deepEqual(state.haptics, []);
    finish(); await first;
    assert.deepEqual(state.haptics, ['light']);
    assert.equal(state.hearts, 1);
});
test('failed favorite write does not animate or vibrate and permits retry', async () => {
    const { context, state } = setup({ toggle: async () => { throw Error('storage'); } });
    await context.onFavPress(); await context.onFavPress();
    assert.equal(state.toggles, 2);
    assert.deepEqual(state.haptics, []);
    assert.equal(state.hearts, 0);
    assert.deepEqual(state.local, ['catalog.toast.favoriteFail', 'catalog.toast.favoriteFail']);
});
test('double tap adds with feedback; existing favorite is never toggled by double tap', async () => {
    for (const isFav of [false, true]) {
        const { context, state } = setup({ isFav });
        context.onImageTap(); context.onImageTap();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(state.toggles, isFav ? 0 : 1);
        assert.deepEqual(state.haptics, isFav ? [] : ['light']);
    }
});
test('favorite removal does not play addition feedback', async () => {
    const { context, state } = setup({ isFav: true });
    await context.onFavPress();
    assert.equal(state.toggles, 1);
    assert.deepEqual(state.haptics, []);
    assert.equal(state.hearts, 0);
});
