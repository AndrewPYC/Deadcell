import { PLAYER_RADIUS, WEAPONS } from '../data/config';
import { AMMO_BOX_RADIUS, type AmmoBox } from '../entities/ammoBox';
import type { Player } from '../entities/player';
import { circlesOverlap } from './collision';
import { tryPickupAmmo } from './weapon';

/**
 * Ammo boxes refill the weapon currently in hand. A box the player touches while that
 * weapon's reserve is full stays on the ground. Returns the boxes left.
 */
export function collectAmmoBoxes(p: Player, boxes: readonly AmmoBox[]): AmmoBox[] {
  const id = p.loadout.current;
  const left: AmmoBox[] = [];
  for (const box of boxes) {
    if (!circlesOverlap(p.pos, PLAYER_RADIUS, box.pos, AMMO_BOX_RADIUS)) {
      left.push(box);
      continue;
    }
    const result = tryPickupAmmo(p.loadout.weapons[id], WEAPONS[id]);
    if (!result.picked) {
      left.push(box);
      continue;
    }
    p.loadout = { ...p.loadout, weapons: { ...p.loadout.weapons, [id]: result.state } };
  }
  return left;
}
