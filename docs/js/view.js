// What you see through the glass: sky, sun or moon, clouds, the Gulf of İzmit, Gebze rooftops, weather.
// `p` is the loop position in [0, 1). Every motion is periodic in p, so the GIF loops seamlessly.

import { createCanvas, hex, mix, setPx, getPx, blendPx, fillRect, disc, line, bayer, rng, clamp01, wrap } from './canvas.js';
import { isLit } from './moon.js';

const SKY = {
  night: [hex('#0a0f26'), hex('#22305a')],
  dawn: [hex('#3b3f7a'), hex('#f4a76b')],
  day: [hex('#3e8fd6'), hex('#b4e1f7')],
  dusk: [hex('#2e2357'), hex('#ee7a5a')],
};
const OVERCAST = {
  night: [hex('#14171f'), hex('#262b36')],
  dawn: [hex('#5d5868'), hex('#9c8c94')],
  day: [hex('#7b8794'), hex('#b8c1cb')],
  dusk: [hex('#5a5065'), hex('#9a8590')],
};
const CLOUD = {
  night: [hex('#3c4566'), hex('#2d3453'), hex('#222843')],
  dawn: [hex('#f7c6a5'), hex('#d99a8c'), hex('#8e6b80')],
  day: [hex('#f6f9fc'), hex('#dbe3ec'), hex('#b3bfcc')],
  dusk: [hex('#f2b58f'), hex('#c98579'), hex('#6f5070')],
};
const DARK_CLOUD = {
  night: [hex('#2a2f3c'), hex('#20242f'), hex('#181b24')],
  dawn: [hex('#8a8290'), hex('#6e6775'), hex('#56505e')],
  day: [hex('#a3acb6'), hex('#8a939e'), hex('#717a86')],
  dusk: [hex('#857786'), hex('#6c606f'), hex('#544a58')],
};
const LAND = {
  night: { hills: hex('#1b2140'), sea: hex('#141a36'), seaHi: hex('#2a3566'), city: hex('#0d1024'), cityHi: hex('#171b33'), win: hex('#ffd27a') },
  dawn: { hills: hex('#6a5a8a'), sea: hex('#c0849a'), seaHi: hex('#f2c09a'), city: hex('#3a3050'), cityHi: hex('#4d4065'), win: hex('#ffcf7a') },
  day: { hills: hex('#7d9cc0'), sea: hex('#3f7fb3'), seaHi: hex('#8cc4ea'), city: hex('#c9c2b6'), cityHi: hex('#e6e0d4'), win: hex('#5f7f9c') },
  dusk: { hills: hex('#5e4a78'), sea: hex('#b0607a'), seaHi: hex('#f5a07a'), city: hex('#2f2440'), cityHi: hex('#40324f'), win: hex('#ffcf7a') },
};
const ROOF = hex('#b3553f');
const STORM = hex('#1c1f2a');
const FOG = { night: hex('#3a4050'), dawn: hex('#b7a7ad'), day: hex('#d5dbe0'), dusk: hex('#a8939b') };

export const VIEW_W = 76;
export const VIEW_H = 54;
const HORIZON = 34;
const SEA_BOTTOM = 44;

function overcastAmount(s) {
  return s.condition === 'partly' || s.condition === 'clear' ? 0 : clamp01((s.cloud - 0.6) / 0.35) * 0.9;
}

function drawSky(c, s) {
  const oc = overcastAmount(s);
  const gloom = gloomOf(s);
  const top = mix(mix(SKY[s.phase][0], OVERCAST[s.phase][0], oc), STORM, gloom);
  const bot = mix(mix(SKY[s.phase][1], OVERCAST[s.phase][1], oc), STORM, gloom * 0.8);
  const bands = 6;
  for (let y = 0; y < HORIZON + 2; y++) {
    for (let x = 0; x < c.w; x++) {
      const t = Math.min(1, Math.floor((y / (HORIZON + 1)) * bands + bayer(x, y)) / bands);
      setPx(c, x, y, mix(top, bot, t));
    }
  }
}

function drawStars(c, s, p) {
  if (s.phase !== 'night' || s.cloud > 0.7) return;
  const r = rng(7);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * c.w);
    const y = Math.floor(r() * (HORIZON - 4));
    const tw = Math.sin(2 * Math.PI * (p * 3 + r()));
    const a = (0.45 + 0.4 * tw) * (1 - s.cloud);
    blendPx(c, x, y, [255, 250, 230], clamp01(a));
  }
}

