import { normalize, vec, type Vec2 } from '../core/math';
import { CANVAS_HEIGHT, CANVAS_WIDTH, MAP_WALLS, PLAYER_RADIUS, ZOMBIES } from '../data/config';
import type { Zombie } from '../entities/zombie';
import { moveCircle } from './collision';
import { inMeleeRange, meleeStep } from './melee';

/**
 * Simple steering: walk straight at the player, sliding along walls.
 * Returns the total melee damage dealt to the player this step.
 */
export function updateZombies(zombies: Zombie[], player: Vec2, dt: number): number {
  let damage = 0;
  for (const z of zombies) {
    const s = ZOMBIES[z.type];
    const dir = normalize(vec(player.x - z.pos.x, player.y - z.pos.y));
    z.pos = moveCircle(z.pos, vec(dir.x * s.speed * dt, dir.y * s.speed * dt), z.radius, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);

    const dist = Math.hypot(player.x - z.pos.x, player.y - z.pos.y);
    const step = meleeStep(z.attackCooldown, inMeleeRange(dist, z.radius, PLAYER_RADIUS), s.attackInterval, dt);
    z.attackCooldown = step.cooldown;
    if (step.hit) damage += s.damage;
    z.flashLeft = Math.max(0, z.flashLeft - dt);
  }
  return damage;
}
