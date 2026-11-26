import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionFromCode, intensityFromCode, skyPhase, buildState, localClock } from '../docs/js/weather.js';

const sample = (code, cloud = 50) => ({
  current: { time: '2026-11-26T12:00', temperature_2m: 7.4, weather_code: code, cloud_cover: cloud, wind_speed_10m: 12 },
  daily: { sunrise: ['2026-11-26T08:01'], sunset: ['2026-11-26T17:37'] },
});

test('maps WMO codes to conditions', () => {
  const cases = { 0: 'clear', 1: 'partly', 2: 'partly', 3: 'cloudy', 45: 'fog', 48: 'fog', 53: 'drizzle',
    61: 'rain', 67: 'rain', 81: 'rain', 71: 'snow', 77: 'snow', 86: 'snow', 95: 'storm', 99: 'storm' };
  for (const [code, want] of Object.entries(cases)) assert.equal(conditionFromCode(Number(code)), want, `code ${code}`);
});

test('unknown codes fall back to partly cloudy', () => {
  assert.equal(conditionFromCode(42), 'partly');
});

test('precipitation intensity follows the code', () => {
  assert.ok(intensityFromCode(61) < intensityFromCode(63));
  assert.ok(intensityFromCode(63) < intensityFromCode(65));
});

test('sky phase around sunrise and sunset', () => {
  const sr = 8 * 60;
  const ss = 17 * 60 + 30;
  assert.equal(skyPhase(3 * 60, sr, ss).phase, 'night');
  assert.equal(skyPhase(sr + 10, sr, ss).phase, 'dawn');
  assert.equal(skyPhase(12 * 60, sr, ss).phase, 'day');
  assert.equal(skyPhase(ss - 5, sr, ss).phase, 'dusk');
  assert.equal(skyPhase(23 * 60, sr, ss).phase, 'night');
  const noon = skyPhase((sr + ss) / 2, sr, ss);
  assert.ok(Math.abs(noon.arc - 0.5) < 1e-9);
});

test('local clock uses Istanbul time regardless of host time zone', () => {
  assert.equal(localClock(new Date('2026-11-26T09:30:00Z')).text, '12:30');
});

test('buildState gives a renderable state and honours overrides', () => {
  const date = new Date('2026-11-26T09:30:00Z');
  const live = buildState(sample(63, 100), date);
  assert.equal(live.condition, 'rain');
  assert.equal(live.phase, 'day');
  assert.ok(live.precip > 0 && live.cloud >= 0.85);
  const forced = buildState(sample(0, 0), date, { condition: 'snow', phase: 'night' });
  assert.equal(forced.condition, 'snow');
  assert.equal(forced.phase, 'night');
  const bogus = buildState(sample(0, 0), date, { condition: '<script>', phase: 'noon' });
  assert.equal(bogus.condition, 'clear');
  assert.equal(bogus.phase, 'day');
});

test('buildState rejects malformed API responses', () => {
  assert.throws(() => buildState({}, new Date()), /Unexpected Open-Meteo/);
});
