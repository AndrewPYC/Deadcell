import {
  ABILITIES,
  ABILITY_KEY,
  ACTIVE_ZOMBIE_CAP,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_BACKGROUND,
  COLOR_FROST_PULSE,
  DEBUG_HORDE_KEY,
  DEBUG_HORDE_SIZE,
  DEBUG_KILL_ALL_KEY,
  DEBUG_SPAWN_KEYS,
  DEBUG_SWITCH_CHARACTER_KEY,
  DEFAULT_CHARACTER,
  FROST_PULSE,
  HIT_FLASH_SECONDS,
  LEVEL_1,
  PLAYER_RADIUS,
  STARTING_WEAPON,
  ZOMBIES,
  type CharacterId,
  type LevelDef,
  type WeaponId,
  type ZombieType,
} from './data/config';
import type { Input } from './core/input';
import { vec, type Vec2 } from './core/math';
import {
  createPlayer,
  damagePlayer,
  drawPlayer,
  switchCharacter,
  updatePlayer,
  type Player,
} from './entities/player';
import { drawProjectiles, updateProjectiles, type Detonation, type Projectile } from './entities/projectile';
import { createExplosion, drawExplosions, updateExplosions, type Explosion } from './entities/explosion';
import { drawPickups, updatePickups, type Pickup } from './entities/pickup';
import { createZombie, drawZombies, type Zombie } from './entities/zombie';
import { updatePlayerWeapon } from './systems/playerWeapon';
import { resolveHitsOnPlayer, resolveProjectileHits, type Damageable, type OnHit } from './systems/combat';
import { applySplash } from './systems/splash';
import { collectPickups } from './systems/pickups';
import { createSupplyTimers, rollDrop, stockSupplyPoints, updateSupplyPoints } from './systems/supply';
import { updateZombies, type ZombieWorld } from './systems/zombieAI';
import { createNavCache, updateNavCache } from './systems/navCache';
import { findSpawnPoint, GROUP_MIN_DISTANCE, groupPositions, inSafeArea } from './systems/spawn';
import { collectKills } from './systems/xp';
import { countsTowardCap, createWaveState, updateWaves, type WaveContext, type WaveState } from './systems/waves';
import { isAbilityActive, updateAbility } from './systems/ability';
import { abilityOf, applyHitEffect, frostPulse, weaponModsFor } from './systems/characterAbility';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';
import { drawHealthBar } from './ui/healthBar';
import { drawAmmo } from './ui/ammo';
import { drawAbilityIcon } from './ui/abilityIcon';
import { drawWaveHud } from './ui/waveHud';
import { drawSpawnWarnings } from './ui/spawnWarnings';
import { drawDebugInfo } from './ui/debugInfo';
import { drawEndScreen, endScreenText } from './ui/gameOver';
import { drawObjective, objectiveHint } from './ui/objective';
import { createLevelState, updateLevel, type LevelResult, type LevelState } from './systems/levelManager';

export interface World {
  player: Player;
  zombies: Zombie[];
  projectiles: Projectile[];
  enemyProjectiles: Projectile[];
  explosions: Explosion[];
  pickups: Pickup[];
  /** Seconds until each empty supply location refills. */
  supplyTimers: number[];
  level: LevelDef;
  waves: WaveState;
  /** Win and lose tracking for the level. */
  levelState: LevelState;
  zombieWorld: ZombieWorld;
  /** Random source for spawns and drops; tests pass a seeded one. */
  rng: () => number;
  /** Seconds of play so far; drives pulsing visuals. */
  time: number;
}

const ZOMBIE_TYPES = Object.keys(ZOMBIES) as ZombieType[];

export const standardAlive = (zombies: readonly Zombie[]): number =>
  zombies.filter((z) => countsTowardCap(z.type)).length;

export const isLevelClear = (world: World): boolean => world.levelState.status === 'won';
/** A won or lost level stops the game until restart. */
export const isOver = (world: World): boolean => world.levelState.status !== 'playing';

