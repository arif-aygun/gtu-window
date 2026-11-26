// The desk-side room around the window. Coordinates are in scene pixels (160 x 112).

import { hex, mix, setPx, blendPx, fillRect, hline, vline, line, rng, wrap } from './canvas.js';
import { drawText, textWidth } from './font.js';

export const GLASS = { x: 17, y: 11, w: 76, h: 54 };
const FRAME = { x: 14, y: 8, w: 82, h: 60 };
const DESK_Y = 84;

const C = {
  wall: hex('#4a4463'),
  wallStripe: hex('#45405d'),
  wood: hex('#8a5a3b'),
  woodHi: hex('#a8714b'),
  woodLo: hex('#5e3b26'),
  desk: hex('#9c6b46'),
  deskHi: hex('#b88356'),
  deskFront: hex('#6f4a31'),
  deskLo: hex('#553722'),
  curtain: hex('#2f4a7a'),
  curtainHi: hex('#3f5f96'),
  curtainLo: hex('#223860'),
  navy: hex('#1f3a70'),
  white: hex('#eef0f6'),
  metal: hex('#c4c8d2'),
  metalLo: hex('#8c919e'),
  dark: hex('#24262e'),
  screen: hex('#141b2b'),
  lcd: hex('#9cc070'),
  lcdInk: hex('#22351c'),
  pot: hex('#c0643e'),
  potLo: hex('#8f4429'),
  leaf: hex('#4f9a4a'),
  leafLo: hex('#356e35'),
  shade: hex('#d9a441'),
  bulb: hex('#fff1c4'),
};

function drawWall(c) {
  fillRect(c, 0, 0, c.w, DESK_Y, C.wall);
  for (let x = 3; x < c.w; x += 8) vline(c, x, 0, DESK_Y - 1, C.wallStripe);
}

function drawFrame(c, s) {
  const { x, y, w, h } = FRAME;
  fillRect(c, x, y, w, 3, C.wood);
  fillRect(c, x, y + h - 3, w, 3, C.wood);
  fillRect(c, x, y, 3, h, C.wood);
  fillRect(c, x + w - 3, y, 3, h, C.wood);
  hline(c, x, x + w - 1, y, C.woodHi);
  vline(c, x, y, y + h - 1, C.woodHi);
  hline(c, GLASS.x, GLASS.x + GLASS.w - 1, GLASS.y - 1, C.woodLo);
  vline(c, GLASS.x - 1, GLASS.y, GLASS.y + GLASS.h - 1, C.woodLo);
  // Mullions.
  fillRect(c, GLASS.x + 37, GLASS.y, 2, GLASS.h, C.wood);
  vline(c, GLASS.x + 37, GLASS.y, GLASS.y + GLASS.h - 1, C.woodHi);
  fillRect(c, GLASS.x, GLASS.y + 26, GLASS.w, 2, C.wood);
  hline(c, GLASS.x, GLASS.x + GLASS.w - 1, GLASS.y + 26, C.woodHi);
  // Sill.
  fillRect(c, x - 4, y + h, w + 8, 2, C.woodHi);
  fillRect(c, x - 4, y + h + 2, w + 8, 2, C.woodLo);
  if (s.condition === 'snow') hline(c, GLASS.x, GLASS.x + GLASS.w - 1, GLASS.y + GLASS.h - 1, [240, 244, 252]);
}

export function drawGlass(c, s, p) {
  const { x, y, w, h } = GLASS;
  // A soft diagonal reflection.
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const d = wrap(i + j, 46);
      if (d < 3 && i < 34) blendPx(c, x + i, y + j, [255, 255, 255], 0.07);
    }
  }
  if (!['rain', 'drizzle', 'storm'].includes(s.condition)) return;
  const r = rng(11);
  const drop = [200, 220, 245];
  for (let i = 0; i < 14; i++) blendPx(c, x + r() * w, y + r() * h, drop, 0.55);
  for (let i = 0; i < 3; i++) {
    const tx = x + 4 + Math.floor(r() * (w - 8));
    const ty = y + Math.floor(wrap(r() * h + p * h * 2, h));
    for (let k = 0; k < 4; k++) blendPx(c, tx, ty - k, drop, 0.6 - k * 0.12);
  }
}

