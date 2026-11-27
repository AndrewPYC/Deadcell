import {
  COLOR_HUD_TEXT,
  COLOR_SLOT_LOCKED,
  DEBUG_HELP_TEXT,
  HUD_FONT,
  HUD_PADDING,
  HUD_ROW_HEIGHT,
  HUD_SMALL_FONT,
} from '../data/config';

/** Under the FPS counter (row 0): live zombie count (row 1) and the debug spawn keys (row 2). */
export function drawDebugInfo(ctx: CanvasRenderingContext2D, zombieCount: number): void {
  ctx.textBaseline = 'top';
  ctx.font = HUD_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.fillText(`ZOMBIES ${zombieCount}`, HUD_PADDING, HUD_PADDING + HUD_ROW_HEIGHT);
  ctx.font = HUD_SMALL_FONT;
  ctx.fillStyle = COLOR_SLOT_LOCKED;
  ctx.fillText(`DEBUG  ${DEBUG_HELP_TEXT}`, HUD_PADDING, HUD_PADDING + HUD_ROW_HEIGHT * 2);
}
