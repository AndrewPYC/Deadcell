import { CANVAS_HEIGHT, CANVAS_WIDTH, RESTART_KEY } from './data/config';
import { startLoop } from './core/loop';
import { createInput } from './core/input';
import { createWorld, isOver, renderWorld, updateWorld } from './world';
import { createFpsCounter } from './ui/fps';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const fps = createFpsCounter();
let world = createWorld();

startLoop({
  update: (dt) => {
    if (isOver(world) && input.consumePress(RESTART_KEY)) world = createWorld(world.player.character);
    updateWorld(world, input, dt);
    input.clearPresses();
  },
  render: (frameSeconds) => {
    fps.tick(frameSeconds);
    renderWorld(ctx, world);
    fps.draw(ctx);
  },
});
