import type { Vec2 } from '../core/math';
import {
  COLOR_FROZEN_EDGE,
  COLOR_FROZEN_TINT,
  COLOR_HIT_FLASH,
  COLOR_SLOWED_EDGE,
  COLOR_STAMINA_TRACK,
  COLOR_ZOMBIE_HEALTH,
  STATUS_EDGE_WIDTH,
  ZOMBIES,
  ZOMBIE_HEALTH_BAR_GAP,
  ZOMBIE_HEALTH_BAR_HEIGHT,
  type ZombieType,
} from '../data/config';
import type { Damageable } from '../systems/combat';
import { createStatus, isFrozen, isSlowed, type StatusEffects } from '../systems/statusEffects';

export interface Zombie extends Damageable {
  type: ZombieType;
  maxHealth: number;
  /** Seconds until this zombie can attack again. */
  attackCooldown: number;
  /** Freeze, ice slow and knockback from character abilities. */
  status: StatusEffects;
}

export function createZombie(type: ZombieType, pos: Vec2): Zombie {
  const s = ZOMBIES[type];
  return {
    type,
    pos,
    radius: s.radius,
    health: s.health,
    maxHealth: s.health,
    flashLeft: 0,
    attackCooldown: 0,
    status: createStatus(),
  };
}

/** Frozen: icy tint over the body with a frosty edge. Slowed: just the edge. */
function drawIce(ctx: CanvasRenderingContext2D, z: Zombie): void {
  const frozen = isFrozen(z.status);
  if (!frozen && !isSlowed(z.status)) return;
  ctx.beginPath();
  ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI * 2);
  if (frozen) {
    ctx.fillStyle = COLOR_FROZEN_TINT;
    ctx.fill();
  }
  ctx.strokeStyle = frozen ? COLOR_FROZEN_EDGE : COLOR_SLOWED_EDGE;
  ctx.lineWidth = STATUS_EDGE_WIDTH;
  ctx.stroke();
}

export function drawZombies(ctx: CanvasRenderingContext2D, zombies: readonly Zombie[]): void {
  for (const z of zombies) {
    ctx.fillStyle = z.flashLeft > 0 ? COLOR_HIT_FLASH : ZOMBIES[z.type].color;
    ctx.beginPath();
    ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI * 2);
    ctx.fill();
    drawIce(ctx, z);

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
