// Run: node scripts/catalog-cache.test.cjs — no real API or device storage.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/catalogCache.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const photo = id => ({ id, urls: { small: `${id}-small`, regular: `${id}-regular`, full: `${id}-full` },
    user: { name: 'Author', username: 'author', profile_image: { small: 'avatar' }, links: { html: 'profile' } },
    links: { download_location: 'tracking-url' }, description: 'description' });
const page = id => ({ photos: [photo(id)], query: 'space', page: 3, hasMore: true });
const signal = () => new AbortController().signal;
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(storage = new Map(), overrides = {}, clock = { now: 1000000000 }) {
    const exports = {};
    class CanceledError extends Error { code = 'ERR_CANCELED'; }
    const api = { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), ...overrides };
    vm.runInNewContext(code, { exports, Date: class extends Date { static now() { return clock.now; } },
        require: name => name === 'axios' ? { CanceledError } : { default: api } });
    return { load: exports.loadCatalogPage, storage, clock };
}
const entries = storage => JSON.parse(storage.get('catalog_cache_v1') || '[]');

test('cache survives restart and preserves pagination, author and download tracking', async () => {
    const storage = new Map(); let calls = 0;
    const fetch = async () => { calls++; return page('a'); };
    await setup(storage).load('category', fetch, signal());
    const result = await setup(storage).load('category', fetch, signal());
    assert.equal(calls, 1);
    assert.equal(result.page, 3); assert.equal(result.query, 'space'); assert.equal(result.hasMore, true);
    assert.equal(result.photos[0].links.download_location, 'tracking-url');
    assert.equal(result.photos[0].user.profile_image.small, 'avatar');
});
test('24h expiry and a backwards clock invalidate entries; cache reads do not extend TTL', async () => {
    const { load, clock } = setup(); let calls = 0;
    const fetch = async () => { calls++; return page('a'); };
    await load('x', fetch, signal());
    clock.now += 23 * 3600000; await load('x', fetch, signal()); assert.equal(calls, 1);
    clock.now += 3600000; await load('x', fetch, signal()); assert.equal(calls, 2);
    clock.now -= 1; await load('x', fetch, signal()); assert.equal(calls, 3);
});
test('identical concurrent loads share the fetch', async () => {
    const { load } = setup(), gate = deferred(); let calls = 0;
    const fetch = async () => { calls++; return gate.promise; };
    const first = load('x', fetch, signal()), second = load('x', fetch, signal());
    await settle(); assert.equal(calls, 1);
    gate.resolve(page('a')); await Promise.all([first, second]);
});
test('manual refresh bypasses cache; failed refresh retains the last successful entry', async () => {
    const { load } = setup();
    await load('x', async () => page('a'), signal());
    assert.equal((await load('x', async () => page('b'), signal(), true)).photos[0].id, 'b');
    await assert.rejects(load('x', async () => { throw Error('offline'); }, signal(), true), /offline/);
    assert.equal((await load('x', async () => { throw Error('unexpected fetch'); }, signal())).photos[0].id, 'b');
});
test('late old response cannot replace a newer refresh in memory or on disk', async () => {
    const { load, storage } = setup(), old = deferred();
    const first = load('x', () => old.promise, signal()); await settle();
    await load('x', async () => page('new'), signal(), true);
    old.resolve(page('old')); await first;
    assert.equal((await setup(storage).load('x', async () => { throw Error('unexpected fetch'); }, signal())).photos[0].id, 'new');
});
test('cancel during disk read makes no request; cancelled late fetch cannot poison cache', async () => {
    const read = deferred(), abort = new AbortController(); let calls = 0;
    const first = setup(new Map(), { getItem: () => read.promise }).load('x', async () => { calls++; return page('a'); }, abort.signal);
    abort.abort(); read.resolve(null);
    await assert.rejects(first, e => e.code === 'ERR_CANCELED'); assert.equal(calls, 0);
    const { load, storage } = setup(), old = deferred(), cancelled = new AbortController();
    const work = load('x', () => old.promise, cancelled.signal); await settle(); cancelled.abort();
    await load('x', async () => page('new'), signal());
    old.resolve(page('old')); await assert.rejects(work, e => e.code === 'ERR_CANCELED');
    assert.equal(entries(storage)[0].value.photos[0].id, 'new');
});
test('malformed cache and failed storage do not break a successful fetch', async () => {
    for (const raw of ['broken JSON', '{}', '[null]', '[{"key":"x","savedAt":1000000000,"value":{"photos":[null],"query":"q","page":1,"hasMore":true}}]']) {
        const { load } = setup(new Map([['catalog_cache_v1', raw]]));
        assert.equal((await load('x', async () => page('a'), signal())).photos[0].id, 'a');
    }
    const { load } = setup(new Map(), { getItem: async () => { throw Error('read'); }, setItem: async () => { throw Error('write'); } });
    await load('x', async () => page('a'), signal());
    assert.equal((await load('x', async () => { throw Error('unexpected fetch'); }, signal())).photos[0].id, 'a');
});
test('cache evicts least recently used entries and stays within count and size limits', async () => {
    const { load, storage } = setup();
    for (let i = 0; i < 20; i++) await load(`${i}`, async () => page(`${i}`), signal());
    await load('0', async () => { throw Error('unexpected fetch'); }, signal());
    await load('20', async () => page('20'), signal());
    assert.equal(entries(storage).length, 20);
    assert.equal(entries(storage).some(e => e.key === '0'), true);
    assert.equal(entries(storage).some(e => e.key === '1'), false);
    for (const id of ['large1', 'large2', 'large3']) await load(id, async () => ({ ...page(id), photos: [{ ...photo(id), description: 'x'.repeat(250000) }] }), signal());
    assert.ok(storage.get('catalog_cache_v1').length <= 600000);
    const before = storage.get('catalog_cache_v1');
    const result = await load('huge', async () => ({ ...page('huge'), photos: [{ ...photo('huge'), description: 'x'.repeat(700000) }] }), signal());
    assert.equal(result.photos[0].id, 'huge');
    assert.equal(storage.get('catalog_cache_v1'), before);
});
test('writes finish in order when different requests resolve close together', async () => {
    const storage = new Map(), gate = deferred(); let writes = 0;
    const { load } = setup(storage, { setItem: async (key, value) => {
        if (++writes === 1) await gate.promise;
        storage.set(key, value);
    } });
    const a = load('a', async () => page('a'), signal()); await settle();
    const b = load('b', async () => page('b'), signal()); await settle();
    assert.equal(writes, 1); gate.resolve(); await Promise.all([a, b]);
    assert.deepEqual(entries(storage).map(e => e.key), ['a', 'b']);
});
