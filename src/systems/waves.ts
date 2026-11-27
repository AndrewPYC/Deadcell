import type { Vec2 } from '../core/math';
import {
  ACTIVE_ZOMBIE_CAP,
  CAP_EXEMPT_TYPES,
  DEFAULT_GROUP_INTERVAL_SECONDS,
  SPAWN_WARNING_SECONDS,
  TIMER_EPSILON,
  type LevelDef,
  type WaveDef,
  type ZombieType,
} from '../data/config';

/**
 * Wave flow for a level: intermission countdown → active wave → (all spawned and all dead)
 * → next intermission … → victory after the last wave.
 *
 * Inside a wave: batches come due on a schedule and join a queue. Queued zombies become
 * spawn warnings only while there is room under the active cap; a warning turns into real
 * zombies once its timer runs out.
 */
export type WavePhase = 'intermission' | 'active' | 'victory';

export interface Batch {
  type: ZombieType;
  count: number;
  /** Seconds after the wave starts when this batch is due. */
  time: number;
}

export interface QueuedGroup {
  type: ZombieType;
  count: number;
}

export interface SpawnWarning extends QueuedGroup {
  pos: Vec2;
  timeLeft: number;
}

export interface WaveState {
  /** Current (or upcoming, during intermission) wave, 0-based. */
  waveIndex: number;
  phase: WavePhase;
  /** Intermission: seconds left. Active: seconds since the wave started. */
  timer: number;
  /** Batches not yet due, sorted by time. */
  pending: Batch[];
  /** Due but waiting for room under the cap. */
  queue: QueuedGroup[];
  /** Visible markers; each becomes a group of zombies when its timer runs out. */
  warnings: SpawnWarning[];
}

export interface WaveContext {
  /** Standard (capped) zombies alive right now. */
  activeStandard: number;
  /** Every zombie alive right now. */
  activeTotal: number;
  /** A spawn spot outside the player's safe area. */
  pickSpawnPoint: (type: ZombieType) => Vec2;
  /** True when a spot is inside the player's safe area (the player walked toward it). */
  inSafeArea: (pos: Vec2) => boolean;
}

export interface GroupSpawn extends QueuedGroup {
  pos: Vec2;
}

export interface WaveStep {
  state: WaveState;
  /** Groups whose warning ran out this step; the caller creates the zombies. */
  spawns: GroupSpawn[];
  /** True on the step a wave was cleared. */
  cleared: boolean;
}

export const countsTowardCap = (type: ZombieType): boolean => !CAP_EXEMPT_TYPES.includes(type);

const sum = (groups: readonly QueuedGroup[]): number => groups.reduce((n, g) => n + g.count, 0);
const standardIn = (groups: readonly QueuedGroup[]): number =>
  sum(groups.filter((g) => countsTowardCap(g.type)));

/** Splits each spawn group into batches of groupSize, spaced by its interval. */
export function buildSchedule(wave: WaveDef): Batch[] {
  const out: Batch[] = [];
  for (const g of wave.groups) {
    const size = Math.max(1, g.groupSize);
    const interval = g.intervalSeconds ?? DEFAULT_GROUP_INTERVAL_SECONDS;
    for (let k = 0, left = g.count; left > 0; k++, left -= size) {
      out.push({ type: g.type, count: Math.min(size, left), time: g.delaySeconds + k * interval });
    }
  }
  return out.sort((a, b) => a.time - b.time); // stable, so equal times keep level order
}

export const totalInWave = (wave: WaveDef): number => wave.groups.reduce((n, g) => n + g.count, 0);

export const createWaveState = (level: LevelDef): WaveState => ({
  waveIndex: 0,
  phase: level.waves.length > 0 ? 'intermission' : 'victory',
  timer: level.intermissionSeconds,
  pending: [],
  queue: [],
  warnings: [],
});

/** Zombies of this wave not yet on the map: scheduled, queued or behind a warning. */
export const notYetSpawned = (s: WaveState): number => sum(s.pending) + sum(s.queue) + sum(s.warnings);

/** HUD count: everything still to beat in this wave, alive or on its way. */
export const enemiesRemaining = (s: WaveState, alive: number): number => notYetSpawned(s) + alive;

function startWave(s: WaveState, level: LevelDef): WaveState {
  return { ...s, phase: 'active', timer: 0, pending: buildSchedule(level.waves[s.waveIndex]), queue: [], warnings: [] };
}

function finishWave(s: WaveState, level: LevelDef): WaveState {
  const empty = { pending: [], queue: [], warnings: [] };
  if (s.waveIndex + 1 >= level.waves.length) return { ...s, ...empty, phase: 'victory', timer: 0 };
  return { ...s, ...empty, phase: 'intermission', waveIndex: s.waveIndex + 1, timer: level.intermissionSeconds };
}

export function updateWaves(s: WaveState, level: LevelDef, dt: number, ctx: WaveContext): WaveStep {
  if (s.phase === 'victory') return { state: s, spawns: [], cleared: false };
  if (s.phase === 'intermission') {
    const left = s.timer - dt;
    if (left > TIMER_EPSILON) return { state: { ...s, timer: left }, spawns: [], cleared: false };
    s = startWave(s, level); // the first batches may come due this same step
  }

  // 1. Batches whose time has come join the back of the queue.
  const due = s.pending.filter((b) => b.time <= s.timer + TIMER_EPSILON);
  const pending = s.pending.slice(due.length);
  const queue: QueuedGroup[] = [...s.queue, ...due.map(({ type, count }) => ({ type, count }))];

  // 2. Warnings count down; finished ones spawn, unless the player has walked into them.
  const spawns: GroupSpawn[] = [];
  const warnings: SpawnWarning[] = [];
  for (const w of s.warnings) {
    const timeLeft = w.timeLeft - dt;
    if (timeLeft > TIMER_EPSILON) warnings.push({ ...w, timeLeft });
    else if (ctx.inSafeArea(w.pos)) warnings.push({ ...w, pos: ctx.pickSpawnPoint(w.type), timeLeft: SPAWN_WARNING_SECONDS });
    else spawns.push({ type: w.type, count: w.count, pos: w.pos });
  }

  // 3. Queued zombies get a warning only while there is room under the cap. Zombies behind
  //    a warning or spawning this step already hold their place.
  let room = ACTIVE_ZOMBIE_CAP - ctx.activeStandard - standardIn(spawns) - standardIn(warnings);
  const waiting: QueuedGroup[] = [];
  const warn = (type: ZombieType, count: number) =>
    warnings.push({ type, count, pos: ctx.pickSpawnPoint(type), timeLeft: SPAWN_WARNING_SECONDS });
  for (const g of queue) {
    if (!countsTowardCap(g.type)) {
      warn(g.type, g.count);
      continue;
    }
    const take = Math.max(0, Math.min(g.count, room));
    if (take > 0) warn(g.type, take);
    room -= take;
    if (take < g.count) waiting.push({ type: g.type, count: g.count - take });
  }

  // 4. The wave ends only once everything scheduled has spawned and been defeated.
  const next: WaveState = { ...s, pending, queue: waiting, warnings };
  const done = pending.length === 0 && waiting.length === 0 && warnings.length === 0 && spawns.length === 0;
  if (done && ctx.activeTotal === 0) return { state: finishWave(next, level), spawns, cleared: true };
  return { state: { ...next, timer: s.timer + dt }, spawns, cleared: false };
}
