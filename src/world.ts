import {
  ABILITIES,
  ABILITY_KEY,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_BACKGROUND,
  COLOR_FROST_PULSE,
  DEBUG_HORDE_KEY,
  DEBUG_HORDE_SIZE,
  DEBUG_SPAWN_KEYS,
  DEBUG_SWITCH_CHARACTER_KEY,
  DEFAULT_CHARACTER,
  FROST_PULSE,
  HIT_FLASH_SECONDS,
  INITIAL_ZOMBIES,
  MAP_WALLS,
  PLAYER_RADIUS,
  ZOMBIES,
  type CharacterId,
  type ZombieType,
} from './data/config';
import type { Input } from './core/input';
import { vec, type Vec2 } from './core/math';
import {
  createPlayer,
  damagePlayer,
  drawPlayer,
  isDead,
  switchCharacter,
  updatePlayer,
  type Player,
} from './entities/player';
import { drawProjectiles, updateProjectiles, type Detonation, type Projectile } from './entities/projectile';
import { createExplosion, drawExplosions, updateExplosions, type Explosion } from './entities/explosion';
import { createTestAmmoBoxes, drawAmmoBoxes, type AmmoBox } from './entities/ammoBox'; // TODO static spawns: remove when zombies drop ammo
import { createZombie, drawZombies, type Zombie } from './entities/zombie';
import { updatePlayerWeapon } from './systems/playerWeapon';
import { resolveHitsOnPlayer, resolveProjectileHits, type Damageable, type OnHit } from './systems/combat';
import { applySplash } from './systems/splash';
import { collectAmmoBoxes } from './systems/pickups';
import { updateZombies, type ZombieWorld } from './systems/zombieAI';
import { createNavCache, updateNavCache } from './systems/navCache';
import { findSpawnPoint } from './systems/spawn';
import { collectKills } from './systems/xp';
import { isAbilityActive, updateAbility } from './systems/ability';
import { abilityOf, applyHitEffect, frostPulse, weaponModsFor } from './systems/characterAbility';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';
import { drawHealthBar } from './ui/healthBar';
import { drawAmmo } from './ui/ammo';
import { drawAbilityIcon } from './ui/abilityIcon';
import { drawDebugInfo } from './ui/debugInfo';
import { drawGameOver } from './ui/gameOver';

export interface World {
  player: Player;
  zombies: Zombie[];
  projectiles: Projectile[];
  enemyProjectiles: Projectile[];
  explosions: Explosion[];
  ammoBoxes: AmmoBox[];
  zombieWorld: ZombieWorld;
}

const ZOMBIE_TYPES = Object.keys(ZOMBIES) as ZombieType[];

export function spawnZombie(world: World, type: ZombieType): void {
  const pos = findSpawnPoint(world.player.pos, ZOMBIES[type].radius, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  world.zombies.push(createZombie(type, pos));
}

export function createWorld(character: CharacterId = DEFAULT_CHARACTER): World {
  const world: World = {
    player: createPlayer(vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2), character),
    zombies: [],
    projectiles: [],
    enemyProjectiles: [],
    explosions: [],
    ammoBoxes: createTestAmmoBoxes(),
    zombieWorld: {
      walls: MAP_WALLS,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      nav: createNavCache(MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT, ZOMBIE_TYPES.map((t) => ZOMBIES[t].radius)),
    },
  };
  INITIAL_ZOMBIES.forEach((t) => spawnZombie(world, t));
  return world;
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

export function updateWorld(world: World, input: Input, dt: number): void {
  const { player } = world;
  if (isDead(player)) return;
  handleDebugKeys(world, input);

  updatePlayer(player, input, dt);
  handleAbility(world, input, dt);
  const ability = abilityOf(player.character);
  const active = isAbilityActive(player.ability);
  const onHit: OnHit<Zombie> = (z: Zombie, dir: Vec2) => applyHitEffect(ability, active, z, dir);
  world.projectiles.push(...updatePlayerWeapon(player, input, dt, weaponModsFor(ability, active)));

  const moved = updateProjectiles(world.projectiles, dt, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  moved.detonations.forEach((d) => detonate(world, d, onHit));
  const hits = resolveProjectileHits(moved.alive, world.zombies, HIT_FLASH_SECONDS, onHit);
  hits.detonations.forEach((d) => detonate(world, d, onHit, d.directTarget));
  world.projectiles = hits.projectiles;

  const kills = collectKills(world.zombies);
  world.zombies = kills.alive;
  player.xp += kills.xp;

  updateNavCache(world.zombieWorld.nav, player.pos, dt);
  const zombieStep = updateZombies(world.zombies, player.pos, PLAYER_RADIUS, world.zombieWorld, dt);
  damagePlayer(player, zombieStep.meleeDamage);

  const spit = updateProjectiles(
    [...world.enemyProjectiles, ...zombieStep.spits],
    dt,
    MAP_WALLS,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
  );
  const spitHits = resolveHitsOnPlayer(spit.alive, player.pos, PLAYER_RADIUS);
  world.enemyProjectiles = spitHits.projectiles;
  damagePlayer(player, spitHits.damage);

  world.explosions = updateExplosions(world.explosions, dt);
  world.ammoBoxes = collectAmmoBoxes(player, world.ammoBoxes);
}

export function renderWorld(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawWalls(ctx, MAP_WALLS);
  drawAmmoBoxes(ctx, world.ammoBoxes);
  drawZombies(ctx, world.zombies);
  drawProjectiles(ctx, world.projectiles);
  drawProjectiles(ctx, world.enemyProjectiles);
  drawExplosions(ctx, world.explosions);
  drawPlayer(ctx, world.player);
  drawHealthBar(ctx, world.player);
  drawStaminaBar(ctx, world.player.stamina);
  drawAmmo(ctx, world.player.loadout);
  drawAbilityIcon(ctx, world.player);
  drawDebugInfo(ctx, world.zombies.length);
  if (isDead(world.player)) drawGameOver(ctx, world.player.xp);
}
