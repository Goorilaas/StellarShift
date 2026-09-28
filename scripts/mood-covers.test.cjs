// Run: node scripts/mood-covers.test.cjs — real cover-cache migration, mocked storage/API.
/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'services/moodCovers.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const key = 'mood_covers', migration = 'mood_covers_earth_move_4015';
function setup(storage, failKey) {
    let requests = 0;
    const exports = {};
    const mocks = {
        '@react-native-async-storage/async-storage': { default: {
            getItem: async name => storage.get(name) ?? null,
            setItem: async (name, value) => { if (name === failKey) throw Error('write failed'); storage.set(name, value); },
        } },
        './collectionService': { getCollectionMeta: async () => { requests++; return { cover: 'space' }; } },
    };
    vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
    return { api: exports, requests: () => requests };
}
const snapshot = () => new Map([[key, JSON.stringify({ milkyway: ['earth', 'stars'], horizons: ['travel'], forest: ['trees'] })], ['collection_bookmarks', '["earth-id"]']]);
test('upgrade clears only cosmic covers, without API calls or modifying unrelated storage', async () => {
    const storage = snapshot(), { api, requests } = setup(storage);
    const map = await api.loadCoversMap();
    assert.equal(map.milkyway, undefined);
    assert.equal(map.horizons[0], 'travel'); assert.equal(map.forest[0], 'trees');
    assert.equal(storage.get('collection_bookmarks'), '["earth-id"]');
    assert.equal(storage.get(migration), 'done'); assert.equal(requests(), 0);
    assert.equal(JSON.parse(storage.get(key)).milkyway, undefined);
});
test('fresh cosmic covers survive restart after successful migration', async () => {
    const storage = snapshot(), first = setup(storage);
    await first.api.loadCoversMap(); await first.api.mergeMoodCovers('milkyway', ['space']);
    const restarted = setup(storage);
    assert.equal((await restarted.api.loadCoversMap()).milkyway[0], 'space');
    assert.equal(restarted.requests(), 0);
});
test('failed cache write does not mark migration complete; retry works after restart', async () => {
    const storage = snapshot(), failed = setup(storage, key);
    assert.equal((await failed.api.loadCoversMap()).milkyway, undefined);
    assert.equal(storage.get(migration), undefined);
    await setup(storage).api.loadCoversMap();
    assert.equal(JSON.parse(storage.get(key)).milkyway, undefined);
    assert.equal(storage.get(migration), 'done');
});
test('failed marker write can be retried without losing other moods', async () => {
    const storage = snapshot(); await setup(storage, migration).api.loadCoversMap();
    const map = await setup(storage).api.loadCoversMap();
    assert.equal(map.horizons[0], 'travel'); assert.equal(map.forest[0], 'trees');
    assert.equal(storage.get(migration), 'done');
});
test('first cosmic cover can repopulate migrated cache through existing metadata loader', async () => {
    const storage = snapshot(), { api, requests } = setup(storage);
    await api.loadCoversMap();
    assert.equal(await api.fetchFirstCover({ id: 'milkyway', collectionIds: ['4332580'] }), 'space');
    assert.equal((await api.loadCoversMap()).milkyway[0], 'space');
    assert.equal(requests(), 1);
});
