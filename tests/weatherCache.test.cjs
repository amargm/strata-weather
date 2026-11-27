const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const values = new Map();
let failReads = false;
let failWrites = false;
const storage = {
  async getItem(key) {
    if (failReads) throw new Error('storage read failed');
    return values.has(key) ? values.get(key) : null;
  },
  async setItem(key, value) {
    if (failWrites) throw new Error('storage write failed');
    values.set(key, value);
  },
};

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
  return originalLoad.call(this, request, parent, isMain);
};

const { getCachedWeather, isCacheStale, setCachedWeather } = require('../.test-build/services/weatherCache.js');
const KEY = 'weather_data_cache_v2';
const coords = { latitude: 12.9716, longitude: 77.5946 };
const otherCoords = { latitude: 19.076, longitude: 72.8777 };
const sample = {
  location: { lat: coords.latitude, lon: coords.longitude },
  current: { temperature: 24 },
};

test.beforeEach(() => {
  values.clear();
  failReads = false;
  failWrites = false;
});

test('cache round-trips weather for the same rounded coordinates', async () => {
  await setCachedWeather(sample);
  assert.deepEqual(await getCachedWeather({ latitude: 12.97161, longitude: 77.59461 }), sample);
  assert.equal(await isCacheStale(coords), false);
});

test('cache never returns weather saved for a different location', async () => {
  await setCachedWeather(sample);
  assert.equal(await getCachedWeather(otherCoords), null);
  assert.equal(await isCacheStale(otherCoords), true);
});

test('cache becomes stale after the 30-minute TTL', async () => {
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  try {
    await setCachedWeather(sample);
    now += 30 * 60 * 1000 + 1;
    assert.equal(await isCacheStale(coords), true);
  } finally {
    Date.now = originalNow;
  }
});

test('malformed or incomplete cache entries are treated as stale and unavailable', async () => {
  values.set(KEY, '{not-json');
  assert.equal(await getCachedWeather(coords), null);
  assert.equal(await isCacheStale(coords), true);

  values.set(KEY, JSON.stringify({ data: sample, locationKey: '12.972,77.595' }));
  assert.equal(await getCachedWeather(coords), null);
  assert.equal(await isCacheStale(coords), true);
});

test('storage failures do not break weather loading', async () => {
  failReads = true;
  assert.equal(await getCachedWeather(coords), null);
  assert.equal(await isCacheStale(coords), true);

  failReads = false;
  failWrites = true;
  await assert.doesNotReject(setCachedWeather(sample));
});