function drawSun(c, s) {
  if (s.phase === 'night' || s.cloud >= 0.85) return;
  const x = Math.round(6 + s.arc * (c.w - 12));
  const y = Math.round(HORIZON - 2 - Math.sin(Math.PI * s.arc) * 24);
  const warm = s.phase === 'day' ? hex('#fff3b0') : hex('#ffb070');
  disc(c, x, y, 6, mix(getPx(c, x, Math.max(0, y - 7)), warm, 0.25));
  disc(c, x, y, 4, warm);
}

function drawMoon(c, s) {
  if (s.phase !== 'night' || s.cloud >= 0.85) return;
  const cx = Math.round(8 + s.arc * (c.w - 16));
  const cy = Math.round(HORIZON - 4 - Math.sin(Math.PI * s.arc) * 20);
  const R = 5;
  const lit = hex('#f2efd8');
  const crater = hex('#d6d0b4');
  const dark = mix(getPx(c, cx, cy), hex('#4a5275'), 0.55);
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      if (x * x + y * y > R * R + 2) continue;
      const on = isLit(x / (R + 0.5), y / (R + 0.5), s.moon);
      const isCrater = (x === -1 && y === -2) || (x === 2 && y === 1) || (x === -2 && y === 2);
      setPx(c, cx + x, cy + y, on ? (isCrater ? crater : lit) : dark);
    }
  }
}

// A cloud is a few overlapping blobs with a lit top and a shaded belly.
function cloudShape(r) {
  const w = 12 + Math.floor(r() * 14);
  const h = 5 + Math.floor(r() * 3);
  const n = 3 + Math.floor(r() * 2);
  const blobs = Array.from({ length: n }, (_, i) => ({
    x: (w * (i + 0.5)) / n,
    y: h - 2 - r() * (h - 3),
    rad: 2.2 + r() * 2.6,
  }));
  return { w, h, blobs };
}

function cloudTone(shape, x, y) {
  let best = -1;
  for (const b of shape.blobs) {
    const d = ((x - b.x) ** 2 + (y - b.y) ** 2) / (b.rad * b.rad);
    if (d <= 1 && y <= shape.h - 1) best = Math.max(best, 1 - d + (b.y - y) / 6);
  }
  if (best < 0) return -1;
  if (y >= shape.h - 2) return 2;
  return best > 0.55 ? 0 : best > 0.2 ? 1 : 2;
}

function drawClouds(c, s, p) {
  const count = Math.round(s.cloud * 9);
  if (count === 0) return;
  const dark = s.precip > 0 || s.condition === 'cloudy';
  const tones = (dark ? DARK_CLOUD : CLOUD)[s.phase];
  const pad = 30;
  const period = c.w + pad;
  const laps = s.wind > 25 ? 2 : 1;
  const r = rng(42);
  for (let i = 0; i < count; i++) {
    const shape = cloudShape(r);
    const x0 = r() * period;
    const y0 = 1 + Math.floor(r() * (HORIZON - 14));
    const ox = Math.floor(wrap(x0 + p * period * laps, period)) - pad;
    for (let y = 0; y < shape.h; y++) {
      for (let x = 0; x < shape.w; x++) {
        const t = cloudTone(shape, x, y);
        if (t >= 0) setPx(c, ox + x, y0 + y, tones[t]);
      }
    }
  }
}

function drawLand(c, s, p) {
  const L = LAND[s.phase];
  // Far shore across the gulf.
  for (let x = 0; x < c.w; x++) {
    const h = Math.round(3 + 2.5 * Math.sin(x * 0.09 + 1) + 1.5 * Math.sin(x * 0.23));
    for (let y = HORIZON - h; y <= HORIZON; y++) setPx(c, x, y, L.hills);
  }
  // The sea, with glints that slide along the loop.
  for (let y = HORIZON + 1; y <= SEA_BOTTOM; y++) {
    for (let x = 0; x < c.w; x++) {
      const glint = wrap(x * 7 + y * 13 + Math.floor(p * 23) * 5, 23) === 0;
      setPx(c, x, y, glint ? L.seaHi : L.sea);
    }
  }
  drawCity(c, s, L);
}

function drawCity(c, s, L) {
  const r = rng(1984);
  const lights = s.phase !== 'day';
  let x = -2;
  while (x < c.w) {
    const w = 6 + Math.floor(r() * 7);
    const h = 7 + Math.floor(r() * 10);
    const top = c.h - h;
    fillRect(c, x, top, w, h, L.city);
    for (let yy = top; yy < c.h; yy++) setPx(c, x, yy, L.cityHi);
    if (r() < 0.45) fillRect(c, x - 1, top - 1, w + 2, 1, s.phase === 'day' ? ROOF : L.cityHi);
    for (let wy = top + 2; wy < c.h - 1; wy += 3) {
      for (let wx = x + 2; wx < x + w - 1; wx += 2) {
        const on = r() < (lights ? 0.38 : 0.9);
        if (on) setPx(c, wx, wy, L.win);
      }
    }
    x += w + 1;
  }
  drawMosque(c, 50, L);
}

