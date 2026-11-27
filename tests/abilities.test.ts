import { describe, expect, it } from 'vitest';
import {
  abilityStatusText,
  createAbility,
  isAbilityActive,
  updateAbility,
  type AbilityState,
} from '../src/systems/ability';
import {
  applyHitEffect,
  frostPulse,
  hitEffect,
  pulseEffect,
  weaponModsFor,
} from '../src/systems/characterAbility';
import {
  createStatus,
  isFrozen,
  isSlowed,
  speedMultiplier,
  tickStatus,
  type StatusEffects,
} from '../src/systems/statusEffects';
import { createWeaponState, reloadProgress, startReload, updateWeapon, type WeaponState } from '../src/systems/weapon';
import { resolveProjectileHits, type Damageable } from '../src/systems/combat';
import { createProjectile } from '../src/entities/projectile';
import { updateZombies, type ZombieWorld } from '../src/systems/zombieAI';
import { createNavCache } from '../src/systems/navCache';
import { createZombie, type Zombie } from '../src/entities/zombie';
import { createPlayer, switchCharacter } from '../src/entities/player';
import { vec, type Vec2 } from '../src/core/math';
import {
  ABILITIES,
  BOSS_RESISTANCES,
  CHARACTERS,
  FIXED_STEP_SECONDS,
  FROST_PULSE,
  PLAYER_RADIUS,
  WEAPONS,
  WIND_SURGE,
  ZOMBIES,
  type Resistances,
  type ZombieType,
} from '../src/data/config';

const timing = ABILITIES.windSurge;
const steps = (seconds: number) => Math.round(seconds / FIXED_STEP_SECONDS);
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

/** Advance the ability `seconds` at 60 Hz with no key presses. */
function wait(a: AbilityState, seconds: number): AbilityState {
  for (let i = 0; i < steps(seconds); i++) a = updateAbility(a, timing, FIXED_STEP_SECONDS, false).state;
  return a;
}

const activate = (a: AbilityState = createAbility()) => updateAbility(a, timing, FIXED_STEP_SECONDS, true);

describe('characters', () => {
  it('Zane is blue with Wind Surge, Nepbava is pink with Frost Pulse', () => {
    expect(CHARACTERS.zane).toMatchObject({ name: 'Zane', ability: 'windSurge' });
    expect(CHARACTERS.nepbava).toMatchObject({ name: 'Nepbava', ability: 'frostPulse' });
    expect(CHARACTERS.zane.color).not.toBe(CHARACTERS.nepbava.color);
  });

  it('share the same health, stamina and weapons', () => {
    const z = createPlayer(vec(0, 0), 'zane');
    const n = createPlayer(vec(0, 0), 'nepbava');
    expect(n.health).toBe(z.health);
    expect(n.maxHealth).toBe(z.maxHealth);
    expect(n.stamina).toEqual(z.stamina);
    expect(n.loadout).toEqual(z.loadout);
  });

  it('the debug switch cycles characters and resets the ability', () => {
    const p = createPlayer(vec(0, 0), 'zane');
    p.ability = activate().state;
    switchCharacter(p);
    expect(p.character).toBe('nepbava');
    expect(p.ability.phase).toBe('ready');
    switchCharacter(p);
    expect(p.character).toBe('zane');
  });
});

