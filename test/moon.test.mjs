import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moonPhase, illumination, phaseName, isLit } from '../docs/js/moon.js';

const near = (a, b, tol) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) <= tol;
const HALF_DAY = 0.5 / 29.53;

test('known new and full moons', () => {
  assert.ok(near(moonPhase(new Date('2024-01-11T11:57:00Z')), 0, HALF_DAY), 'new moon 2024-01-11');
  assert.ok(near(moonPhase(new Date('2024-01-25T17:54:00Z')), 0.5, HALF_DAY), 'full moon 2024-01-25');
  assert.ok(near(moonPhase(new Date('2025-09-07T18:09:00Z')), 0.5, HALF_DAY), 'full moon 2025-09-07');
});

test('illumination and names', () => {
  assert.equal(illumination(0), 0);
  assert.equal(illumination(0.5), 1);
  assert.equal(phaseName(0.25), 'First quarter');
  assert.equal(phaseName(0.98), 'New moon');
});

test('terminator: waxing lit on the right, waning on the left', () => {
  assert.equal(isLit(0.5, 0, 0.25), true);
  assert.equal(isLit(-0.5, 0, 0.25), false);
  assert.equal(isLit(-0.5, 0, 0.75), true);
  assert.equal(isLit(0.5, 0, 0.75), false);
  assert.equal(isLit(0, 0, 0.5), true);
  assert.equal(isLit(0, 0, 0), false);
});
