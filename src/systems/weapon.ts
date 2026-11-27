import { TIMER_EPSILON, type WeaponStats } from '../data/config';

/** Runtime state for one weapon. All behaviour comes from its WeaponStats. */
export interface WeaponState {
  magazine: number;
  reserve: number;
  /** Seconds until the next shot is allowed. */
  cooldown: number;
  /** Seconds left on the current reload; 0 when not reloading. */
  reloadLeft: number;
}

export const createWeaponState = (stats: WeaponStats): WeaponState => ({
  magazine: stats.magazineSize,
  reserve: stats.startingReserve,
  cooldown: 0,
  reloadLeft: 0,
});

export const isReloading = (w: WeaponState): boolean => w.reloadLeft > 0;

export const canReload = (w: WeaponState, stats: WeaponStats): boolean =>
  !isReloading(w) && w.reserve > 0 && w.magazine < stats.magazineSize;

export const canFire = (w: WeaponState): boolean =>
  !isReloading(w) && w.magazine > 0 && w.cooldown <= TIMER_EPSILON;

/** Starts a reload if allowed; otherwise returns the state unchanged. */
export function startReload(w: WeaponState, stats: WeaponStats): WeaponState {
  return canReload(w, stats) ? { ...w, reloadLeft: stats.reloadSeconds } : w;
}

export const cancelReload = (w: WeaponState): WeaponState => ({ ...w, reloadLeft: 0 });

export const isReserveFull = (w: WeaponState, stats: WeaponStats): boolean => w.reserve >= stats.reserveCap;

export interface PickupResult {
  state: WeaponState;
  picked: boolean;
}

/** An ammo box adds `ammoBoxAmount` to the reserve, capped. Refused when the reserve is already full. */
export function tryPickupAmmo(w: WeaponState, stats: WeaponStats): PickupResult {
  if (isReserveFull(w, stats)) return { state: w, picked: false };
  return { state: { ...w, reserve: Math.min(stats.reserveCap, w.reserve + stats.ammoBoxAmount) }, picked: true };
}

/** Fraction of the reload done, 0..1 (0 when not reloading). */
export const reloadProgress = (w: WeaponState, stats: WeaponStats): number =>
  isReloading(w) ? 1 - w.reloadLeft / stats.reloadSeconds : 0;

/** Temporary changes from abilities. Ammo use is never changed. */
export interface WeaponMods {
  fireRateMultiplier: number;
  /** Reload takes reloadSeconds × this; reloadLeft stays in base seconds so progress reads right. */
  reloadTimeMultiplier: number;
}
export const NO_WEAPON_MODS: WeaponMods = { fireRateMultiplier: 1, reloadTimeMultiplier: 1 };

export interface WeaponStep {
  state: WeaponState;
  /** Number of shots fired this step; the caller spawns the projectiles. */
  shots: number;
}

/** Advances timers, finishes reloads and fires while the trigger is held. */
export function updateWeapon(
  w: WeaponState,
  stats: WeaponStats,
  dt: number,
  triggerHeld: boolean,
  mods: WeaponMods = NO_WEAPON_MODS,
): WeaponStep {
  let { magazine, reserve, cooldown, reloadLeft } = w;

  if (reloadLeft > 0) {
    reloadLeft -= dt / mods.reloadTimeMultiplier;
    if (reloadLeft <= TIMER_EPSILON) {
      const moved = Math.min(stats.magazineSize - magazine, reserve);
      magazine += moved;
      reserve -= moved;
      reloadLeft = 0;
    }
  }

  // Fire using the cooldown as it stood at the start of this step, then let time pass.
  let shots = 0;
  const interval = 1 / (stats.fireRate * mods.fireRateMultiplier);
  while (triggerHeld && reloadLeft === 0 && magazine > 0 && cooldown <= TIMER_EPSILON) {
    magazine--;
    shots++;
    cooldown += interval;
  }
  // Clamping at 0 means releasing the trigger never banks shots for later.
  cooldown = Math.max(0, cooldown - dt);

  return { state: { magazine, reserve, cooldown, reloadLeft }, shots };
}

/**
 * Direction for each projectile of one shot. Pellets fan evenly across pelletSpread;
 * moving adds a random deviation of up to ±movingSpread. `rng` returns [0, 1).
 */
export function shotAngles(aim: number, stats: WeaponStats, moving: boolean, rng: () => number): number[] {
  const n = stats.projectilesPerShot;
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const fan = n > 1 ? (i / (n - 1) - 0.5) * stats.pelletSpreadRadians : 0;
    const jitter = moving ? (rng() * 2 - 1) * stats.movingSpreadRadians : 0;
    angles.push(aim + fan + jitter);
  }
  return angles;
}
