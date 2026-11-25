// TODO remove in the next step: static test targets for checking shooting. Delete this
// file, its config block and its uses in main.ts once real zombies exist.
import { vec } from '../core/math';
import {
  COLOR_TARGET,
  COLOR_TARGET_FLASH,
  TARGET_HEALTH,
  TARGET_POSITIONS,
  TARGET_RADIUS,
} from '../data/config';
import type { Damageable } from '../systems/combat';

export type Target = Damageable;

export const createTestTargets = (): Target[] =>
  TARGET_POSITIONS.map((p) => ({ pos: vec(p.x, p.y), radius: TARGET_RADIUS, health: TARGET_HEALTH, flashLeft: 0 }));

/** Ticks flash timers and removes destroyed targets. */
export function updateTargets(targets: readonly Target[], dt: number): Target[] {
  return targets
    .filter((t) => t.health > 0)
    .map((t) => ({ ...t, flashLeft: Math.max(0, t.flashLeft - dt) }));
}

export function drawTargets(ctx: CanvasRenderingContext2D, targets: readonly Target[]): void {
  for (const t of targets) {
    ctx.fillStyle = t.flashLeft > 0 ? COLOR_TARGET_FLASH : COLOR_TARGET;
    ctx.beginPath();
    ctx.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
