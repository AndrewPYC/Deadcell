import { normalize, vec, type Vec2 } from '../core/math';
import type { Splash } from '../data/config';
import type { Damageable, OnHit } from './combat';

/** Linear falloff: full centerDamage at distance 0, nothing at or beyond the radius. */
export function splashDamage(distance: number, splash: Splash): number {
  if (distance >= splash.radius) return 0;
  return splash.centerDamage * (1 - Math.max(0, distance) / splash.radius);
}

/**
 * Damages every living target whose center is inside the blast. `exclude` is the target
 * hit directly by the rocket, which takes the direct-hit damage instead of splash.
 * Only targets passed in are affected; the player is never passed, so blasts never hurt them.
 * `onHit` gets the direction away from the blast center.
 */
export function applySplash<T extends Damageable>(
  center: Vec2,
  splash: Splash,
  targets: T[],
  flashSeconds: number,
  exclude: Damageable | null = null,
  onHit?: OnHit<T>,
): number {
  let hit = 0;
  for (const t of targets) {
    if (t === exclude || t.health <= 0) continue;
    const dmg = splashDamage(Math.hypot(t.pos.x - center.x, t.pos.y - center.y), splash);
    if (dmg <= 0) continue;
    t.health = Math.max(0, t.health - dmg);
    t.flashLeft = flashSeconds;
    onHit?.(t, normalize(vec(t.pos.x - center.x, t.pos.y - center.y)));
    hit++;
  }
  return hit;
}
