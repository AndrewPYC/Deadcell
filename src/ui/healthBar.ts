import {
  CANVAS_HEIGHT,
  COLOR_HEALTH_FILL,
  COLOR_HUD_TEXT,
  COLOR_STAMINA_TRACK,
  HUD_BAR_STACK_GAP,
  HUD_PADDING,
  HUD_SMALL_FONT,
  HUD_SMALL_FONT_SIZE,
  STAMINA_BAR_HEIGHT,
  STAMINA_BAR_LABEL_GAP,
  STAMINA_BAR_WIDTH,
} from '../data/config';
import type { Player } from '../entities/player';

/** Sits above the stamina bar: "HEALTH 80/100   XP 120" and a red bar. */
export function drawHealthBar(ctx: CanvasRenderingContext2D, p: Player): void {
  const x = HUD_PADDING;
  const staminaY = CANVAS_HEIGHT - HUD_PADDING - STAMINA_BAR_HEIGHT;
  const y = staminaY - STAMINA_BAR_HEIGHT - HUD_BAR_STACK_GAP - HUD_SMALL_FONT_SIZE;

  ctx.font = HUD_SMALL_FONT;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.fillText(`HEALTH  ${Math.ceil(p.health)}/${p.maxHealth}     XP  ${p.xp}`, x, y - STAMINA_BAR_LABEL_GAP);

  ctx.fillStyle = COLOR_STAMINA_TRACK;
  ctx.fillRect(x, y, STAMINA_BAR_WIDTH, STAMINA_BAR_HEIGHT);
  ctx.fillStyle = COLOR_HEALTH_FILL;
  ctx.fillRect(x, y, (p.health / p.maxHealth) * STAMINA_BAR_WIDTH, STAMINA_BAR_HEIGHT);
}
