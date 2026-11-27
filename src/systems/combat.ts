import type { Vec2 } from '../core/math';
import type { Detonation, Projectile } from '../entities/projectile';
import { circlesOverlap } from './collision';

/** Anything projectiles can hit. Targets use it now; zombies will later. */
export interface Damageable {
  pos: Vec2;
  radius: number;
  health: number;
  flashLeft: number;
}

export interface DirectHitDetonation extends Detonation {
  /** The target the rocket struck; it takes direct-hit damage, not splash. */
  directTarget: Damageable;
}

export interface HitResult {
  projectiles: Projectile[];
  hits: number;
  detonations: DirectHitDetonation[];
}

export interface PlayerHitResult {
  projectiles: Projectile[];
  damage: number;
}

/** Enemy projectiles that touch the player are consumed and their damage totalled. */
export function resolveHitsOnPlayer(projectiles: readonly Projectile[], pos: Vec2, radius: number): PlayerHitResult {
  const survivors: Projectile[] = [];
  let damage = 0;
  for (const p of projectiles) {
    if (circlesOverlap(p.pos, p.radius, pos, radius)) damage += p.damage;
    else survivors.push(p);
  }
  return { projectiles: survivors, damage };
}

/**
 * Each projectile damages the first living thing it overlaps and is consumed, so a zombie
 * hit by several shotgun pellets takes the sum. Explosive projectiles also report a
 * detonation. Mutates health and flash timers; returns surviving projectiles.
 */
export function resolveProjectileHits(
  projectiles: readonly Projectile[],
  targets: Damageable[],
  flashSeconds: number,
): HitResult {
  const survivors: Projectile[] = [];
  const detonations: DirectHitDetonation[] = [];
  let hits = 0;
  for (const p of projectiles) {
    const target = targets.find((t) => t.health > 0 && circlesOverlap(p.pos, p.radius, t.pos, t.radius));
    if (!target) {
      survivors.push(p);
      continue;
    }
    target.health = Math.max(0, target.health - p.damage);
    target.flashLeft = flashSeconds;
    hits++;
    if (p.splash) detonations.push({ pos: p.pos, splash: p.splash, directTarget: target });
  }
  return { projectiles: survivors, hits, detonations };
}