describe('ability duration and cooldown', () => {
  it('both abilities last 10 s with a 15 s cooldown', () => {
    for (const a of Object.values(ABILITIES)) expect(a).toMatchObject({ durationSeconds: 10, cooldownSeconds: 15 });
  });

  it('starts ready and activates on the key', () => {
    expect(createAbility().phase).toBe('ready');
    const step = activate();
    expect(step.activated).toBe(true);
    expect(isAbilityActive(step.state)).toBe(true);
  });

  it('does nothing without the key', () => {
    expect(updateAbility(createAbility(), timing, FIXED_STEP_SECONDS, false).state.phase).toBe('ready');
  });

  it('stays active for exactly 10 seconds', () => {
    const a = activate().state;
    expect(wait(a, 10 - FIXED_STEP_SECONDS).phase).toBe('active');
    expect(wait(a, 10).phase).toBe('cooldown');
  });

  it('does not count down the cooldown while active', () => {
    const a = wait(activate().state, 5);
    expect(a.phase).toBe('active');
    expect(a.timeLeft).toBeCloseTo(5);
  });

  it('starts the full 15 s cooldown only once the 10 s end', () => {
    const ended = wait(activate().state, 10);
    expect(ended.phase).toBe('cooldown');
    expect(ended.timeLeft).toBeCloseTo(15);
  });

  it('is ready again 25 s after activation, not 15 s', () => {
    const a = activate().state;
    expect(wait(a, 15).phase).toBe('cooldown');
    expect(wait(a, 25 - FIXED_STEP_SECONDS).phase).toBe('cooldown');
    expect(wait(a, 25).phase).toBe('ready');
  });

  it('ignores the key while active or cooling down', () => {
    const active = wait(activate().state, 3);
    const pressedActive = updateAbility(active, timing, FIXED_STEP_SECONDS, true);
    expect(pressedActive.activated).toBe(false);
    expect(pressedActive.state.timeLeft).toBeCloseTo(7 - FIXED_STEP_SECONDS);

    const cooling = wait(activate().state, 20);
    const pressedCooling = updateAbility(cooling, timing, FIXED_STEP_SECONDS, true);
    expect(pressedCooling.activated).toBe(false);
    expect(pressedCooling.state.phase).toBe('cooldown');
  });

  it('can be used again as soon as it is ready', () => {
    const ready = wait(activate().state, 25);
    expect(activate(ready).activated).toBe(true);
  });
});

describe('HUD ability state', () => {
  it('shows Ready, the active timer and the cooldown timer', () => {
    expect(abilityStatusText(createAbility())).toBe('READY');
    const a = activate().state;
    expect(abilityStatusText(a)).toBe('ACTIVE 10s');
    expect(abilityStatusText(wait(a, 9.5))).toBe('ACTIVE 1s');
    expect(abilityStatusText(wait(a, 10))).toBe('COOLDOWN 15s');
    expect(abilityStatusText(wait(a, 17))).toBe('COOLDOWN 8s'); // 10 s active + 7 s of cooldown
    expect(abilityStatusText(wait(a, 24.5))).toBe('COOLDOWN 1s');
    expect(abilityStatusText(wait(a, 25))).toBe('READY');
  });
});

describe('Wind Surge weapon boost', () => {
  const rifle = WEAPONS.assaultRifle;
  const surge = weaponModsFor('windSurge', true);

  function fire(w: WeaponState, seconds: number, trigger: boolean) {
    let shots = 0;
    for (let i = 0; i < steps(seconds); i++) {
      const r = updateWeapon(w, rifle, FIXED_STEP_SECONDS, trigger, surge);
      w = r.state;
      shots += r.shots;
    }
    return { w, shots };
  }

  it('only applies while Wind Surge is active', () => {
    expect(surge).toEqual({ fireRateMultiplier: 1.25, reloadTimeMultiplier: 0.75 });
    expect(weaponModsFor('windSurge', false)).toEqual({ fireRateMultiplier: 1, reloadTimeMultiplier: 1 });
    expect(weaponModsFor('frostPulse', true)).toEqual({ fireRateMultiplier: 1, reloadTimeMultiplier: 1 });
  });

  it('fires 25% faster and still uses one round per shot', () => {
    const { w, shots } = fire(createWeaponState(rifle), 2, true);
    expect(shots).toBe(15); // 6/s × 1.25 = 7.5/s
    expect(w.magazine).toBe(rifle.magazineSize - 15);
  });

  it('reloads in 75% of the time, and the progress bar still reads right', () => {
    const empty = startReload({ magazine: 0, reserve: 75, cooldown: 0, reloadLeft: 0 }, rifle);
    const half = fire(empty, 0.75, false).w;
    expect(reloadProgress(half, rifle)).toBeCloseTo(0.5);
    expect(fire(empty, 1.5 - FIXED_STEP_SECONDS, false).w.magazine).toBe(0);
    expect(fire(empty, 1.5, false).w.magazine).toBe(rifle.magazineSize);
  });
});

