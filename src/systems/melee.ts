import { MELEE_REACH } from '../data/config';

export interface MeleeStep {
  cooldown: number;
  hit: boolean;
}

/** True when two circles' edges are within melee reach. */
export const inMeleeRange = (distance: number, attackerRadius: number, targetRadius: number): boolean =>
  distance <= attackerRadius + targetRadius + MELEE_REACH;

/**
 * Ticks an attack cooldown and strikes when in range and ready. The first strike lands
 * on contact; after that, one strike per `interval` while contact lasts.
 */
export function meleeStep(cooldown: number, inRange: boolean, interval: number, dt: number): MeleeStep {
  const next = Math.max(0, cooldown - dt);
  if (inRange && next === 0) return { cooldown: interval, hit: true };
  return { cooldown: next, hit: false };
}
