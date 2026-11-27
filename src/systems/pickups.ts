import { MEDKIT_HEAL, PLAYER_RADIUS, WEAPONS } from '../data/config';
import { PICKUP_RADIUS, type Pickup } from '../entities/pickup';
import type { Player } from '../entities/player';
import { circlesOverlap } from './collision';
import { tryPickupAmmo } from './weapon';

export interface HealResult {
  health: number;
  used: boolean;
}

/** Medkit: heals `amount`, never above max, and is refused (not used up) at full health. */
export function tryUseMedkit(health: number, maxHealth: number, amount: number = MEDKIT_HEAL): HealResult {
  if (health <= 0 || health >= maxHealth) return { health, used: false };
  return { health: Math.min(maxHealth, health + amount), used: true };
}

/** Applies one pickup to the player. Returns false when it can't be used and stays on the ground. */
function apply(p: Player, pickup: Pickup): boolean {
  if (pickup.kind === 'medkit') {
    const r = tryUseMedkit(p.health, p.maxHealth);
    p.health = r.health;
    return r.used;
  }
  // Ammo refills the weapon currently in hand; refused when its reserve is full.
  const id = p.loadout.current;
  const r = tryPickupAmmo(p.loadout.weapons[id], WEAPONS[id]);
  if (r.picked) p.loadout = { ...p.loadout, weapons: { ...p.loadout.weapons, [id]: r.state } };
  return r.picked;
}

/** Collects every pickup the player touches that can be used. Returns the pickups left. */
export function collectPickups(p: Player, pickups: readonly Pickup[]): Pickup[] {
  return pickups.filter((pickup) => !(circlesOverlap(p.pos, PLAYER_RADIUS, pickup.pos, PICKUP_RADIUS) && apply(p, pickup)));
}
