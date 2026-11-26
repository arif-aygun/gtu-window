// Composes the full scene: room, window view, and lighting. Pure function of (state, loop position).

import { createCanvas, blit, getPx, setPx, clamp01, bayer } from './canvas.js';
import { renderView } from './view.js';
import { drawRoomBack, drawRoomFront, drawGlass, GLASS } from './room.js';

export const SCENE_W = 160;
export const SCENE_H = 112;
// Browser and GIF share one loop length so motion matches in both.
export const LOOP_MS = 14400;
export const GIF_FRAMES = 96;

const AMBIENT = { day: 1, dawn: 0.78, dusk: 0.72, night: 0.46 };

function inRect(x, y, r) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

const LIGHT_STEPS = 6;

// Light fades in dithered steps rather than a smooth ramp: reads as pixel art and survives GIF palettes.
function falloff(x, y, cx, cy, radius) {
  const d = Math.hypot(x - cx, y - cy) / radius;
  const v = d >= 1 ? 0 : (1 - d) ** 1.6;
  return Math.floor(v * LIGHT_STEPS + bayer(x, y)) / LIGHT_STEPS;
}

// Ambient dimming plus warm lamp light, cool laptop light and lightning flashes.
function light(c, s, room, flash, outdoor) {
  const ambient = AMBIENT[s.phase] * (s.phase === 'day' && s.cloud > 0.85 ? 0.88 : 1);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (outdoor[y * c.w + x] || room.emissive.some((r) => inRect(x, y, r))) continue;
      const [r, g, b] = getPx(c, x, y);
      const lamp = room.lampOn ? falloff(x, y, room.lamp.x, room.lamp.y + 18, 62) * 0.7 : 0;
      const screen = s.phase === 'day' ? 0 : falloff(x, y, room.laptop.glow.x, room.laptop.glow.y, 30) * 0.35;
      const win = falloff(x, y, GLASS.x + GLASS.w / 2, GLASS.y + GLASS.h, 70) * (s.phase === 'day' ? 0.12 : 0.05);
      const k = clamp01(ambient + win + flash * 0.3);
      setPx(c, x, y, [
        r * k + r * lamp * 1.0 + 255 * lamp * 0.12 + 40 * screen,
        g * k + g * lamp * 0.78 + 190 * lamp * 0.12 + 70 * screen,
        b * k + b * lamp * 0.45 + 110 * lamp * 0.06 + 120 * screen,
      ]);
    }
  }
}

// Glass pixels nothing was drawn over are the outdoor view, which carries its own light.
function outdoorMask(c, before) {
  const mask = new Uint8Array(c.w * c.h);
  for (let y = GLASS.y; y < GLASS.y + GLASS.h; y++) {
    for (let x = GLASS.x; x < GLASS.x + GLASS.w; x++) {
      const i = (y * c.w + x) * 4;
      mask[y * c.w + x] = before[i] === c.data[i] && before[i + 1] === c.data[i + 1] && before[i + 2] === c.data[i + 2] ? 1 : 0;
    }
  }
  return mask;
}

// Returns a 160x112 RGBA canvas for loop position p in [0, 1).
export function renderScene(state, p) {
  const c = createCanvas(SCENE_W, SCENE_H);
  drawRoomBack(c, state);
  const view = renderView(state, p);
  blit(c, view.canvas, GLASS.x, GLASS.y);
  const before = c.data.slice();
  const room = drawRoomFront(c, state, p);
  light(c, state, room, view.flash, outdoorMask(c, before));
  drawGlass(c, state, p);
  return c;
}