// A small mosque silhouette: dome, half domes and a pencil minaret.
function drawMosque(c, x, L) {
  const base = c.h - 9;
  fillRect(c, x, base, 14, 9, L.city);
  disc(c, x + 7, base, 4, L.city);
  fillRect(c, x + 6, base - 6, 2, 2, L.city);
  disc(c, x + 2, base + 1, 2, L.city);
  disc(c, x + 12, base + 1, 2, L.city);
  fillRect(c, x + 16, base - 12, 2, 21, L.city);
  fillRect(c, x + 15, base - 6, 4, 1, L.cityHi);
  setPx(c, x + 16, base - 13, L.city);
  setPx(c, x + 17, base - 14, L.city);
}

function gloomOf(s) {
  return s.condition === 'storm' ? 0.45 : s.precip > 0.6 ? 0.15 : 0;
}

// Overcast light is flat and grey: pull the land toward the sky's grey.
function muteLand(c, s) {
  const amount = overcastAmount(s) * 0.4 + gloomOf(s) * 0.6;
  if (amount === 0) return;
  const target = mix(OVERCAST[s.phase][1], STORM, gloomOf(s));
  for (let y = HORIZON - 7; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) blendPx(c, x, y, target, amount);
  }
}

function drawFog(c, s, p) {
  if (s.condition !== 'fog') return;
  const col = FOG[s.phase];
  for (let y = 0; y < c.h; y++) {
    const band = 0.08 * Math.sin(2 * Math.PI * (p + y / 14));
    for (let x = 0; x < c.w; x++) blendPx(c, x, y, col, clamp01(0.42 + 0.3 * (y / c.h) + band));
  }
}

function drawRain(c, s, p) {
  const drizzle = s.condition === 'drizzle';
  const count = Math.round((drizzle ? 20 : 34) + s.precip * (drizzle ? 15 : 60));
  const len = drizzle ? 2 : 4;
  const col = s.phase === 'day' ? [225, 235, 248] : [150, 170, 210];
  const laps = drizzle ? 10 : 18;
  const slant = Math.min(0.6, s.wind / 60);
  const r = rng(99);
  for (let i = 0; i < count; i++) {
    const x0 = r() * c.w;
    const y = wrap(r() * c.h + p * c.h * laps, c.h);
    const x = wrap(x0 + slant * y, c.w);
    for (let k = 0; k < len; k++) blendPx(c, x - slant * k, y - k, col, 0.75 - k * 0.12);
  }
}

function drawSnow(c, s, p) {
  const count = Math.round(30 + s.precip * 60);
  const r = rng(314);
  for (let i = 0; i < count; i++) {
    const near = r() < 0.3;
    const laps = near ? 3 : 2;
    const y = wrap(r() * c.h + p * c.h * laps, c.h);
    const x = wrap(r() * c.w + 1.6 * Math.sin(2 * Math.PI * (p * 2 + r())), c.w);
    setPx(c, x, y, [245, 248, 255]);
    if (near) {
      blendPx(c, x + 1, y, [245, 248, 255], 0.6);
      blendPx(c, x, y + 1, [245, 248, 255], 0.6);
    }
  }
}

// Two flashes per loop, with a bolt on the first.
function lightning(p) {
  if (p >= 0.3 && p < 0.33) return 1;
  if (p >= 0.36 && p < 0.38) return 0.6;
  return 0;
}

function drawLightning(c, s, p) {
  if (s.condition !== 'storm') return 0;
  const f = lightning(p);
  if (f === 0) return 0;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) blendPx(c, x, y, [230, 235, 255], 0.35 * f);
  if (f === 1) {
    const r = rng(5);
    let x = 20 + Math.floor(r() * 36);
    let y = 0;
    while (y < HORIZON) {
      const nx = x + Math.floor(r() * 5) - 2;
      const ny = y + 3 + Math.floor(r() * 3);
      line(c, x, y, nx, ny, [255, 255, 240]);
      x = nx;
      y = ny;
    }
  }
  return f;
}

// Renders the view and reports the lightning flash strength so the room can light up too.
export function renderView(s, p) {
  const c = createCanvas(VIEW_W, VIEW_H);
  drawSky(c, s);
  drawStars(c, s, p);
  drawSun(c, s);
  drawMoon(c, s);
  drawClouds(c, s, p);
  drawLand(c, s, p);
  muteLand(c, s);
  drawFog(c, s, p);
  if (s.condition === 'snow') drawSnow(c, s, p);
  else if (s.precip > 0) drawRain(c, s, p);
  const flash = drawLightning(c, s, p);
  return { canvas: c, flash };
}
