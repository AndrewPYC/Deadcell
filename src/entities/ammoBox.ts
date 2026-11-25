// TODO remove the static spawns when zombies drop ammo; the pickup rule itself stays.
import { vec, type Vec2 } from '../core/math';
import {
  AMMO_BOX_EDGE_WIDTH,
  AMMO_BOX_POSITIONS,
  AMMO_BOX_SIZE,
  COLOR_AMMO_BOX,
  COLOR_AMMO_BOX_EDGE,
} from '../data/config';

export interface AmmoBox {
  pos: Vec2;
}

export const createTestAmmoBoxes = (): AmmoBox[] => AMMO_BOX_POSITIONS.map((p) => ({ pos: vec(p.x, p.y) }));

/** Pickup radius treats the box as the circle inside its square. */
export const AMMO_BOX_RADIUS = AMMO_BOX_SIZE / 2;

export function drawAmmoBoxes(ctx: CanvasRenderingContext2D, boxes: readonly AmmoBox[]): void {
  const half = AMMO_BOX_SIZE / 2;
  for (const b of boxes) {
    ctx.fillStyle = COLOR_AMMO_BOX;
    ctx.fillRect(b.pos.x - half, b.pos.y - half, AMMO_BOX_SIZE, AMMO_BOX_SIZE);
    ctx.strokeStyle = COLOR_AMMO_BOX_EDGE;
    ctx.lineWidth = AMMO_BOX_EDGE_WIDTH;
    ctx.strokeRect(b.pos.x - half, b.pos.y - half, AMMO_BOX_SIZE, AMMO_BOX_SIZE);
  }
}
