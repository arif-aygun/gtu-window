// Moon phase from the mean synodic month. Accurate to within about half a day,
// which is plenty for a 10-pixel moon.

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC
const DAY_MS = 86400000;

// 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
export function moonPhase(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON_MS) / DAY_MS;
  const cycles = days / SYNODIC_DAYS;
  return cycles - Math.floor(cycles);
}

// Fraction of the disc that is lit, 0..1.
export function illumination(phase) {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

const NAMES = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
];

export function phaseName(phase) {
  return NAMES[Math.round(phase * 8) % 8];
}

// Is point (x, y) on the unit disc lit? Northern-hemisphere view: waxing is lit on the right.
export function isLit(x, y, phase) {
  const w = Math.sqrt(Math.max(0, 1 - y * y));
  const k = Math.cos(2 * Math.PI * phase);
  return phase < 0.5 ? x > k * w : x < -k * w;
}
