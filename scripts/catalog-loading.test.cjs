// Run: node scripts/catalog-loading.test.cjs — real screen handlers and cache, mocked API.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const source = ts.createSourceFile('index.tsx', fs.readFileSync(path.join(root, 'app/index.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const options = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } };
const cacheCode = ts.transpileModule(fs.readFileSync(path.join(root, 'services/catalogCache.ts'), 'utf8'), options).outputText;
function initializer(name) {
    let value;
    function visit(node) {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) value = node.initializer.getText(source);
        ts.forEachChild(node, visit);
    }
    visit(source); assert.ok(value, name); return value;
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const settle = () => new Promise(resolve => setImmediate(resolve));
const category = id => ({ id, query: id, label: id, icon: '' });
const photo = id => ({ id, urls: { small: id, regular: id, full: id }, user: { name: 'Author', username: id } });
const response = (ids, total = 8) => ({ data: { results: ids.map(photo), total_pages: total } });
function setup({ storage = new Map(), get, settings, key } = {}) {
    const calls = [], state = { photos: [], loading: false, more: false, toasts: [], rateDialogs: 0, history: [] };
    class CanceledError extends Error { code = 'ERR_CANCELED'; }
    const AsyncStorage = {
        getItem: async name => name === 'settings' && settings ? settings() : storage.get(name) ?? null,
        setItem: async (name, value) => storage.set(name, value),
    };
    const exports = {};
    vm.runInNewContext(cacheCode, { exports, require: name => name === 'axios' ? { CanceledError } : { default: AsyncStorage } });
    const ctx = vm.createContext({
        AsyncStorage, AbortController, CanceledError, Math: Object.assign(Object.create(Math), { random: () => 0.9 }),
        CATEGORIES: [category('mix'), ...Array.from({ length: 12 }, (_, i) => category(`cat${i}`))],
        CHAOS_QUERIES: Array.from({ length: 8 }, (_, i) => `chaos${i}`),
        shuffle: list => [...list], subCountForMix: () => 1, pickCategoryQueries: id => [`${id}-sub`],
        dedupAndCapByAuthor: list => list, filterNoPeople: list => list,
        abortRef: { current: null }, catalogRequestRef: { current: null }, catalogPageRef: { current: null },
        activeCategory: category('mix'), searchText: '',
        getUnsplashKey: key ?? (async () => 'test-key'),
        loadCatalogPage: exports.loadCatalogPage,
        axios: { CanceledError, get: async (url, config) => {
            calls.push(config);
            return get ? get(config) : response([`${config.params.query}:${config.params.page}`]);
        } },
        setLoading: value => { state.loading = value; }, setIsFetchingMore: value => { state.more = value; },
        setPhotos: value => { state.photos = typeof value === 'function' ? value(state.photos) : value; },
        setActiveCategory: value => { ctx.activeCategory = value; }, setSearchText: value => { ctx.searchText = value; },
        setSearchHistory: fn => { state.history = fn(state.history); },
        showToast: message => state.toasts.push(message), trigger403: () => state.rateDialogs++, t: key => key,
        mapFetchError: () => 'error',
    });
    for (const name of ['loadCatalog', 'handleCategory', 'handleSearch']) {
        vm.runInContext(ts.transpileModule(`globalThis.${name} = ${initializer(name)};`, options).outputText, ctx);
    }
    return { ctx, calls, state, storage };
}

