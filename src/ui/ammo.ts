import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_AMMO_EMPTY,
  COLOR_HUD_TEXT,
  COLOR_RELOAD_FILL,
  COLOR_STAMINA_TRACK,
  HUD_AMMO_FONT,
  HUD_AMMO_FONT_SIZE,
  HUD_LINE_GAP,
  HUD_PADDING,
  HUD_SMALL_FONT,
  RELOAD_BAR_HEIGHT,
  RELOAD_BAR_WIDTH,
  type WeaponStats,
} from '../data/config';
import { isReloading, reloadProgress, type WeaponState } from '../systems/weapon';

function statusLine(w: WeaponState): string {
  if (isReloading(w)) return 'RELOADING';
  if (w.magazine === 0) return w.reserve > 0 ? 'EMPTY · PRESS R' : 'OUT OF AMMO';
  return '';
}

/** Bottom-right: weapon name, "magazine / reserve" and a reload bar while reloading. */
export function drawAmmo(ctx: CanvasRenderingContext2D, w: WeaponState, stats: WeaponStats): void {
  const right = CANVAS_WIDTH - HUD_PADDING;
  const barY = CANVAS_HEIGHT - HUD_PADDING - RELOAD_BAR_HEIGHT;
  ctx.textAlign = 'right';

  if (isReloading(w)) {
    const x = right - RELOAD_BAR_WIDTH;
    ctx.fillStyle = COLOR_STAMINA_TRACK;
    ctx.fillRect(x, barY, RELOAD_BAR_WIDTH, RELOAD_BAR_HEIGHT);
    ctx.fillStyle = COLOR_RELOAD_FILL;
    ctx.fillRect(x, barY, RELOAD_BAR_WIDTH * reloadProgress(w, stats), RELOAD_BAR_HEIGHT);
  }

  ctx.textBaseline = 'bottom';
  ctx.font = HUD_AMMO_FONT;
  ctx.fillStyle = w.magazine === 0 ? COLOR_AMMO_EMPTY : COLOR_HUD_TEXT;
  const ammoY = barY - HUD_LINE_GAP;
  ctx.fillText(`${w.magazine} / ${w.reserve}`, right, ammoY);

  ctx.font = HUD_SMALL_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  const status = statusLine(w);
  const label = status ? `${stats.name.toUpperCase()}  ·  ${status}` : stats.name.toUpperCase();
  ctx.fillText(label, right, ammoY - HUD_AMMO_FONT_SIZE - HUD_LINE_GAP);

  ctx.textAlign = 'left';
}
