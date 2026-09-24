export interface SlimeHealthState {
  current: number;
  max: number;
  dead: boolean;
}

export interface SlimeDamageResult {
  state: SlimeHealthState;
  applied: boolean;
  killed: boolean;
}

export function applySlimeDamage(
  state: SlimeHealthState,
  damage: number,
): SlimeDamageResult {
  if (state.dead || !(damage > 0)) {
    return { state: { ...state }, applied: false, killed: false };
  }

  const current = Math.max(0, state.current - damage);
  const dead = current === 0;
  return {
    state: { ...state, current, dead },
    applied: true,
    killed: dead && !state.dead,
  };
}
