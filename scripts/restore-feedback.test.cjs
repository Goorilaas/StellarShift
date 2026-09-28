// Run: node scripts/restore-feedback.test.cjs — actual component/effects/queue, native animation mocked.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks, globals = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; }, ...globals });
    return exports;
}
const jsx = (type, props) => ({ type, props });
test('existing sparkle and text fade with blessing rhythm; Undo remains outside fading layer', () => {
    let effect, steps, stopped = false, pressed = false;
    const component = load('components/RestoreFeedback.tsx', {
        'react/jsx-runtime': { jsx, jsxs: jsx },
        react: { useRef: current => ({ current }), useEffect: fn => { effect = fn; } },
        'react-native': {
            Animated: { Value: class { setValue() {} }, View: 'AnimatedView',
                timing: (_, config) => ({ kind: 'timing', ...config }), delay: duration => ({ kind: 'delay', duration }),
                sequence: list => { steps = list; return { start() {}, stop() { stopped = true; } }; } },
            View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: styles => styles },
        },
        'react-native-svg': { SvgXml: 'SvgXml' }, './icons': { ICON: { sparkle: 'existing-sparkle' } },
    }).default;
    const tree = component({ message: 'Красу повернуто', action: { label: 'Скасувати', onPress: () => { pressed = true; } } });
    const cleanup = effect();
    assert.equal(steps[0].duration, 250); assert.equal(steps[1].duration, 1800); assert.equal(steps[2].duration, 400);
    assert.equal(steps[2].toValue, 0);
    const [animated, undo] = tree.props.children;
    assert.equal(animated.type, 'AnimatedView'); assert.equal(animated.props.children[0].props.xml, 'existing-sparkle');
    assert.equal(undo.type, 'Pressable'); undo.props.onPress(); assert.equal(pressed, true);
    assert.equal(tree.props.style.backgroundColor, undefined); assert.equal(tree.props.style.borderWidth, undefined);
    cleanup(); assert.equal(stopped, true);
});
function queue() {
    let current, nextTimer = 0;
    const timers = new Map();
    const api = load('components/Toast.tsx', {
        'react/jsx-runtime': { jsx, jsxs: jsx },
        react: { useState: () => [null, value => { current = value; }], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: () => {} },
        'react-native': { StyleSheet: { create: styles => styles } },
    }, {
        setTimeout: (fn, duration) => { const id = ++nextTimer; timers.set(id, { fn, duration }); return id; },
        clearTimeout: id => timers.delete(id),
    }).useToastQueue();
    return { api, timers, current: () => current, advance: () => { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); } };
}
test('restore message retains Undo and presentation for 5000 ms, then advances to the next photo', () => {
    const { api, timers, current, advance } = queue();
    const restored = [];
    api.showToast('Красу повернуто', { onPress: () => restored.push('a') }, 5000, 'restore');
    api.showToast('Красу повернуто', { onPress: () => restored.push('b') }, 5000, 'restore');
    assert.equal(current().presentation, 'restore'); assert.equal([...timers.values()][0].duration, 5000);
    const first = current().action;
    advance(); assert.notEqual(current().action, first);
    current().action.onPress(); assert.deepEqual(restored, ['b']);
    advance(); assert.equal(current(), null);
});
test('ordinary errors keep default presentation and duration; Undo dismissal drains queued feedback', () => {
    const { api, timers, current } = queue();
    api.showToast('error'); assert.equal(current().presentation, undefined); assert.equal([...timers.values()][0].duration, 3000);
    api.showToast('Красу повернуто', { onPress() {} }, 5000, 'restore');
    api.dismissToast(); assert.equal(current(), null); assert.equal(timers.size, 0);
});
