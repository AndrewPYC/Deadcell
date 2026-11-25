import { CANVAS_HEIGHT, CANVAS_WIDTH, COLOR_BACKGROUND, MAP_WALLS } from './data/config';
import { startLoop } from './core/loop';
import { createInput } from './core/input';
import { vec } from './core/math';
import { createPlayer, drawPlayer, updatePlayer } from './entities/player';
import { createFpsCounter } from './ui/fps';
import { drawWalls } from './ui/walls';
import { drawStaminaBar } from './ui/staminaBar';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const fps = createFpsCounter();
const player = createPlayer(vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2));

startLoop({
  update: (dt) => updatePlayer(player, input, dt),
  render: (frameSeconds) => {
    fps.tick(frameSeconds);
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawWalls(ctx, MAP_WALLS);
    drawPlayer(ctx, player);
    drawStaminaBar(ctx, player.stamina);
    fps.draw(ctx);
  },
});
