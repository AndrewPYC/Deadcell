import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_BACKGROUND,
  MAP_WALLS,
  TARGET_FLASH_SECONDS,
  WEAPONS,
} from './data/config';
import { startLoop } from './core/loop';
import { createInput } from './core/input';
import { vec } from './core/math';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player';
import { drawProjectiles, updateProjectiles, type Projectile } from './entities/projectile';
import { createTestTargets, drawTargets, updateTargets } from './entities/target'; // TODO remove in the next step
import { updatePlayerWeapon } from './systems/playerWeapon';
import { resolveProjectileHits } from './systems/combat';
import { createFpsCounter } from './ui/fps';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';
import { drawAmmo } from './ui/ammo';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const fps = createFpsCounter();
const player = createPlayer(vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2));
let projectiles: Projectile[] = [];
let targets = createTestTargets(); // TODO remove in the next step

function update(dt: number): void {
  updatePlayer(player, input, dt);
  projectiles.push(...updatePlayerWeapon(player, input, dt));
  projectiles = updateProjectiles(projectiles, dt, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  projectiles = resolveProjectileHits(projectiles, targets, TARGET_FLASH_SECONDS).projectiles;
  targets = updateTargets(targets, dt);
}

function render(frameSeconds: number): void {
  fps.tick(frameSeconds);
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawWalls(ctx, MAP_WALLS);
  drawTargets(ctx, targets);
  drawProjectiles(ctx, projectiles);
  drawPlayer(ctx, player);
  drawStaminaBar(ctx, player.stamina);
  drawAmmo(ctx, player.weapon, WEAPONS[player.weaponId]);
  fps.draw(ctx);
}

startLoop({ update, render });