test('Mix and Chaos cache across restart; refresh and active-chip shuffle fetch again', async () => {
    const storage = new Map();
    const first = setup({ storage });
    await first.ctx.loadCatalog(category('mix')); assert.equal(first.calls.length, 12);
    const restarted = setup({ storage });
    await restarted.ctx.loadCatalog(category('mix')); assert.equal(restarted.calls.length, 0);
    await restarted.ctx.loadCatalog(category('mix'), { refresh: true }); assert.equal(restarted.calls.length, 12);
    await restarted.ctx.loadCatalog(category('chaos')); assert.equal(restarted.calls.length, 18);
    await restarted.ctx.loadCatalog(category('mix')); await restarted.ctx.loadCatalog(category('chaos'));
    assert.equal(restarted.calls.length, 18);
    restarted.ctx.activeCategory = category('chaos');
    restarted.ctx.handleCategory(category('chaos')); await settle();
    assert.equal(restarted.calls.length, 24);
});
test('Mix settings form the cache key, with category order ignored', async () => {
    let chosen = ['cat1', 'cat2'];
    const { ctx, calls } = setup({ settings: async () => JSON.stringify({ mixCategories: chosen }) });
    await ctx.loadCatalog(category('mix')); assert.equal(calls.length, 2);
    chosen = ['cat2', 'cat1']; await ctx.loadCatalog(category('mix')); assert.equal(calls.length, 2);
    chosen = ['cat3']; await ctx.loadCatalog(category('mix')); assert.equal(calls.length, 3);
    assert.equal(calls[2].params.query, 'cat3-sub');
});
test('restored category keeps its actual subquery and page; search pagination uses the search term', async () => {
    const storage = new Map();
    await setup({ storage }).ctx.loadCatalog(category('space'));
    const { ctx, calls } = setup({ storage });
    ctx.Math.random = () => 0.1;
    ctx.pickCategoryQueries = () => ['different-subquery'];
    await ctx.loadCatalog(category('space')); assert.equal(calls.length, 0);
    await ctx.loadCatalog(category('space'), { nextPage: true });
    assert.equal(calls[0].params.query, 'space-sub'); assert.equal(calls[0].params.page, 4);
    ctx.handleSearch('  red sky  ');
    await ctx.loadCatalog(ctx.activeCategory); // effect після вибору пошуку
    await ctx.loadCatalog(ctx.activeCategory, { nextPage: true });
    assert.equal(calls[1].params.query, 'red sky'); assert.equal(calls[2].params.query, 'red sky');
    const count = calls.length;
    await ctx.loadCatalog(ctx.activeCategory); assert.equal(calls.length, count);
});
test('duplicate first-page and load-more events share one active request; pages deduplicate IDs', async () => {
    const first = deferred(), next = deferred();
    const { ctx, calls, state } = setup({ get: config => config.params.page === 3 ? first.promise : next.promise });
    const initial = ctx.loadCatalog(category('space'));
    await ctx.loadCatalog(category('space')); await settle(); assert.equal(calls.length, 1);
    first.resolve(response(['a', 'b'])); await initial;
    const more = ctx.loadCatalog(category('space'), { nextPage: true });
    await ctx.loadCatalog(category('space'), { nextPage: true }); await settle(); assert.equal(calls.length, 2);
    next.resolve(response(['b', 'c'], 4)); await more;
    assert.deepEqual(Array.from(state.photos, p => p.id), ['a', 'b', 'c']);
    await ctx.loadCatalog(category('space'), { nextPage: true }); assert.equal(calls.length, 2);
    assert.equal(state.more, false);
});
test('empty API page ends pagination without repeated requests', async () => {
    const { ctx, calls } = setup({ get: async () => response([], 20) });
    await ctx.loadCatalog(category('space'));
    await ctx.loadCatalog(category('space'), { nextPage: true }); assert.equal(calls.length, 1);
});
test('category filtering survives cache reload, with the existing fallback for sparse results', async () => {
    const storage = new Map();
    const scene = { ...category('scene'), excludePeople: true };
    const ids = ['person', ...Array.from({ length: 6 }, (_, i) => `landscape${i}`)];
    const first = setup({ storage, get: async () => response(ids) });
    first.ctx.filterNoPeople = photos => photos.filter(p => p.id !== 'person');
    await first.ctx.loadCatalog(scene);
    assert.equal(first.calls[0].params.per_page, 30);
    assert.equal(first.state.photos.length, 6);
    const restarted = setup({ storage });
    await restarted.ctx.loadCatalog(scene);
    assert.equal(restarted.calls.length, 0);
    assert.deepEqual(Array.from(restarted.state.photos, p => p.id), ids.slice(1));
    const sparse = setup({ get: async () => response(['person', 'landscape']) });
    sparse.ctx.filterNoPeople = photos => photos.filter(p => p.id !== 'person');
    await sparse.ctx.loadCatalog(scene);
    assert.equal(sparse.state.photos.length, 2);
});
for (const outcome of ['response', '403']) test(`late old ${outcome} cannot change a newer screen or loading state`, async () => {
    const old = deferred(), current = deferred();
    const { ctx, calls, state } = setup({ get: config => config.params.query === 'old-sub' ? old.promise : current.promise });
    const before = ctx.loadCatalog(category('old')); await settle();
    ctx.handleCategory(category('new'));
    assert.equal(calls[0].signal.aborted, true);
    const after = ctx.loadCatalog(category('new')); await settle();
    if (outcome === 'response') old.resolve(response(['old'])); else old.reject({ response: { status: 403 } });
    await before;
    assert.equal(state.photos.length, 0); assert.equal(state.loading, true); assert.equal(state.rateDialogs, 0);
    current.resolve(response(['new'])); await after;
    assert.equal(state.photos[0].id, 'new'); assert.equal(state.loading, false);
});
test('category switch before its effect also invalidates the previous response', async () => {
    const gate = deferred();
    const { ctx, state } = setup({ get: () => gate.promise });
    const work = ctx.loadCatalog(category('old')); await settle();
    ctx.handleCategory(category('new'));
    gate.resolve(response(['old'])); await work;
    assert.equal(state.photos.length, 0); assert.equal(state.loading, true);
});
test('cancelled Mix settings read and delayed key do not start old API requests', async () => {
    const settings = deferred();
    const a = setup({ settings: () => settings.promise });
    const old = a.ctx.loadCatalog(category('mix'));
    await a.ctx.loadCatalog(category('space'));
    settings.resolve('{}'); await old; assert.equal(a.calls.length, 1);
    const key = deferred(); let reads = 0;
    const b = setup({ key: async () => ++reads === 1 ? key.promise : 'test' });
    const pending = b.ctx.loadCatalog(category('chaos')); await settle();
    await b.ctx.loadCatalog(category('space')); key.resolve('old-key'); await pending;
    assert.equal(b.calls.length, 1); assert.equal(b.calls[0].params.query, 'space-sub');
});
test('failed manual refresh keeps visible photos; 403 clears loading so retry works', async () => {
    let fail = false;
    const { ctx, state, calls } = setup({ get: async () => {
        if (fail) throw { response: { status: 403 } };
        return response(['a']);
    } });
    await ctx.loadCatalog(category('space')); fail = true;
    await ctx.loadCatalog(category('space'), { refresh: true });
    assert.equal(state.photos[0].id, 'a'); assert.equal(state.loading, false); assert.equal(state.more, false);
    assert.equal(state.rateDialogs, 1);
    fail = false; await ctx.loadCatalog(category('space'), { refresh: true }); assert.equal(calls.length, 3);
});
test('unmount abort ignores a late result and does not update screen state', async () => {
    const gate = deferred();
    const { ctx, state } = setup({ get: () => gate.promise });
    const work = ctx.loadCatalog(category('space')); await settle();
    ctx.abortRef.current.abort(); gate.resolve(response(['a'])); await work;
    assert.equal(state.photos.length, 0); assert.equal(state.loading, true); assert.equal(state.toasts.length, 0);
});
