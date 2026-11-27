import { FIRST_LEVEL_ID, STARTING_WEAPON, type LevelRewards, type WeaponId } from '../data/config';
import type { LevelResult } from './levelManager';

/**
 * What the player keeps between levels (spec §12.1). Lives in memory for now; save/load
 * will persist this object as-is.
 */
export interface Profile {
  /** Banked XP from every finished level, bonuses included. */
  xp: number;
  /** Weapons the player starts each level with. Always includes STARTING_WEAPON. */
  ownedWeapons: WeaponId[];
  unlockedLevels: number[];
  completedLevels: number[];
}

export const createProfile = (): Profile => ({
  xp: 0,
  ownedWeapons: [STARTING_WEAPON],
  unlockedLevels: [FIRST_LEVEL_ID],
  completedLevels: [],
});

const addMissing = <T>(list: readonly T[], extra: readonly T[]): T[] => [
  ...list,
  ...extra.filter((x, i) => !list.includes(x) && extra.indexOf(x) === i),
];

/** Adds a level's victory rewards. Unlocking something already owned changes nothing. */
export const grantRewards = (p: Profile, r: LevelRewards): Profile => ({
  ...p,
  xp: p.xp + r.bonusXp,
  ownedWeapons: addMissing(p.ownedWeapons, r.weapons),
  unlockedLevels: addMissing(p.unlockedLevels, r.levels),
});

/**
 * Banks a finished level into the profile. XP from kills is kept win or lose; rewards
 * and completion come only with victory.
 */
export function applyLevelResult(p: Profile, result: LevelResult): Profile {
  const banked = { ...p, xp: p.xp + result.xpEarned };
  if (result.outcome !== 'victory') return banked;
  const rewarded = grantRewards(banked, result.rewards);
  return { ...rewarded, completedLevels: addMissing(rewarded.completedLevels, [result.levelId]) };
}
