import {
  CANVAS_WIDTH,
  COLOR_HUD_TEXT,
  COLOR_WAVE_CLEAR,
  HUD_AMMO_FONT,
  HUD_AMMO_FONT_SIZE,
  HUD_LINE_GAP,
  HUD_PADDING,
  HUD_SMALL_FONT,
} from '../data/config';
import { ceilSeconds } from '../core/time';
import { enemiesRemaining, type WaveState } from '../systems/waves';

/** Top-center: "WAVE 2 / 3" and either "ENEMIES LEFT 17" or the next-wave countdown. */
export function waveHudLines(s: WaveState, totalWaves: number, alive: number): [string, string] {
  if (s.phase === 'victory') return ['ALL WAVES CLEARED', `${totalWaves} / ${totalWaves} WAVES`];
  const title = `WAVE ${s.waveIndex + 1} / ${totalWaves}`;
  if (s.phase === 'intermission') return [title, `STARTS IN ${ceilSeconds(s.timer)}s`];
  return [title, `ENEMIES LEFT ${enemiesRemaining(s, alive)}`];
}

export function drawWaveHud(ctx: CanvasRenderingContext2D, s: WaveState, totalWaves: number, alive: number): void {
  const [title, sub] = waveHudLines(s, totalWaves, alive);
  const x = CANVAS_WIDTH / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = HUD_AMMO_FONT;
  ctx.fillStyle = s.phase === 'victory' ? COLOR_WAVE_CLEAR : COLOR_HUD_TEXT;
  ctx.fillText(title, x, HUD_PADDING);
  ctx.font = HUD_SMALL_FONT;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.fillText(sub, x, HUD_PADDING + HUD_AMMO_FONT_SIZE + HUD_LINE_GAP);
  ctx.textAlign = 'left';
}
