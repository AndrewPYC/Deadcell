import { COLOR_HUD_TEXT, FPS_SAMPLE_SECONDS, HUD_FONT, HUD_PADDING } from '../data/config';

/** Averages frame count over a short window so the number is readable. */
export function createFpsCounter() {
  let frames = 0;
  let elapsed = 0;
  let fps = 0;

  return {
    tick(frameSeconds: number) {
      frames++;
      elapsed += frameSeconds;
      if (elapsed >= FPS_SAMPLE_SECONDS) {
        fps = Math.round(frames / elapsed);
        frames = 0;
        elapsed = 0;
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      ctx.font = HUD_FONT;
      ctx.fillStyle = COLOR_HUD_TEXT;
      ctx.textBaseline = 'top';
      ctx.fillText(`FPS ${fps}`, HUD_PADDING, HUD_PADDING);
    },
  };
}
