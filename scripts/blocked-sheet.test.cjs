// Run: node scripts/blocked-sheet.test.cjs — real handlers and rendered component tree; no native gesture simulation.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const options = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = ts.createSourceFile('settings.tsx', read('app/settings.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = {};
function visit(node) {
    if (ts.isVariableDeclaration(node) && ['handleUnblock', 'undoUnblockOne'].includes(node.name.getText(source))) handlers[node.name.getText(source)] = node.initializer.getText(source);
    ts.forEachChild(node, visit);
}
visit(source);
function setup(unblock = async () => {}) {
    const toasts = [], vibrations = [], writes = [];
    const context = vm.createContext({
        blocked: [{ id: 'a', small: 'a' }, { id: 'b', small: 'b' }],
        restoringBlockedRef: { current: new Set() },
        unblockPhoto: async id => { writes.push(id); await unblock(id); },
        Haptics: { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async kind => { vibrations.push(kind); } },
        showToast: (message, action) => toasts.push({ message, action }), t: key => key,
        blockPhoto: async () => {}, dismissToast: () => {},
    });
    for (const [name, handler] of Object.entries(handlers)) {
        vm.runInContext(ts.transpileModule(`globalThis.${name} = ${handler};`, options).outputText, context);
    }
    return { context, toasts, vibrations, writes };
}
test('restoration feedback waits for native success; duplicate taps yield one mutation and one haptic', async () => {
    let finish;
    const { context, toasts, vibrations, writes } = setup(() => new Promise(resolve => { finish = resolve; }));
    const action = context.handleUnblock('a');
    await context.handleUnblock('a');
    assert.deepEqual(writes, ['a']); assert.equal(toasts.length, 0); assert.equal(vibrations.length, 0);
    finish(); await action;
    assert.equal(toasts[0].message, 'settings.toast.unblockedOne');
    assert.equal(toasts[0].action.label, 'common.undo'); assert.deepEqual(vibrations, ['light']);
    assert.equal(context.restoringBlockedRef.current.size, 0);
});
test('failed restore shows error without haptic; releases guard for retry', async () => {
    let fail = true;
    const { context, toasts, vibrations, writes } = setup(async () => { if (fail) throw Error('native'); });
    await context.handleUnblock('a');
    assert.equal(toasts[0].message, 'blockedSheet.restoreFailed'); assert.equal(vibrations.length, 0);
    fail = false; await context.handleUnblock('a');
    assert.deepEqual(writes, ['a', 'a']); assert.deepEqual(vibrations, ['light']);
});
test('stale id does not produce false success feedback or mutate storage', async () => {
    const { context, toasts, vibrations, writes } = setup(); await context.handleUnblock('missing');
    assert.equal(writes.length, 0); assert.equal(toasts.length, 0); assert.equal(vibrations.length, 0);
});
function render(blocked) {
    const exports = {}, jsx = (type, props) => ({ type, props });
    const mocks = {
        'react/jsx-runtime': { jsx, jsxs: jsx },
        react: { useEffect: () => {}, useRef: value => ({ current: value }) },
        'react-i18next': { useTranslation: () => ({ t: key => key }) },
        'react-native': {
            Animated: { Value: class {}, View: 'AnimatedView' },
            FlatList: 'FlatList', Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
            StyleSheet: { create: styles => styles, absoluteFill: { position: 'absolute' } },
            useWindowDimensions: () => ({ width: 390, height: 844 }),
        },
        'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
        'react-native-svg': { SvgXml: 'SvgXml' }, './icons': { ICON: { blocked: 'existing-svg' } },
        './Toast': { default: 'Toast' },
    };
    vm.runInNewContext(ts.transpileModule(read('components/BlockedManagerSheet.tsx'), options).outputText, {
        exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; },
    });
    let closes = 0, clears = 0;
    const restored = [], feedback = { message: 'restored', action: { label: 'undo', onPress: () => {} } };
    const tree = exports.default({ visible: true, blocked, feedback, onClose: () => { closes++; }, onClearAll: () => { clears++; }, onUnblock: id => restored.push(id) });
    return { tree, restored, feedback, closes: () => closes, clears: () => clears };
}
function find(tree, predicate, ancestors = []) {
    if (!tree || typeof tree !== 'object') return [];
    const found = predicate(tree) ? [{ node: tree, ancestors }] : [];
    for (const child of [tree.props?.children].flat(Infinity)) found.push(...find(child, predicate, [...ancestors, tree]));
    return found;
}
test('20-photo sheet places list outside press responders and footer outside scroll content', () => {
    const photos = Array.from({ length: 20 }, (_, i) => ({ id: String(i), small: String(i) }));
    const view = render(photos);
    const { node: list, ancestors } = find(view.tree, node => node.type === 'FlatList')[0];
    assert.equal(list.props.data.length, 20); assert.equal(list.props.style.flex, 1);
    assert.ok(ancestors.every(node => node.type !== 'Pressable' && !node.props.onStartShouldSetResponder));
    assert.equal(list.props.removeClippedSubviews, false);
    const tile = list.props.renderItem({ item: photos[19] });
    assert.equal(find(tile, node => node.type === 'SvgXml').length, 0);
    find(tile, node => node.type === 'TouchableOpacity')[0].node.props.onPress();
    assert.deepEqual(view.restored, ['19']); assert.equal(view.closes(), 0);
    const clear = find(view.tree, node => node.props?.onPress && node.props?.children?.props?.children === 'blockedSheet.clearAll')[0];
    assert.ok(clear); assert.notEqual(clear.node.props.style.position, 'absolute');
    clear.node.props.onPress(); assert.equal(view.clears(), 1);
    const toast = find(view.tree, node => node.type === 'Toast')[0].node;
    assert.equal(toast.props.inline, true); assert.equal(toast.props.message, 'restored'); assert.equal(toast.props.action, view.feedback.action);
});
test('new list after restore has stable remaining ids; empty sheet retains feedback and close actions', () => {
    const list = find(render([{ id: 'b', small: 'b' }]).tree, node => node.type === 'FlatList')[0].node;
    assert.equal(list.props.keyExtractor(list.props.data[0]), 'b'); assert.equal(list.props.data.length, 1);
    const empty = render([]);
    assert.equal(find(empty.tree, node => node.props?.children?.props?.children === 'blockedSheet.clearAll').length, 0);
    const backdrop = find(empty.tree, node => node.type === 'Pressable')[0].node;
    backdrop.props.onPress(); assert.equal(empty.closes(), 1);
    assert.equal(find(empty.tree, node => node.type === 'Toast')[0].node.props.message, 'restored');
});
