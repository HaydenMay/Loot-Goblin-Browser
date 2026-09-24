import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySlimeDamage,
  type SlimeHealthState,
} from '../src/game/combat/slime-health.ts';

test('kills the slime only on the third hit and never kills it twice', () => {
  let state: SlimeHealthState = { current: 3, max: 3, dead: false };

  const first = applySlimeDamage(state, 1);
  assert.deepEqual(first, {
    state: { current: 2, max: 3, dead: false },
    applied: true,
    killed: false,
  });
  state = first.state;

  const second = applySlimeDamage(state, 1);
  assert.deepEqual(second, {
    state: { current: 1, max: 3, dead: false },
    applied: true,
    killed: false,
  });
  state = second.state;

  const third = applySlimeDamage(state, 1);
  assert.deepEqual(third, {
    state: { current: 0, max: 3, dead: true },
    applied: true,
    killed: true,
  });

  const repeatedDamage = applySlimeDamage(third.state, 1);
  assert.deepEqual(repeatedDamage, {
    state: { current: 0, max: 3, dead: true },
    applied: false,
    killed: false,
  });
  assert.deepEqual(third.state, { current: 0, max: 3, dead: true });
});

test('ignores zero and negative damage without changing slime health', () => {
  const state: SlimeHealthState = { current: 2, max: 3, dead: false };

  assert.deepEqual(applySlimeDamage(state, 0), {
    state: { current: 2, max: 3, dead: false },
    applied: false,
    killed: false,
  });
  assert.deepEqual(applySlimeDamage(state, -1), {
    state: { current: 2, max: 3, dead: false },
    applied: false,
    killed: false,
  });
  assert.deepEqual(state, { current: 2, max: 3, dead: false });
});
