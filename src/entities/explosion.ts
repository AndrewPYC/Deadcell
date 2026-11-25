import type { Vec2 } from '../core/math';
import {
  COLOR_EXPLOSION,
  EXPLOSION_START_RADIUS_FRACTION,
  EXPLOSION_VISUAL_SECONDS,
} from '../data/config';

/** Visual only: a circle that grows to the blast radius and fades. Damage is applied separately. */
export interface Explosion {
  pos: Vec2;
  radius: number;
  age: number;
}

export const createExplosion = (pos: Vec2, radius: number): Explosion => ({ pos, radius, age: 0 });

export function updateExplosions(list: readonly Explosion[], dt: number): Explosion[] {
  return list.map((e) => ({ ...e, age: e.age + dt })).filter((e) => e.age < EXPLOSION_VISUAL_SECONDS);
}

export function drawExplosions(ctx: CanvasRenderingContext2D, list: readonly Explosion[]): void {
  for (const e of list) {
    const t = e.age / EXPLOSION_VISUAL_SECONDS;
    const r = e.radius * (EXPLOSION_START_RADIUS_FRACTION + (1 - EXPLOSION_START_RADIUS_FRACTION) * t);
    ctx.fillStyle = `rgba(${COLOR_EXPLOSION}, ${1 - t})`;
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
