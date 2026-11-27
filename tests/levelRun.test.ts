import { describe, expect, it } from 'vitest';
import { createWorld, isLevelClear, standardAlive, updateWorld } from '../src/world';
import { enemiesRemaining, totalInWave } from '../src/systems/waves';
import { waveHudLines } from '../src/ui/waveHud';
import type { Zombie } from '../src/entities/zombie';
import { ACTIVE_ZOMBIE_CAP, FIXED_STEP_SECONDS, TEST_LEVEL, ZOMBIES, ZOMBIE_SPAWN_MIN_DISTANCE } from '../src/data/config';
import { idleInput, seeded } from './helpers';

/** Fastest zombie's move in one step, plus a little for separation. */
const STEP_SLACK = ZOMBIES.runner.speed * FIXED_STEP_SECONDS * 2;

describe('test level, start to finish', () => {
  it('plays every wave in order, holds the cap, and ends in victory', () => {
    const world = createWorld('zane', TEST_LEVEL, undefined, seeded(7));
    const steps = Math.round(600 / FIXED_STEP_SECONDS); // generous upper bound
    const killEvery = Math.round(1 / FIXED_STEP_SECONDS); // one kill per second, so wave 3 hits the cap

    const seen = new Set<Zombie>();
    const titles: string[] = [];
    const startCounts: number[] = [];
    let maxStandard = 0;
    let maxCommitted = 0; // alive plus those behind a warning
    let closestSpawn = Infinity;
    let dropsSeen = 0;
    let kills = 0;
    let lastPhase = world.waves.phase;

    for (let i = 0; i < steps && !isLevelClear(world); i++) {
      world.player.health = world.player.maxHealth; // keep the test player alive
      if (i % killEvery === 0 && world.zombies.length > 0) {
        world.zombies[0].health = 0; // the "player" kills the oldest zombie
        kills++;
      }
      updateWorld(world, idleInput, FIXED_STEP_SECONDS);

      maxStandard = Math.max(maxStandard, standardAlive(world.zombies));
      const incoming = world.waves.warnings.reduce((n, w) => n + w.count, 0);
      maxCommitted = Math.max(maxCommitted, standardAlive(world.zombies) + incoming);
      for (const z of world.zombies) {
        if (seen.has(z)) continue;
        seen.add(z);
        closestSpawn = Math.min(closestSpawn, Math.hypot(z.pos.x - world.player.pos.x, z.pos.y - world.player.pos.y));
      }
      dropsSeen = Math.max(dropsSeen, world.pickups.filter((p) => p.supplyPoint === null).length);

      const [title] = waveHudLines(world.waves, TEST_LEVEL.waves.length, world.zombies.length);
      if (titles[titles.length - 1] !== title) titles.push(title);
      if (world.waves.phase === 'active' && lastPhase !== 'active') {
        startCounts.push(enemiesRemaining(world.waves, world.zombies.length));
      }
      lastPhase = world.waves.phase;
    }

    expect(isLevelClear(world)).toBe(true);
    expect(titles).toEqual(['WAVE 1 / 3', 'WAVE 2 / 3', 'WAVE 3 / 3', 'ALL WAVES CLEARED']);
    expect(startCounts).toEqual(TEST_LEVEL.waves.map(totalInWave));
    const total = TEST_LEVEL.waves.reduce((n, w) => n + totalInWave(w), 0);
    expect(seen.size).toBe(total);
    expect(kills).toBe(total);
    expect(maxStandard).toBeLessThanOrEqual(ACTIVE_ZOMBIE_CAP);
    expect(maxCommitted).toBe(ACTIVE_ZOMBIE_CAP); // the cap was reached, never passed
    // Measured after the spawn step, so allow for one step of walking and push-apart.
    expect(closestSpawn).toBeGreaterThanOrEqual(ZOMBIE_SPAWN_MIN_DISTANCE - STEP_SLACK);
    expect(dropsSeen).toBeGreaterThan(0);
  });
});
