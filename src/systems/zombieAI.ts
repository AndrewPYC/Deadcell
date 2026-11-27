import { length, normalize, vec, type Vec2 } from '../core/math';
import { SEPARATION_PADDING, SEPARATION_WEIGHT, ZOMBIES, type ZombieStats } from '../data/config';
import type { Zombie } from '../entities/zombie';
import { makeProjectile, type Projectile } from '../entities/projectile';
import { hasClearPath, moveCircle, type Rect } from './collision';
import { inMeleeRange, meleeStep } from './melee';
import { fieldFor, type NavCache } from './navCache';
import { flowDirection } from './navigation';
import { canSpit, rangeIntent } from './spitter';
import { isFrozen, speedMultiplier, tickStatus } from './statusEffects';
import { KNOCKBACK_DECAY } from './characterAbility';

export interface ZombieWorld {
  walls: readonly Rect[];
  width: number;
  height: number;
  nav: NavCache;
}

export interface ZombieStep {
  meleeDamage: number;
  spits: Projectile[];
}

/** Gentle push away from nearby zombies so they spread out instead of stacking. */
export function separation(self: Zombie, others: readonly Zombie[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const o of others) {
    if (o === self) continue;
    const dx = self.pos.x - o.pos.x;
    const dy = self.pos.y - o.pos.y;
    const range = self.radius + o.radius + SEPARATION_PADDING;
    const distSq = dx * dx + dy * dy;
    if (distSq >= range * range) continue;
    const dist = Math.sqrt(distSq);
    const strength = 1 - dist / range;
    if (dist === 0) {
      x += strength; // exact overlap: any consistent direction works
      continue;
    }
    x += (dx / dist) * strength;
    y += (dy / dist) * strength;
  }
  return vec(x, y);
}

/** Zombies crowd the player but never overlap them; the push is wall-checked like normal movement. */
function keepOutOfPlayer(z: Zombie, player: Vec2, playerRadius: number, world: ZombieWorld): Vec2 {
  const dx = z.pos.x - player.x;
  const dy = z.pos.y - player.y;
  const dist = Math.hypot(dx, dy);
  const minDist = z.radius + playerRadius;
  if (dist >= minDist) return z.pos;
  const nx = dist === 0 ? 1 : dx / dist;
  const ny = dist === 0 ? 0 : dy / dist;
  const push = minDist - dist;
  return moveCircle(z.pos, vec(nx * push, ny * push), z.radius, world.walls, world.width, world.height);
}

/** Straight at the player when the way is clear, otherwise along the flow field around walls. */
function chaseDirection(z: Zombie, player: Vec2, clear: boolean, world: ZombieWorld): Vec2 {
  if (clear) return normalize(vec(player.x - z.pos.x, player.y - z.pos.y));
  const field = fieldFor(world.nav, z.radius);
  return field ? flowDirection(field, z.pos) : normalize(vec(player.x - z.pos.x, player.y - z.pos.y));
}

function desiredDirection(z: Zombie, s: ZombieStats, player: Vec2, playerRadius: number, dist: number, clear: boolean, world: ZombieWorld): Vec2 {
  if (s.behavior === 'melee') {
    return inMeleeRange(dist, z.radius, playerRadius) ? vec(0, 0) : chaseDirection(z, player, clear, world);
  }
  const intent = rangeIntent(dist, s.preferredRange!, clear);
  if (intent === 'approach') return chaseDirection(z, player, clear, world);
  if (intent === 'retreat') return normalize(vec(z.pos.x - player.x, z.pos.y - player.y));
  return vec(0, 0);
}

export function updateZombies(
  zombies: Zombie[],
  player: Vec2,
  playerRadius: number,
  world: ZombieWorld,
  dt: number,
): ZombieStep {
  let meleeDamage = 0;
  const spits: Projectile[] = [];

  for (const z of zombies) {
    const s = ZOMBIES[z.type];
    if (isFrozen(z.status)) {
      // Frozen solid: no moving, no attacking, attack timer on hold.
      z.status = tickStatus(z.status, dt, KNOCKBACK_DECAY);
      z.flashLeft = Math.max(0, z.flashLeft - dt);
      continue;
    }
    const dist = Math.hypot(player.x - z.pos.x, player.y - z.pos.y);
    const clear = hasClearPath(z.pos, player, z.radius, world.walls);

    const maxSpeed = s.speed * speedMultiplier(z.status, s);
    const want = desiredDirection(z, s, player, playerRadius, dist, clear, world);
    const push = separation(z, zombies);
    let v = vec((want.x + push.x * SEPARATION_WEIGHT) * maxSpeed, (want.y + push.y * SEPARATION_WEIGHT) * maxSpeed);
    const speed = length(v);
    if (speed > maxSpeed) v = vec((v.x / speed) * maxSpeed, (v.y / speed) * maxSpeed);
    // Knockback is added on top of the capped walk so it can push a zombie backwards.
    const kb = z.status.knockback;
    const delta = vec((v.x + kb.x) * dt, (v.y + kb.y) * dt);
    z.pos = moveCircle(z.pos, delta, z.radius, world.walls, world.width, world.height);
    z.pos = keepOutOfPlayer(z, player, playerRadius, world);

    const newDist = Math.hypot(player.x - z.pos.x, player.y - z.pos.y);
    if (s.behavior === 'melee') {
      const step = meleeStep(z.attackCooldown, inMeleeRange(newDist, z.radius, playerRadius), s.attackInterval, dt);
      z.attackCooldown = step.cooldown;
      if (step.hit) meleeDamage += s.damage;
    } else if (s.spit && s.preferredRange) {
      z.attackCooldown = Math.max(0, z.attackCooldown - dt);
      const spitClear = hasClearPath(z.pos, player, s.spit.radius, world.walls);
      if (canSpit(z.attackCooldown, newDist, s.preferredRange.max, spitClear)) {
        const angle = Math.atan2(player.y - z.pos.y, player.x - z.pos.x);
        spits.push(
          makeProjectile(z.pos, angle, { ...s.spit, damage: s.damage, splash: null }),
        );
        z.attackCooldown = s.attackInterval;
      }
    }
    z.status = tickStatus(z.status, dt, KNOCKBACK_DECAY);
    z.flashLeft = Math.max(0, z.flashLeft - dt);
  }
  return { meleeDamage, spits };
}
