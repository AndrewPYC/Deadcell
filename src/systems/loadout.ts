import { WEAPONS, WEAPON_SWITCH_SECONDS, TIMER_EPSILON, type WeaponId } from '../data/config';
import { cancelReload, createWeaponState, type WeaponState } from './weapon';

/** Which weapons the player owns, which one is out, and each weapon's own ammo. */
export interface Loadout {
  owned: WeaponId[];
  current: WeaponId;
  /** Weapon being switched to, or null when not switching. */
  pending: WeaponId | null;
  switchLeft: number;
  weapons: Record<WeaponId, WeaponState>;
}

export function createLoadout(owned: readonly WeaponId[], current: WeaponId): Loadout {
  const weapons = {} as Record<WeaponId, WeaponState>;
  for (const id of Object.keys(WEAPONS) as WeaponId[]) weapons[id] = createWeaponState(WEAPONS[id]);
  return { owned: [...owned], current, pending: null, switchLeft: 0, weapons };
}

export const isSwitching = (l: Loadout): boolean => l.pending !== null;

/**
 * Starts a switch to `id`. Ignored if the weapon isn't owned or is already out or on its way.
 * Switching away cancels the current weapon's reload.
 */
export function requestSwitch(l: Loadout, id: WeaponId): Loadout {
  if (!l.owned.includes(id) || id === (l.pending ?? l.current)) return l;
  if (id === l.current) return { ...l, pending: null, switchLeft: 0 }; // changed mind mid-switch
  const weapons = { ...l.weapons, [l.current]: cancelReload(l.weapons[l.current]) };
  return { ...l, pending: id, switchLeft: WEAPON_SWITCH_SECONDS, weapons };
}

export function updateSwitch(l: Loadout, dt: number): Loadout {
  if (l.pending === null) return l;
  const switchLeft = l.switchLeft - dt;
  if (switchLeft > TIMER_EPSILON) return { ...l, switchLeft };
  return { ...l, current: l.pending, pending: null, switchLeft: 0 };
}
