import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateKnobOffset } from '../src/input/joystick-math.ts';

test('filters thumb drift inside the dead zone', () => {
  assert.deepEqual(calculateKnobOffset(6, 8, 60, 12), { x: 0, y: 0 });
});

test('ramps a deliberate thumb direction smoothly after the dead zone', () => {
  const offset = calculateKnobOffset(0, 36, 60, 12);

  assert.equal(offset.x, 0);
  assert.ok(offset.y > 0 && offset.y < 60);
});

test('clamps a long drag to the joystick radius without changing direction', () => {
  const offset = calculateKnobOffset(180, 240, 60, 12);

  assert.ok(Math.abs(Math.hypot(offset.x, offset.y) - 60) < 0.0001);
  assert.ok(Math.abs(offset.x / offset.y - 180 / 240) < 0.0001);
});

test('returns a neutral offset when the radius is not positive', () => {
  assert.deepEqual(calculateKnobOffset(10, 10, 0, 4), { x: 0, y: 0 });
});
