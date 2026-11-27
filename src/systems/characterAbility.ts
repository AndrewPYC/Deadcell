import type { Vec2 } from '../core/math';
import {
  CHARACTERS,
  FROST_PULSE,
  WIND_SURGE,
  ZOMBIES,
  type AbilityId,
  type CharacterId,
  type Resistances,
} from '../data/config';
import type { Zombie } from '../entities/zombie';
import { applyFreeze, applyIceSlow, applyKnockback, type StatusEffects } from './statusEffects';
import { NO_WEAPON_MODS, type WeaponMods } from './weapon';

export const abilityOf = (c: CharacterId): AbilityId => CHARACTERS[c].ability;

/** Knockback decay that brings a full push to 0 in WIND_SURGE.knockbackSeconds. */
export const KNOCKBACK_DECAY = WIND_SURGE.knockbackSpeed / WIND_SURGE.knockbackSeconds;

const WIND_SURGE_MODS: WeaponMods = {
  fireRateMultiplier: WIND_SURGE.fireRateMultiplier,
  reloadTimeMultiplier: WIND_SURGE.reloadTimeMultiplier,
};

/** Wind Surge speeds up fire rate and reload while active; nothing else changes the weapon. */
export const weaponModsFor = (ability: AbilityId, active: boolean): WeaponMods =>
  active && ability === 'windSurge' ? WIND_SURGE_MODS : NO_WEAPON_MODS;

/** What one weapon hit does to a target with these resistances while the ability is active. */
export function hitEffect(ability: AbilityId, s: StatusEffects, r: Resistances, dir: Vec2): StatusEffects {
  if (ability === 'windSurge') return applyKnockback(s, r, dir, WIND_SURGE.knockbackSpeed);
  return applyIceSlow(s, FROST_PULSE.hitSlowSeconds);
}

/** Applies the active ability's on-hit effect to a zombie. Damage is handled separately. */
export function applyHitEffect(ability: AbilityId, active: boolean, z: Zombie, dir: Vec2): void {
  if (active) z.status = hitEffect(ability, z.status, ZOMBIES[z.type], dir);
}

/** What the activation pulse does to one target: freeze, or ice slow if freeze-immune. */
export const pulseEffect = (s: StatusEffects, r: Resistances): StatusEffects =>
  applyFreeze(s, r, FROST_PULSE.freezeSeconds, FROST_PULSE.hitSlowSeconds);

/** One pulse on activation: every zombie whose center is within the radius. Returns how many. */
export function frostPulse(zombies: Zombie[], center: Vec2): number {
  let affected = 0;
  for (const z of zombies) {
    if (Math.hypot(z.pos.x - center.x, z.pos.y - center.y) > FROST_PULSE.radius) continue;
    z.status = pulseEffect(z.status, ZOMBIES[z.type]);
    affected++;
  }
  return affected;
}
