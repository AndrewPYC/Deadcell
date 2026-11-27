import { vec, type Vec2 } from '../core/math';
import { SPAWN_GROUP_SPREAD, ZOMBIE_SPAWN_MAX_TRIES, ZOMBIE_SPAWN_MIN_DISTANCE } from '../data/config';
import { circleIntersectsRect, type Rect } from './collision';

/**
 * A random spot that doesn't overlap a wall and is at least `minDistance` from the player.
 * Falls back to any wall-free spot if the map is too crowded.
 */
export function findSpawnPoint(
  player: Vec2,
  radius: number,
  walls: readonly Rect[],
  width: number,
  height: number,
  rng: () => number = Math.random,
  minDistance: number = ZOMBIE_SPAWN_MIN_DISTANCE,
): Vec2 {
  let fallback: Vec2 | null = null;
  for (let i = 0; i < ZOMBIE_SPAWN_MAX_TRIES; i++) {
    const p = vec(radius + rng() * (width - radius * 2), radius + rng() * (height - radius * 2));
    if (walls.some((w) => circleIntersectsRect(p, radius, w))) continue;
    if (Math.hypot(p.x - player.x, p.y - player.y) >= minDistance) return p;
    fallback ??= p;
  }
  return fallback ?? vec(radius, radius);
}

/**
 * Group markers sit this far from the player, so every member (placed within
 * SPAWN_GROUP_SPREAD of the marker) lands outside the safe area.
 */
export const GROUP_MIN_DISTANCE = ZOMBIE_SPAWN_MIN_DISTANCE + SPAWN_GROUP_SPREAD;

/** True when a group marker is too close to the player to spawn there. */
export const inSafeArea = (marker: Vec2, player: Vec2): boolean =>
  Math.hypot(marker.x - player.x, marker.y - player.y) < GROUP_MIN_DISTANCE;

/**
 * Positions for `count` members around `center`: the first on the center, the rest on a
 * ring of SPAWN_GROUP_SPREAD. A spot that hits a wall or leaves the map uses the center.
 */
export function groupPositions(
  center: Vec2,
  count: number,
  radius: number,
  walls: readonly Rect[],
  width: number,
  height: number,
): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      out.push(vec(center.x, center.y));
      continue;
    }
    const a = (2 * Math.PI * (i - 1)) / (count - 1);
    const p = vec(center.x + Math.cos(a) * SPAWN_GROUP_SPREAD, center.y + Math.sin(a) * SPAWN_GROUP_SPREAD);
    const onMap = p.x >= radius && p.y >= radius && p.x <= width - radius && p.y <= height - radius;
    const clear = onMap && !walls.some((w) => circleIntersectsRect(p, radius, w));
    out.push(clear ? p : vec(center.x, center.y));
  }
  return out;
}
