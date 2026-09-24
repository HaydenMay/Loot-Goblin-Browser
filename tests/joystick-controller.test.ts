import assert from 'node:assert/strict';
import test from 'node:test';
import { JoystickController } from '../src/input/joystick-controller.ts';

test('starts a touch at its exact origin anywhere on the play surface', () => {
  const joystick = new JoystickController(60, 12);

  assert.equal(joystick.begin(7, 'touch', 1, 843, false), true);
  assert.deepEqual(joystick.origin, { x: 1, y: 843 });
  assert.equal(joystick.activePointerId, 7);
});

test('ignores mouse input and interactive UI targets', () => {
  const joystick = new JoystickController(60, 12);

  assert.equal(joystick.begin(1, 'mouse', 20, 30, false), false);
  assert.equal(joystick.begin(2, 'touch', 20, 30, true), false);
  assert.equal(joystick.activePointerId, null);
});

test('keeps the first touch as owner and ignores movement from other pointers', () => {
  const joystick = new JoystickController(60, 12);
  joystick.begin(4, 'touch', 100, 200, false);

  assert.equal(joystick.begin(5, 'touch', 120, 220, false), false);
  assert.equal(joystick.move(5, 160, 200), null);
  const offset = joystick.move(4, 160, 200);

  assert.ok(offset);
  assert.ok(offset.x > 0);
  assert.equal(offset.y, 0);
});

test('ends only the active pointer and clears the origin', () => {
  const joystick = new JoystickController(60, 12);
  joystick.begin(8, 'touch', 80, 90, false);

  assert.equal(joystick.end(9), false);
  assert.equal(joystick.activePointerId, 8);
  assert.equal(joystick.end(8), true);
  assert.equal(joystick.activePointerId, null);
  assert.equal(joystick.origin, null);
});
