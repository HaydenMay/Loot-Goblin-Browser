import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AutoAttackController,
  type AttackTarget,
} from '../src/game/combat/auto-attack.ts';
import type { WorldPoint } from '../src/game/world-layout.ts';

const player: WorldPoint = { x: 0, y: 0 };
const nearbySlime: AttackTarget = { id: 'slime', x: 50, y: 0, alive: true };

test('starts a wind-up only while stationary and impacts after its wind-up', () => {
  const controller = new AutoAttackController(100, 180, 750, 1);

  assert.deepEqual(controller.update(50, true, player, [nearbySlime]), []);
  assert.deepEqual(controller.update(0, false, player, [nearbySlime]), [
    { type: 'windup-start', targetId: 'slime' },
  ]);

  const events = [
    ...controller.update(50, false, player, [nearbySlime]),
    ...controller.update(50, false, player, [nearbySlime]),
    ...controller.update(50, false, player, [nearbySlime]),
    ...controller.update(30, false, player, [nearbySlime]),
  ];
  assert.deepEqual(events, [{ type: 'impact', targetId: 'slime', damage: 1 }]);
  assert.deepEqual(controller.update(50, false, player, [nearbySlime]), []);
});

test('cancels a pending hit when movement resumes before impact', () => {
  const controller = new AutoAttackController(100, 180, 750, 1);
  assert.deepEqual(controller.update(0, false, player, [nearbySlime]), [
    { type: 'windup-start', targetId: 'slime' },
  ]);
  assert.deepEqual(controller.update(50, true, player, [nearbySlime]), [
    { type: 'windup-cancel', targetId: 'slime' },
  ]);
  assert.deepEqual(controller.update(50, true, player, [nearbySlime]), []);
});

test('cancels the locked swing when its target dies or leaves range', () => {
  for (const scenario of ['missing', 'dead', 'out-of-range'] as const) {
    const controller = new AutoAttackController(100, 180, 750, 1);
    const target = { ...nearbySlime };
    controller.update(0, false, player, [target]);
    controller.update(100, false, player, [target]);
    if (scenario === 'dead') target.alive = false;
    else if (scenario === 'out-of-range') target.x = 101;
    const targets = scenario === 'missing' ? [] : [target];

    assert.deepEqual(controller.update(50, false, player, targets), [
      { type: 'windup-cancel', targetId: 'slime' },
    ]);
    assert.deepEqual(controller.update(50, false, player, targets), []);
  }
});

test('ignores dead or distant slimes and selects the nearest living target in range', () => {
  const controller = new AutoAttackController(100, 180, 750, 1);
  const targets: AttackTarget[] = [
    { id: 'dead', x: 5, y: 0, alive: false },
    { id: 'distant', x: 101, y: 0, alive: true },
    { id: 'nearer', x: 25, y: 0, alive: true },
    { id: 'farther', x: 60, y: 0, alive: true },
  ];

  assert.deepEqual(controller.update(0, false, player, targets), [
    { type: 'windup-start', targetId: 'nearer' },
  ]);

  controller.reset();
  assert.deepEqual(
    controller.update(0, false, player, targets.slice(0, 2)),
    [],
  );
});

test('waits 750 ms from one wind-up start and advances cooldown while moving', () => {
  const controller = new AutoAttackController(100, 180, 750, 1);
  let elapsedSinceStart = 0;
  assert.deepEqual(controller.update(0, false, player, [nearbySlime]), [
    { type: 'windup-start', targetId: 'slime' },
  ]);

  for (const delta of [50, 50, 50, 30]) {
    const events = controller.update(delta, false, player, [nearbySlime]);
    elapsedSinceStart += delta;
    if (delta === 30) {
      assert.deepEqual(events, [{ type: 'impact', targetId: 'slime', damage: 1 }]);
    } else {
      assert.deepEqual(events, []);
    }
  }

  for (let index = 0; index < 11; index += 1) {
    assert.deepEqual(controller.update(50, true, player, [nearbySlime]), []);
    elapsedSinceStart += 50;
  }
  assert.deepEqual(controller.update(19, true, player, [nearbySlime]), []);
  elapsedSinceStart += 19;
  assert.deepEqual(controller.update(1, true, player, [nearbySlime]), []);
  elapsedSinceStart += 1;
  assert.equal(elapsedSinceStart, 750);
  assert.deepEqual(controller.update(0, true, player, [nearbySlime]), []);
  assert.deepEqual(controller.update(0, false, player, [nearbySlime]), [
    { type: 'windup-start', targetId: 'slime' },
  ]);
});

test('reset returns a pending swing to ready without carrying its elapsed time', () => {
  const controller = new AutoAttackController(100, 180, 750, 1);
  controller.update(0, false, player, [nearbySlime]);
  controller.update(50, false, player, [nearbySlime]);

  controller.reset();

  assert.deepEqual(controller.update(0, false, player, [nearbySlime]), [
    { type: 'windup-start', targetId: 'slime' },
  ]);
});
