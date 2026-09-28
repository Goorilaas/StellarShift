// Run: node scripts/collection-errors.test.cjs — actual classifier and PhotoGrid handlers.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');
const root = path.join(__dirname, '..');
const options = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } };
const exportsForError = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'services/collectionError.ts'), 'utf8'), options).outputText,
    { exports: exportsForError, require: name => { assert.equal(name, 'axios'); return axios; } });
const { classifyCollectionError } = exportsForError;
const httpError = (status, headers = {}, data = {}) => new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, { status, headers, data });
const cases = [
    ['429 confirms rate limit', httpError(429), 'rateLimit'],
    ['403 with zero quota confirms rate limit', httpError(403, { 'x-ratelimit-remaining': '0' }), 'rateLimit'],
    ['403 with numeric zero quota confirms rate limit', httpError(403, { 'x-ratelimit-remaining': 0 }), 'rateLimit'],
    ['403 plain-text rate limit response', httpError(403, {}, 'Rate Limit Exceeded'), 'rateLimit'],
    ['403 JSON rate limit response', httpError(403, {}, { errors: ['Rate Limit Exceeded'] }), 'rateLimit'],
    ['403 alone is access denied, not quota', httpError(403), 'access'],
    ['403 with remaining requests is access denied', httpError(403, { 'x-ratelimit-remaining': '12' }), 'access'],
    ['401 is invalid authorization, not quota', httpError(401, { 'x-ratelimit-remaining': '0' }), 'auth'],
    ['404 is unavailable', httpError(404), 'unavailable'],
    ['410 is unavailable', httpError(410), 'unavailable'],
    ['503 is server failure', httpError(503), 'server'],
    ['network failure', new axios.AxiosError('Network Error', 'ERR_NETWORK'), 'network'],
    ['timeout', new axios.AxiosError('timeout', 'ECONNABORTED'), 'network'],
    ['unknown local failure is not mislabeled as network', Error('storage'), 'unknown'],
    ['other API failure remains unknown', httpError(400), 'unknown'],
];
for (const [name, error, expected] of cases) test(name, () => assert.equal(classifyCollectionError(error), expected));
const source = ts.createSourceFile('collections.tsx', fs.readFileSync(path.join(root, 'app/collections.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const grid = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'PhotoGrid');
const effect = grid.body.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && node.expression.expression.getText(source) === 'useEffect' && node.getText(source).includes('getCollectionPhotos'));
const retry = grid.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText(source) === 'retryLoad');
const effectCode = ts.transpileModule(`globalThis.load = ${effect.expression.arguments[0].getText(source)}; globalThis.retry = ${retry.initializer.getText(source)};`, options).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness(get) {
    const state = { photos: null, error: null, retry: 0, calls: 0 };
    const context = vm.createContext({
        collection: { id: 'c' }, classifyCollectionError,
        getCollectionPhotos: (...args) => { state.calls++; assert.equal(args[0], context.collection.id); return get(); },
        setPhotos: value => { state.photos = value; }, setLoadError: value => { state.error = value; },
        setRetryCount: fn => { state.retry = fn(state.retry); },
    });
    vm.runInContext(effectCode, context);
    return { context, state };
}
test('error remains distinct from empty results; only explicit retry reloads and success clears error', async () => {
    let succeeds = false;
    const { context, state } = harness(async () => {
        if (!succeeds) throw httpError(403);
        return [{ id: 'photo' }];
    });
    let cleanup = context.load(); await settle();
    assert.equal(state.error, 'access');
    assert.equal(state.photos.length, 0);
    await settle(); assert.equal(state.calls, 1);
    succeeds = true;
    context.retry();
    assert.equal(state.error, null); assert.equal(state.photos, null); assert.equal(state.retry, 1);
    cleanup(); cleanup = context.load(); await settle();
    assert.equal(state.error, null); assert.equal(state.photos[0].id, 'photo'); assert.equal(state.calls, 2);
    cleanup();
});
test('successful empty API response is empty, not a guessed quota or premium restriction', async () => {
    const { context, state } = harness(async () => []);
    const cleanup = context.load(); await settle();
    assert.equal(state.error, null); assert.equal(state.photos.length, 0); cleanup();
});
test('late failure from previous collection cannot replace the new collection', async () => {
    let reject, calls = 0;
    const { context, state } = harness(() => {
        calls++;
        return calls === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve([{ id: 'new' }]);
    });
    const cleanup = context.load(); cleanup(); context.collection = { id: 'other' };
    const cleanupNew = context.load(); await settle(); reject(httpError(429)); await settle();
    assert.equal(state.error, null); assert.equal(state.photos[0].id, 'new'); cleanupNew();
});
test('unmounted grid ignores late successful response', async () => {
    let resolve;
    const { context, state } = harness(() => new Promise(done => { resolve = done; }));
    const cleanup = context.load(); cleanup(); resolve([{ id: 'late' }]); await settle();
    assert.equal(state.photos, null); assert.equal(state.error, null);
});
test('all error messages and empty/hidden/retry labels exist in both languages', () => {
    for (const lang of ['uk', 'en']) {
        const labels = JSON.parse(fs.readFileSync(path.join(root, `i18n/locales/${lang}.json`), 'utf8')).collections;
        for (const kind of new Set(cases.map(c => c[2]))) assert.ok(labels.errors[kind]);
        for (const key of ['emptyPhotos', 'allHidden', 'retry']) assert.ok(labels[key]);
    }
});
