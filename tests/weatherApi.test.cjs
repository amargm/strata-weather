const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapCurrentWeather,
  mapHourlyItem,
  aggregateDaily,
  computePressureTrend,
} = require('../.test-build/services/weatherApi.js');

function current(overrides = {}) {
  return {
    main: { temp: 22, feels_like: 23, humidity: 55, pressure: 1012 },
    wind: { speed: 2, deg: 350, gust: 4 },
    clouds: { all: 35 },
    weather: [{ id: 800, description: 'clear sky', icon: '01d' }],
    visibility: 10000,
    ...overrides,
  };
}

function forecast(overrides = {}) {
  return {
    dt: 1795737600,
    dt_txt: '2026-11-27 00:00:00',
    main: { temp: 22, feels_like: 23, humidity: 55, pressure: 1012 },
    wind: { speed: 2, deg: 90, gust: 4 },
    clouds: { all: 35 },
    weather: [{ id: 500, description: 'light rain', icon: '10d' }],
    visibility: 10000,
    pop: 0.6,
    ...overrides,
  };
}

test('current mapper rejects invalid optional measurements without losing valid core data', () => {
  const result = mapCurrentWeather(current({
    wind: { speed: -1, deg: 361, gust: '4' },
    visibility: -20,
  }));

  assert.equal(result.temperature, 22);
  assert.equal(result.windSpeed, null);
  assert.equal(result.windDirection, null);
  assert.equal(result.windGust, null);
  assert.equal(result.visibility, null);
  assert.equal(result.uvIndex, null);
  assert.equal(result.dewPoint, null);
  assert.equal(result.precipitationProbability, null);
});

test('current mapper rejects missing required measurements', () => {
  assert.throws(
    () => mapCurrentWeather(current({ main: { temp: undefined, feels_like: 23, humidity: 55, pressure: 1012 } })),
    /valid temperature/
  );
});

test('3-hour forecast mapper bounds optional visibility and precipitation probability', () => {
  const result = mapHourlyItem(forecast({ visibility: -1, pop: 1.5 }));
  assert.equal(result.values.visibility, null);
  assert.equal(result.values.precipitationProbability, null);

  const valid = mapHourlyItem(forecast({ pop: 0.75 }));
  assert.equal(valid.values.precipitationProbability, 75);
  assert.equal(valid.values.visibility, 10);
});

test('daily aggregation uses the most frequent condition and circular wind direction', () => {
  const items = [
    forecast({ weather: [{ id: 800 }], wind: { speed: 1, deg: 359 } }),
    forecast({ weather: [{ id: 500 }], wind: { speed: 2, deg: 1 } }),
    forecast({ weather: [{ id: 800 }], wind: { speed: 3, deg: 180 } }),
  ];

  const [day] = aggregateDaily(items);
  assert.equal(day.values.weatherCode, 1000);
  assert.equal(day.values.windSpeed, 3);
  assert.ok(day.values.windDirection < 1 || day.values.windDirection > 359);
  assert.equal(day.values.precipitationProbability, 60);
});

test('pressure trend ignores missing readings and compares valid observations', () => {
  assert.equal(computePressureTrend([
    { main: { pressure: 1000 } },
    { main: {} },
    { main: { pressure: 1004 } },
  ]), 'rising');

  assert.equal(computePressureTrend([
    { main: { pressure: 1004 } },
    { main: {} },
    { main: { pressure: 1000 } },
  ]), 'falling');
});
