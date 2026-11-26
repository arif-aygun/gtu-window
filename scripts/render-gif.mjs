// Fetches Gebze's current weather and writes dist/window.gif (plus dist/weather.json).
// Usage: npm run gif            -> live weather
//        npm run gif -- snow night   -> forced look, for testing
import { mkdirSync, writeFileSync } from 'node:fs';
import gifenc from 'gifenc';
import { buildState, fetchWeather } from '../docs/js/weather.js';
import { renderScene, LOOP_MS, GIF_FRAMES } from '../docs/js/scene.js';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const SCALE = 3;
const OUT_DIR = 'dist';
const TRANSPARENT = 255;

async function fetchWithRetry(tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fetchWeather();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

function upscale(indexed, w, h, scale) {
  const out = new Uint8Array(w * h * scale * scale);
  const W = w * scale;
  for (let y = 0; y < h * scale; y++) {
    const row = Math.floor(y / scale) * w;
    for (let x = 0; x < W; x++) out[y * W + x] = indexed[row + Math.floor(x / scale)];
  }
  return out;
}

// One shared palette for every frame, so unchanged pixels can be marked transparent.
function buildPalette(frames) {
  const step = Math.max(1, Math.floor(frames.length / 12));
  const samples = frames.filter((_, i) => i % step === 0);
  const joined = new Uint8Array(samples.reduce((n, f) => n + f.data.length, 0));
  samples.reduce((off, f) => (joined.set(f.data, off), off + f.data.length), 0);
  const palette = quantize(joined, 255, { format: 'rgb565' });
  return [...palette, [0, 0, 0]];
}

export function encodeGif(frames, delayMs) {
  const { w, h } = frames[0];
  const palette = buildPalette(frames);
  const gif = GIFEncoder();
  let prev = null;
  for (const f of frames) {
    const idx = applyPalette(f.data, palette.slice(0, 255), 'rgb565');
    const shown = prev ? idx.map((v, i) => (v === prev[i] ? TRANSPARENT : v)) : idx;
    gif.writeFrame(upscale(shown, w, h, SCALE), w * SCALE, h * SCALE, {
      palette: prev ? undefined : palette,
      delay: delayMs,
      transparent: Boolean(prev),
      transparentIndex: TRANSPARENT,
      dispose: 1,
      repeat: 0,
    });
    prev = idx;
  }
  gif.finish();
  return gif.bytes();
}

async function main() {
  const [condition, phase] = process.argv.slice(2);
  const json = await fetchWithRetry();
  const state = buildState(json, new Date(), { condition, phase });
  const frames = Array.from({ length: GIF_FRAMES }, (_, i) => renderScene(state, i / GIF_FRAMES));
  const bytes = encodeGif(frames, Math.round(LOOP_MS / GIF_FRAMES));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/window.gif`, bytes);
  writeFileSync(`${OUT_DIR}/weather.json`, `${JSON.stringify({ ...state, generated: new Date().toISOString() }, null, 2)}\n`);
  process.stdout.write(`window.gif: ${state.label}, ${state.temp} °C, ${state.phase} (${(bytes.length / 1024).toFixed(0)} KB)\n`);
}

main().catch((err) => {
  process.stderr.write(`render-gif failed: ${err.message}\n`);
  process.exit(1);
});
