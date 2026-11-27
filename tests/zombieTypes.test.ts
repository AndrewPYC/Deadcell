import { describe, expect, it } from 'vitest';
import { canSpit, rangeIntent } from '../src/systems/spitter';
import { separation, updateZombies, type ZombieWorld } from '../src/systems/zombieAI';
import { createNavCache, updateNavCache } from '../src/systems/navCache';
import { circleIntersectsRect, type Rect } from '../src/systems/collision';
import { createZombie, type Zombie } from '../src/entities/zombie';
import { vec, type Vec2 } from '../src/core/math';
import { FIXED_STEP_SECONDS, PLAYER_RADIUS, ZOMBIES, type ZombieType } from '../src/data/config';

const band = ZOMBIES.spitter.preferredRange!;

function makeWorld(walls: Rect[] = [], w = 1600, h = 1200): ZombieWorld {
  const radii = (Object.keys(ZOMBIES) as ZombieType[]).map((t) => ZOMBIES[t].radius);
  return { walls, width: w, height: h, nav: createNavCache(walls, w, h, radii) };
}

function simulate(zombies: Zombie[], player: Vec2, world: ZombieWorld, seconds: number, each?: () => void) {
  let spits = 0;
  let melee = 0;
  for (let i = 0; i < Math.round(seconds / FIXED_STEP_SECONDS); i++) {
    updateNavCache(world.nav, player, FIXED_STEP_SECONDS);
    const r = updateZombies(zombies, player, PLAYER_RADIUS, world, FIXED_STEP_SECONDS);
    spits += r.spits.length;
    melee += r.meleeDamage;
    each?.();
  }
  return { spits, melee };
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

describe('zombie type data', () => {
  it('Runner, Tank and Spitter match the brief', () => {
    expect(ZOMBIES.runner).toMatchObject({ health: 25, speed: 145, damage: 8, xp: 15, attackInterval: 1.2, behavior: 'melee' });
    expect(ZOMBIES.tank).toMatchObject({ health: 300, speed: 45, damage: 20, xp: 50, attackInterval: 2 });
    expect(ZOMBIES.spitter).toMatchObject({ health: 60, speed: 65, damage: 12, xp: 25, attackInterval: 2.5, behavior: 'ranged' });
    expect(band).toEqual({ min: 180, max: 260 });
  });

  it('Tanks resist knockback, cannot be frozen and are slowed only 25% by ice', () => {
    expect(ZOMBIES.tank.knockbackResistance).toBeGreaterThan(0);
    expect(ZOMBIES.tank.freezeImmune).toBe(true);
    expect(ZOMBIES.tank.iceSlowMultiplier).toBe(0.75);
  });

  it('every type has a distinct color and size', () => {
    const all = Object.values(ZOMBIES);
    expect(new Set(all.map((z) => z.color)).size).toBe(all.length);
    expect(new Set(all.map((z) => z.radius)).size).toBe(all.length);
  });
});

describe('spitter distance keeping', () => {
  it('retreats when too close, holds in the band, approaches when too far', () => {
    expect(rangeIntent(100, band, true)).toBe('retreat');
    expect(rangeIntent(179, band, true)).toBe('retreat');
    expect(rangeIntent(180, band, true)).toBe('hold');
    expect(rangeIntent(220, band, true)).toBe('hold');
    expect(rangeIntent(260, band, true)).toBe('hold');
    expect(rangeIntent(261, band, true)).toBe('approach');
  });

  it('closes in when a wall blocks its view, even inside the band', () => {
    expect(rangeIntent(220, band, false)).toBe('approach');
  });

  it('only spits when ready, in range and with a clear shot', () => {
    expect(canSpit(0, 200, band.max, true)).toBe(true);
    expect(canSpit(0.5, 200, band.max, true)).toBe(false);
    expect(canSpit(0, 300, band.max, true)).toBe(false);
    expect(canSpit(0, 200, band.max, false)).toBe(false);
  });

  it('backs off from a close player into the band', () => {
    const player = vec(800, 600);
    const z = createZombie('spitter', vec(860, 600));
    simulate([z], player, makeWorld(), 5);
    const d = dist(z.pos, player);
    expect(d).toBeGreaterThanOrEqual(band.min - 1);
    expect(d).toBeLessThanOrEqual(band.max);
  });

  it('walks in from far away and stops inside the band', () => {
    const player = vec(800, 600);
    const z = createZombie('spitter', vec(100, 600));
    simulate([z], player, makeWorld(), 15);
    const d = dist(z.pos, player);
    expect(d).toBeGreaterThanOrEqual(band.min);
    expect(d).toBeLessThanOrEqual(band.max + 1);
  });

  it('spits every 2.5 seconds while in the band', () => {
    const player = vec(800, 600);
    const z = createZombie('spitter', vec(1020, 600)); // 220 px away
    const { spits, melee } = simulate([z], player, makeWorld(), 10);
    expect(spits).toBe(4); // t = 0, 2.5, 5, 7.5
    expect(melee).toBe(0);
  });
});

describe('navigation in play', () => {
  it('zombies go around a wall and never overlap it', () => {
    const wall = { x: 600, y: 200, w: 40, h: 800 };
    const world = makeWorld([wall]);
    const player = vec(300, 600);
    const zombies = (['walker', 'runner', 'tank', 'walker', 'runner', 'tank'] as ZombieType[]).map((t, i) =>
      createZombie(t, vec(900, 400 + i * 60)),
    );
    let touched = false;
    let overlappedPlayer = false;
    simulate(zombies, player, world, 20, () => {
      if (zombies.some((z) => circleIntersectsRect(z.pos, z.radius - 0.01, wall))) touched = true;
      if (zombies.some((z) => dist(z.pos, player) < z.radius + PLAYER_RADIUS - 0.01)) overlappedPlayer = true;
    });
    expect(touched).toBe(false);
    expect(overlappedPlayer).toBe(false);
    // Everyone made it around the wall to the player's side and is crowding in.
    for (const z of zombies) {
      expect(z.pos.x).toBeLessThan(wall.x);
      expect(dist(z.pos, player)).toBeLessThan(160);
    }
  });

  it('zombies spread out instead of stacking', () => {
    const a = createZombie('walker', vec(500, 500));
    const b = createZombie('walker', vec(500, 500));
    expect(separation(a, [a, b]).x).not.toBe(0);
    const player = vec(500, 900); // far enough that they never reach melee range
    simulate([a, b], player, makeWorld(), 0.5);
    expect(dist(a.pos, b.pos)).toBeGreaterThan(a.radius);
  });
});
