import { length, normalize, vec, type Vec2 } from '../core/math';
import { TIMER_EPSILON, type Resistances } from '../data/config';

/** Ability effects on one zombie. Timers in seconds; knockback is a velocity in px/s. */
export interface StatusEffects {
  freezeLeft: number;
  slowLeft: number;
  knockback: Vec2;
}

export const createStatus = (): StatusEffects => ({ freezeLeft: 0, slowLeft: 0, knockback: vec(0, 0) });

export const isFrozen = (s: StatusEffects): boolean => s.freezeLeft > 0;
export const isSlowed = (s: StatusEffects): boolean => s.slowLeft > 0;

/**
 * Ice slow. Each hit refreshes the timer back to `seconds`; the amount is fixed per zombie
 * (iceSlowMultiplier), so repeated hits never stack the percentage.
 */
export const applyIceSlow = (s: StatusEffects, seconds: number): StatusEffects => ({
  ...s,
  slowLeft: Math.max(s.slowLeft, seconds),
});

/** Full freeze. Freeze-immune zombies (Tank, boss) get the ice slow instead. */
export function applyFreeze(s: StatusEffects, r: Resistances, freezeSeconds: number, slowSeconds: number): StatusEffects {
  if (r.freezeImmune) return applyIceSlow(s, slowSeconds);
  return { ...s, freezeLeft: Math.max(s.freezeLeft, freezeSeconds) };
}

/**
 * Pushes along `dir` at `speed`, reduced by knockback resistance. A new hit replaces the
 * current push rather than adding to it, so a shotgun blast doesn't launch a zombie.
 */
export function applyKnockback(s: StatusEffects, r: Resistances, dir: Vec2, speed: number): StatusEffects {
  const strength = speed * (1 - r.knockbackResistance);
  const n = normalize(dir);
  if (strength <= 0 || (n.x === 0 && n.y === 0)) return s;
  return { ...s, knockback: vec(n.x * strength, n.y * strength) };
}

/** Multiplier on normal move speed: 0 when frozen, the ice slow when slowed, else 1. */
export function speedMultiplier(s: StatusEffects, r: Resistances): number {
  if (isFrozen(s)) return 0;
  return isSlowed(s) ? r.iceSlowMultiplier : 1;
}

const countDown = (t: number, dt: number): number => (t - dt <= TIMER_EPSILON ? 0 : t - dt);

/** Counts timers down and decays the knockback at `knockbackDecay` px/s². */
export function tickStatus(s: StatusEffects, dt: number, knockbackDecay: number): StatusEffects {
  const k = length(s.knockback);
  const scale = k > 0 ? Math.max(0, k - knockbackDecay * dt) / k : 0;
  return {
    freezeLeft: countDown(s.freezeLeft, dt),
    slowLeft: countDown(s.slowLeft, dt),
    knockback: vec(s.knockback.x * scale, s.knockback.y * scale),
  };
}
