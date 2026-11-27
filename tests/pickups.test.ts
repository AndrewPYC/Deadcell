import { describe, expect, it } from 'vitest';
import { collectPickups, tryUseMedkit } from '../src/systems/pickups';
import {
  createSupplyTimers,
  rollDrop,
  rollKind,
  stockSupplyPoints,
  updateSupplyPoints,
} from '../src/systems/supply';
import { createDroppedPickup, createSupplyPickup, updatePickups, type Pickup } from '../src/entities/pickup';
import { createPlayer } from '../src/entities/player';
import { vec } from '../src/core/math';
import {
  FIXED_STEP_SECONDS,
  PLAYER_MAX_HEALTH,
  TEST_LEVEL,
  WEAPONS,
  type DropRule,
  type SupplyConfig,
} from '../src/data/config';

const steps = (seconds: number) => Math.round(seconds / FIXED_STEP_SECONDS);
const always = () => 0;
const never = () => 0.999999;

describe('medkit', () => {
  it('restores full health from any amount of damage', () => {
    expect(PLAYER_MAX_HEALTH).toBe(100);
    expect(tryUseMedkit(1, 100)).toEqual({ health: 100, used: true });
    expect(tryUseMedkit(50, 100)).toEqual({ health: 100, used: true });
    expect(tryUseMedkit(99, 100)).toEqual({ health: 100, used: true });
  });

  it('cannot be used at full health', () => {
    expect(tryUseMedkit(100, 100)).toEqual({ health: 100, used: false });
  });

  it('does nothing for a dead player', () => {
    expect(tryUseMedkit(0, 100).used).toBe(false);
  });
});

describe('collecting pickups', () => {
  const at = (kind: 'ammo' | 'medkit') => createDroppedPickup(kind, vec(100, 100), 10);

  it('a medkit stays on the ground while the player is at full health', () => {
    const p = createPlayer(vec(100, 100));
    expect(collectPickups(p, [at('medkit')])).toHaveLength(1);
    expect(p.health).toBe(PLAYER_MAX_HEALTH);
  });

  it('a hurt player picks up a medkit and is back to full health', () => {
    const p = createPlayer(vec(100, 100));
    p.health = 20;
    expect(collectPickups(p, [at('medkit')])).toHaveLength(0);
    expect(p.health).toBe(100);
  });

  it('only pickups the player touches are collected', () => {
    const p = createPlayer(vec(100, 100));
    p.health = 40;
    const far = createDroppedPickup('medkit', vec(400, 400), 10);
    expect(collectPickups(p, [far])).toEqual([far]);
    expect(p.health).toBe(40);
  });

  it('ammo still refills the weapon in hand and is refused at a full reserve', () => {
    const p = createPlayer(vec(100, 100));
    expect(collectPickups(p, [at('ammo')])).toHaveLength(1); // rifle starts at its cap
    p.loadout.weapons.assaultRifle.reserve = 10;
    expect(collectPickups(p, [at('ammo')])).toHaveLength(0);
    expect(p.loadout.weapons.assaultRifle.reserve).toBe(10 + WEAPONS.assaultRifle.ammoBoxAmount);
  });

  it('one touch can collect an ammo box and a medkit together', () => {
    const p = createPlayer(vec(100, 100));
    p.health = 50;
    p.loadout.weapons.assaultRifle.reserve = 0;
    expect(collectPickups(p, [at('ammo'), at('medkit')])).toHaveLength(0);
    expect(p.health).toBe(PLAYER_MAX_HEALTH);
  });
});

