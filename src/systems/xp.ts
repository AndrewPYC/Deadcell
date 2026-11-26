import { ZOMBIES } from '../data/config';
import type { Zombie } from '../entities/zombie';

export interface KillResult {
  alive: Zombie[];
  xp: number;
  kills: number;
}

/** Removes dead zombies and totals the XP they award. */
export function collectKills(zombies: readonly Zombie[]): KillResult {
  const alive: Zombie[] = [];
  let xp = 0;
  let kills = 0;
  for (const z of zombies) {
    if (z.health > 0) {
      alive.push(z);
      continue;
    }
    xp += ZOMBIES[z.type].xp;
    kills++;
  }
  return { alive, xp, kills };
}
