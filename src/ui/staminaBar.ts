import {
  CANVAS_HEIGHT,
  COLOR_HUD_TEXT,
  COLOR_STAMINA_FILL,
  COLOR_STAMINA_LOCKED,
  COLOR_STAMINA_THRESHOLD,
  COLOR_STAMINA_TRACK,
  HUD_PADDING,
  HUD_SMALL_FONT,
  STAMINA_BAR_HEIGHT,
  STAMINA_BAR_LABEL_GAP,
  STAMINA_BAR_WIDTH,
  STAMINA_MAX,
  STAMINA_RESUME_THRESHOLD,
  STAMINA_THRESHOLD_TICK_WIDTH,
} from '../data/config';
import type { StaminaState } from '../systems/stamina';

/** Bottom-left bar. Turns orange while sprint is locked; the tick marks the resume threshold. */
export function drawStaminaBar(ctx: CanvasRenderingContext2D, s: StaminaState): void {
  const x = HUD_PADDING;
  const y = CANVAS_HEIGHT - HUD_PADDING - STAMINA_BAR_HEIGHT;

  ctx.font = HUD_SMALL_FONT;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = COLOR_HUD_TEXT;
  const label = s.locked ? 'STAMINA  ·  SPRINT LOCKED' : 'STAMINA';
  ctx.fillText(`${label}  ${Math.floor(s.current)}/${STAMINA_MAX}`, x, y - STAMINA_BAR_LABEL_GAP);

  ctx.fillStyle = COLOR_STAMINA_TRACK;
  ctx.fillRect(x, y, STAMINA_BAR_WIDTH, STAMINA_BAR_HEIGHT);
  ctx.fillStyle = s.locked ? COLOR_STAMINA_LOCKED : COLOR_STAMINA_FILL;
  ctx.fillRect(x, y, (s.current / STAMINA_MAX) * STAMINA_BAR_WIDTH, STAMINA_BAR_HEIGHT);

  const tickX = x + (STAMINA_RESUME_THRESHOLD / STAMINA_MAX) * STAMINA_BAR_WIDTH;
  ctx.fillStyle = COLOR_STAMINA_THRESHOLD;
  ctx.fillRect(tickX, y, STAMINA_THRESHOLD_TICK_WIDTH, STAMINA_BAR_HEIGHT);
}