describe('Wind Surge knockback', () => {
  const push = (r: Resistances) => hitEffect('windSurge', createStatus(), r, vec(1, 0)).knockback.x;

  it('full on normal zombies, heavily reduced on Tanks, none on the boss', () => {
    expect(push(ZOMBIES.walker)).toBeCloseTo(WIND_SURGE.knockbackSpeed);
    expect(push(ZOMBIES.runner)).toBeCloseTo(WIND_SURGE.knockbackSpeed);
    expect(push(ZOMBIES.tank)).toBeGreaterThan(0);
    expect(push(ZOMBIES.tank)).toBeLessThanOrEqual(WIND_SURGE.knockbackSpeed * 0.25);
    expect(push(BOSS_RESISTANCES)).toBe(0);
  });

  it('the boss is not pushed but still takes full damage', () => {
    const boss: Damageable & { status: StatusEffects } = {
      pos: vec(100, 100),
      radius: 40,
      health: 1000,
      flashLeft: 0,
      status: createStatus(),
    };
    const onHit = (t: typeof boss, dir: Vec2) => {
      t.status = hitEffect('windSurge', t.status, BOSS_RESISTANCES, dir);
    };
    resolveProjectileHits([createProjectile(boss.pos, 0, WEAPONS.assaultRifle)], [boss], 0.1, onHit);
    expect(boss.health).toBe(1000 - WEAPONS.assaultRifle.damage);
    expect(boss.status.knockback).toEqual(vec(0, 0));
  });

  it('hits push along the bullet direction and do not add up', () => {
    let s = createStatus();
    for (let i = 0; i < 6; i++) s = hitEffect('windSurge', s, ZOMBIES.walker, vec(0, 1));
    expect(s.knockback.x).toBeCloseTo(0);
    expect(s.knockback.y).toBeCloseTo(WIND_SURGE.knockbackSpeed);
  });

  it('pushes a walker back, a Tank much less, and wears off', () => {
    const world = makeWorld();
    const player = vec(200, 600);
    const walker = createZombie('walker', vec(500, 600));
    const tank = createZombie('tank', vec(500, 900)); // far from the walker so they don't push apart
    for (const z of [walker, tank]) applyHitEffect('windSurge', true, z, vec(1, 0));
    const start = [dist(walker.pos, player), dist(tank.pos, player)];
    simulate([walker, tank], player, world, WIND_SURGE.knockbackSeconds + 2 * FIXED_STEP_SECONDS);
    const walkerBack = dist(walker.pos, player) - start[0];
    expect(walkerBack).toBeGreaterThan(0);
    expect(walker.status.knockback).toEqual(vec(0, 0));
    expect(tank.pos.x - 500).toBeLessThan(walker.pos.x - 500);
  });

  it('does nothing when the ability is not active', () => {
    const z = createZombie('walker', vec(0, 0));
    applyHitEffect('windSurge', false, z, vec(1, 0));
    expect(z.status).toEqual(createStatus());
  });
});

function makeWorld(w = 1600, h = 1200): ZombieWorld {
  const radii = (Object.keys(ZOMBIES) as ZombieType[]).map((t) => ZOMBIES[t].radius);
  return { walls: [], width: w, height: h, nav: createNavCache([], w, h, radii) };
}

function simulate(zombies: Zombie[], player: Vec2, world: ZombieWorld, seconds: number): number {
  let melee = 0;
  for (let i = 0; i < steps(seconds); i++) {
    melee += updateZombies(zombies, player, PLAYER_RADIUS, world, FIXED_STEP_SECONDS).meleeDamage;
  }
  return melee;
}

