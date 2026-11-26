import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_BACKGROUND,
  DEBUG_SPAWN_KEYS,
  HIT_FLASH_SECONDS,
  INITIAL_ZOMBIES,
  MAP_WALLS,
  ZOMBIES,
  type ZombieType,
} from './data/config';
import type { Input } from './core/input';
import { vec } from './core/math';
import { createPlayer, damagePlayer, drawPlayer, isDead, updatePlayer, type Player } from './entities/player';
import { drawProjectiles, updateProjectiles, type Detonation, type Projectile } from './entities/projectile';
import { createExplosion, drawExplosions, updateExplosions, type Explosion } from './entities/explosion';
import { createTestAmmoBoxes, drawAmmoBoxes, type AmmoBox } from './entities/ammoBox'; // TODO static spawns: remove when zombies drop ammo
import { createZombie, drawZombies, type Zombie } from './entities/zombie';
import { updatePlayerWeapon } from './systems/playerWeapon';
import { resolveProjectileHits, type Damageable } from './systems/combat';
import { applySplash } from './systems/splash';
import { collectAmmoBoxes } from './systems/pickups';
import { updateZombies } from './systems/zombieAI';
import { findSpawnPoint } from './systems/spawn';
import { collectKills } from './systems/xp';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';
import { drawHealthBar } from './ui/healthBar';
import { drawAmmo } from './ui/ammo';
import { drawGameOver } from './ui/gameOver';

export interface World {
  player: Player;
  zombies: Zombie[];
  projectiles: Projectile[];
  explosions: Explosion[];
  ammoBoxes: AmmoBox[];
}

export function spawnZombie(world: World, type: ZombieType): void {
  const pos = findSpawnPoint(world.player.pos, ZOMBIES[type].radius, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  world.zombies.push(createZombie(type, pos));
}

export function createWorld(): World {
  const world: World = {
    player: createPlayer(vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)),
    zombies: [],
    projectiles: [],
    explosions: [],
    ammoBoxes: createTestAmmoBoxes(),
  };
  INITIAL_ZOMBIES.forEach((t) => spawnZombie(world, t));
  return world;
}

/** Splash hits zombies only; the player is never in this list, so blasts never hurt them. */
function detonate(world: World, d: Detonation, directTarget: Damageable | null = null): void {
  applySplash(d.pos, d.splash, world.zombies, HIT_FLASH_SECONDS, directTarget);
  world.explosions.push(createExplosion(d.pos, d.splash.radius));
}

export function updateWorld(world: World, input: Input, dt: number): void {
  const { player } = world;
  if (isDead(player)) return;

  for (const type of Object.keys(DEBUG_SPAWN_KEYS) as ZombieType[]) {
    if (input.consumePress(DEBUG_SPAWN_KEYS[type])) spawnZombie(world, type);
  }

  updatePlayer(player, input, dt);
  world.projectiles.push(...updatePlayerWeapon(player, input, dt));

  const moved = updateProjectiles(world.projectiles, dt, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  moved.detonations.forEach((d) => detonate(world, d));
  const hits = resolveProjectileHits(moved.alive, world.zombies, HIT_FLASH_SECONDS);
  hits.detonations.forEach((d) => detonate(world, d, d.directTarget));
  world.projectiles = hits.projectiles;

  const kills = collectKills(world.zombies);
  world.zombies = kills.alive;
  player.xp += kills.xp;

  damagePlayer(player, updateZombies(world.zombies, player.pos, dt));

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
  drawExplosions(ctx, world.explosions);
  drawPlayer(ctx, world.player);
  drawHealthBar(ctx, world.player);
  drawStaminaBar(ctx, world.player.stamina);
  drawAmmo(ctx, world.player.loadout);
  if (isDead(world.player)) drawGameOver(ctx, world.player.xp);
}
