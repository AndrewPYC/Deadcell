import { describe, expect, it } from 'vitest';
import { createWorld, updateWorld } from '../src/world';
import { applyLevelResult, createProfile } from '../src/systems/profile';
import { validateLevel } from '../src/systems/levelValidation';
import { totalInWave } from '../src/systems/waves';
import { buildNavGrid, computeFlowField, cellIndex } from '../src/systems/navigation';
import { endScreenText } from '../src/ui/gameOver';
import { waveHudLines } from '../src/ui/waveHud';
import { objectiveHint } from '../src/ui/objective';
import type { LevelResult } from '../src/systems/levelManager';
import { vec } from '../src/core/math';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FIXED_STEP_SECONDS,
  LEVEL_1,
  LEVELS,
  NAV_CELL_SIZE,
  PLAYER_RADIUS,
  TEST_LEVEL,
  ZOMBIES,
  type ZombieType,
} from '../src/data/config';
import { heldKeys, idleInput, seeded } from './helpers';

/** { walker: 6 } style counts for one wave. */
const composition = (i: number): Partial<Record<ZombieType, number>> => {
  const out: Partial<Record<ZombieType, number>> = {};
  for (const g of LEVEL_1.waves[i].groups) out[g.type] = (out[g.type] ?? 0) + g.count;
  return out;
};

describe('Level 1 definition', () => {
  it('is The Outbreak with the five waves from the brief, all mandatory', () => {
    expect(LEVEL_1.id).toBe(1);
    expect(LEVEL_1.name).toBe('The Outbreak');
    expect(LEVEL_1.waves.map((_, i) => composition(i))).toEqual([
      { walker: 6 },
      { walker: 9 },
      { walker: 8, runner: 3 },
      { walker: 12, runner: 5 },
      { walker: 15, runner: 8 },
    ]);
    expect(LEVEL_1.waves.every((w) => w.mandatory !== false)).toBe(true);
  });

  it('ends with extraction and rewards 250 XP, the shotgun and Level 2', () => {
    expect(LEVEL_1.objective.kind).toBe('extraction');
    expect(LEVEL_1.rewards).toEqual({ bonusXp: 250, weapons: ['shotgun'], levels: [2] });
  });

  it('has both ammo and medkit spots', () => {
    const kinds = new Set(LEVEL_1.supply.points.map((p) => p.kind));
    expect(kinds).toEqual(new Set(['ammo', 'medkit']));
  });

  it('every level definition passes validation', () => {
    for (const level of [...LEVELS, TEST_LEVEL]) expect(validateLevel(level, CANVAS_WIDTH, CANVAS_HEIGHT)).toEqual([]);
  });

  it('every open spot is reachable from the start, for the player and each zombie in the level', () => {
    const radii = new Set([PLAYER_RADIUS, ...LEVEL_1.waves.flatMap((w) => w.groups.map((g) => ZOMBIES[g.type].radius))]);
    const start = vec(LEVEL_1.playerStart.x, LEVEL_1.playerStart.y);
    for (const r of radii) {
      const grid = buildNavGrid(CANVAS_WIDTH, CANVAS_HEIGHT, NAV_CELL_SIZE, LEVEL_1.walls, r);
      const field = computeFlowField(grid, start);
      const unreachable = [...grid.blocked.keys()].filter((i) => !grid.blocked[i] && !Number.isFinite(field.cost[i]));
      expect(unreachable, `radius ${r}`).toEqual([]);
    }
    // The places the player has to get to.
    const grid = buildNavGrid(CANVAS_WIDTH, CANVAS_HEIGHT, NAV_CELL_SIZE, LEVEL_1.walls, PLAYER_RADIUS);
    const field = computeFlowField(grid, start);
    const zone = LEVEL_1.objective.kind === 'extraction' ? LEVEL_1.objective.zone : null;
    const targets = [...LEVEL_1.supply.points, ...(zone ? [{ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 }] : [])];
    for (const t of targets) expect(Number.isFinite(field.cost[cellIndex(grid, vec(t.x, t.y))])).toBe(true);
  });

  it('has a narrow passage (an alley 80 px wide or less) and open space', () => {
    const top = LEVEL_1.walls.filter((w) => w.y < CANVAS_HEIGHT / 2 && w.h > 100).sort((a, b) => a.x - b.x);
    const gaps = top.slice(1).map((w, i) => w.x - (top[i].x + top[i].w));
    expect(Math.min(...gaps)).toBeLessThanOrEqual(80);
    expect(Math.max(...gaps)).toBeGreaterThanOrEqual(150);
  });
});

