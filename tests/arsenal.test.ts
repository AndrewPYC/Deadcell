import { describe, expect, it } from 'vitest';
import { FIXED_STEP_SECONDS, WEAPONS, WEAPON_SWITCH_SECONDS, type WeaponId } from '../src/data/config';
import {
  createWeaponState,
  isReserveFull,
  shotAngles,
  startReload,
  tryPickupAmmo,
  type WeaponState,
} from '../src/systems/weapon';
import { applySplash, splashDamage } from '../src/systems/splash';
import { createLoadout, isSwitching, requestSwitch, updateSwitch, type Loadout } from '../src/systems/loadout';
import { createProjectile, updateProjectiles } from '../src/entities/projectile';
import { resolveProjectileHits, type Damageable } from '../src/systems/combat';
import { vec } from '../src/core/math';

const { assaultRifle: rifle, shotgun, rpg } = WEAPONS;
const deg = (d: number) => (d * Math.PI) / 180;
const target = (x: number, y: number, health = 1000): Damageable => ({ pos: vec(x, y), radius: 20, health, flashLeft: 0 });

describe('weapon stats match the brief', () => {
  it('shotgun', () => {
    expect(shotgun).toMatchObject({
      projectilesPerShot: 6, damage: 8, fireRate: 1, magazineSize: 5, startingReserve: 20, reloadSeconds: 2.5,
    });
    expect(shotgun.pelletSpreadRadians).toBeCloseTo(deg(30));
  });

  it('rpg', () => {
    expect(rpg).toMatchObject({ damage: 90, fireRate: 0.5, magazineSize: 1, startingReserve: 4, reloadSeconds: 3 });
    expect(rpg.splash).toEqual({ radius: 100, centerDamage: 60 });
  });
});

describe('shotgun pellet spread', () => {
  const aim = deg(40);

  it('fires 6 pellets, all inside the 30° cone', () => {
    for (const moving of [false, true]) {
      for (const r of [0, 0.5, 0.999999]) {
        const angles = shotAngles(aim, shotgun, moving, () => r);
        expect(angles).toHaveLength(6);
        for (const a of angles) {
          expect(a).toBeGreaterThanOrEqual(aim - deg(15) - 1e-9);
          expect(a).toBeLessThanOrEqual(aim + deg(15) + 1e-9);
        }
      }
    }
  });

  it('spans the full cone, edge to edge, centred on the aim', () => {
    const angles = shotAngles(aim, shotgun, false, Math.random);
    expect(Math.min(...angles)).toBeCloseTo(aim - deg(15));
    expect(Math.max(...angles)).toBeCloseTo(aim + deg(15));
    const mean = angles.reduce((s, a) => s + a, 0) / angles.length;
    expect(mean).toBeCloseTo(aim);
  });

  it('several pellets on one target add up', () => {
    const t = target(100, 100);
    const pellets = Array.from({ length: 6 }, () => createProjectile(t.pos, 0, shotgun));
    resolveProjectileHits(pellets, [t], 0.1);
    expect(t.health).toBe(1000 - 6 * 8);
  });
});

describe('RPG splash falloff', () => {
  const s = rpg.splash!;

  it('is 60 at the center and 0 at the edge', () => {
    expect(splashDamage(0, s)).toBe(60);
    expect(splashDamage(100, s)).toBe(0);
    expect(splashDamage(150, s)).toBe(0);
  });

  it('falls off linearly', () => {
    expect(splashDamage(25, s)).toBeCloseTo(45);
    expect(splashDamage(50, s)).toBeCloseTo(30);
    expect(splashDamage(75, s)).toBeCloseTo(15);
  });

  it('hits everything in range except the directly hit target', () => {
    const direct = target(0, 0);
    const near = target(50, 0);
    const far = target(200, 0);
    applySplash(vec(0, 0), s, [direct, near, far], 0.1, direct);
    expect(direct.health).toBe(1000);
    expect(near.health).toBeCloseTo(1000 - 30);
    expect(far.health).toBe(1000);
  });

  it('direct hit deals 90 and reports a detonation for splash', () => {
    const t = target(300, 300);
    const r = resolveProjectileHits([createProjectile(t.pos, 0, rpg)], [t], 0.1);
    expect(t.health).toBe(1000 - 90);
    expect(r.detonations).toHaveLength(1);
    expect(r.detonations[0].directTarget).toBe(t);
  });
});

