import type { Vec2 } from '../core/math';
import type { DifficultySegment, LevelDef, LevelRewards, ZoneDef } from '../data/config';
import type { WaveState } from './waves';

/**
 * Tracks one level's win and lose conditions (spec §3, §3.1, §9):
 * - lose when the player's health is 0, or a protected objective is destroyed;
 * - win when every mandatory wave is cleared and the final objective is done.
 * Reports the result exactly once, on the step the level ends.
 */
export type LevelStatus = 'playing' | 'won' | 'lost';
export type DefeatReason = 'playerDied' | 'objectiveDestroyed';

export interface LevelState {
  status: LevelStatus;
  /** True once the final objective is live (e.g. the extraction zone is open). */
  objectiveActive: boolean;
  /** Health of a protect objective; null for other kinds. */
  objectiveHealth: number | null;
  defeatReason: DefeatReason | null;
}

export interface LevelResult {
  levelId: number;
  outcome: 'victory' | 'defeat';
  defeatReason: DefeatReason | null;
  /** XP earned from kills during the run. */
  xpEarned: number;
  /** The level's rewards; granted only on victory. */
  rewards: LevelRewards;
}

/** What the level manager reads from the world each step. */
export interface LevelSnapshot {
  waves: WaveState;
  playerHealth: number;
  playerPos: Vec2;
  xpEarned: number;
}

export interface LevelStep {
  state: LevelState;
  /** Set only on the step the level ends. */
  finished: LevelResult | null;
}

export const createLevelState = (level: LevelDef): LevelState => ({
  status: 'playing',
  objectiveActive: level.objective.kind === 'protect', // a protect target is at risk from the start
  objectiveHealth: level.objective.kind === 'protect' ? level.objective.health : null,
  defeatReason: null,
});

/** Waves fully cleared so far. During an intermission, waveIndex is the next wave. */
export const wavesCleared = (s: WaveState, totalWaves: number): number =>
  s.phase === 'victory' ? totalWaves : s.waveIndex;

/** True when every mandatory wave has been cleared. A level with none is done at once. */
export function mandatoryWavesDone(level: LevelDef, s: WaveState): boolean {
  const cleared = wavesCleared(s, level.waves.length);
  return level.waves.every((w, i) => w.mandatory === false || i < cleared);
}

export const pointInZone = (p: Vec2, z: ZoneDef): boolean =>
  p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;

/** Damages a protect objective. Does nothing for other kinds or after the level ended. */
export function damageObjective(s: LevelState, amount: number): LevelState {
  if (s.objectiveHealth === null || s.status !== 'playing' || amount <= 0) return s;
  return { ...s, objectiveHealth: Math.max(0, s.objectiveHealth - amount) };
}

function objectiveComplete(level: LevelDef, s: LevelState, snap: LevelSnapshot): boolean {
  switch (level.objective.kind) {
    case 'clearWaves':
      return true;
    case 'extraction':
      return pointInZone(snap.playerPos, level.objective.zone);
    case 'protect':
      return (s.objectiveHealth ?? 0) > 0;
  }
}

function defeatReason(s: LevelState, snap: LevelSnapshot): DefeatReason | null {
  if (snap.playerHealth <= 0) return 'playerDied';
  if (s.objectiveHealth !== null && s.objectiveHealth <= 0) return 'objectiveDestroyed';
  return null;
}

export function updateLevel(s: LevelState, level: LevelDef, snap: LevelSnapshot): LevelStep {
  if (s.status !== 'playing') return { state: s, finished: null };
  const result = (outcome: LevelResult['outcome'], reason: DefeatReason | null): LevelResult => ({
    levelId: level.id,
    outcome,
    defeatReason: reason,
    xpEarned: snap.xpEarned,
    rewards: level.rewards,
  });

  // Losing is checked first: dying on the step you reach the zone is still a loss.
  const reason = defeatReason(s, snap);
  if (reason) return { state: { ...s, status: 'lost', defeatReason: reason }, finished: result('defeat', reason) };

  if (!mandatoryWavesDone(level, snap.waves)) return { state: s, finished: null };
  const active = { ...s, objectiveActive: true };
  if (!objectiveComplete(level, active, snap)) return { state: active, finished: null };
  return { state: { ...active, status: 'won' }, finished: result('victory', null) };
}

/** The difficulty segment a wave (0-based) belongs to; the last one for indexes past the end. */
export function segmentForWave(level: LevelDef, waveIndex: number): { segment: DifficultySegment; index: number } {
  let first = 0;
  for (let i = 0; i < level.segments.length; i++) {
    first += level.segments[i].waveCount;
    if (waveIndex < first) return { segment: level.segments[i], index: i };
  }
  const last = level.segments.length - 1;
  return { segment: level.segments[last], index: last };
}