describe('Level 1, start to finish', () => {
  it('opens extraction only after wave 5, wins on entering it, and unlocks the shotgun and Level 2', () => {
    const world = createWorld('zane', LEVEL_1, createProfile().ownedWeapons, seeded(11));
    expect(world.player.loadout.owned).toEqual(['assaultRifle']);
    expect(world.player.pos).toEqual(vec(LEVEL_1.playerStart.x, LEVEL_1.playerStart.y));

    const killEvery = Math.round(1 / FIXED_STEP_SECONDS);
    const maxSteps = Math.round(900 / FIXED_STEP_SECONDS);
    let kills = 0;
    let result: LevelResult | null = null;
    const wavesDone = () => world.waves.phase === 'victory';
    for (let i = 0; i < maxSteps && !wavesDone(); i++) {
      world.player.health = world.player.maxHealth; // keep the test player alive
      if (i % killEvery === 0 && world.zombies.length > 0) {
        world.zombies[0].health = 0;
        kills++;
      }
      result = updateWorld(world, idleInput, FIXED_STEP_SECONDS) ?? result;
      if (!wavesDone()) {
        expect(world.levelState.objectiveActive, `zone open during wave ${world.waves.waveIndex + 1}`).toBe(false);
      }
    }
    expect(world.waves.phase).toBe('victory');
    expect(kills).toBe(LEVEL_1.waves.reduce((n, w) => n + totalInWave(w), 0));

    // Waves done: the zone is open, but the level isn't won until the player walks in.
    expect(world.levelState.objectiveActive).toBe(true);
    expect(world.levelState.status).toBe('playing');
    expect(result).toBeNull();
    expect(waveHudLines(world.waves, 5, 0, objectiveHint(LEVEL_1, world.levelState))).toEqual([
      'ALL WAVES CLEARED',
      'REACH THE EXTRACTION ZONE',
    ]);
    for (let k = 0; k < Math.round(5 / FIXED_STEP_SECONDS); k++) updateWorld(world, idleInput, FIXED_STEP_SECONDS);
    expect(world.levelState.status).toBe('playing'); // standing around doesn't win

    // Walk north into the zone from just below it.
    if (LEVEL_1.objective.kind !== 'extraction') throw new Error('Level 1 must end with extraction');
    const zone = LEVEL_1.objective.zone;
    world.player.pos = vec(zone.x + zone.w / 2, zone.y + zone.h + 20);
    const walkUp = heldKeys('KeyW');
    for (let k = 0; k < Math.round(2 / FIXED_STEP_SECONDS) && !result; k++) {
      result = updateWorld(world, walkUp, FIXED_STEP_SECONDS);
    }
    expect(world.levelState.status).toBe('won');
    expect(result).toMatchObject({ levelId: 1, outcome: 'victory', xpEarned: world.player.xp });

    const profile = applyLevelResult(createProfile(), result!);
    expect(profile.ownedWeapons).toEqual(['assaultRifle', 'shotgun']);
    expect(profile.unlockedLevels).toEqual([1, 2]);
    expect(profile.xp).toBe(world.player.xp + 250);
    expect(endScreenText(world.levelState, LEVEL_1, world.player.xp)?.lines).toEqual([
      `XP ${world.player.xp} + 250 BONUS`,
      'SHOTGUN UNLOCKED  ·  LEVEL 2 UNLOCKED',
      'Press Enter to play again',
    ]);

    // The world stops after the result; nothing more is reported.
    expect(updateWorld(world, idleInput, FIXED_STEP_SECONDS)).toBeNull();
    // The next run starts with the shotgun owned.
    expect(createWorld('zane', LEVEL_1, profile.ownedWeapons).player.loadout.owned).toContain('shotgun');
  });

  it('is lost when the player dies, with no rewards', () => {
    const world = createWorld('zane', LEVEL_1, createProfile().ownedWeapons, seeded(3));
    world.player.health = 0;
    const result = updateWorld(world, idleInput, FIXED_STEP_SECONDS);
    expect(result).toMatchObject({ outcome: 'defeat', defeatReason: 'playerDied' });
    const profile = applyLevelResult(createProfile(), result!);
    expect(profile.ownedWeapons).toEqual(['assaultRifle']);
    expect(profile.unlockedLevels).toEqual([1]);
    expect(endScreenText(world.levelState, LEVEL_1, 0)?.title).toBe('YOU DIED');
  });
});
