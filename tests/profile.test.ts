import { describe, expect, it } from 'vitest';
import { applyLevelResult, createProfile, grantRewards } from '../src/systems/profile';
import type { LevelResult } from '../src/systems/levelManager';
import { createPlayer } from '../src/entities/player';
import { createWorld } from '../src/world';
import { vec } from '../src/core/math';
import { LEVEL_1, STARTING_WEAPON } from '../src/data/config';

const result = (outcome: LevelResult['outcome'], xpEarned = 120): LevelResult => ({
  levelId: LEVEL_1.id,
  outcome,
  defeatReason: outcome === 'defeat' ? 'playerDied' : null,
  xpEarned,
  rewards: LEVEL_1.rewards,
});

describe('profile', () => {
  it('starts with only the assault rifle and Level 1', () => {
    const p = createProfile();
    expect(p.ownedWeapons).toEqual(['assaultRifle']);
    expect(p.unlockedLevels).toEqual([1]);
    expect(p.completedLevels).toEqual([]);
    expect(p.xp).toBe(0);
  });

  it('grantRewards adds bonus XP and unlocks, without duplicates', () => {
    const once = grantRewards(createProfile(), LEVEL_1.rewards);
    expect(once.xp).toBe(250);
    expect(once.ownedWeapons).toEqual(['assaultRifle', 'shotgun']);
    expect(once.unlockedLevels).toEqual([1, 2]);
    const twice = grantRewards(once, LEVEL_1.rewards);
    expect(twice.xp).toBe(500); // XP stacks
    expect(twice.ownedWeapons).toEqual(['assaultRifle', 'shotgun']);
    expect(twice.unlockedLevels).toEqual([1, 2]);
  });

  it('grantRewards does not change the profile it was given', () => {
    const p = createProfile();
    grantRewards(p, LEVEL_1.rewards);
    expect(p).toEqual(createProfile());
  });
});

describe('applying a level result', () => {
  it('victory: banks kill XP plus the bonus, unlocks the shotgun and Level 2, marks Level 1 done', () => {
    const p = applyLevelResult(createProfile(), result('victory', 120));
    expect(p.xp).toBe(120 + 250);
    expect(p.ownedWeapons).toContain('shotgun');
    expect(p.unlockedLevels).toContain(2);
    expect(p.completedLevels).toEqual([1]);
  });

  it('defeat: keeps kill XP but grants no rewards', () => {
    const p = applyLevelResult(createProfile(), result('defeat', 80));
    expect(p.xp).toBe(80);
    expect(p.ownedWeapons).toEqual(['assaultRifle']);
    expect(p.unlockedLevels).toEqual([1]);
    expect(p.completedLevels).toEqual([]);
  });
});

describe('starting weapons come from the ownership list', () => {
  it('a new player owns only the assault rifle', () => {
    const p = createPlayer(vec(0, 0));
    expect(p.loadout.owned).toEqual([STARTING_WEAPON]);
    expect(p.loadout.current).toBe(STARTING_WEAPON);
  });

  it('unlocked weapons are owned at the next level start, rifle still in hand', () => {
    const profile = applyLevelResult(createProfile(), result('victory'));
    const world = createWorld('zane', LEVEL_1, profile.ownedWeapons);
    expect(world.player.loadout.owned).toEqual(['assaultRifle', 'shotgun']);
    expect(world.player.loadout.current).toBe('assaultRifle');
  });

  it('the rifle is always owned, even if the list leaves it out', () => {
    expect(createPlayer(vec(0, 0), 'zane', ['shotgun']).loadout.owned).toEqual(['assaultRifle', 'shotgun']);
  });
});
