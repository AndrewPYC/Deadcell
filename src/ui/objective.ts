import {
  COLOR_EXTRACTION,
  COLOR_HUD_TEXT,
  EXTRACTION_BORDER_WIDTH,
  EXTRACTION_FILL_MAX_ALPHA,
  EXTRACTION_FILL_MIN_ALPHA,
  EXTRACTION_LABEL,
  EXTRACTION_PULSE_HZ,
  HUD_SMALL_FONT,
  type LevelDef,
} from '../data/config';
import type { LevelState } from '../systems/levelManager';

/** The extraction zone, drawn only once it is open. Its fill pulses so it is easy to spot. */
export function drawObjective(ctx: CanvasRenderingContext2D, level: LevelDef, s: LevelState, timeSeconds: number): void {
  const o = level.objective;
  if (o.kind !== 'extraction' || !s.objectiveActive) return;
  const z = o.zone;
  const wave = (Math.sin(timeSeconds * EXTRACTION_PULSE_HZ * Math.PI * 2) + 1) / 2;
  const alpha = EXTRACTION_FILL_MIN_ALPHA + (EXTRACTION_FILL_MAX_ALPHA - EXTRACTION_FILL_MIN_ALPHA) * wave;
  ctx.fillStyle = `rgba(${COLOR_EXTRACTION}, ${alpha})`;
  ctx.fillRect(z.x, z.y, z.w, z.h);
  ctx.strokeStyle = `rgb(${COLOR_EXTRACTION})`;
  ctx.lineWidth = EXTRACTION_BORDER_WIDTH;
  ctx.strokeRect(z.x, z.y, z.w, z.h);
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.font = HUD_SMALL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(EXTRACTION_LABEL, z.x + z.w / 2, z.y + z.h / 2);
  ctx.textAlign = 'left';
}

/** HUD hint once the waves are done but the objective isn't. */
export function objectiveHint(level: LevelDef, s: LevelState): string | null {
  if (!s.objectiveActive || s.status !== 'playing') return null;
  if (level.objective.kind === 'extraction') return 'REACH THE EXTRACTION ZONE';
  return null;
}
