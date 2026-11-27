import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_AMMO_EMPTY,
  COLOR_HUD_TEXT,
  COLOR_RELOAD_FILL,
  COLOR_SLOT_ACTIVE,
  COLOR_SLOT_LOCKED,
  COLOR_STAMINA_TRACK,
  HUD_AMMO_FONT,
  HUD_AMMO_FONT_SIZE,
  HUD_LINE_GAP,
  HUD_PADDING,
  HUD_SLOT_GAP,
  HUD_SMALL_FONT,
  HUD_SMALL_FONT_SIZE,
  RELOAD_BAR_HEIGHT,
  RELOAD_BAR_WIDTH,
  WEAPONS,
  WEAPON_SLOTS,
  WEAPON_SWITCH_SECONDS,
} from '../data/config';
import { isSwitching, type Loadout } from '../systems/loadout';
import { isReloading, isReserveFull, reloadProgress, type WeaponState } from '../systems/weapon';

function statusLine(w: WeaponState, switching: boolean): string {
  if (switching) return 'SWITCHING';
  if (isReloading(w)) return 'RELOADING';
  if (w.magazine === 0) return w.reserve > 0 ? 'EMPTY' : 'OUT OF AMMO';
  return '';
}

/** Weapon slots row: "1 RIFLE  2 SHOTGUN  3 RPG", right-aligned. Drawn = highlight, unowned = dim. */
function drawSlots(ctx: CanvasRenderingContext2D, l: Loadout, right: number, y: number): void {
  ctx.font = HUD_SMALL_FONT;
  let x = right;
  for (let i = WEAPON_SLOTS.length - 1; i >= 0; i--) {
    const id = WEAPON_SLOTS[i];
    const label = `${i + 1} ${WEAPONS[id].shortName}`;
    const selected = id === (l.pending ?? l.current);
    ctx.fillStyle = !l.owned.includes(id) ? COLOR_SLOT_LOCKED : selected ? COLOR_SLOT_ACTIVE : COLOR_HUD_TEXT;
    ctx.fillText(label, x, y);
    x -= ctx.measureText(label).width + HUD_SLOT_GAP;
  }
}

/** Bottom-right: weapon slots, equipped weapon name and status, "magazine / reserve", progress bar. */
export function drawAmmo(ctx: CanvasRenderingContext2D, l: Loadout): void {
  const stats = WEAPONS[l.current];
  const w = l.weapons[l.current];
  const switching = isSwitching(l);
  const right = CANVAS_WIDTH - HUD_PADDING;
  const barY = CANVAS_HEIGHT - HUD_PADDING - RELOAD_BAR_HEIGHT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  const progress = switching
    ? 1 - l.switchLeft / WEAPON_SWITCH_SECONDS
    : isReloading(w)
      ? reloadProgress(w, stats)
      : null;
  if (progress !== null) {
    const x = right - RELOAD_BAR_WIDTH;
    ctx.fillStyle = COLOR_STAMINA_TRACK;
    ctx.fillRect(x, barY, RELOAD_BAR_WIDTH, RELOAD_BAR_HEIGHT);
    ctx.fillStyle = COLOR_RELOAD_FILL;
    ctx.fillRect(x, barY, RELOAD_BAR_WIDTH * progress, RELOAD_BAR_HEIGHT);
  }

  const ammoY = barY - HUD_LINE_GAP;
  ctx.font = HUD_AMMO_FONT;
  ctx.fillStyle = w.magazine === 0 ? COLOR_AMMO_EMPTY : COLOR_HUD_TEXT;
  const full = isReserveFull(w, stats) ? ' MAX' : '';
  ctx.fillText(`${w.magazine} / ${w.reserve}${full}`, right, ammoY);

  const nameY = ammoY - HUD_AMMO_FONT_SIZE - HUD_LINE_GAP;
  ctx.font = HUD_SMALL_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  const status = statusLine(w, switching);
  ctx.fillText(status ? `${stats.name.toUpperCase()}  ·  ${status}` : stats.name.toUpperCase(), right, nameY);

  drawSlots(ctx, l, right, nameY - HUD_SMALL_FONT_SIZE - HUD_LINE_GAP);
  ctx.textAlign = 'left';
}
