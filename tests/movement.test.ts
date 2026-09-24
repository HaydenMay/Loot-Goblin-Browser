import assert from 'node:assert/strict';
import test from 'node:test';
import { clampFrameDelta, moveWithinBounds } from '../src/game/movement.ts';

const portraitBounds = { left: 20, top: 20, right: 700, bottom: 1260 };
const landscapeBounds = { left: 20, top: 20, right: 824, bottom: 370 };

test('preserves analog movement strength and equalizes full-speed diagonals', () => {
  const halfStep = moveWithinBounds(
    { x: 100, y: 100 },
    { x: 0.5, y: 0 },
    50,
    220,
    portraitBounds,
  );
  assert.deepEqual(halfStep, { x: 105.5, y: 100 });

  const cardinal = moveWithinBounds(
    { x: 100, y: 100 },
    { x: 1, y: 0 },
    50,
    220,
    portraitBounds,
  );
  const diagonal = moveWithinBounds(
    { x: 100, y: 100 },
    { x: 1, y: 1 },
    50,
    220,
    portraitBounds,
  );
  assert.ok(Math.abs(Math.hypot(cardinal.x - 100, cardinal.y - 100) - 11) < 1e-10);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 100, diagonal.y - 100) - 11) < 1e-10);

  const overlength = moveWithinBounds(
    { x: 100, y: 100 },
    { x: 4, y: 0 },
    50,
    220,
    portraitBounds,
  );
  assert.deepEqual(overlength, cardinal);
});

test('caps long frames and treats invalid or negative deltas as zero', () => {
  assert.equal(clampFrameDelta(200), 50);
  assert.equal(clampFrameDelta(-25), 0);
  assert.equal(clampFrameDelta(Number.NaN), 0);
  assert.equal(clampFrameDelta(Number.POSITIVE_INFINITY), 0);

  const capped = moveWithinBounds(
    { x: 100, y: 100 },
    { x: 1, y: 0 },
    200,
    220,
    portraitBounds,
  );
  assert.deepEqual(capped, { x: 111, y: 100 });
  assert.deepEqual(
    moveWithinBounds({ x: 100, y: 100 }, { x: 1, y: 0 }, -25, 220, portraitBounds),
    { x: 100, y: 100 },
  );
  assert.deepEqual(
    moveWithinBounds({ x: 100, y: 100 }, { x: 0, y: 0 }, 50, 220, portraitBounds),
    { x: 100, y: 100 },
  );
});

test('clamps the Goblin center at all four room edges', () => {
  const cases = [
    { start: { x: 21, y: 100 }, direction: { x: -1, y: 0 }, expected: { x: 20, y: 100 } },
    { start: { x: 100, y: 21 }, direction: { x: 0, y: -1 }, expected: { x: 100, y: 20 } },
    { start: { x: 699, y: 100 }, direction: { x: 1, y: 0 }, expected: { x: 700, y: 100 } },
    { start: { x: 100, y: 1259 }, direction: { x: 0, y: 1 }, expected: { x: 100, y: 1260 } },
  ];

  for (const { start, direction, expected } of cases) {
    assert.deepEqual(moveWithinBounds(start, direction, 50, 220, portraitBounds), expected);
  }
});

test('clamps the current position across portrait and landscape resizes', () => {
  const positionValidInPortrait = { x: 680, y: 1200 };
  const landscapePosition = moveWithinBounds(
    positionValidInPortrait,
    { x: 0, y: 0 },
    0,
    220,
    landscapeBounds,
  );
  assert.deepEqual(landscapePosition, { x: 680, y: 370 });

  const portraitPosition = moveWithinBounds(
    { x: 824, y: 350 },
    { x: 0, y: 0 },
    0,
    220,
    portraitBounds,
  );
  assert.deepEqual(portraitPosition, { x: 700, y: 350 });
});
