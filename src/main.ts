import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_BACKGROUND,
  MAP_WALLS,
  TARGET_FLASH_SECONDS,
} from './data/config';
import { startLoop } from './core/loop';
import { createInput } from './core/input';
import { vec } from './core/math';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player';
import { drawProjectiles, updateProjectiles, type Projectile } from './entities/projectile';
import { createExplosion, drawExplosions, updateExplosions, type Explosion } from './entities/explosion';
import { createTestAmmoBoxes, drawAmmoBoxes } from './entities/ammoBox'; // TODO static spawns: remove when zombies drop ammo
import { createTestTargets, drawTargets, updateTargets } from './entities/target'; // TODO remove in the next step
import { updatePlayerWeapon } from './systems/playerWeapon';
import { resolveProjectileHits, type Damageable } from './systems/combat';
import { applySplash } from './systems/splash';
import { collectAmmoBoxes } from './systems/pickups';
import { createFpsCounter } from './ui/fps';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';
import { drawAmmo } from './ui/ammo';
import type { Detonation } from './entities/projectile';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const fps = createFpsCounter();
const player = createPlayer(vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2));
let projectiles: Projectile[] = [];
let explosions: Explosion[] = [];
let ammoBoxes = createTestAmmoBoxes();
let targets = createTestTargets(); // TODO remove in the next step

/** Splash hits targets only; the player is never in this list, so blasts never hurt them. */
function detonate(d: Detonation, directTarget: Damageable | null = null): void {
  applySplash(d.pos, d.splash, targets, TARGET_FLASH_SECONDS, directTarget);
  explosions.push(createExplosion(d.pos, d.splash.radius));
}

function update(dt: number): void {
  updatePlayer(player, input, dt);
  projectiles.push(...updatePlayerWeapon(player, input, dt));

  const moved = updateProjectiles(projectiles, dt, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  moved.detonations.forEach((d) => detonate(d));

  const hits = resolveProjectileHits(moved.alive, targets, TARGET_FLASH_SECONDS);
  hits.detonations.forEach((d) => detonate(d, d.directTarget));
  projectiles = hits.projectiles;

  targets = updateTargets(targets, dt);
  explosions = updateExplosions(explosions, dt);
  ammoBoxes = collectAmmoBoxes(player, ammoBoxes);
}

function render(frameSeconds: number): void {
  fps.tick(frameSeconds);
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawWalls(ctx, MAP_WALLS);
  drawAmmoBoxes(ctx, ammoBoxes);
  drawTargets(ctx, targets);
  drawProjectiles(ctx, projectiles);
  drawExplosions(ctx, explosions);
  drawPlayer(ctx, player);
  drawStaminaBar(ctx, player.stamina);
  drawAmmo(ctx, player.loadout);
  fps.draw(ctx);
}

startLoop({ update, render });
