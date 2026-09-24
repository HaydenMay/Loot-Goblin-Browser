export interface KnobOffset {
  x: number;
  y: number;
}

const NEUTRAL_OFFSET: KnobOffset = { x: 0, y: 0 };

export function calculateKnobOffset(
  dx: number,
  dy: number,
  radius: number,
  deadZone: number,
): KnobOffset {
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    !Number.isFinite(radius) ||
    !Number.isFinite(deadZone) ||
    radius <= 0
  ) {
    return NEUTRAL_OFFSET;
  }

  const distance = Math.hypot(dx, dy);
  if (distance === 0) return NEUTRAL_OFFSET;

  const innerRadius = Math.min(Math.max(deadZone, 0), radius * 0.85);
  const clampedDistance = Math.min(distance, radius);
  if (clampedDistance <= innerRadius) return NEUTRAL_OFFSET;

  const t = (clampedDistance - innerRadius) / (radius - innerRadius);
  const easedMagnitude = t * t * (3 - 2 * t) * radius;
  const directionX = dx / distance;
  const directionY = dy / distance;

  return {
    x: directionX * easedMagnitude,
    y: directionY * easedMagnitude,
  };
}
