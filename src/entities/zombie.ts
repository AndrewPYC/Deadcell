import type { Vec2 } from '../core/math';
import {
  COLOR_HIT_FLASH,
  COLOR_STAMINA_TRACK,
  COLOR_ZOMBIE_HEALTH,
  ZOMBIES,
  ZOMBIE_HEALTH_BAR_GAP,
  ZOMBIE_HEALTH_BAR_HEIGHT,
  type ZombieType,
} from '../data/config';
import type { Damageable } from '../systems/combat';

export interface Zombie extends Damageable {
  type: ZombieType;
  maxHealth: number;
  /** Seconds until this zombie can attack again. */
  attackCooldown: number;
}

export function createZombie(type: ZombieType, pos: Vec2): Zombie {
  const s = ZOMBIES[type];
  return { type, pos, radius: s.radius, health: s.health, maxHealth: s.health, flashLeft: 0, attackCooldown: 0 };
}

export function drawZombies(ctx: CanvasRenderingContext2D, zombies: readonly Zombie[]): void {
  for (const z of zombies) {
    ctx.fillStyle = z.flashLeft > 0 ? COLOR_HIT_FLASH : ZOMBIES[z.type].color;
    ctx.beginPath();
    ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI * 2);
    ctx.fill();

    if (z.health < z.maxHealth) {
      const w = z.radius * 2;
      const x = z.pos.x - z.radius;
      const y = z.pos.y - z.radius - ZOMBIE_HEALTH_BAR_GAP - ZOMBIE_HEALTH_BAR_HEIGHT;
      ctx.fillStyle = COLOR_STAMINA_TRACK;
      ctx.fillRect(x, y, w, ZOMBIE_HEALTH_BAR_HEIGHT);
      ctx.fillStyle = COLOR_ZOMBIE_HEALTH;
      ctx.fillRect(x, y, w * (z.health / z.maxHealth), ZOMBIE_HEALTH_BAR_HEIGHT);
    }
  }
}
