import { vec } from '../core/math';
import type { Input } from '../core/input';
import { MUZZLE_OFFSET, WEAPONS, WEAPON_SLOTS, type WeaponId } from '../data/config';
import type { Player } from '../entities/player';
import { createProjectile, type Projectile } from '../entities/projectile';
import { isSwitching, requestSwitch, updateSwitch } from './loadout';
import { NO_WEAPON_MODS, shotAngles, startReload, updateWeapon, type WeaponMods } from './weapon';

const SLOT_KEY_PREFIX = 'Digit';
const SLOT_KEY_FIRST = 1;

/** Handles switching (1/2/3), reload (R) and firing (held left mouse). Returns new projectiles. */
export function updatePlayerWeapon(
  p: Player,
  input: Input,
  dt: number,
  mods: WeaponMods = NO_WEAPON_MODS,
  rng: () => number = Math.random,
): Projectile[] {
  WEAPON_SLOTS.forEach((id, i) => {
    if (input.isDown(`${SLOT_KEY_PREFIX}${i + SLOT_KEY_FIRST}`)) p.loadout = requestSwitch(p.loadout, id);
  });
  p.loadout = updateSwitch(p.loadout, dt);

  const switching = isSwitching(p.loadout);
  const current = p.loadout.current;
  if (!switching && input.isDown('KeyR')) {
    setWeapon(p, current, startReload(p.loadout.weapons[current], WEAPONS[current]));
  }

  // Tick every weapon so fire cooldowns keep running while holstered; only the drawn one fires.
  let shots = 0;
  for (const id of Object.keys(p.loadout.weapons) as WeaponId[]) {
    const trigger = id === current && !switching && input.mouseDown();
    const step = updateWeapon(p.loadout.weapons[id], WEAPONS[id], dt, trigger, mods);
    setWeapon(p, id, step.state);
    if (id === current) shots = step.shots;
  }

  const stats = WEAPONS[current];
  const muzzle = vec(p.pos.x + Math.cos(p.aim) * MUZZLE_OFFSET, p.pos.y + Math.sin(p.aim) * MUZZLE_OFFSET);
  const spawned: Projectile[] = [];
  for (let i = 0; i < shots; i++) {
    for (const angle of shotAngles(p.aim, stats, p.moving, rng)) {
      spawned.push(createProjectile(muzzle, angle, stats));
    }
  }
  return spawned;
}

function setWeapon(p: Player, id: WeaponId, state: Player['loadout']['weapons'][WeaponId]): void {
  p.loadout = { ...p.loadout, weapons: { ...p.loadout.weapons, [id]: state } };
}
