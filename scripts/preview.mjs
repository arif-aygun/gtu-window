// Renders every condition x time of day to preview/*.png with fake weather, for eyeballing changes.
// Usage: npm run preview
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildState, CONDITIONS } from '../docs/js/weather.js';
import { renderScene } from '../docs/js/scene.js';
import { encodePng } from './png.mjs';

const SAMPLE = {
  current: { time: '2026-11-26T12:00', temperature_2m: 7.4, weather_code: 0, cloud_cover: 0, is_day: 1, wind_speed_10m: 12 },
  daily: { sunrise: ['2026-11-26T08:01'], sunset: ['2026-11-26T17:37'] },
};

mkdirSync('preview', { recursive: true });
const date = new Date();
for (const phase of ['day', 'night', 'dusk']) {
  for (const condition of CONDITIONS) {
    const state = buildState(SAMPLE, date, { condition, phase });
    const p = condition === 'storm' ? 0.31 : 0.2;
    writeFileSync(`preview/${phase}-${condition}.png`, encodePng(renderScene(state, p), 4));
  }
}
process.stdout.write('Wrote preview/*.png\n');
