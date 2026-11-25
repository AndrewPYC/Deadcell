import type { Vec2 } from '../core/math';
import type { Projectile } from '../entities/projectile';
import { circlesOverlap } from './collision';

/** Anything projectiles can hit. Targets use it now; zombies will later. */
export interface Damageable {
  pos: Vec2;
  radius: number;
  health: number;
  flashLeft: number;
}

export interface HitResult {
  projectiles: Projectile[];
  hits: number;
}

/**
 * Each projectile damages the first living thing it overlaps and is consumed.
 * Mutates the damageables' health and flash timers; returns surviving projectiles.
 */
export function resolveProjectileHits(
  projectiles: readonly Projectile[],
  targets: Damageable[],
  flashSeconds: number,
): HitResult {
  const survivors: Projectile[] = [];
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
  }
  return { projectiles: survivors, hits };
}