describe('zombie drops', () => {
  const rule: DropRule = {
    chance: { walker: 0.1, runner: 0, tank: 1, spitter: 0.5 },
    table: [{ kind: 'medkit', weight: 1 }],
    lifetimeSeconds: 12,
    maxOnGround: 2,
  };

  it('follows the per-type drop chance from the level data', () => {
    expect(rollDrop('tank', vec(0, 0), rule, [], never)).not.toBeNull();
    expect(rollDrop('runner', vec(0, 0), rule, [], always)).toBeNull();
    expect(rollDrop('walker', vec(0, 0), rule, [], () => 0.09)).not.toBeNull();
    expect(rollDrop('walker', vec(0, 0), rule, [], () => 0.1)).toBeNull();
  });

  it('drops where the zombie died and lasts the rule lifetime', () => {
    const d = rollDrop('tank', vec(30, 40), rule, [], always)!;
    expect(d).toMatchObject({ kind: 'medkit', pos: { x: 30, y: 40 }, lifeLeft: 12, supplyPoint: null });
  });

  it('stops dropping while maxOnGround drops lie around; supply pickups do not count', () => {
    const two = [createDroppedPickup('ammo', vec(0, 0), 5), createDroppedPickup('ammo', vec(0, 0), 5)];
    expect(rollDrop('tank', vec(0, 0), rule, two, always)).toBeNull();
    const supplies = [createSupplyPickup('ammo', vec(0, 0), 0), createSupplyPickup('ammo', vec(0, 0), 1)];
    expect(rollDrop('tank', vec(0, 0), rule, supplies, always)).not.toBeNull();
  });

  it('dropped pickups vanish after their lifetime; supply pickups stay', () => {
    let list: Pickup[] = [createDroppedPickup('ammo', vec(0, 0), 2), createSupplyPickup('medkit', vec(0, 0), 0)];
    for (let i = 0; i < steps(2) - 1; i++) list = updatePickups(list, FIXED_STEP_SECONDS);
    expect(list).toHaveLength(2);
    list = updatePickups(list, FIXED_STEP_SECONDS);
    expect(list.map((p) => p.kind)).toEqual(['medkit']);
  });

  it('weighted tables pick by relative weight', () => {
    const table = [
      { kind: 'ammo' as const, weight: 3 },
      { kind: 'medkit' as const, weight: 1 },
    ];
    expect(rollKind(table, () => 0)).toBe('ammo');
    expect(rollKind(table, () => 0.74)).toBe('ammo');
    expect(rollKind(table, () => 0.75)).toBe('medkit');
    expect(rollKind([], () => 0)).toBeNull();
  });
});

describe('supply locations', () => {
  const config: SupplyConfig = {
    points: [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ],
    table: [{ kind: 'ammo', weight: 1 }],
    respawnSeconds: 5,
  };

  it('every location starts stocked', () => {
    const list = stockSupplyPoints(config, always);
    expect(list.map((p) => p.supplyPoint)).toEqual([0, 1]);
    expect(list.every((p) => p.lifeLeft === null)).toBe(true);
  });

  it('a taken location refills after respawnSeconds, not before', () => {
    let pickups = stockSupplyPoints(config, always).filter((p) => p.supplyPoint !== 0); // point 0 taken
    let timers = createSupplyTimers(config);
    const tick = () => {
      const s = updateSupplyPoints(timers, pickups, config, FIXED_STEP_SECONDS, always);
      timers = s.timers;
      pickups = [...pickups, ...s.spawned];
    };
    for (let i = 0; i < steps(5) - 1; i++) tick();
    expect(pickups.filter((p) => p.supplyPoint === 0)).toHaveLength(0);
    tick();
    expect(pickups.filter((p) => p.supplyPoint === 0)).toHaveLength(1);
    expect(pickups.filter((p) => p.supplyPoint === 1)).toHaveLength(1); // never doubled up
  });

  it('a spot with a fixed kind always stocks and refills that kind, whatever the table rolls', () => {
    const fixed: SupplyConfig = { ...config, points: [{ x: 10, y: 10, kind: 'medkit' }, { x: 50, y: 50 }] };
    expect(stockSupplyPoints(fixed, always).map((p) => p.kind)).toEqual(['medkit', 'ammo']);
    const refill = updateSupplyPoints([0, 0], [], fixed, FIXED_STEP_SECONDS, always);
    expect(refill.spawned.map((p) => [p.supplyPoint, p.kind])).toEqual([
      [0, 'medkit'],
      [1, 'ammo'],
    ]);
  });

  it('the test level has supply locations and drop rules for every zombie type', () => {
    expect(TEST_LEVEL.supply.points.length).toBeGreaterThan(0);
    expect(TEST_LEVEL.supply.table.map((e) => e.kind).sort()).toEqual(['ammo', 'medkit']);
    expect(Object.keys(TEST_LEVEL.drops.chance).sort()).toEqual(['runner', 'spitter', 'tank', 'walker']);
  });
});
