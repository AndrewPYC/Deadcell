import { ZOMBIES } from '../data/config';
import type { Zombie } from '../entities/zombie';

export interface KillResult {
  alive: Zombie[];
  /** Zombies that died this step, e.g. for drops. */
  dead: Zombie[];
  xp: number;
  kills: number;
}

/** Removes dead zombies and totals the XP they award. */
export function collectKills(zombies: readonly Zombie[]): KillResult {
  const alive: Zombie[] = [];
  const dead: Zombie[] = [];
  let xp = 0;
  for (const z of zombies) {
    if (z.health > 0) {
      alive.push(z);
      continue;
    }
    dead.push(z);
    xp += ZOMBIES[z.type].xp;
  }
  return { alive, dead, xp, kills: dead.length };
}
