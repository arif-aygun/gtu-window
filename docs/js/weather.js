// Open-Meteo (no API key) -> the small state object the renderer needs.

import { moonPhase } from './moon.js';

// GTÜ main campus, Gebze / Kocaeli.
export const LOCATION = { name: 'Gebze', lat: 40.8077, lon: 29.3592, tz: 'Europe/Istanbul' };

export const API_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
  '&current=temperature_2m,weather_code,cloud_cover,is_day,wind_speed_10m,precipitation' +
  '&daily=sunrise,sunset&timezone=Europe%2FIstanbul&forecast_days=1';

export const CONDITIONS = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm'];

const LABELS = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
};

// Minimum cloud amount that makes each condition look right, whatever cloud_cover says.
const MIN_CLOUD = { clear: 0, partly: 0.25, cloudy: 0.85, fog: 0.6, drizzle: 0.75, rain: 0.85, snow: 0.85, storm: 0.95 };

// WMO weather interpretation codes, as documented by Open-Meteo.
export function conditionFromCode(code) {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'partly';
}

const LIGHT = [51, 56, 61, 66, 71, 77, 80, 85];
const HEAVY = [55, 57, 65, 67, 75, 82, 86, 99];

export function intensityFromCode(code) {
  if (LIGHT.includes(code)) return 0.35;
  if (HEAVY.includes(code)) return 1;
  return 0.65;
}

export function conditionLabel(condition) {
  return LABELS[condition] ?? condition;
}

function hhmmToMinutes(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

// Local wall-clock time at the location, independent of the viewer's time zone.
export function localClock(date, tz = LOCATION.tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return { text: parts, minutes: hhmmToMinutes(parts) };
}

const TWILIGHT_MIN = 40;

// Where the sky is in its day: phase name plus how far the sun (by day) or moon (by night) is along its arc.
export function skyPhase(minutes, sunrise, sunset) {
  if (Math.abs(minutes - sunrise) <= TWILIGHT_MIN) return { phase: 'dawn', arc: arcOf(minutes, sunrise, sunset) };
  if (Math.abs(minutes - sunset) <= TWILIGHT_MIN) return { phase: 'dusk', arc: arcOf(minutes, sunrise, sunset) };
  if (minutes > sunrise && minutes < sunset) return { phase: 'day', arc: arcOf(minutes, sunrise, sunset) };
  return { phase: 'night', arc: arcOf(minutes, sunrise, sunset) };
}

function arcOf(minutes, sunrise, sunset) {
  if (minutes >= sunrise && minutes <= sunset) return (minutes - sunrise) / (sunset - sunrise);
  const nightLen = 1440 - (sunset - sunrise);
  const sinceSunset = (minutes - sunset + 1440) % 1440;
  return sinceSunset / nightLen;
}

function validate(json) {
  const c = json?.current;
  const d = json?.daily;
  if (!c || typeof c.weather_code !== 'number' || !Array.isArray(d?.sunrise) || !Array.isArray(d?.sunset)) {
    throw new Error('Unexpected Open-Meteo response shape');
  }
  return { c, d };
}

// Pure: API JSON + a Date -> render state. Overrides let you force any look (?condition=snow&phase=night).
export function buildState(json, date, overrides = {}) {
  const { c, d } = validate(json);
  const fromApi = conditionFromCode(c.weather_code);
  const condition = CONDITIONS.includes(overrides.condition) ? overrides.condition : fromApi;
  const forced = condition !== fromApi;
  const clock = localClock(date);
  const sunrise = hhmmToMinutes(d.sunrise[0].slice(11, 16));
  const sunset = hhmmToMinutes(d.sunset[0].slice(11, 16));
  const sky = skyPhase(clock.minutes, sunrise, sunset);
  const phase = ['night', 'dawn', 'day', 'dusk'].includes(overrides.phase) ? overrides.phase : sky.phase;
  const cloudCover = forced ? 0 : (c.cloud_cover ?? 0) / 100;
  return {
    condition,
    label: conditionLabel(condition),
    cloud: Math.max(cloudCover, MIN_CLOUD[condition]),
    precip: ['drizzle', 'rain', 'snow', 'storm'].includes(condition)
      ? (forced ? 0.65 : intensityFromCode(c.weather_code))
      : 0,
    wind: c.wind_speed_10m ?? 0,
    temp: typeof c.temperature_2m === 'number' ? c.temperature_2m : null,
    phase,
    arc: overrides.phase ? 0.5 : sky.arc,
    moon: moonPhase(date),
    clock: clock.text,
    sunrise: d.sunrise[0].slice(11, 16),
    sunset: d.sunset[0].slice(11, 16),
    observed: c.time,
  };
}

export async function fetchWeather(fetchImpl = fetch, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(API_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