function drawCurtain(c, x0, flip) {
  for (let x = 0; x < 9; x++) {
    const fold = (x + (flip ? 1 : 0)) % 3;
    const col = fold === 0 ? C.curtainHi : fold === 1 ? C.curtain : C.curtainLo;
    const flare = Math.floor(x / 3);
    const bottom = FRAME.y + FRAME.h + 1 + (flip ? 2 - flare : flare);
    vline(c, x0 + x, 2, bottom, col);
  }
  hline(c, 4, 106, 1, C.dark);
}

function drawPlant(c) {
  const px = 21;
  const base = FRAME.y + FRAME.h - 1;
  fillRect(c, px, base - 5, 7, 5, C.pot);
  hline(c, px - 1, px + 7, base - 6, C.pot);
  vline(c, px + 6, base - 5, base - 1, C.potLo);
  const leaves = [[3, -7], [2, -8], [4, -9], [1, -10], [5, -10], [3, -11], [0, -8], [6, -8], [2, -12], [4, -13]];
  leaves.forEach(([dx, dy], i) => setPx(c, px + dx, base + dy, i % 3 === 0 ? C.leafLo : C.leaf));
  line(c, px + 3, base - 7, px + 1, base - 12, C.leaf);
  line(c, px + 3, base - 7, px + 6, base - 11, C.leafLo);
}

function drawPennant(c) {
  const x = 106;
  const y = 14;
  hline(c, x - 2, x + 40, y - 2, C.dark);
  for (let j = 0; j < 14; j++) {
    const len = Math.round(38 * (1 - j / 14));
    hline(c, x, x + len, y + j, j === 0 ? C.curtainHi : C.navy);
  }
  vline(c, x, y, y + 13, C.white);
  drawText(c, 'GTÜ', x + 5, y + 3, C.white);
}

function drawDesk(c) {
  fillRect(c, 0, DESK_Y, c.w, 3, C.desk);
  hline(c, 0, c.w - 1, DESK_Y, C.deskHi);
  fillRect(c, 0, DESK_Y + 3, c.w, c.h - DESK_Y - 3, C.deskFront);
  hline(c, 0, c.w - 1, DESK_Y + 3, C.deskLo);
  fillRect(c, 54, DESK_Y + 8, 52, 12, C.deskLo);
  fillRect(c, 55, DESK_Y + 9, 50, 10, C.desk);
  fillRect(c, 77, DESK_Y + 13, 6, 2, C.woodLo);
}

function drawBooks(c) {
  const books = [[hex('#b84a4a'), 22], [hex('#3f7f6a'), 19], [hex('#d6a84a'), 21]];
  books.forEach(([col, w], i) => {
    const y = DESK_Y - 3 - i * 3;
    fillRect(c, 26 + i, y, w, 3, col);
    hline(c, 26 + i, 26 + i + w - 1, y, mix(col, [255, 255, 255], 0.25));
    vline(c, 26 + i + w - 1, y, y + 2, [236, 228, 210]);
  });
}

// Desk lamp; returns the point its light comes from.
function drawLamp(c, on) {
  fillRect(c, 4, DESK_Y - 2, 11, 2, C.dark);
  line(c, 9, DESK_Y - 3, 6, 66, C.metalLo);
  line(c, 6, 66, 12, 56, C.metalLo);
  for (let j = 0; j < 5; j++) hline(c, 9 - j, 15 + j - 2, 54 + j, C.shade);
  hline(c, 6, 15, 58, mix(C.shade, [0, 0, 0], 0.3));
  if (on) hline(c, 9, 12, 59, C.bulb);
  return { x: 11, y: 61 };
}

