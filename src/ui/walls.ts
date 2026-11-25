import type { WallDef } from '../data/config';

export function drawWalls(ctx: CanvasRenderingContext2D, walls: readonly WallDef[]): void {
  for (const w of walls) {
    ctx.fillStyle = w.color;
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }
}
