import { clampFrameDelta } from '../movement.ts';
import type { WorldPoint } from '../world-layout.ts';

export interface AttackTarget {
  id: string;
  x: number;
  y: number;
  alive: boolean;
}

export type AutoAttackEvent =
  | { type: 'windup-start'; targetId: string }
  | { type: 'impact'; targetId: string; damage: number }
  | { type: 'windup-cancel'; targetId: string };

type AttackPhase = 'ready' | 'windup' | 'cooldown';

export class AutoAttackController {
  private phase: AttackPhase = 'ready';
  private lockedTargetId: string | null = null;
  private windupElapsed = 0;
  private cooldownRemaining = 0;
  private readonly range: number;
  private readonly windupMs: number;
  private readonly repeatIntervalMs: number;
  private readonly damage: number;

  constructor(
    range: number,
    windupMs: number,
    repeatIntervalMs: number,
    damage: number,
  ) {
    this.range = range;
    this.windupMs = windupMs;
    this.repeatIntervalMs = repeatIntervalMs;
    this.damage = damage;
  }

  update(
    deltaMs: number,
    moving: boolean,
    player: WorldPoint,
    targets: readonly AttackTarget[],
  ): AutoAttackEvent[] {
    const delta = clampFrameDelta(deltaMs);

    if (this.phase === 'windup') {
      const target = targets.find(({ id }) => id === this.lockedTargetId);
      if (moving || !target || !target.alive || !this.isInRange(player, target)) {
        const targetId = this.lockedTargetId;
        this.phase = 'ready';
        this.lockedTargetId = null;
        this.windupElapsed = 0;
        return targetId === null ? [] : [{ type: 'windup-cancel', targetId }];
      }

      this.windupElapsed += delta;
      if (this.windupElapsed < this.windupMs) return [];

      const targetId = this.lockedTargetId;
      this.phase = 'cooldown';
      this.lockedTargetId = null;
      this.windupElapsed = 0;
      this.cooldownRemaining = Math.max(0, this.repeatIntervalMs - this.windupMs);
      return targetId === null ? [] : [{ type: 'impact', targetId, damage: this.damage }];
    }

    if (this.phase === 'cooldown') {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
      if (this.cooldownRemaining > 0) return [];
      this.phase = 'ready';
    }

    if (moving) return [];
    const target = this.findNearestTarget(player, targets);
    if (!target) return [];

    this.phase = 'windup';
    this.lockedTargetId = target.id;
    this.windupElapsed = 0;
    return [{ type: 'windup-start', targetId: target.id }];
  }

  reset(): void {
    this.phase = 'ready';
    this.lockedTargetId = null;
    this.windupElapsed = 0;
    this.cooldownRemaining = 0;
  }

  private findNearestTarget(
    player: WorldPoint,
    targets: readonly AttackTarget[],
  ): AttackTarget | null {
    let nearest: AttackTarget | null = null;
    let nearestDistanceSquared = this.range * this.range;

    for (const target of targets) {
      if (!target.alive) continue;
      const distanceSquared = this.distanceSquared(player, target);
      if (distanceSquared > nearestDistanceSquared) continue;
      if (nearest && distanceSquared === nearestDistanceSquared) continue;
      nearest = target;
      nearestDistanceSquared = distanceSquared;
    }

    return nearest;
  }

  private isInRange(player: WorldPoint, target: AttackTarget): boolean {
    return this.distanceSquared(player, target) <= this.range * this.range;
  }

  private distanceSquared(player: WorldPoint, target: AttackTarget): number {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    return dx * dx + dy * dy;
  }
}
