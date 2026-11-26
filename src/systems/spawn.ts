import { vec, type Vec2 } from '../core/math';
import { ZOMBIE_SPAWN_MAX_TRIES, ZOMBIE_SPAWN_MIN_DISTANCE } from '../data/config';
import { circleIntersectsRect, type Rect } from './collision';

/**
 * A random spot that doesn't overlap a wall and is at least ZOMBIE_SPAWN_MIN_DISTANCE
 * from the player. Falls back to any wall-free spot if the map is too crowded.
 */
export function findSpawnPoint(
  player: Vec2,
  radius: number,
  walls: readonly Rect[],
  width: number,
  height: number,
  rng: () => number = Math.random,
): Vec2 {
  let fallback: Vec2 | null = null;
  for (let i = 0; i < ZOMBIE_SPAWN_MAX_TRIES; i++) {
    const p = vec(radius + rng() * (width - radius * 2), radius + rng() * (height - radius * 2));
    if (walls.some((w) => circleIntersectsRect(p, radius, w))) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) >= ZOMBIE_SPAWN_MIN_DISTANCE) return p;
    fallback ??= p;
  }
  return fallback ?? vec(radius, radius);
}
