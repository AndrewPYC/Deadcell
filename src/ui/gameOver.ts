import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_HUD_TEXT,
  COLOR_OVERLAY,
  HUD_FONT,
  HUD_TITLE_FONT,
  HUD_TITLE_GAP,
} from '../data/config';

/** Dimmed overlay with a title ("YOU DIED", "LEVEL CLEAR") and the restart hint. */
export function drawEndScreen(ctx: CanvasRenderingContext2D, title: string, xp: number): void {
  ctx.fillStyle = COLOR_OVERLAY;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.font = HUD_TITLE_FONT;
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.font = HUD_FONT;
  ctx.fillText(`XP ${xp}  ·  Press Enter to restart`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + HUD_TITLE_GAP);
  ctx.textAlign = 'left';
}
