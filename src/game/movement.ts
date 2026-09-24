import type { Vector2 } from '../shared/vector2.ts';
import type { WorldPoint } from './world-layout.ts';

interface WorldBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MAX_FRAME_DELTA_MS = 50;

export function clampFrameDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs)) return 0;
  return Math.max(0, Math.min(deltaMs, MAX_FRAME_DELTA_MS));
}

export function moveWithinBounds(
  position: WorldPoint,
  direction: Vector2,
  deltaMs: number,
  speed: number,
  bounds: WorldBounds,
): WorldPoint {
  const frameDelta = clampFrameDelta(deltaMs);
  const magnitude = Math.hypot(direction.x, direction.y);
  const movementSpeed = Number.isFinite(speed) && speed > 0 ? speed : 0;
  const normalize = magnitude > 1 ? 1 / magnitude : 1;
  const distance = movementSpeed * frameDelta / 1000;

  const x = position.x + (Number.isFinite(magnitude) ? direction.x * normalize * distance : 0);
  const y = position.y + (Number.isFinite(magnitude) ? direction.y * normalize * distance : 0);

  return {
    x: Math.max(bounds.left, Math.min(x, bounds.right)),
    y: Math.max(bounds.top, Math.min(y, bounds.bottom)),
  };
}
