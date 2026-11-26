import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderScene, SCENE_W, SCENE_H } from '../docs/js/scene.js';
import { buildState, CONDITIONS } from '../docs/js/weather.js';

const json = {
  current: { time: '2026-11-26T12:00', temperature_2m: -2.6, weather_code: 0, cloud_cover: 0, wind_speed_10m: 40 },
  daily: { sunrise: ['2026-11-26T08:01'], sunset: ['2026-11-26T17:37'] },
};

test('every condition and phase renders a full opaque frame', () => {
  for (const phase of ['night', 'dawn', 'day', 'dusk']) {
    for (const condition of CONDITIONS) {
      const c = renderScene(buildState(json, new Date(), { condition, phase }), 0.31);
      assert.equal(c.data.length, SCENE_W * SCENE_H * 4);
      for (let i = 3; i < c.data.length; i += 4) assert.equal(c.data[i], 255);
    }
  }
});

test('rendering is deterministic and the loop is seamless', () => {
  const s = buildState(json, new Date('2026-11-26T09:30:00Z'), { condition: 'rain' });
  assert.deepEqual(renderScene(s, 0.2).data, renderScene(s, 0.2).data);
  assert.deepEqual(renderScene(s, 0).data, renderScene(s, 1).data);
});

test('the scene animates', () => {
  const s = buildState(json, new Date(), { condition: 'snow' });
  assert.notDeepEqual(renderScene(s, 0).data, renderScene(s, 0.5).data);
});
