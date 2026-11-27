import { describe, expect, it } from 'vitest';
import {
  buildSchedule,
  countsTowardCap,
  createWaveState,
  enemiesRemaining,
  notYetSpawned,
  totalInWave,
  updateWaves,
  type WaveState,
} from '../src/systems/waves';
import { waveHudLines } from '../src/ui/waveHud';
import { vec } from '../src/core/math';
import {
  ACTIVE_ZOMBIE_CAP,
  DEFAULT_GROUP_INTERVAL_SECONDS,
  FIXED_STEP_SECONDS,
  SPAWN_WARNING_SECONDS,
  TEST_LEVEL,
  ZOMBIES,
  type LevelDef,
  type WaveDef,
  type ZombieType,
} from '../src/data/config';

const steps = (seconds: number) => Math.round(seconds / FIXED_STEP_SECONDS);

const level = (waves: WaveDef[], intermissionSeconds = 1): LevelDef => ({
  ...TEST_LEVEL,
  name: 'unit',
  intermissionSeconds,
  waves,
});

/** Drives the wave manager with a fake zombie list instead of the real world. */
class Sim {
  state: WaveState;
  alive: ZombieType[] = [];
  safe = false;
  maxAlive = 0;
  maxSpawnPerStep = 0;
  spawnedTotal = 0;
  clears = 0;
  constructor(readonly lvl: LevelDef) {
    this.state = createWaveState(lvl);
  }
  step(): void {
    const r = updateWaves(this.state, this.lvl, FIXED_STEP_SECONDS, {
      activeStandard: this.alive.filter(countsTowardCap).length,
      activeTotal: this.alive.length,
      pickSpawnPoint: () => vec(0, 0),
      inSafeArea: () => this.safe,
    });
    this.state = r.state;
    let n = 0;
    for (const g of r.spawns) {
      for (let i = 0; i < g.count; i++) this.alive.push(g.type);
      n += g.count;
    }
    this.spawnedTotal += n;
    this.maxSpawnPerStep = Math.max(this.maxSpawnPerStep, n);
    this.maxAlive = Math.max(this.maxAlive, this.alive.length);
    if (r.cleared) this.clears++;
  }
  run(seconds: number): this {
    for (let i = 0; i < steps(seconds); i++) this.step();
    return this;
  }
  kill(n: number): void {
    this.alive.splice(0, n);
  }
}

describe('wave data', () => {
  it('splits a spawn group into batches of its group size, spaced by its interval', () => {
    const s = buildSchedule({ groups: [{ type: 'walker', count: 10, groupSize: 4, delaySeconds: 2, intervalSeconds: 3 }] });
    expect(s).toEqual([
      { type: 'walker', count: 4, time: 2 },
      { type: 'walker', count: 4, time: 5 },
      { type: 'walker', count: 2, time: 8 },
    ]);
  });

  it('uses the default interval when a group leaves it out', () => {
    const s = buildSchedule({ groups: [{ type: 'runner', count: 2, groupSize: 1, delaySeconds: 0 }] });
    expect(s.map((b) => b.time)).toEqual([0, DEFAULT_GROUP_INTERVAL_SECONDS]);
  });

  it('the test level has several waves and uses all four zombie types', () => {
    expect(TEST_LEVEL.waves.length).toBeGreaterThan(1);
    const used = new Set(TEST_LEVEL.waves.flatMap((w) => w.groups.map((g) => g.type)));
    expect([...used].sort()).toEqual((Object.keys(ZOMBIES) as ZombieType[]).sort());
    // At least one wave sends more than the cap so the queue gets used.
    expect(Math.max(...TEST_LEVEL.waves.map(totalInWave))).toBeGreaterThan(ACTIVE_ZOMBIE_CAP);
  });

  it('all current zombie types count toward the cap', () => {
    for (const t of Object.keys(ZOMBIES) as ZombieType[]) expect(countsTowardCap(t)).toBe(true);
  });
});

describe('spawning', () => {
  const one = level([{ groups: [{ type: 'walker', count: 4, groupSize: 4, delaySeconds: 0 }] }], 2);

  it('waits out the intermission before the first wave', () => {
    const sim = new Sim(one).run(2 - FIXED_STEP_SECONDS);
    expect(sim.state.phase).toBe('intermission');
    expect(sim.state.warnings).toHaveLength(0);
    sim.step();
    expect(sim.state.phase).toBe('active');
  });

  it('shows a warning first and spawns the group exactly when it runs out', () => {
    const sim = new Sim(one).run(2);
    expect(sim.state.warnings).toEqual([expect.objectContaining({ type: 'walker', count: 4 })]);
    expect(sim.alive).toHaveLength(0);
    sim.run(SPAWN_WARNING_SECONDS - FIXED_STEP_SECONDS);
    expect(sim.alive).toHaveLength(0);
    sim.step();
    expect(sim.alive).toHaveLength(4);
    expect(sim.state.warnings).toHaveLength(0);
  });

  it('enemies arrive in groups, never all at once', () => {
    const lvl = level([{ groups: [{ type: 'walker', count: 30, groupSize: 5, delaySeconds: 0, intervalSeconds: 2 }] }]);
    const sim = new Sim(lvl).run(30);
    expect(sim.spawnedTotal).toBe(30);
    expect(sim.maxSpawnPerStep).toBe(5);
  });

  it('moves a warning the player walked into and restarts its countdown', () => {
    const sim = new Sim(one).run(2);
    sim.safe = true;
    sim.run(SPAWN_WARNING_SECONDS);
    expect(sim.alive).toHaveLength(0);
    expect(sim.state.warnings[0].timeLeft).toBeCloseTo(SPAWN_WARNING_SECONDS);
    sim.safe = false;
    sim.run(SPAWN_WARNING_SECONDS);
    expect(sim.alive).toHaveLength(4);
  });
});

