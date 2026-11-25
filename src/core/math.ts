export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len === 0 ? vec(0, 0) : vec(v.x / len, v.y / len);
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const angleTo = (from: Vec2, to: Vec2): number =>
  Math.atan2(to.y - from.y, to.x - from.x);
