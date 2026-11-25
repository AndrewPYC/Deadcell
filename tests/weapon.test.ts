import { describe, expect, it } from 'vitest';
import {
  canFire,
  canReload,
  createWeaponState,
  isReloading,
  reloadProgress,
  shotAngles,
  startReload,
  updateWeapon,
  type WeaponState,
} from '../src/systems/weapon';
import { FIXED_STEP_SECONDS, WEAPONS } from '../src/data/config';

const rifle = WEAPONS.assaultRifle;

/** Simulate `seconds` at 60 Hz; returns final state and total shots fired. */
function run(w: WeaponState, seconds: number, trigger: boolean) {
  let shots = 0;
  const steps = Math.round(seconds / FIXED_STEP_SECONDS);
  for (let i = 0; i < steps; i++) {
    const r = updateWeapon(w, rifle, FIXED_STEP_SECONDS, trigger);
    w = r.state;
    shots += r.shots;
  }
  return { w, shots };
}

describe('assault rifle stats', () => {
  it('match the brief', () => {
    expect(rifle.damage).toBe(12);
    expect(rifle.fireRate).toBe(6);
    expect(rifle.magazineSize).toBe(25);
    expect(rifle.startingReserve).toBe(75);
    expect(rifle.reloadSeconds).toBe(2);
    expect(rifle.projectilesPerShot).toBe(1);
  });
});

describe('ammo and firing', () => {
  it('starts with a full magazine and 75 in reserve', () => {
    const w = createWeaponState(rifle);
    expect(w.magazine).toBe(25);
    expect(w.reserve).toBe(75);
    expect(canFire(w)).toBe(true);
  });

  it('fires 6 shots per second while the trigger is held', () => {
    expect(run(createWeaponState(rifle), 1, true).shots).toBe(6);
    expect(run(createWeaponState(rifle), 2, true).shots).toBe(12);
  });

  it('fires nothing without the trigger', () => {
    expect(run(createWeaponState(rifle), 1, false).shots).toBe(0);
  });

  it('does not bank shots while the trigger is released', () => {
    let { w } = run(createWeaponState(rifle), 3, false);
    const r = updateWeapon(w, rifle, FIXED_STEP_SECONDS, true);
    expect(r.shots).toBe(1);
  });

  it('empties the magazine after exactly 25 shots and then stops', () => {
    const { w, shots } = run(createWeaponState(rifle), 10, true);
    expect(shots).toBe(25);
    expect(w.magazine).toBe(0);
    expect(w.reserve).toBe(75);
    expect(canFire(w)).toBe(false);
  });
});

describe('reload', () => {
  const empty = (): WeaponState => ({ magazine: 0, reserve: 75, cooldown: 0, reloadLeft: 0 });

  it('takes the full 2 seconds and moves rounds from reserve', () => {
    let w = startReload(empty(), rifle);
    expect(isReloading(w)).toBe(true);

    w = run(w, 1.9, false).w;
    expect(isReloading(w)).toBe(true);
    expect(w.magazine).toBe(0);
    expect(reloadProgress(w, rifle)).toBeCloseTo(0.95);

    w = run(w, 0.1, false).w;
    expect(isReloading(w)).toBe(false);
    expect(w.magazine).toBe(25);
    expect(w.reserve).toBe(50);
  });

  it('tops up a partly used magazine with only the rounds it needs', () => {
    let w = startReload({ magazine: 10, reserve: 75, cooldown: 0, reloadLeft: 0 }, rifle);
    w = run(w, 2, false).w;
    expect(w.magazine).toBe(25);
    expect(w.reserve).toBe(60);
  });

  it('loads whatever is left when the reserve is short', () => {
    let w = startReload({ magazine: 0, reserve: 7, cooldown: 0, reloadLeft: 0 }, rifle);
    w = run(w, 2, false).w;
    expect(w.magazine).toBe(7);
    expect(w.reserve).toBe(0);
  });

  it('cannot start with an empty reserve', () => {
    const w = { magazine: 0, reserve: 0, cooldown: 0, reloadLeft: 0 };
    expect(canReload(w, rifle)).toBe(false);
    expect(isReloading(startReload(w, rifle))).toBe(false);
  });

  it('cannot start with a full magazine', () => {
    const w = createWeaponState(rifle);
    expect(canReload(w, rifle)).toBe(false);
    expect(isReloading(startReload(w, rifle))).toBe(false);
  });

  it('pressing R again mid-reload does not restart it', () => {
    let w = startReload(empty(), rifle);
    w = run(w, 1, false).w;
    const again = startReload(w, rifle);
    expect(again.reloadLeft).toBeCloseTo(w.reloadLeft);
  });

  it('blocks firing while reloading', () => {
    const w = startReload({ magazine: 10, reserve: 75, cooldown: 0, reloadLeft: 0 }, rifle);
    expect(canFire(w)).toBe(false);
    const { shots } = run(w, 1.9, true);
    expect(shots).toBe(0);
  });

  it('can fire again once the reload finishes', () => {
    const w = startReload(empty(), rifle);
    const { w: after, shots } = run(w, 2 + 1 / rifle.fireRate, true);
    expect(after.reserve).toBe(50);
    expect(shots).toBeGreaterThan(0);
  });
});

describe('shot direction', () => {
  it('is exactly on aim when standing still', () => {
    expect(shotAngles(1.2, rifle, false, () => 0.99)).toEqual([1.2]);
  });

  it('deviates by at most the moving spread when moving', () => {
    const [lo] = shotAngles(0, rifle, true, () => 0);
    const [hi] = shotAngles(0, rifle, true, () => 0.999999);
    expect(lo).toBeCloseTo(-rifle.movingSpreadRadians);
    expect(hi).toBeLessThanOrEqual(rifle.movingSpreadRadians);
    expect(hi).toBeGreaterThan(0);
  });

  it('fans pellets for multi-projectile weapons', () => {
    const shotgunLike = { ...rifle, projectilesPerShot: 3, pelletSpreadRadians: 0.4 };
    const a = shotAngles(0, shotgunLike, false, () => 0.5);
    expect(a).toHaveLength(3);
    expect(a[0]).toBeCloseTo(-0.2);
    expect(a[1]).toBeCloseTo(0);
    expect(a[2]).toBeCloseTo(0.2);
  });
});