function drawLaptop(c, s, p) {
  const x = 110;
  const y = 60;
  fillRect(c, x, y, 34, 22, C.dark);
  fillRect(c, x + 2, y + 2, 30, 18, C.screen);
  const r = rng(3);
  const cols = [hex('#7aa2f7'), hex('#9ece6a'), hex('#e0af68'), hex('#bb9af7'), hex('#7dcfff')];
  for (let row = 0; row < 7; row++) {
    let cx = x + 4 + Math.floor(r() * 3) * 2;
    const ly = y + 4 + row * 2;
    while (cx < x + 26 && r() < 0.8) {
      const len = 2 + Math.floor(r() * 6);
      hline(c, cx, Math.min(cx + len, x + 30), ly, cols[Math.floor(r() * cols.length)]);
      cx += len + 2;
    }
  }
  if (Math.floor(p * 8) % 2 === 0) fillRect(c, x + 22, y + 16, 2, 2, C.white);
  fillRect(c, x - 3, y + 22, 40, 2, C.metal);
  hline(c, x - 3, x + 36, y + 23, C.metalLo);
  return { emissive: { x: x + 2, y: y + 2, w: 30, h: 18 }, glow: { x: x + 17, y: y + 10 } };
}

function drawMug(c, s, p) {
  const x = 94;
  const y = DESK_Y - 9;
  fillRect(c, x, y, 8, 9, C.white);
  fillRect(c, x, y + 3, 8, 3, C.navy);
  vline(c, x + 7, y, y + 8, hex('#c9ccd6'));
  vline(c, x + 9, y + 2, y + 6, C.white);
  setPx(c, x + 8, y + 2, C.white);
  setPx(c, x + 8, y + 6, C.white);
  hline(c, x + 1, x + 6, y, hex('#5a3a28'));
  if (s.temp !== null && s.temp > 24) return;
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < 8; j++) {
      const t = wrap(p * 2 + j / 8 + k * 0.5, 1);
      const sy = y - 1 - Math.floor(t * 9);
      const sx = x + 2 + k * 3 + Math.round(Math.sin(2 * Math.PI * (t * 1.5 + k * 0.3)));
      blendPx(c, sx, sy, [235, 235, 245], 0.45 * (1 - t));
    }
  }
}

function tempText(t) {
  if (t === null) return '--°C';
  return `${Math.round(t)}°C`;
}

function drawStation(c, s) {
  const x = 64;
  const y = DESK_Y - 17;
  fillRect(c, x, y, 25, 17, C.dark);
  hline(c, x, x + 24, y, hex('#3a3d48'));
  const lcd = { x: x + 2, y: y + 2, w: 21, h: 13 };
  fillRect(c, lcd.x, lcd.y, lcd.w, lcd.h, C.lcd);
  const temp = tempText(s.temp);
  drawText(c, s.clock, lcd.x + Math.floor((lcd.w - textWidth(s.clock)) / 2), lcd.y + 1, C.lcdInk);
  drawText(c, temp, lcd.x + Math.floor((lcd.w - textWidth(temp)) / 2), lcd.y + 7, C.lcdInk);
  return lcd;
}

export function drawRoomBack(c, s) {
  drawWall(c);
  drawPennant(c);
}

export function drawRoomFront(c, s, p) {
  drawFrame(c, s);
  drawCurtain(c, 6, false);
  drawCurtain(c, 95, true);
  drawPlant(c);
  drawDesk(c);
  drawBooks(c);
  const lampOn = s.phase !== 'day' || s.cloud > 0.85;
  const lamp = drawLamp(c, lampOn);
  const laptop = drawLaptop(c, s, p);
  drawMug(c, s, p);
  const lcd = drawStation(c, s);
  return { lampOn, lamp, laptop, emissive: [laptop.emissive, lcd] };
}
