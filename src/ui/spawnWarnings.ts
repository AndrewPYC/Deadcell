import {
  COLOR_SPAWN_WARNING,
  SPAWN_GROUP_SPREAD,
  SPAWN_WARNING_FONT,
  SPAWN_WARNING_INNER_ALPHA,
  SPAWN_WARNING_LINE_WIDTH,
  SPAWN_WARNING_MIN_ALPHA,
  SPAWN_WARNING_PULSE_HZ,
  SPAWN_WARNING_SECONDS,
  ZOMBIES,
} from '../data/config';
import type { SpawnWarning } from '../systems/waves';

/**
 * Pulsing red ring where a group is about to appear, with an inner ring that closes in as
 * the countdown runs out, and a "!" in the middle.
 */
export function drawSpawnWarnings(ctx: CanvasRenderingContext2D, warnings: readonly SpawnWarning[]): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = SPAWN_WARNING_FONT;
  ctx.lineWidth = SPAWN_WARNING_LINE_WIDTH;
  for (const w of warnings) {
    const outer = SPAWN_GROUP_SPREAD + ZOMBIES[w.type].radius;
    const pulse = (Math.sin(w.timeLeft * SPAWN_WARNING_PULSE_HZ * Math.PI * 2) + 1) / 2;
    const progress = Math.min(1, w.timeLeft / SPAWN_WARNING_SECONDS);

    ctx.strokeStyle = `rgba(${COLOR_SPAWN_WARNING}, ${SPAWN_WARNING_MIN_ALPHA + (1 - SPAWN_WARNING_MIN_ALPHA) * pulse})`;
    ctx.beginPath();
    ctx.arc(w.pos.x, w.pos.y, outer, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${COLOR_SPAWN_WARNING}, ${SPAWN_WARNING_INNER_ALPHA})`;
    ctx.beginPath();
    ctx.arc(w.pos.x, w.pos.y, outer * progress, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgb(${COLOR_SPAWN_WARNING})`;
    ctx.fillText(w.count > 1 ? `!×${w.count}` : '!', w.pos.x, w.pos.y);
  }
  ctx.textAlign = 'left';
}
