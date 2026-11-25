import { vec, type Vec2 } from '../core/math';
import type { Splash, WeaponStats } from '../data/config';
import { circleIntersectsRect, type Rect } from '../systems/collision';

export interface Projectile {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  damage: number;
  life: number;
  color: string;
  /** Set for explosive projectiles; they detonate whenever they stop. */
  splash: Splash | null;
}

export interface Detonation {
  pos: Vec2;
  splash: Splash;
}

export function createProjectile(origin: Vec2, angle: number, stats: WeaponStats): Projectile {
  return {
    pos: vec(origin.x, origin.y),
    vel: vec(Math.cos(angle) * stats.projectileSpeed, Math.sin(angle) * stats.projectileSpeed),
    radius: stats.projectileRadius,
    damage: stats.damage,
    life: stats.projectileLifetime,
    color: stats.projectileColor,
    splash: stats.splash,
  };
}

const outsideMap = (p: Projectile, width: number, height: number): boolean =>
  p.pos.x < -p.radius || p.pos.y < -p.radius || p.pos.x > width + p.radius || p.pos.y > height + p.radius;

export interface ProjectileStep {
  alive: Projectile[];
  /** Explosive projectiles that hit a wall, left the map or reached max range this step. */
  detonations: Detonation[];
}

/** Moves projectiles and drops any that expired, hit a wall or left the map. */
export function updateProjectiles(
  list: readonly Projectile[],
  dt: number,
  walls: readonly Rect[],
  width: number,
  height: number,
): ProjectileStep {
  const alive: Projectile[] = [];
  const detonations: Detonation[] = [];
  for (const p of list) {
    const moved: Projectile = {
      ...p,
      pos: vec(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt),
      life: p.life - dt,
    };
    const stopped =
      moved.life <= 0 ||
      outsideMap(moved, width, height) ||
      walls.some((w) => circleIntersectsRect(moved.pos, moved.radius, w));
    if (!stopped) alive.push(moved);
    else if (moved.splash) detonations.push({ pos: moved.pos, splash: moved.splash });
  }
  return { alive, detonations };
}

export function drawProjectiles(ctx: CanvasRenderingContext2D, list: readonly Projectile[]): void {
  for (const p of list) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
