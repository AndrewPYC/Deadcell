import { describe, expect, it } from 'vitest';
import {
  createLevelState,
  damageObjective,
  mandatoryWavesDone,
  pointInZone,
  segmentForWave,
  updateLevel,
  type LevelSnapshot,
  type LevelState,
} from '../src/systems/levelManager';
import type { WaveState } from '../src/systems/waves';
import { vec } from '../src/core/math';
import { LEVEL_1, TEST_LEVEL, type LevelDef, type ObjectiveDef, type WaveDef } from '../src/data/config';

const ZONE = { x: 100, y: 100, w: 50, h: 50 };
const IN_ZONE = vec(125, 125);
const OUTSIDE = vec(400, 400);
const wave: WaveDef = { groups: [{ type: 'walker', count: 1, groupSize: 1, delaySeconds: 0 }] };

const level = (objective: ObjectiveDef, waves: WaveDef[] = [wave, wave]): LevelDef => ({
  ...TEST_LEVEL,
  id: 7,
  objective,
  waves,
  segments: [{ label: 'x', difficulty: 1, waveCount: waves.length }],
  rewards: { bonusXp: 250, weapons: ['shotgun'], levels: [8] },
});

const waves = (phase: WaveState['phase'], waveIndex: number): WaveState => ({
  phase,
  waveIndex,
  timer: 0,
  pending: [],
  queue: [],
  warnings: [],
});
const ALL_CLEARED = waves('victory', 1);

const snap = (over: Partial<LevelSnapshot> = {}): LevelSnapshot => ({
  waves: waves('active', 0),
  playerHealth: 100,
  playerPos: OUTSIDE,
  xpEarned: 40,
  ...over,
});

describe('mandatory waves', () => {
  it('are done only once every mandatory wave is cleared', () => {
    const l = level({ kind: 'clearWaves' });
    expect(mandatoryWavesDone(l, waves('intermission', 0))).toBe(false);
    expect(mandatoryWavesDone(l, waves('active', 1))).toBe(false);
    expect(mandatoryWavesDone(l, ALL_CLEARED)).toBe(true);
  });

  it('ignore trailing optional waves', () => {
    const l = level({ kind: 'clearWaves' }, [wave, { ...wave, mandatory: false }]);
    expect(mandatoryWavesDone(l, waves('active', 0))).toBe(false);
    expect(mandatoryWavesDone(l, waves('intermission', 1))).toBe(true); // wave 1 cleared, optional wave 2 next
  });
});

describe('win conditions', () => {
  it('clearWaves: wins on the step the last mandatory wave is cleared', () => {
    const l = level({ kind: 'clearWaves' });
    let s = createLevelState(l);
    s = updateLevel(s, l, snap({ waves: waves('active', 1) })).state;
    expect(s.status).toBe('playing');
    const step = updateLevel(s, l, snap({ waves: ALL_CLEARED }));
    expect(step.state.status).toBe('won');
    expect(step.finished).toEqual({
      levelId: 7,
      outcome: 'victory',
      defeatReason: null,
      xpEarned: 40,
      rewards: l.rewards,
    });
  });

  it('extraction: the zone stays closed until the waves are done, even if the player stands in it', () => {
    const l = level({ kind: 'extraction', zone: ZONE });
    let s = createLevelState(l);
    expect(s.objectiveActive).toBe(false);
    const early = updateLevel(s, l, snap({ waves: waves('active', 1), playerPos: IN_ZONE }));
    expect(early.state.objectiveActive).toBe(false);
    expect(early.finished).toBeNull();

    s = updateLevel(early.state, l, snap({ waves: ALL_CLEARED, playerPos: OUTSIDE })).state;
    expect(s.objectiveActive).toBe(true);
    expect(s.status).toBe('playing'); // waves done is not enough

    const won = updateLevel(s, l, snap({ waves: ALL_CLEARED, playerPos: IN_ZONE }));
    expect(won.state.status).toBe('won');
    expect(won.finished?.outcome).toBe('victory');
  });

  it('protect: wins when the waves are done and the target still stands', () => {
    const l = level({ kind: 'protect', target: ZONE, health: 200 });
    let s = createLevelState(l);
    expect(s.objectiveHealth).toBe(200);
    s = damageObjective(s, 150);
    const step = updateLevel(s, l, snap({ waves: ALL_CLEARED }));
    expect(step.state.status).toBe('won');
  });

  it('reports the result once; later steps return nothing', () => {
    const l = level({ kind: 'clearWaves' });
    const first = updateLevel(createLevelState(l), l, snap({ waves: ALL_CLEARED }));
    const again = updateLevel(first.state, l, snap({ waves: ALL_CLEARED }));
    expect(first.finished).not.toBeNull();
    expect(again.finished).toBeNull();
    expect(again.state).toBe(first.state);
  });
});

describe('lose conditions', () => {
  it('loses when the player reaches 0 health', () => {
    const l = level({ kind: 'clearWaves' });
    const step = updateLevel(createLevelState(l), l, snap({ playerHealth: 0 }));
    expect(step.state.status).toBe('lost');
    expect(step.state.defeatReason).toBe('playerDied');
    expect(step.finished).toMatchObject({ outcome: 'defeat', defeatReason: 'playerDied', xpEarned: 40 });
  });

  it('dying on the step you reach the extraction zone is still a loss', () => {
    const l = level({ kind: 'extraction', zone: ZONE });
    let s = updateLevel(createLevelState(l), l, snap({ waves: ALL_CLEARED })).state;
    s = updateLevel(s, l, snap({ waves: ALL_CLEARED, playerPos: IN_ZONE, playerHealth: 0 })).state;
    expect(s.status).toBe('lost');
  });

  it('loses when a protected objective is destroyed, even mid-wave', () => {
    const l = level({ kind: 'protect', target: ZONE, health: 100 });
    const s = damageObjective(createLevelState(l), 100);
    expect(s.objectiveHealth).toBe(0);
    const step = updateLevel(s, l, snap({ waves: waves('active', 0) }));
    expect(step.state.status).toBe('lost');
    expect(step.finished).toMatchObject({ outcome: 'defeat', defeatReason: 'objectiveDestroyed' });
  });

  it('a destroyed objective beats clearing the last wave on the same step', () => {
    const l = level({ kind: 'protect', target: ZONE, health: 10 });
    const s = damageObjective(createLevelState(l), 50);
    expect(updateLevel(s, l, snap({ waves: ALL_CLEARED })).state.status).toBe('lost');
  });

  it('damageObjective does nothing to levels without a protect target', () => {
    const l = level({ kind: 'clearWaves' });
    const s: LevelState = createLevelState(l);
    expect(damageObjective(s, 50)).toBe(s);
  });
});

describe('helpers', () => {
  it('pointInZone includes the edges', () => {
    expect(pointInZone(vec(100, 100), ZONE)).toBe(true);
    expect(pointInZone(vec(150, 150), ZONE)).toBe(true);
    expect(pointInZone(vec(151, 125), ZONE)).toBe(false);
  });

  it('segmentForWave walks the segments in order', () => {
    const names = LEVEL_1.waves.map((_, i) => segmentForWave(LEVEL_1, i).index);
    expect(names).toEqual([0, 0, 1, 1, 2]);
    expect(segmentForWave(LEVEL_1, 99).index).toBe(2);
  });
});
