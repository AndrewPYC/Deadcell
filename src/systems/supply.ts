import { vec, type Vec2 } from '../core/math';
import {
  TIMER_EPSILON,
  type DropRule,
  type PickupKind,
  type SupplyConfig,
  type SupplyPointDef,
  type WeightedPickup,
  type ZombieType,
} from '../data/config';
import { createDroppedPickup, createSupplyPickup, type Pickup } from '../entities/pickup';

/** Picks one kind from a weighted table. `rng` returns [0, 1). */
export function rollKind(table: readonly WeightedPickup[], rng: () => number): PickupKind | null {
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const e of table) {
    r -= e.weight;
    if (r < 0) return e.kind;
  }
  return table[table.length - 1].kind;
}

const droppedOnGround = (pickups: readonly Pickup[]): number => pickups.filter((p) => p.supplyPoint === null).length;

/** A killed zombie may drop a pickup, per the level's drop rule. */
export function rollDrop(
  type: ZombieType,
  pos: Vec2,
  rule: DropRule,
  pickups: readonly Pickup[],
  rng: () => number,
): Pickup | null {
  if (droppedOnGround(pickups) >= rule.maxOnGround) return null;
  if (rng() >= rule.chance[type]) return null;
  const kind = rollKind(rule.table, rng);
  return kind ? createDroppedPickup(kind, pos, rule.lifetimeSeconds) : null;
}

/** A spot with a fixed kind always holds that kind; otherwise one is rolled from the table. */
const kindFor = (point: SupplyPointDef, config: SupplyConfig, rng: () => number): PickupKind | null =>
  point.kind ?? rollKind(config.table, rng);

/** Every supply location starts stocked. */
export function stockSupplyPoints(config: SupplyConfig, rng: () => number): Pickup[] {
  const out: Pickup[] = [];
  config.points.forEach((p, i) => {
    const kind = kindFor(p, config, rng);
    if (kind) out.push(createSupplyPickup(kind, vec(p.x, p.y), i));
  });
  return out;
}

export const createSupplyTimers = (config: SupplyConfig): number[] => config.points.map(() => config.respawnSeconds);

export interface SupplyStep {
  timers: number[];
  spawned: Pickup[];
}

/**
 * Each supply location refills `respawnSeconds` after its pickup is taken. The timer only
 * runs while the location is empty.
 */
export function updateSupplyPoints(
  timers: readonly number[],
  pickups: readonly Pickup[],
  config: SupplyConfig,
  dt: number,
  rng: () => number,
): SupplyStep {
  const spawned: Pickup[] = [];
  const next = timers.map((t, i) => {
    if (pickups.some((p) => p.supplyPoint === i)) return config.respawnSeconds;
    const left = t - dt;
    if (left > TIMER_EPSILON) return left;
    const at = config.points[i];
    const kind = kindFor(at, config, rng);
    if (kind) spawned.push(createSupplyPickup(kind, vec(at.x, at.y), i));
    return config.respawnSeconds;
  });
  return { timers: next, spawned };
}
