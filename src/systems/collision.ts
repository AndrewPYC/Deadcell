import { clamp, vec, type Vec2 } from '../core/math';
import { COLLISION_ITERATIONS } from '../data/config';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function circleIntersectsRect(pos: Vec2, radius: number, r: Rect): boolean {
  const dx = pos.x - clamp(pos.x, r.x, r.x + r.w);
  const dy = pos.y - clamp(pos.y, r.y, r.y + r.h);
  return dx * dx + dy * dy < radius * radius;
}

export function circlesOverlap(a: Vec2, ra: number, b: Vec2, rb: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < (ra + rb) * (ra + rb);
}

/** Pushes a circle out of a rectangle along the contact normal. Returns the new center. */
export function resolveCircleRect(pos: Vec2, radius: number, r: Rect): Vec2 {
  const cx = clamp(pos.x, r.x, r.x + r.w);
  const cy = clamp(pos.y, r.y, r.y + r.h);
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) return pos;

  if (distSq > 0) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    return vec(pos.x + (dx / dist) * push, pos.y + (dy / dist) * push);
  }

  // Center is inside the rectangle: leave by the nearest side.
  const exits = [
    { d: pos.x - r.x, p: vec(r.x - radius, pos.y) },
    { d: r.x + r.w - pos.x, p: vec(r.x + r.w + radius, pos.y) },
    { d: pos.y - r.y, p: vec(pos.x, r.y - radius) },
    { d: r.y + r.h - pos.y, p: vec(pos.x, r.y + r.h + radius) },
  ];
  return exits.reduce((a, b) => (b.d < a.d ? b : a)).p;
}

export function clampCircleToBounds(pos: Vec2, radius: number, width: number, height: number): Vec2 {
  return vec(clamp(pos.x, radius, width - radius), clamp(pos.y, radius, height - radius));
}

/**
 * Moves a circle by `delta`, then resolves wall overlaps and keeps it on the map.
 * Only the component pushing into a wall is removed, so the circle slides along it.
 */
export function moveCircle(
  pos: Vec2,
  delta: Vec2,
  radius: number,
  walls: readonly Rect[],
  width: number,
  height: number,
): Vec2 {
  let next = vec(pos.x + delta.x, pos.y + delta.y);
  for (let i = 0; i < COLLISION_ITERATIONS; i++) {
    for (const wall of walls) next = resolveCircleRect(next, radius, wall);
    next = clampCircleToBounds(next, radius, width, height);
  }
  return next;
}
