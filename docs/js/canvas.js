// Tiny RGBA pixel buffer helpers. No DOM, so the same code runs in the browser and in Node.

export function createCanvas(w, h) {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

export function hex(s) {
  const n = parseInt(s.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function inside(c, x, y) {
  return x >= 0 && y >= 0 && x < c.w && y < c.h;
}

export function setPx(c, x, y, col) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (!inside(c, x, y)) return;
  const i = (y * c.w + x) * 4;
  c.data[i] = col[0];
  c.data[i + 1] = col[1];
  c.data[i + 2] = col[2];
  c.data[i + 3] = 255;
}

export function getPx(c, x, y) {
  const i = (y * c.w + x) * 4;
  return [c.data[i], c.data[i + 1], c.data[i + 2]];
}

export function blendPx(c, x, y, col, a) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (!inside(c, x, y)) return;
  setPx(c, x, y, mix(getPx(c, x, y), col, a));
}

export function fillRect(c, x, y, w, h, col) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPx(c, i, j, col);
}

export function hline(c, x0, x1, y, col) {
  for (let x = x0; x <= x1; x++) setPx(c, x, y, col);
}

export function vline(c, x, y0, y1, col) {
  for (let y = y0; y <= y1; y++) setPx(c, x, y, col);
}

// Bresenham line.
export function line(c, x0, y0, x1, y1, col) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    setPx(c, x0, y0, col);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function disc(c, cx, cy, r, col) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.6) setPx(c, cx + x, cy + y, col);
    }
  }
}

// Copy src into dst at (ox, oy).
export function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) setPx(dst, ox + x, oy + y, getPx(src, x, y));
  }
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Ordered-dither threshold in [0, 1) for a pixel.
export function bayer(x, y) {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

// Deterministic PRNG (mulberry32), so every frame and every run draws the same city.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function wrap(v, n) {
  return ((v % n) + n) % n;
}