describe('RPG rocket detonation', () => {
  it('explodes on hitting a wall', () => {
    const wall = { x: 120, y: 0, w: 40, h: 1000 };
    let list = [createProjectile(vec(100, 500), 0, rpg)];
    let detonations = 0;
    for (let i = 0; i < 60 && list.length; i++) {
      const r = updateProjectiles(list, FIXED_STEP_SECONDS, [wall], 1000, 1000);
      list = r.alive;
      detonations += r.detonations.length;
    }
    expect(detonations).toBe(1);
  });

  it('explodes at max range', () => {
    const p = createProjectile(vec(0, 0), 0, rpg);
    const r = updateProjectiles([p], rpg.projectileLifetime, [], 1e6, 1e6);
    expect(r.alive).toHaveLength(0);
    expect(r.detonations).toHaveLength(1);
  });

  it('non-explosive bullets never detonate', () => {
    const r = updateProjectiles([createProjectile(vec(0, 0), 0, rifle)], rifle.projectileLifetime, [], 1e6, 1e6);
    expect(r.detonations).toHaveLength(0);
  });
});

describe('reserve caps', () => {
  it('rifle 75, shotgun 20 (spec conflict), rpg 8', () => {
    expect(rifle.reserveCap).toBe(75);
    expect(shotgun.reserveCap).toBe(20);
    expect(rpg.reserveCap).toBe(8);
  });

  it('no weapon starts above its cap', () => {
    for (const s of Object.values(WEAPONS)) expect(s.startingReserve).toBeLessThanOrEqual(s.reserveCap);
  });

  it('an ammo box never pushes the reserve past the cap', () => {
    const w: WeaponState = { ...createWeaponState(rpg), reserve: 7 };
    const r = tryPickupAmmo(w, rpg);
    expect(r.picked).toBe(true);
    expect(r.state.reserve).toBe(8);
  });
});

describe('ammo box pickup', () => {
  it('adds 25 rifle rounds, 10 shells, 2 rockets', () => {
    const cases: [WeaponId, number][] = [['assaultRifle', 25], ['shotgun', 10], ['rpg', 2]];
    for (const [id, amount] of cases) {
      const stats = WEAPONS[id];
      const w: WeaponState = { ...createWeaponState(stats), reserve: 0 };
      expect(tryPickupAmmo(w, stats).state.reserve).toBe(amount);
    }
  });

  it('is refused when the reserve is full', () => {
    for (const stats of Object.values(WEAPONS)) {
      const w: WeaponState = { ...createWeaponState(stats), reserve: stats.reserveCap };
      expect(isReserveFull(w, stats)).toBe(true);
      const r = tryPickupAmmo(w, stats);
      expect(r.picked).toBe(false);
      expect(r.state).toBe(w);
    }
  });

  it('is refused at the start for rifle and shotgun, which begin at their caps', () => {
    expect(tryPickupAmmo(createWeaponState(rifle), rifle).picked).toBe(false);
    expect(tryPickupAmmo(createWeaponState(shotgun), shotgun).picked).toBe(false);
    expect(tryPickupAmmo(createWeaponState(rpg), rpg).picked).toBe(true);
  });
});

describe('weapon switching', () => {
  const all = (): Loadout => createLoadout(['assaultRifle', 'shotgun', 'rpg'], 'assaultRifle');
  const tick = (l: Loadout, seconds: number) => {
    for (let i = 0; i < Math.round(seconds / FIXED_STEP_SECONDS); i++) l = updateSwitch(l, FIXED_STEP_SECONDS);
    return l;
  };

  it('takes 0.25 seconds', () => {
    expect(WEAPON_SWITCH_SECONDS).toBe(0.25);
    let l = requestSwitch(all(), 'shotgun');
    expect(isSwitching(l)).toBe(true);
    l = tick(l, 0.2);
    expect(l.current).toBe('assaultRifle');
    l = tick(l, 0.05);
    expect(l.current).toBe('shotgun');
    expect(isSwitching(l)).toBe(false);
  });

  it('ignores weapons that are not owned', () => {
    const l = createLoadout(['assaultRifle'], 'assaultRifle');
    expect(requestSwitch(l, 'rpg')).toBe(l);
  });

  it('ignores the weapon already in hand', () => {
    const l = all();
    expect(requestSwitch(l, 'assaultRifle')).toBe(l);
  });

  it('holding the key does not restart the timer', () => {
    let l = tick(requestSwitch(all(), 'rpg'), 0.1);
    const again = requestSwitch(l, 'rpg');
    expect(again.switchLeft).toBeCloseTo(l.switchLeft);
  });

  it('cancels the reload of the weapon put away', () => {
    let l = all();
    const used = { ...l.weapons.assaultRifle, magazine: 3 };
    l = { ...l, weapons: { ...l.weapons, assaultRifle: startReload(used, rifle) } };
    l = requestSwitch(l, 'shotgun');
    expect(l.weapons.assaultRifle.reloadLeft).toBe(0);
    expect(l.weapons.assaultRifle.magazine).toBe(3);
  });

  it('each weapon keeps its own ammo', () => {
    const l = all();
    expect(l.weapons.assaultRifle.magazine).toBe(25);
    expect(l.weapons.shotgun.magazine).toBe(5);
    expect(l.weapons.rpg.reserve).toBe(4);
  });
});
