import {
  CANVAS_WIDTH,
  COLOR_HUD_TEXT,
  COLOR_SEGMENT_TEXT,
  COLOR_WAVE_CLEAR,
  HUD_AMMO_FONT,
  HUD_AMMO_FONT_SIZE,
  HUD_LINE_GAP,
  HUD_PADDING,
  HUD_SMALL_FONT,
  HUD_SMALL_FONT_SIZE,
  type LevelDef,
} from '../data/config';
import { ceilSeconds } from '../core/time';
import { enemiesRemaining, type WaveState } from '../systems/waves';
import { segmentForWave } from '../systems/levelManager';

/**
 * Top-center: "WAVE 2 / 3" and either "ENEMIES LEFT 17" or the next-wave countdown.
 * After the last wave, `hint` (e.g. "REACH THE EXTRACTION ZONE") replaces the wave count.
 */
export function waveHudLines(s: WaveState, totalWaves: number, alive: number, hint: string | null = null): [string, string] {
  if (s.phase === 'victory') return ['ALL WAVES CLEARED', hint ?? `${totalWaves} / ${totalWaves} WAVES`];
  const title = `WAVE ${s.waveIndex + 1} / ${totalWaves}`;
  if (s.phase === 'intermission') return [title, `STARTS IN ${ceilSeconds(s.timer)}s`];
  return [title, `ENEMIES LEFT ${enemiesRemaining(s, alive)}`];
}

/** "SEGMENT 2 / 3 · RUNNERS IN THE ALLEYS" while waves are running; null after the last one. */
export function segmentLine(level: LevelDef, s: WaveState): string | null {
  if (s.phase === 'victory' || level.segments.length === 0) return null;
  const { segment, index } = segmentForWave(level, s.waveIndex);
  return `SEGMENT ${index + 1} / ${level.segments.length}  ·  ${segment.label.toUpperCase()}`;
}

export function drawWaveHud(
  ctx: CanvasRenderingContext2D,
  level: LevelDef,
  s: WaveState,
  alive: number,
  hint: string | null,
): void {
  const [title, sub] = waveHudLines(s, level.waves.length, alive, hint);
  const x = CANVAS_WIDTH / 2;
  const subY = HUD_PADDING + HUD_AMMO_FONT_SIZE + HUD_LINE_GAP;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = HUD_AMMO_FONT;
  ctx.fillStyle = s.phase === 'victory' ? COLOR_WAVE_CLEAR : COLOR_HUD_TEXT;
  ctx.fillText(title, x, HUD_PADDING);
  ctx.font = HUD_SMALL_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.fillText(sub, x, subY);
  const segment = segmentLine(level, s);
  if (segment) {
    ctx.fillStyle = COLOR_SEGMENT_TEXT;
    ctx.fillText(segment, x, subY + HUD_SMALL_FONT_SIZE + HUD_LINE_GAP);
  }
  ctx.textAlign = 'left';
}
