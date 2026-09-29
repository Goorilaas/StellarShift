/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const plain = value => JSON.parse(JSON.stringify(value));
function load(file, mocks, globals = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; }, ...globals });
    return exports;
}
function storage() {
    const disk = new Map();
    const api = { getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); } };
    return { disk, api, order: load('services/collectionOrder.ts', { '@react-native-async-storage/async-storage': { default: api } }) };
}
test('saved order survives reload; moods and each subcollection list are independent', async () => {
    const { order, disk, api } = storage();
    await order.saveCollectionOrder('moods', ['b', 'a']);
    await order.saveCollectionOrder('mood:a', ['2', '1']);
    await order.saveCollectionOrder('mood:b', ['1', '2']);
    const reloaded = load('services/collectionOrder.ts', { '@react-native-async-storage/async-storage': { default: api } });
    assert.deepEqual(plain(await reloaded.readCollectionOrder('moods')), ['b', 'a']);
    assert.deepEqual(plain(await reloaded.readCollectionOrder('mood:a')), ['2', '1']);
    assert.deepEqual(plain(await reloaded.readCollectionOrder('mood:b')), ['1', '2']);
    assert.equal(disk.size, 3);
});
test('removed ids disappear, new ids append, missing metadata does not remove a collection', () => {
    const { order } = storage();
    assert.deepEqual(plain(order.reconcileOrder(['a', 'b', 'new'], ['b', 'deleted', 'a', 'b'])), ['b', 'a', 'new']);
});
test('dragging first to last and back preserves every id and does not mutate source', () => {
    const { order } = storage();
    const initial = ['a', 'b', 'c'];
    const moved = order.moveItem(initial, 0, 2);
    assert.deepEqual(plain(moved), ['b', 'c', 'a']);
    assert.deepEqual(plain(order.moveItem(moved, 2, 0)), initial);
    assert.deepEqual(initial, ['a', 'b', 'c']);
    assert.deepEqual(plain(order.moveItem(initial, 0, -1)), initial);
    assert.deepEqual(plain(order.moveItem(initial, 2, 3)), initial);
});
test('empty store uses default order; malformed or unavailable storage is reported', async () => {
    const { order, disk, api } = storage();
    assert.deepEqual(plain(await order.readCollectionOrder('moods')), []);
    for (const bad of ['{', '{}', '[1]']) {
        disk.set('collection_order_v1:moods', bad);
        await assert.rejects(order.readCollectionOrder('moods'));
    }
    api.getItem = async () => { throw new Error('read failed'); };
    await assert.rejects(order.readCollectionOrder('moods'), /read failed/);
});
test('failed save propagates and leaves previous saved order intact', async () => {
    const { order, api } = storage();
    await order.saveCollectionOrder('moods', ['a', 'b']);
    api.setItem = async () => { throw new Error('disk full'); };
    await assert.rejects(order.saveCollectionOrder('moods', ['b', 'a']), /disk full/);
    assert.deepEqual(plain(await order.readCollectionOrder('moods')), ['a', 'b']);
});
const jsx = (type, props) => ({ type, props });
function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    return [tree, ...nodes(tree.props?.children)];
}
function constellation(animated) {
    const effects = [], started = [], stopped = [];
    const animation = config => ({ ...config, start() { started.push(config); }, stop() { stopped.push(config); } });
    const component = load('components/OrderConstellation.tsx', {
        react: { useRef: current => ({ current }), useEffect: effect => { effects.push(effect); } },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': {
            View: 'View', StyleSheet: { absoluteFill: {} }, Easing: { bezier: (...values) => values },
            Animated: {
                View: 'AnimatedView', Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate(config) { return { config }; } },
                timing: (value, config) => animation({ type: 'timing', value, ...config }),
                delay: duration => animation({ type: 'delay', duration }),
                sequence: children => animation({ type: 'sequence', children }),
                parallel: children => animation({ type: 'parallel', children }),
            },
        },
        'react-native-svg': { default: 'Svg', Circle: 'Circle', Path: 'Path' },
    }).default;
    const tree = component({ animated });
    const cleanup = effects[0]();
    return { tree, started, stopped, cleanup };
}
test('approved constellation has three stars, three white centers and a connecting path; button icon stays still', () => {
    const { tree, started } = constellation(false);
    const all = nodes(tree);
    assert.equal(all.filter(n => n.type === 'Circle').length, 3);
    assert.equal(all.filter(n => n.type === 'Path').length, 4);
    assert.equal(all.find(n => n.type === 'Path').props.d, 'M6 23 L16 7 L26 19');
    assert.equal(tree.props.style.width, 32);
    assert.equal(tree.props.style.borderWidth, undefined);
    assert.equal(started.length, 0);
});
test('stars settle with stagger then connecting line appears; all motion uses native driver and stops on unmount', () => {
    const { started, stopped, cleanup } = constellation(true);
    assert.equal(started.length, 1);
    const branches = started[0].children;
    assert.deepEqual(plain(branches.slice(0, 3).map(b => b.children[0].duration)), [0, 70, 140]);
    assert.ok(branches.slice(0, 3).every(b => b.children[1].duration === 550 && b.children[1].useNativeDriver));
    assert.equal(branches[3].children[0].duration, 500);
    assert.equal(branches[3].children[1].toValue, 0.65);
    assert.equal(branches[3].children[1].duration, 250);
    assert.equal(branches[3].children[1].useNativeDriver, true);
    cleanup(); assert.equal(stopped.length, 1);
});
const tiles = load('services/tileOrder.ts', {});
test('two-column slots preserve image-sized cards and hit-test across columns and rows', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const layout = tiles.tilePositions(ids, 312, 2, {}, 132);
    assert.deepEqual(plain(layout.positions.b), { x: 162, y: 0, width: 150, height: 132 });
    assert.equal(layout.positions.c.y, 144);
    assert.equal(tiles.nearestTile(ids, layout.positions, 237, 210), 3);
    assert.equal(tiles.nearestTile(ids, layout.positions, -40, -40), 0);
    assert.equal(layout.height, 288);
});
test('single-column layout uses measured card heights; relayout at narrow widths stays inside screen', () => {
    const layout = tiles.tilePositions(['a', 'b', 'c'], 280, 1, { a: 150, b: 170 }, 124);
    assert.equal(layout.positions.b.y, 162);
    assert.equal(layout.positions.c.y, 344);
    assert.equal(layout.positions.c.width, 280);
    assert.equal(tiles.nearestTile(['a', 'b', 'c'], layout.positions, 140, 900), 2);
});
test('reordering visible cards retains unavailable collection ids in their slots', () => {
    assert.deepEqual(plain(tiles.mergeVisibleOrder(['a', 'missing', 'b', 'c'], ['c', 'a', 'b'])), ['c', 'missing', 'a', 'b']);
});
function editingHarness(saveImpl = async () => {}) {
    let stateIndex = 0, refIndex = 0;
    const state = [], refs = [], focusEffects = [], calls = [], haptics = [];
    const order = { ids: ['a', 'b', 'c'], ready: true, save: async ids => { calls.push(plain(ids)); await saveImpl(ids); order.ids = [...ids]; } };
    const hook = load('services/useOrderEditing.ts', {
        react: {
            useState: initial => { const i = stateIndex++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
            useRef: current => { const i = refIndex++; return refs[i] ?? (refs[i] = { current }); }, useCallback: callback => callback,
        },
        'expo-router': { useFocusEffect: fn => { focusEffects.push(fn); } },
        'react-native': { BackHandler: { addEventListener: (_event, fn) => { back = fn; return { remove() {} }; } } },
        'expo-haptics': { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async () => { haptics.push(true); } },
        './tileOrder': tiles, './useCollectionOrder': { useCollectionOrder: () => order },
    }).useOrderEditing;
    let back;
    function render() { stateIndex = 0; refIndex = 0; focusEffects.length = 0; return hook('moods', ['a', 'b', 'c']); }
    return { render, state, calls, haptics, focusEffects, back: () => back() };
}
test('editing keeps changes as draft, system Back cancels without persistence or haptic', () => {
    const h = editingHarness(); let api = h.render(); api.start(); api = h.render();
    api.reorder(['c', 'a', 'b']); api = h.render();
    assert.deepEqual(plain(api.ids), ['c', 'a', 'b']);
    h.focusEffects[1](); assert.equal(h.back(), true);
    api = h.render(); assert.equal(api.editing, false); assert.deepEqual(plain(api.ids), ['a', 'b', 'c']);
    assert.equal(h.calls.length, 0); assert.equal(h.haptics.length, 0);
});
test('Done awaits successful persistence and guards duplicate presses; cancellation cannot interrupt save', async () => {
    let finish;
    const h = editingHarness(() => new Promise(resolve => { finish = resolve; }));
    let api = h.render(); api.start(); api = h.render(); api.reorder(['b', 'a', 'c']); api = h.render();
    const pending = api.save(); await api.save(); api.cancel();
    assert.equal(h.calls.length, 1); assert.equal(h.haptics.length, 0); assert.equal(h.render().editing, true);
    finish(); await pending;
    api = h.render(); assert.equal(api.editing, false); assert.equal(api.success, 1); assert.equal(h.haptics.length, 1);
    assert.deepEqual(plain(api.ids), ['b', 'a', 'c']);
});
test('failed save retains tile order in edit mode; retry succeeds', async () => {
    let fail = true;
    const h = editingHarness(async () => { if (fail) throw new Error('full'); });
    let api = h.render(); api.start(); api = h.render(); api.reorder(['c', 'b', 'a']); api = h.render();
    await api.save(); api = h.render();
    assert.equal(api.editing, true); assert.equal(api.saveError, true); assert.equal(api.success, 0); assert.equal(h.haptics.length, 0);
    assert.deepEqual(plain(api.ids), ['c', 'b', 'a']);
    fail = false; await api.save(); assert.equal(h.render().editing, false); assert.equal(h.haptics.length, 1);
});
test('Done is ignored while dragging; losing focus discards unsaved changes', async () => {
    const h = editingHarness(); let api = h.render(); const blur = h.focusEffects[0]();
    api.start(); api = h.render(); api.setDragging(true); api = h.render(); await api.save();
    assert.equal(h.calls.length, 0); blur(); api = h.render(); assert.equal(api.editing, false); assert.equal(api.dragging, false);
});
test('orbit uses approved planet/satellite geometry and one native rotation that stops on unmount', () => {
    let effect, started = false, stopped = false, config;
    const component = load('components/OrderOrbit.tsx', {
        react: { useRef: current => ({ current }), useEffect: fn => { effect = fn; } },
        'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': { View: 'View', StyleSheet: { absoluteFill: {} }, Easing: { bezier: () => 'easing' }, Animated: {
            View: 'AnimatedView', Value: class { setValue() {} interpolate(value) { return value; } },
            timing: (_value, options) => { config = options; return { start() { started = true; }, stop() { stopped = true; } }; },
        } }, 'react-native-svg': { default: 'Svg', Path: 'Path', Circle: 'Circle' },
    }).default;
    const tree = component({ animated: true }); const cleanup = effect();
    assert.equal(nodes(tree).filter(n => n.type === 'Circle').length, 3);
    assert.equal(config.duration, 750); assert.equal(config.useNativeDriver, true); assert.equal(started, true);
    cleanup(); assert.equal(stopped, true);
});
test('header button starts editing or confirms current draft; orbit is selected for inner collections', async () => {
    let starts = 0, saves = 0;
    const component = load('components/CollectionOrderControl.tsx', {
        react: {}, 'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        'react-native': { Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: x => x } },
        './OrderConstellation': { default: 'Constellation' }, './OrderOrbit': { default: 'Orbit' },
    }).default;
    const order = { ready: true, editing: false, start: () => { starts++; }, save: async () => { saves++; } };
    let tree = component({ order, orbit: true, count: 3 }); tree.props.onPress();
    assert.equal(starts, 1); assert.ok(nodes(tree).some(n => n.type === 'Orbit'));
    order.editing = true; tree = component({ order, orbit: true, count: 3 }); await tree.props.onPress();
    assert.equal(saves, 1); assert.ok(nodes(tree).some(n => n.type === 'Text' && n.props.children === 'common.done'));
    assert.equal(nodes(tree).some(n => n.type === 'Modal'), false);
});
function tileHarness() {
    let si = 0, ri = 0, ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const state = [312, {}, 0, 200, 0, null], refs = [], timers = new Map(), changes = [], scrolls = [], dragging = [];
    const { order } = storage();
    class ValueXY { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }
    const component = load('components/ReorderTiles.tsx', {
        react: {
            useState: initial => { const i = si++; if (!(i in state)) state[i] = initial; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
            useRef: current => { const i = ri++; return refs[i] ?? (refs[i] = { current }); }, useMemo: fn => fn(), useEffect: () => {},
        }, 'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': { View: 'View', ScrollView: 'ScrollView', StyleSheet: { create: x => x }, Animated: { ValueXY } },
        'react-native-gesture-handler': { Gesture: { Native: () => ({}) }, GestureDetector: 'GestureDetector' },
        'expo-haptics': { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async () => {} },
        '../services/collectionOrder': order, '../services/tileOrder': tiles,
    }, { setInterval: fn => { timers.set(1, fn); return 1; }, clearInterval: id => timers.delete(id) }).default;
    function render() {
        si = 0; ri = 0;
        const tree = component({ ids, columns: 2, fallbackHeight: 132, editing: true, saving: false,
            onReorder: next => { ids = [...next]; changes.push(plain(next)); }, onDragging: value => dragging.push(value), renderItem: id => jsx('ImageCard', { id }),
        });
        nodes(tree).find(n => n.type === 'ScrollView').props.ref.current = { scrollTo: value => scrolls.push(value.y) };
        return tree;
    }
    return { render, timers, changes, scrolls, dragging, ids: () => ids };
}
test('actual tile drag callbacks shift neighboring slots, cancel restores draft, and timers stop', () => {
    const h = tileHarness(); const tree = h.render();
    const tile = nodes(tree).find(n => typeof n.type === 'function');
    tile.props.onBegin(80); tile.props.onMove(162, 144, 80);
    assert.deepEqual(h.ids(), ['b', 'c', 'd', 'a', 'e', 'f']);
    h.render(); tile.props.onEnd(false);
    assert.deepEqual(h.ids(), ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.equal(h.timers.size, 0); assert.deepEqual(h.dragging, [true, false]);
});
test('edge drag scrolls within content bounds and successful drop retains new order', () => {
    const h = tileHarness(); const tile = nodes(h.render()).find(n => typeof n.type === 'function');
    tile.props.onBegin(195); tile.props.onMove(0, 80, 195);
    const tick = h.timers.get(1);
    for (let i = 0; i < 50; i++) tick();
    assert.ok(h.scrolls.length > 0);
    assert.ok(h.scrolls.every(y => y >= 0 && y <= 256));
    assert.equal(h.scrolls.at(-1), 256);
    const beforeDrop = [...h.ids()]; tile.props.onEnd(true);
    assert.deepEqual(h.ids(), beforeDrop); assert.equal(h.timers.size, 0);
});
