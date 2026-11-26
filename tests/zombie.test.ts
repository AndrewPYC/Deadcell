import { describe, expect, it } from 'vitest';
import { inMeleeRange, meleeStep } from '../src/systems/melee';
import { collectKills } from '../src/systems/xp';
import { createZombie } from '../src/entities/zombie';
import { createPlayer, damagePlayer, isDead } from '../src/entities/player';
import { findSpawnPoint } from '../src/systems/spawn';
import { circleIntersectsRect } from '../src/systems/collision';
import { vec } from '../src/core/math';
import { FIXED_STEP_SECONDS, MELEE_REACH, PLAYER_MAX_HEALTH, ZOMBIES, ZOMBIE_SPAWN_MIN_DISTANCE } from '../src/data/config';

describe('melee', () => {
  it('reaches a few px past touching', () => {
    expect(inMeleeRange(16 + 17 + MELEE_REACH, 17, 16)).toBe(true);
    expect(inMeleeRange(16 + 17 + MELEE_REACH + 1, 17, 16)).toBe(false);
  });

  it('strikes on contact, then once per interval', () => {
    let cooldown = 0;
    let hits = 0;
    for (let i = 0; i < Math.round(3 / FIXED_STEP_SECONDS); i++) {
      const s = meleeStep(cooldown, true, 1, FIXED_STEP_SECONDS);
      cooldown = s.cooldown;
      if (s.hit) hits++;
    }
    expect(hits).toBe(3);
  });

  it('never strikes out of range', () => {
    expect(meleeStep(0, false, 1, FIXED_STEP_SECONDS).hit).toBe(false);
  });
});

describe('player health', () => {
  it('takes damage and dies at 0', () => {
    const p = createPlayer(vec(0, 0));
    expect(p.health).toBe(PLAYER_MAX_HEALTH);
    damagePlayer(p, 30);
    expect(p.health).toBe(PLAYER_MAX_HEALTH - 30);
    damagePlayer(p, 1000);
    expect(p.health).toBe(0);
    expect(isDead(p)).toBe(true);
  });
});

describe('kills and XP', () => {
  it('removes dead zombies and awards their XP', () => {
    const dead = createZombie('walker', vec(0, 0));
    dead.health = 0;
    const alive = createZombie('walker', vec(0, 0));
    const r = collectKills([dead, alive]);
    expect(r.alive).toEqual([alive]);
    expect(r.xp).toBe(ZOMBIES.walker.xp);
    expect(r.kills).toBe(1);
  });
});

describe('spawning', () => {
  it('picks a spot clear of walls and away from the player', () => {
    const walls = [{ x: 0, y: 0, w: 500, h: 1000 }];
    for (let i = 0; i < 20; i++) {
      const p = findSpawnPoint(vec(900, 500), 17, walls, 1280, 1000);
      expect(walls.some((w) => circleIntersectsRect(p, 17, w))).toBe(false);
      expect(Math.hypot(p.x - 900, p.y - 500)).toBeGreaterThanOrEqual(ZOMBIE_SPAWN_MIN_DISTANCE);
    }
  });
});
