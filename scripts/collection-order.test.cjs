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
function editor(onSave) {
    const state = [], refs = []; let si, ri, closed = 0, haptics = 0;
    const { order } = storage();
    const component = load('components/CollectionOrderEditor.tsx', {
        react: {
            useState: init => { const i = si++; if (!(i in state)) state[i] = typeof init === 'function' ? init() : init; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
            useRef: init => { const i = ri++; return refs[i] ?? (refs[i] = { current: init }); }, useEffect: () => {},
        }, 'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': { Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: x => x } },
        'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        'expo-haptics': { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async () => { haptics++; } },
        '../services/collectionOrder': order,
    }, { setInterval, clearInterval });
    const render = () => { si = 0; ri = 0; return component.default({ items: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], onSave, onClose: () => { closed++; } }); };
    const done = tree => nodes(tree).find(n => n.type === 'Pressable' && n.props.children?.props?.children === 'common.done');
    return { render, done, state, get closed() { return closed; }, get haptics() { return haptics; } };
}
test('Done awaits persistence, prevents double save/back while pending, then gives one haptic', async () => {
    let finish, writes = 0;
    const e = editor(() => { writes++; return new Promise(resolve => { finish = resolve; }); });
    const tree = e.render();
    const save = e.done(tree).props.onPress();
    await e.done(tree).props.onPress(); tree.props.onRequestClose();
    assert.equal(writes, 1); assert.equal(e.haptics, 0); assert.equal(e.closed, 0);
    finish(); await save; assert.equal(e.haptics, 1);
});
test('save failure keeps draft, reports error, does not vibrate and can retry', async () => {
    let fail = true;
    const e = editor(async () => { if (fail) throw new Error('full'); });
    let tree = e.render();
    nodes(tree).find(n => typeof n.type === 'function' && n.props.index === 0).props.onStep(1);
    tree = e.render(); await e.done(tree).props.onPress();
    tree = e.render();
    assert.deepEqual(plain(e.state[0]), ['b', 'a']);
    assert.ok(nodes(tree).some(n => n.props?.accessibilityRole === 'alert'));
    assert.equal(e.haptics, 0); assert.equal(e.closed, 0);
    fail = false; await e.done(tree).props.onPress(); assert.equal(e.haptics, 1);
});
test('Cancel discards draft without storage write or success feedback', () => {
    let writes = 0;
    const e = editor(async () => { writes++; });
    const tree = e.render();
    nodes(tree).find(n => typeof n.type === 'function' && n.props.index === 0).props.onStep(1);
    nodes(tree).find(n => n.type === 'Pressable' && n.props.children?.props?.children === 'common.cancel').props.onPress();
    assert.equal(writes, 0); assert.equal(e.closed, 1); assert.equal(e.haptics, 0);
});
test('drag release moves the row; interrupted drag leaves the order unchanged', () => {
    const e = editor(async () => {});
    let tree = e.render();
    let row = nodes(tree).find(n => typeof n.type === 'function' && n.props.index === 0);
    row.props.onStart(100); row.props.onMove(100, 200); row.props.onCancel();
    assert.deepEqual(plain(e.state[0]), ['a', 'b']);
    tree = e.render(); row = nodes(tree).find(n => typeof n.type === 'function' && n.props.index === 0);
    row.props.onStart(100); row.props.onMove(100, 200); row.props.onEnd();
    assert.deepEqual(plain(e.state[0]), ['b', 'a']);
});
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
test('control closes editor and starts success feedback only after order persistence succeeds', async () => {
    const states = [], opacity = [];
    let stateIndex = 0, finish;
    const component = load('components/CollectionOrderControl.tsx', {
        react: {
            useState: value => { const i = stateIndex++; return [value, next => states.push({ i, next })]; },
            useRef: current => ({ current }), useEffect: () => {},
        }, 'react/jsx-runtime': { jsx, jsxs: jsx },
        'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: x => x }, Animated: { Value: class { setValue(value) { opacity.push(value); } } } },
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        './CollectionOrderEditor': { default: 'Editor' }, './OrderConstellation': { default: 'Constellation' },
    }).default;
    // Open editor using state setter, then rerender with editing=true.
    const mocksTree = component({ order: { ready: true, save: () => new Promise(resolve => { finish = resolve; }) }, items: [{ id: 'a' }, { id: 'b' }] });
    assert.ok(nodes(mocksTree).some(n => n.type === 'Constellation'));
    // Handler integration is covered below by extracting the actual callback from the component AST.
    const source = fs.readFileSync(path.join(__dirname, '../components/CollectionOrderControl.tsx'), 'utf8');
    const ast = ts.createSourceFile('control.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
        if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onSave') handler = node.initializer.expression.getText(ast);
        ts.forEachChild(node, visit);
    }
    visit(ast);
    const events = [];
    const context = vm.createContext({ order: { save: () => new Promise(resolve => { finish = resolve; }) }, setEditing: value => events.push(['editing', value]), opacity: { setValue: value => events.push(['opacity', value]) }, setSuccess: () => events.push(['success']) });
    vm.runInContext(ts.transpileModule(`globalThis.save = ${handler}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    const pending = context.save(['b', 'a']); assert.equal(events.length, 0);
    finish(); await pending;
    assert.deepEqual(events, [['editing', false], ['opacity', 0], ['success']]);
    events.length = 0;
    context.order.save = async () => { throw new Error('full'); };
    await assert.rejects(context.save(['a', 'b']), /full/);
    assert.equal(events.length, 0);
});
