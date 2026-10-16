/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
    return exports;
}
const plain = v => JSON.parse(JSON.stringify(v));
const native = { getCollectionVisibility: async () => JSON.stringify({ hidden: { 'mood:a': ['x', 'y'], 'collection:z': ['z'] }, active: ['c'], paused: true }) };
const service = load('services/hiddenCollections.ts', { 'react-native': { NativeModules: { WallpaperModule: native } } });
test('confirmation distinguishes inactive, partially active and last active sources', () => {
    assert.equal(service.removalEffect(['a', 'b'], ['x']), 'none');
    assert.equal(service.removalEffect(['a', 'b'], ['a']), 'some');
    assert.equal(service.removalEffect(['a', 'b'], ['a', 'b', 'c']), 'last');
    assert.equal(service.removalEffect([], ['a']), 'none');
});
test('parent exclusions also remove children from saved shelves without touching bookmarks', async () => {
    const state = await service.getCollectionVisibility();
    const bookmarks = ['x', 'y', 'z', 'c'];
    const visible = bookmarks.filter(id => !service.excludedCollections(state).has(id));
    assert.deepEqual(visible, ['c']); assert.deepEqual(bookmarks, ['x', 'y', 'z', 'c']);
});
test('restore sends no activation request and native errors reach the UI', async () => {
    const calls = [];
    native.mutateCollectionVisibility = async (...args) => { calls.push(args); return native.getCollectionVisibility(); };
    await service.mutateCollectionVisibility('mood:a', [], true);
    assert.deepEqual(plain(calls), [['mood:a', '[]', true, '']]);
    native.mutateCollectionVisibility = async () => { throw new Error('disk'); };
    await assert.rejects(service.mutateCollectionVisibility('mood:a', ['x'], false, 'pause'), /disk/);
});
test('rotation toggles use native truth and honor native rejection of hidden sources', async () => {
    native.setActiveCollections = async json => { assert.deepEqual(JSON.parse(json), ['c', 'x']); };
    const subs = load('services/collectionSubs.ts', {
        'react-native': { NativeModules: { WallpaperModule: native } }, './hiddenCollections': service,
        '@react-native-async-storage/async-storage': { default: { getItem: async () => '["old"]' } },
    });
    assert.deepEqual(plain(await subs.getActiveCollections()), ['c']);
    assert.deepEqual(plain(await subs.toggleActiveCollection('x')), ['c']);
});
const jsx = (type, props) => ({ type, props });
const controls = load('components/CollectionOrderControl.tsx', {
    react: {}, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'react-native': { Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: x => x } },
    './OrderConstellation': { default: 'Constellation' }, './OrderOrbit': { default: 'Orbit' },
});
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat().flatMap(nodes)]; }
test('empty collection list still allows entering editing to restore hidden tiles', () => {
    let entered = false;
    const tree = controls.default({ order: { ready: true, start() { entered = true; } }, count: 0 });
    assert.ok(!tree.props.disabled); tree.props.onPress(); assert.ok(entered);
});
test('management shares the alphabetize row and disappears outside editing', () => {
    assert.equal(controls.CollectionAlphabetize({ order: { editing: false }, management: jsx('Gear', {}) }), null);
    const tree = controls.CollectionAlphabetize({ order: { editing: true }, management: jsx('Gear', {}) });
    const row = tree.props.children[0];
    assert.equal(row.props.style.flexDirection, 'row'); assert.equal(row.props.style.justifyContent, 'space-between');
    assert.ok(nodes(row).some(n => n.type === 'Gear'));
    assert.ok(nodes(row).some(n => n.type === 'Text' && n.props.children === 'collectionOrder.alphabetical'));
});