describe('Frost Pulse activation', () => {
  it('freezes every zombie within 120 px, and only those', () => {
    const center = vec(500, 500);
    const near = createZombie('walker', vec(500 + FROST_PULSE.radius, 500));
    const close = createZombie('runner', vec(450, 520));
    const far = createZombie('walker', vec(500 + FROST_PULSE.radius + 1, 500));
    expect(frostPulse([near, close, far], center)).toBe(2);
    expect(isFrozen(near.status)).toBe(true);
    expect(isFrozen(close.status)).toBe(true);
    expect(isFrozen(far.status)).toBe(false);
    expect(isSlowed(far.status)).toBe(false);
  });

  it('a frozen zombie neither moves nor attacks for exactly 1.5 s', () => {
    const player = vec(500, 500);
    const z = createZombie('walker', vec(500 + PLAYER_RADIUS + ZOMBIES.walker.radius, 500)); // touching
    frostPulse([z], player);
    const start = { ...z.pos };
    expect(simulate([z], player, makeWorld(), FROST_PULSE.freezeSeconds - FIXED_STEP_SECONDS)).toBe(0);
    expect(z.pos).toEqual(start);
    expect(isFrozen(z.status)).toBe(true);
    simulate([z], player, makeWorld(), FIXED_STEP_SECONDS);
    expect(isFrozen(z.status)).toBe(false);
  });

  it('Tanks are never fully frozen, only slowed by 25%', () => {
    const tank = createZombie('tank', vec(510, 500));
    frostPulse([tank], vec(500, 500));
    expect(isFrozen(tank.status)).toBe(false);
    expect(speedMultiplier(tank.status, ZOMBIES.tank)).toBe(0.75);
  });

  it('the boss is immune to freezing and only slowed by 20%', () => {
    const s = pulseEffect(createStatus(), BOSS_RESISTANCES);
    expect(isFrozen(s)).toBe(false);
    expect(speedMultiplier(s, BOSS_RESISTANCES)).toBe(0.8);
  });
});

describe('Frost Pulse hit slow', () => {
  const hit = (s: StatusEffects, r: Resistances = ZOMBIES.walker) => hitEffect('frostPulse', s, r, vec(1, 0));

  it('slows a normal zombie by 50% for 2 seconds', () => {
    const s = hit(createStatus());
    expect(speedMultiplier(s, ZOMBIES.walker)).toBe(0.5);
    let t = s;
    for (let i = 0; i < steps(2 - FIXED_STEP_SECONDS); i++) t = tickStatus(t, FIXED_STEP_SECONDS, 0);
    expect(isSlowed(t)).toBe(true);
    t = tickStatus(t, FIXED_STEP_SECONDS, 0);
    expect(isSlowed(t)).toBe(false);
    expect(speedMultiplier(t, ZOMBIES.walker)).toBe(1);
  });

  it('repeated hits never stack the slow', () => {
    let s = createStatus();
    for (let i = 0; i < 10; i++) s = hit(s);
    expect(speedMultiplier(s, ZOMBIES.walker)).toBe(0.5);
    expect(s.slowLeft).toBe(FROST_PULSE.hitSlowSeconds);
  });

  it('repeated hits refresh the duration', () => {
    let s = hit(createStatus());
    for (let i = 0; i < steps(1.5); i++) s = tickStatus(s, FIXED_STEP_SECONDS, 0);
    expect(s.slowLeft).toBeCloseTo(0.5);
    s = hit(s);
    expect(s.slowLeft).toBe(FROST_PULSE.hitSlowSeconds);
  });

  it('Tanks are slowed 25% and the boss 20%, never frozen by hits', () => {
    const tank = hit(createStatus(), ZOMBIES.tank);
    const boss = hit(createStatus(), BOSS_RESISTANCES);
    expect(speedMultiplier(tank, ZOMBIES.tank)).toBe(0.75);
    expect(speedMultiplier(boss, BOSS_RESISTANCES)).toBe(0.8);
    expect(isFrozen(tank) || isFrozen(boss)).toBe(false);
  });

  it('a slowed walker covers half the ground', () => {
    const player = vec(1500, 600);
    const slowed = createZombie('walker', vec(100, 300));
    const normal = createZombie('walker', vec(100, 900));
    slowed.status = hit(slowed.status);
    const a = { ...slowed.pos };
    const b = { ...normal.pos };
    simulate([slowed, normal], player, makeWorld(), 1);
    expect(dist(slowed.pos, a) / dist(normal.pos, b)).toBeCloseTo(0.5, 1);
  });

  it('hits only slow while the ability is active', () => {
    const z = createZombie('walker', vec(0, 0));
    applyHitEffect('frostPulse', false, z, vec(1, 0));
    expect(isSlowed(z.status)).toBe(false);
    applyHitEffect('frostPulse', true, z, vec(1, 0));
    expect(isSlowed(z.status)).toBe(true);
  });
});
