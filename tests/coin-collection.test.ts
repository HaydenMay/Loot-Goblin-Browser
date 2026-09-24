import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceMagnetCoin,
  type MagnetCoin,
} from '../src/game/loot/coin-collection.ts';

const goblin = { x: 100, y: 0 };

test('moves a dropped coin toward the Goblin at the configured speed', () => {
  const coin: MagnetCoin = { id: 1, value: 1, x: 0, y: 0, collected: false };
  const result = advanceMagnetCoin(coin, goblin, 50, 400, 12);

  assert.deepEqual(result, {
    coin: { id: 1, value: 1, x: 20, y: 0, collected: false },
    collectedNow: false,
  });
  assert.deepEqual(coin, { id: 1, value: 1, x: 0, y: 0, collected: false });
});

test('collects once when the next magnet step enters the sack radius', () => {
  const coin: MagnetCoin = { id: 1, value: 1, x: 70, y: 0, collected: false };
  const collected = advanceMagnetCoin(coin, goblin, 50, 400, 12);

  assert.deepEqual(collected, {
    coin: { id: 1, value: 1, x: 100, y: 0, collected: true },
    collectedNow: true,
  });

  const repeated = advanceMagnetCoin(collected.coin, goblin, 50, 400, 12);
  assert.deepEqual(repeated, { coin: collected.coin, collectedNow: false });
});

test('snaps a coin already inside the sack radius without reporting it twice', () => {
  const coin: MagnetCoin = { id: 2, value: 1, x: 95, y: 0, collected: false };
  const result = advanceMagnetCoin(coin, goblin, 0, 400, 12);

  assert.deepEqual(result, {
    coin: { id: 2, value: 1, x: 100, y: 0, collected: true },
    collectedNow: true,
  });
});

test('caps magnet travel to one 50 ms frame step', () => {
  const coin: MagnetCoin = { id: 3, value: 1, x: 0, y: 0, collected: false };
  const capped = advanceMagnetCoin(coin, goblin, 200, 400, 12);

  assert.equal(capped.coin.x, 20);
  assert.equal(capped.coin.y, 0);
  assert.equal(capped.collectedNow, false);
});
