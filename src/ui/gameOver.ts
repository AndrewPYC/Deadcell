import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_HUD_TEXT,
  COLOR_OVERLAY,
  HUD_FONT,
  HUD_TITLE_FONT,
  HUD_TITLE_GAP,
  HUD_ROW_HEIGHT,
  WEAPONS,
  type LevelDef,
} from '../data/config';
import type { LevelState } from '../systems/levelManager';

export interface EndScreenText {
  title: string;
  lines: string[];
}

/** "SHOTGUN UNLOCKED  ·  LEVEL 2 UNLOCKED", or null when the level unlocks nothing. */
export function unlockLine(level: LevelDef): string | null {
  const parts = [
    ...level.rewards.weapons.map((id) => `${WEAPONS[id].name.toUpperCase()} UNLOCKED`),
    ...level.rewards.levels.map((n) => `LEVEL ${n} UNLOCKED`),
  ];
  return parts.length ? parts.join('  ·  ') : null;
}

/** Title and lines for the end-of-level overlay; null while the level is still running. */
export function endScreenText(s: LevelState, level: LevelDef, xp: number): EndScreenText | null {
  if (s.status === 'playing') return null;
  if (s.status === 'lost') {
    const title = s.defeatReason === 'objectiveDestroyed' ? 'OBJECTIVE DESTROYED' : 'YOU DIED';
    return { title, lines: [`XP ${xp}`, 'Press Enter to restart'] };
  }
  const bonus = level.rewards.bonusXp;
  const unlocks = unlockLine(level);
  return {
    title: 'LEVEL COMPLETE',
    lines: [bonus > 0 ? `XP ${xp} + ${bonus} BONUS` : `XP ${xp}`, ...(unlocks ? [unlocks] : []), 'Press Enter to play again'],
  };
}

/** Dimmed overlay with a title and a few centred lines under it. */
export function drawEndScreen(ctx: CanvasRenderingContext2D, text: EndScreenText): void {
  ctx.fillStyle = COLOR_OVERLAY;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.font = HUD_TITLE_FONT;
  ctx.fillText(text.title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.font = HUD_FONT;
  text.lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + HUD_TITLE_GAP + i * HUD_ROW_HEIGHT);
  });
  ctx.textAlign = 'left';
}
