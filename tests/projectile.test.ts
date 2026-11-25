import { describe, expect, it } from 'vitest';
import { createProjectile, updateProjectiles } from '../src/entities/projectile';
import { resolveProjectileHits, type Damageable } from '../src/systems/combat';
import { vec } from '../src/core/math';
import { WEAPONS } from '../src/data/config';

const rifle = WEAPONS.assaultRifle;
const W = 1000;
const H = 1000;

describe('projectiles', () => {
  it('fly toward their angle at weapon speed', () => {
    const p = createProjectile(vec(100, 100), 0, rifle);
    const [moved] = updateProjectiles([p], 0.1, [], W, H);
    expect(moved.pos.x).toBeCloseTo(100 + rifle.projectileSpeed * 0.1);
    expect(moved.pos.y).toBeCloseTo(100);
  });

  it('are removed when they hit a wall', () => {
    const wall = { x: 200, y: 0, w: 50, h: 1000 };
    let list = [createProjectile(vec(100, 500), 0, rifle)];
    for (let i = 0; i < 60 && list.length; i++) {
      list = updateProjectiles(list, 1 / 60, [wall], W, H);
      for (const p of list) expect(p.pos.x).toBeLessThan(wall.x);
    }
    expect(list).toHaveLength(0);
  });

  it('are removed when they leave the map', () => {
    const p = createProjectile(vec(W - 1, 500), 0, rifle);
    expect(updateProjectiles([p], 0.1, [], W, H)).toHaveLength(0);
  });

  it('are removed when their lifetime runs out', () => {
    const p = createProjectile(vec(500, 500), 0, { ...rifle, projectileSpeed: 0 });
    expect(updateProjectiles([p], rifle.projectileLifetime / 2, [], W, H)).toHaveLength(1);
    expect(updateProjectiles([p], rifle.projectileLifetime, [], W, H)).toHaveLength(0);
  });
});

describe('projectile hits', () => {
  const target = (): Damageable => ({ pos: vec(500, 500), radius: 20, health: 40, flashLeft: 0 });

  it('damage, flash and consume the projectile', () => {
    const t = target();
    const r = resolveProjectileHits([createProjectile(vec(500, 500), 0, rifle)], [t], 0.1);
    expect(r.projectiles).toHaveLength(0);
    expect(t.health).toBe(40 - rifle.damage);
    expect(t.flashLeft).toBe(0.1);
  });

  it('miss when not overlapping', () => {
    const t = target();
    const r = resolveProjectileHits([createProjectile(vec(100, 100), 0, rifle)], [t], 0.1);
    expect(r.projectiles).toHaveLength(1);
    expect(t.health).toBe(40);
  });

  it('a 40 health target takes 4 rifle hits', () => {
    const t = target();
    for (let i = 0; i < 3; i++) resolveProjectileHits([createProjectile(t.pos, 0, rifle)], [t], 0.1);
    expect(t.health).toBeGreaterThan(0);
    resolveProjectileHits([createProjectile(t.pos, 0, rifle)], [t], 0.1);
    expect(t.health).toBe(0);
  });
});
