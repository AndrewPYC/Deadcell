import { vec } from '../core/math';
import type { Input } from '../core/input';
import { MUZZLE_OFFSET, WEAPONS } from '../data/config';
import type { Player } from '../entities/player';
import { createProjectile, type Projectile } from '../entities/projectile';
import { shotAngles, startReload, updateWeapon } from './weapon';

/** Handles reload (R) and firing (held left mouse) for the player's current weapon. */
export function updatePlayerWeapon(
  p: Player,
  input: Input,
  dt: number,
  rng: () => number = Math.random,
): Projectile[] {
  const stats = WEAPONS[p.weaponId];
  if (input.isDown('KeyR')) p.weapon = startReload(p.weapon, stats);

  const step = updateWeapon(p.weapon, stats, dt, input.mouseDown());
  p.weapon = step.state;

  const muzzle = vec(p.pos.x + Math.cos(p.aim) * MUZZLE_OFFSET, p.pos.y + Math.sin(p.aim) * MUZZLE_OFFSET);
  const spawned: Projectile[] = [];
  for (let i = 0; i < step.shots; i++) {
    for (const angle of shotAngles(p.aim, stats, p.moving, rng)) {
      spawned.push(createProjectile(muzzle, angle, stats));
    }
  }
  return spawned;
}
