/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function setup() {
    const refs = [], animations = [], effects = [];
    let index = 0, closed = 0;
    const make = (value, config) => {
        const a = { value, config, callback: null, stopped: false,
            start(callback) { a.callback = callback; }, stop() { a.stopped = true; a.callback?.({ finished: false }); },
            finish() { a.callback?.({ finished: true }); },
        };
        animations.push(a); return a;
    };
    const mocks = {
        react: { useRef: current => { const i = index++; return refs[i] ?? (refs[i] = { current }); }, useEffect: effect => effects.push(effect) },
        'react-native': {
            Animated: { Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }, timing: make, spring: make },
            PanResponder: { create: handlers => ({ panHandlers: handlers }) },
        },
    };
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/useSheetDismiss.ts'), 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, require: name => mocks[name] });
    const render = (visible = true, height = 700) => { index = 0; return exports.useSheetDismiss(visible, height, () => { closed++; }); };
    const api = render(); let cleanup = effects.pop()();
    const rerender = (visible, height = 700) => { cleanup(); render(visible, height); cleanup = effects.pop()(); };
    return { api, animations, rerender, unmount: () => cleanup(), closed: () => closed, shouldDismiss: exports.shouldDismissSheet };
}
test('only downward vertical drag starts; horizontal swipe, tap and upward motion do not', () => {
    const { api } = setup(); const should = api.panHandlers.onMoveShouldSetPanResponder;
    assert.equal(should(null, { dx: 2, dy: 10 }), true);
    assert.equal(should(null, { dx: 12, dy: 10 }), false);
    assert.equal(should(null, { dx: 0, dy: 0 }), false);
    assert.equal(should(null, { dx: 0, dy: -40 }), false);
});
test('handle follows downward movement and clamps at sheet bounds', () => {
    const { api } = setup();
    api.panHandlers.onPanResponderGrant();
    api.panHandlers.onPanResponderMove(null, { dy: 80 }); assert.equal(api.slide.value, 80);
    api.panHandlers.onPanResponderMove(null, { dy: -20 }); assert.equal(api.slide.value, 0);
    api.panHandlers.onPanResponderMove(null, { dy: 900 }); assert.equal(api.slide.value, 700);
});
test('short drag and interruption return to top without closing', () => {
    const h = setup();
    h.api.panHandlers.onPanResponderRelease(null, { dy: 40, vy: 0.2 });
    assert.equal(h.animations.at(-1).config.toValue, 0); assert.equal(h.closed(), 0);
    h.api.panHandlers.onPanResponderTerminate();
    assert.equal(h.animations.at(-1).config.toValue, 0); assert.equal(h.closed(), 0);
});
test('sufficient distance or downward flick closes only after animation; duplicate release is ignored', () => {
    for (const gesture of [{ dy: 140, vy: 0 }, { dy: 30, vy: 1 }]) {
        const h = setup(); const release = h.api.panHandlers.onPanResponderRelease;
        release(null, gesture); const count = h.animations.length;
        assert.equal(h.closed(), 0); assert.equal(h.animations.at(-1).config.toValue, 700);
        release(null, gesture); assert.equal(h.animations.length, count);
        h.animations.at(-1).finish(); assert.equal(h.closed(), 1);
    }
});
test('reopen and unmount cancel old close completion; new sheet uses its current height', () => {
    const h = setup(); h.api.panHandlers.onPanResponderRelease(null, { dy: 200, vy: 0 });
    const old = h.animations.at(-1);
    h.rerender(false); h.rerender(true, 500); old.finish(); assert.equal(h.closed(), 0);
    h.api.panHandlers.onPanResponderRelease(null, { dy: 110, vy: 0 });
    const current = h.animations.at(-1); assert.equal(current.config.toValue, 500);
    h.unmount(); current.finish(); assert.equal(h.closed(), 0); assert.equal(current.stopped, true);
});
test('fast incidental tiny motion does not dismiss; threshold adapts to height', () => {
    const { shouldDismiss } = setup();
    assert.equal(shouldDismiss(10, 2, 700), false);
    assert.equal(shouldDismiss(100, 0, 700), false);
    assert.equal(shouldDismiss(100, 0, 500), true);
});
