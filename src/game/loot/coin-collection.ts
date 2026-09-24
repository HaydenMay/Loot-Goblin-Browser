import { clampFrameDelta } from '../movement.ts';
import type { WorldPoint } from '../world-layout.ts';

export interface MagnetCoin {
  id: number;
  value: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface MagnetCoinResult {
  coin: MagnetCoin;
  collectedNow: boolean;
}

export function advanceMagnetCoin(
  coin: MagnetCoin,
  goblin: WorldPoint,
  deltaMs: number,
  speed: number,
  pickupRadius: number,
): MagnetCoinResult {
  if (coin.collected) return { coin, collectedNow: false };

  const dx = goblin.x - coin.x;
  const dy = goblin.y - coin.y;
  const distance = Math.hypot(dx, dy);
  const radius = Number.isFinite(pickupRadius) ? Math.max(0, pickupRadius) : 0;
  if (distance <= radius) {
    return {
      coin: { ...coin, x: goblin.x, y: goblin.y, collected: true },
      collectedNow: true,
    };
  }

  const movementSpeed = Number.isFinite(speed) && speed > 0 ? speed : 0;
  const travelDistance = Math.min(movementSpeed * clampFrameDelta(deltaMs) / 1000, distance);
  const nextX = coin.x + (dx / distance) * travelDistance;
  const nextY = coin.y + (dy / distance) * travelDistance;
  const remainingDistance = distance - travelDistance;

  if (remainingDistance <= radius) {
    return {
      coin: { ...coin, x: goblin.x, y: goblin.y, collected: true },
      collectedNow: true,
    };
  }

  return {
    coin: { ...coin, x: nextX, y: nextY },
    collectedNow: false,
  };
}
