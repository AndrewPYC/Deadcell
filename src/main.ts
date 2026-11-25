import { CANVAS_HEIGHT, CANVAS_WIDTH, COLOR_BACKGROUND } from './data/config';
import { startLoop } from './core/loop';
import { createFpsCounter } from './ui/fps';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const fps = createFpsCounter();

startLoop({
  update: () => {},
  render: (frameSeconds) => {
    fps.tick(frameSeconds);
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    fps.draw(ctx);
  },
});
