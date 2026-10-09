/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../services/morningMix.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const photo = id => ({ id, urls: { small: id, regular: id }, user: { name: id, username: id } });
function setup({ storage, native } = {}) {
    const exports = {}, calls = [];
    const bridge = native ?? {
        configureMorningMix: async (...args) => calls.push(args),
        getMorningMix: async () => null,
        saveMorningMix: async (...args) => calls.push(args),
    };
    vm.runInNewContext(code, { exports, require: name => {
        if (name.includes('async-storage')) return { default: { getItem: storage ?? (async () => null) } };
        if (name === 'react-native') return { NativeModules: { WallpaperModule: bridge } };
        if (name === 'axios') return { CanceledError: class extends Error { code = 'ERR_CANCELED'; } };
        if (name === './unsplashKey') return { getUnsplashKey: async () => 'test-key' };
        return { CATEGORIES: [{ id: 'mix', query: '' }, { id: 'space', query: 'stars' }, { id: 'forest', query: 'trees' }],
            PEOPLE_TAGS: ['person', 'portrait'], CATEGORY_QUERIES: { space: ['galaxy', 'stars'], forest: ['pine'] }, subCountForMix: () => 10,
            filterNoPeople: p => p, dedupAndCapByAuthor: p => p };
    } });
    return { api: exports, bridge, calls };
}
test('recipe preserves category subqueries, caps per-category count, normalizes order', () => {
    const { api } = setup();
    assert.equal(api.morningRecipe(['forest', 'space', 'space']).id, api.morningRecipe(['space', 'forest']).id);
    assert.equal(api.morningRecipe(['space']).groups[0].take, 3);
    assert.equal(api.morningRecipe(['space']).groups[0].queries.join(','), 'galaxy,stars');
});
test('late settings read cannot overwrite newer configuration', async () => {
    let resolve, count = 0;
    const pending = new Promise(r => { resolve = r; });
    const { api, calls } = setup({ storage: () => ++count === 1 ? pending : Promise.resolve('{"mixCategories":["forest"]}') });
    const old = api.syncMorningMix(); await api.syncMorningMix();
    resolve('{"mixCategories":["space"]}'); await old;
    assert.equal(calls.length, 1);
    assert.equal(JSON.parse(calls[0][0]).id, api.morningRecipe(['forest']).id);
});
test('persisted native snapshot survives age and keeps order without network requests', async () => {
    const { api, bridge } = setup();
    const id = api.morningRecipe(['space']).id;
    bridge.getMorningMix = async () => JSON.stringify({ id, savedAt: 1, photos: [photo('b'), photo('a')] });
    const result = await api.readMorningMix(['space']);
    assert.equal(result.photos.map(p => p.id).join(','), 'b,a');
});
test('wrong recipe and malformed photos are not shown as current mix', async () => {
    const { api, bridge } = setup();
    bridge.getMorningMix = async () => JSON.stringify({ id: 'old', photos: [photo('a')] });
    assert.equal(await api.readMorningMix(['space']), null);
    bridge.getMorningMix = async () => JSON.stringify({ id: api.morningRecipe(['space']).id, photos: [{}] });
    assert.equal(await api.readMorningMix(['space']), null);
});
test('aborted/empty manual refresh does not publish; valid refresh carries recipe', async () => {
    const { api, calls } = setup(), abort = new AbortController(); abort.abort();
    await assert.rejects(api.saveMorningMix(['space'], { photos: [photo('a')] }, abort.signal), e => e.code === 'ERR_CANCELED');
    await api.saveMorningMix(['space'], { photos: [] }, new AbortController().signal);
    assert.equal(calls.length, 0);
    await api.saveMorningMix(['space'], { photos: [photo('a')] }, new AbortController().signal);
    assert.equal(calls[0][0], api.morningRecipe(['space']).id);
});
test('older native bridge gracefully keeps foreground-only behavior', async () => {
    const { api } = setup({ native: {} });
    await api.syncMorningMix();
    assert.equal(await api.readMorningMix(['space']), null);
    await api.saveMorningMix(['space'], { photos: [photo('a')] }, new AbortController().signal);
});


test('native rotation follows only enabled sole Mix source; filter vocabulary is shared', async () => {
    for (const [autoChange, activeCategories, expected] of [
        [true, ['mix'], true], [false, ['mix'], false], [true, ['space'], false],
        [true, ['mix', 'space'], false], [true, [], false],
    ]) {
        const { api, calls } = setup({ storage: async () => JSON.stringify({ autoChange, activeCategories, mixCategories: ['space'] }) });
        await api.syncMorningMix();
        const recipe = JSON.parse(calls[0][0]);
        assert.equal(recipe.rotationMix, expected);
        assert.deepEqual(recipe.peopleKeywords, ['person', 'portrait']);
    }
});
