// Browser entry: fetch Gebze's weather, then animate the scene at a pixel-art frame rate.
// URL overrides for fun and testing: ?condition=snow&phase=night

import { buildState, fetchWeather } from './weather.js';
import { illumination, phaseName } from './moon.js';
import { renderScene, LOOP_MS, GIF_FRAMES } from './scene.js';

const REFRESH_MS = 10 * 60 * 1000;
const FRAME_MS = LOOP_MS / GIF_FRAMES;

// Used until the first fetch lands, or if Open-Meteo is unreachable.
const FALLBACK = {
  current: { time: '', temperature_2m: null, weather_code: 2, cloud_cover: 30, wind_speed_10m: 0 },
  daily: { sunrise: ['2000-01-01T08:00'], sunset: ['2000-01-01T17:30'] },
};

const params = new URLSearchParams(location.search);
const overrides = { condition: params.get('condition'), phase: params.get('phase') };

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

let weather = FALLBACK;
let online = false;

function updateReadout(s) {
  $('summary').textContent = online ? s.label : 'Window fogged up (weather unavailable)';
  $('temp').textContent = s.temp === null ? '–' : `${s.temp.toFixed(1)} °C`;
  $('wind').textContent = `${Math.round(s.wind)} km/h`;
  $('moon').textContent = `${phaseName(s.moon)}, ${Math.round(illumination(s.moon) * 100)}% lit`;
  $('sun').textContent = `${s.sunrise} ↑  ${s.sunset} ↓`;
  $('updated').textContent = online ? `Observed ${s.observed.slice(11)} Gebze time.` : '';
}

async function refresh() {
  try {
    weather = await fetchWeather();
    online = true;
  } catch (err) {
    online = weather !== FALLBACK;
    console.warn('Weather fetch failed:', err);
  }
  updateReadout(buildState(weather, new Date(), overrides));
  draw();
}

function draw() {
  const state = buildState(weather, new Date(), overrides);
  const p = (Date.now() % LOOP_MS) / LOOP_MS;
  const img = renderScene(state, p);
  ctx.putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
}

let lastFrame = 0;
function tick(now) {
  if (now - lastFrame >= FRAME_MS) {
    lastFrame = now;
    draw();
  }
  requestAnimationFrame(tick);
}

refresh();
setInterval(refresh, REFRESH_MS);
requestAnimationFrame(tick);