/** DEBUG spawn: one zombie away from the player. Respects the cap like wave spawns do. */
export function spawnZombie(world: World, type: ZombieType): void {
  if (countsTowardCap(type) && standardAlive(world.zombies) >= ACTIVE_ZOMBIE_CAP) return;
  const pos = findSpawnPoint(world.player.pos, ZOMBIES[type].radius, world.level.walls, CANVAS_WIDTH, CANVAS_HEIGHT, world.rng);
  world.zombies.push(createZombie(type, pos));
}

/** `owned` is the profile's weapon list; the player starts the level with exactly those. */
export function createWorld(
  character: CharacterId = DEFAULT_CHARACTER,
  level: LevelDef = LEVEL_1,
  owned: readonly WeaponId[] = [STARTING_WEAPON],
  rng: () => number = Math.random,
): World {
  return {
    player: createPlayer(vec(level.playerStart.x, level.playerStart.y), character, owned),
    zombies: [],
    projectiles: [],
    enemyProjectiles: [],
    explosions: [],
    pickups: stockSupplyPoints(level.supply, rng),
    supplyTimers: createSupplyTimers(level.supply),
    level,
    waves: createWaveState(level),
    levelState: createLevelState(level),
    zombieWorld: {
      walls: level.walls,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      nav: createNavCache(level.walls, CANVAS_WIDTH, CANVAS_HEIGHT, ZOMBIE_TYPES.map((t) => ZOMBIES[t].radius)),
    },
    rng,
    time: 0,
  };
}

/** Splash hits zombies only; the player is never in this list, so blasts never hurt them. */
function detonate(world: World, d: Detonation, onHit: OnHit<Zombie>, directTarget: Damageable | null = null): void {
  applySplash(d.pos, d.splash, world.zombies, HIT_FLASH_SECONDS, directTarget, onHit);
  world.explosions.push(createExplosion(d.pos, d.splash.radius));
}

function handleDebugKeys(world: World, input: Input): void {
  for (const type of ZOMBIE_TYPES) {
    if (input.consumePress(DEBUG_SPAWN_KEYS[type])) spawnZombie(world, type);
  }
  if (input.consumePress(DEBUG_HORDE_KEY)) {
    for (let i = 0; i < DEBUG_HORDE_SIZE; i++) spawnZombie(world, ZOMBIE_TYPES[i % ZOMBIE_TYPES.length]);
  }
  if (input.consumePress(DEBUG_KILL_ALL_KEY)) world.zombies.forEach((z) => (z.health = 0));
  if (input.consumePress(DEBUG_SWITCH_CHARACTER_KEY)) switchCharacter(world.player);
}

/** Q: ticks the ability timer and fires its one-off activation effect. */
function handleAbility(world: World, input: Input, dt: number): void {
  const { player } = world;
  const ability = abilityOf(player.character);
  const step = updateAbility(player.ability, ABILITIES[ability], dt, input.consumePress(ABILITY_KEY));
  player.ability = step.state;
  if (step.activated && ability === 'frostPulse') {
    frostPulse(world.zombies, player.pos);
    world.explosions.push(createExplosion(vec(player.pos.x, player.pos.y), FROST_PULSE.radius, COLOR_FROST_PULSE));
  }
}

/** Removes the dead, awards XP and rolls the level's drop rule for each kill. */
function handleKills(world: World): void {
  const kills = collectKills(world.zombies);
  world.zombies = kills.alive;
  world.player.xp += kills.xp;
  for (const z of kills.dead) {
    const drop = rollDrop(z.type, z.pos, world.level.drops, world.pickups, world.rng);
    if (drop) world.pickups.push(drop);
  }
}

/** Runs the wave manager and turns finished warnings into groups of zombies. */
function handleWaves(world: World, dt: number): void {
  const player = world.player.pos;
  const ctx: WaveContext = {
    activeStandard: standardAlive(world.zombies),
    activeTotal: world.zombies.length,
    pickSpawnPoint: (type) =>
      findSpawnPoint(player, ZOMBIES[type].radius, world.level.walls, CANVAS_WIDTH, CANVAS_HEIGHT, world.rng, GROUP_MIN_DISTANCE),
    inSafeArea: (pos) => inSafeArea(pos, player),
  };
  const step = updateWaves(world.waves, world.level, dt, ctx);
  world.waves = step.state;
  for (const g of step.spawns) {
    const r = ZOMBIES[g.type].radius;
    for (const pos of groupPositions(g.pos, g.count, r, world.level.walls, CANVAS_WIDTH, CANVAS_HEIGHT)) {
      world.zombies.push(createZombie(g.type, pos));
    }
  }
}