describe('active cap and queue', () => {
  const flood = level([{ groups: [{ type: 'walker', count: 60, groupSize: 10, delaySeconds: 0, intervalSeconds: 0.5 }] }]);

  it(`never has more than ${ACTIVE_ZOMBIE_CAP} alive; the rest wait in the queue`, () => {
    const sim = new Sim(flood).run(20);
    expect(sim.alive).toHaveLength(ACTIVE_ZOMBIE_CAP);
    expect(sim.maxAlive).toBe(ACTIVE_ZOMBIE_CAP);
    expect(notYetSpawned(sim.state)).toBe(60 - ACTIVE_ZOMBIE_CAP);
    expect(sim.state.warnings).toHaveLength(0); // no room, so no warnings either
  });

  it('queued zombies spawn as others die, still capped', () => {
    const sim = new Sim(flood).run(20);
    sim.kill(5);
    sim.run(SPAWN_WARNING_SECONDS + FIXED_STEP_SECONDS);
    expect(sim.alive).toHaveLength(ACTIVE_ZOMBIE_CAP);
    expect(notYetSpawned(sim.state)).toBe(60 - ACTIVE_ZOMBIE_CAP - 5);
    expect(sim.maxAlive).toBe(ACTIVE_ZOMBIE_CAP);
  });

  it('zombies behind a warning hold their place under the cap', () => {
    const sim = new Sim(level([{ groups: [{ type: 'walker', count: 6, groupSize: 6, delaySeconds: 0 }] }]));
    sim.alive = Array(ACTIVE_ZOMBIE_CAP - 2).fill('walker');
    sim.run(1);
    expect(sim.state.warnings.map((w) => w.count)).toEqual([2]);
    expect(sim.state.queue).toEqual([{ type: 'walker', count: 4 }]);
  });

  it('the cap holds through a long fight with steady kills', () => {
    const sim = new Sim(flood);
    let maxCommitted = 0; // alive plus those behind a warning
    for (let i = 0; i < steps(120); i++) {
      sim.step();
      maxCommitted = Math.max(maxCommitted, sim.alive.length + sim.state.warnings.reduce((n, w) => n + w.count, 0));
      if (i % 30 === 0) sim.kill(1); // two kills a second
    }
    expect(sim.maxAlive).toBeLessThanOrEqual(ACTIVE_ZOMBIE_CAP);
    expect(maxCommitted).toBe(ACTIVE_ZOMBIE_CAP);
    expect(sim.spawnedTotal).toBe(60);
  });
});

describe('wave completion', () => {
  const two = level(
    [
      { groups: [{ type: 'walker', count: 4, groupSize: 2, delaySeconds: 0, intervalSeconds: 5 }] },
      { groups: [{ type: 'runner', count: 2, groupSize: 2, delaySeconds: 0 }] },
    ],
    1,
  );

  it('does not end between batches, even with nothing alive', () => {
    const sim = new Sim(two).run(1 + SPAWN_WARNING_SECONDS + FIXED_STEP_SECONDS);
    expect(sim.alive).toHaveLength(2);
    sim.kill(2);
    sim.run(2);
    expect(sim.state.phase).toBe('active');
    expect(sim.state.waveIndex).toBe(0);
  });

  it('does not end while spawned zombies are still alive', () => {
    const sim = new Sim(two).run(10);
    expect(sim.spawnedTotal).toBe(4);
    expect(sim.state.phase).toBe('active');
    expect(sim.clears).toBe(0);
  });

  it('ends once everything has spawned and been defeated, then the next wave follows', () => {
    const sim = new Sim(two).run(10);
    sim.kill(4);
    sim.step();
    expect(sim.clears).toBe(1);
    expect(sim.state).toMatchObject({ phase: 'intermission', waveIndex: 1 });
    sim.run(1 + SPAWN_WARNING_SECONDS + FIXED_STEP_SECONDS);
    expect(sim.alive).toEqual(['runner', 'runner']);
  });

  it('clearing the last wave wins the level', () => {
    const sim = new Sim(two).run(10);
    sim.kill(4);
    sim.run(5);
    sim.kill(2);
    sim.step();
    expect(sim.state.phase).toBe('victory');
    expect(sim.clears).toBe(2);
    sim.run(5);
    expect(sim.spawnedTotal).toBe(6);
  });
});

describe('wave HUD', () => {
  const two = level(
    [
      { groups: [{ type: 'walker', count: 4, groupSize: 2, delaySeconds: 0, intervalSeconds: 5 }] },
      { groups: [{ type: 'runner', count: 2, groupSize: 2, delaySeconds: 0 }] },
    ],
    3,
  );

  it('shows the wave number, countdown and enemies left', () => {
    const sim = new Sim(two);
    expect(waveHudLines(sim.state, 2, 0)).toEqual(['WAVE 1 / 2', 'STARTS IN 3s']);
    sim.run(3);
    expect(waveHudLines(sim.state, 2, sim.alive.length)).toEqual(['WAVE 1 / 2', 'ENEMIES LEFT 4']);
    sim.run(10);
    sim.kill(1);
    expect(enemiesRemaining(sim.state, sim.alive.length)).toBe(3);
    sim.kill(3);
    sim.step();
    expect(waveHudLines(sim.state, 2, 0)).toEqual(['WAVE 2 / 2', 'STARTS IN 3s']);
    sim.run(3);
    expect(waveHudLines(sim.state, 2, sim.alive.length)).toEqual(['WAVE 2 / 2', 'ENEMIES LEFT 2']);
    sim.run(5);
    sim.kill(2);
    sim.step();
    expect(waveHudLines(sim.state, 2, 0)[0]).toBe('ALL WAVES CLEARED');
  });
});
