import {
  ABILITIES,
  ABILITY_ICON_BORDER,
  ABILITY_ICON_SIZE,
  ABILITY_TEXT_GAP,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHARACTERS,
  COLOR_ABILITY_DIM,
  COLOR_ABILITY_READY,
  COLOR_HUD_TEXT,
  COLOR_SLOT_LOCKED,
  HUD_FONT,
  HUD_PADDING,
  HUD_SMALL_FONT,
  HUD_SMALL_FONT_SIZE,
} from '../data/config';
import type { Player } from '../entities/player';
import { abilityStatusText, phaseRemaining, type AbilityPhase } from '../systems/ability';
import { abilityOf } from '../systems/characterAbility';

const PHASE_COLOR: Record<AbilityPhase, string> = {
  ready: COLOR_ABILITY_READY,
  active: COLOR_HUD_TEXT,
  cooldown: COLOR_SLOT_LOCKED,
};

/**
 * Bottom-center: a square in the character's color with the ability key, then the name and
 * "READY" / "ACTIVE 7s" / "COOLDOWN 24s". Active drains from the top; cooldown fills back up.
 */
export function drawAbilityIcon(ctx: CanvasRenderingContext2D, p: Player): void {
  const def = ABILITIES[abilityOf(p.character)];
  const a = p.ability;
  const size = ABILITY_ICON_SIZE;
  const x = CANVAS_WIDTH / 2 - size / 2;
  const y = CANVAS_HEIGHT - HUD_PADDING - size;

  ctx.fillStyle = CHARACTERS[p.character].color;
  ctx.fillRect(x, y, size, size);
  // Dim the part of the icon that is "used up": the spent active time, or the cooldown left.
  const dimmed = a.phase === 'active' ? 1 - phaseRemaining(a, def) : phaseRemaining(a, def);
  ctx.fillStyle = COLOR_ABILITY_DIM;
  ctx.fillRect(x, y, size, size * dimmed);

  ctx.strokeStyle = PHASE_COLOR[a.phase];
  ctx.lineWidth = ABILITY_ICON_BORDER;
  ctx.strokeRect(x, y, size, size);

  ctx.font = HUD_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Q', x + size / 2, y + size / 2);

  const textX = x + size + ABILITY_TEXT_GAP;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = HUD_SMALL_FONT;
  ctx.fillText(`${CHARACTERS[p.character].name.toUpperCase()}  ·  ${def.name.toUpperCase()}`, textX, y + size / 2);
  ctx.fillStyle = PHASE_COLOR[a.phase];
  ctx.fillText(abilityStatusText(a), textX, y + size / 2 + HUD_SMALL_FONT_SIZE + ABILITY_TEXT_GAP / 2);
}