/** Expires old drops, refills empty supply locations and collects what the player touches. */
function handleSupplies(world: World, dt: number): void {
  world.pickups = updatePickups(world.pickups, dt);
  const supply = updateSupplyPoints(world.supplyTimers, world.pickups, world.level.supply, dt, world.rng);
  world.supplyTimers = supply.timers;
  world.pickups.push(...supply.spawned);
  world.pickups = collectPickups(world.player, world.pickups);
}

/** Checks win and lose conditions after everything else has moved this step. */
function handleLevel(world: World): LevelResult | null {
  const step = updateLevel(world.levelState, world.level, {
    waves: world.waves,
    playerHealth: world.player.health,
    playerPos: world.player.pos,
    xpEarned: world.player.xp,
  });
  world.levelState = step.state;
  return step.finished;
}

/** Runs one step. Returns the level's result on the step it is won or lost, otherwise null. */
export function updateWorld(world: World, input: Input, dt: number): LevelResult | null {
  const { player } = world;
  if (isOver(world)) return null;
  world.time += dt;
  handleDebugKeys(world, input);

  updatePlayer(player, input, dt, world.level.walls);
  handleAbility(world, input, dt);
  const ability = abilityOf(player.character);
  const active = isAbilityActive(player.ability);
  const onHit: OnHit<Zombie> = (z: Zombie, dir: Vec2) => applyHitEffect(ability, active, z, dir);
  world.projectiles.push(...updatePlayerWeapon(player, input, dt, weaponModsFor(ability, active)));

  const moved = updateProjectiles(world.projectiles, dt, world.level.walls, CANVAS_WIDTH, CANVAS_HEIGHT);
  moved.detonations.forEach((d) => detonate(world, d, onHit));
  const hits = resolveProjectileHits(moved.alive, world.zombies, HIT_FLASH_SECONDS, onHit);
  hits.detonations.forEach((d) => detonate(world, d, onHit, d.directTarget));
  world.projectiles = hits.projectiles;

  handleKills(world);
  handleWaves(world, dt);

  updateNavCache(world.zombieWorld.nav, player.pos, dt);
  const zombieStep = updateZombies(world.zombies, player.pos, PLAYER_RADIUS, world.zombieWorld, dt);
  damagePlayer(player, zombieStep.meleeDamage);

  const spit = updateProjectiles(
    [...world.enemyProjectiles, ...zombieStep.spits],
    dt,
    world.level.walls,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  const spitHits = resolveHitsOnPlayer(spit.alive, player.pos, PLAYER_RADIUS);
  world.enemyProjectiles = spitHits.projectiles;
  damagePlayer(player, spitHits.damage);

  world.explosions = updateExplosions(world.explosions, dt);
  handleSupplies(world, dt);
  return handleLevel(world);
}

export function renderWorld(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawObjective(ctx, world.level, world.levelState, world.time);
  drawWalls(ctx, world.level.walls);
  drawPickups(ctx, world.pickups);
  drawSpawnWarnings(ctx, world.waves.warnings);
  drawZombies(ctx, world.zombies);
  drawProjectiles(ctx, world.projectiles);
  drawProjectiles(ctx, world.enemyProjectiles);
  drawExplosions(ctx, world.explosions);
  drawPlayer(ctx, world.player);
  drawHealthBar(ctx, world.player);
  drawStaminaBar(ctx, world.player.stamina);
  drawAmmo(ctx, world.player.loadout);
  drawAbilityIcon(ctx, world.player);
  drawWaveHud(ctx, world.level, world.waves, world.zombies.length, objectiveHint(world.level, world.levelState));
  drawDebugInfo(ctx, world.zombies.length);
  const end = endScreenText(world.levelState, world.level, world.player.xp);
  if (end) drawEndScreen(ctx, end);
}
