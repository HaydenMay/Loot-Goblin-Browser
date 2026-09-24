import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorldLayout } from '../src/game/world-layout.ts';

test('keeps Goblin and slime markers inside and separated across expanded views', () => {
  const viewports = [
    { width: 720, height: 1280 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1365, height: 768 },
  ];

  for (const { width, height } of viewports) {
    const { goblin, slime } = getWorldLayout(width, height);

    for (const marker of [goblin, slime]) {
      assert.ok(marker.x >= width * 0.06, `x ${marker.x} stays inside left edge at ${width}×${height}`);
      assert.ok(marker.x <= width * 0.94, `x ${marker.x} stays inside right edge at ${width}×${height}`);
      assert.ok(marker.y >= height * 0.06, `y ${marker.y} stays inside top edge at ${width}×${height}`);
      assert.ok(marker.y <= height * 0.94, `y ${marker.y} stays inside bottom edge at ${width}×${height}`);
    }

    const separation = Math.hypot(goblin.x - slime.x, goblin.y - slime.y);
    assert.ok(
      separation >= Math.min(width, height) * 0.12,
      `markers remain separated at ${width}×${height}`,
    );
  }
});
