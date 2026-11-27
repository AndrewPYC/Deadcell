import { vec, type Vec2 } from '../core/math';
import {
  COLOR_AMMO_BOX,
  COLOR_AMMO_BOX_EDGE,
  COLOR_MEDKIT,
  COLOR_MEDKIT_CROSS,
  MEDKIT_CROSS_THICKNESS,
  PICKUP_BLINK_HZ,
  PICKUP_BLINK_SECONDS,
  PICKUP_EDGE_WIDTH,
  PICKUP_SIZE,
  TIMER_EPSILON,
  type PickupKind,
} from '../data/config';

export interface Pickup {
  kind: PickupKind;
  pos: Vec2;
  /** Seconds until a dropped pickup vanishes; null = stays until collected. */
  lifeLeft: number | null;
  /** Index of the supply location it sits on, or null for a zombie drop. */
  supplyPoint: number | null;
}

/** Pickup radius treats the square as the circle inside it. */
export const PICKUP_RADIUS = PICKUP_SIZE / 2;

export const createSupplyPickup = (kind: PickupKind, pos: Vec2, supplyPoint: number): Pickup => ({
  kind,
  pos: vec(pos.x, pos.y),
  lifeLeft: null,
  supplyPoint,
});

export const createDroppedPickup = (kind: PickupKind, pos: Vec2, lifetime: number): Pickup => ({
  kind,
  pos: vec(pos.x, pos.y),
  lifeLeft: lifetime,
  supplyPoint: null,
});

/** Counts down dropped pickups and removes the expired ones. */
export function updatePickups(list: readonly Pickup[], dt: number): Pickup[] {
  const left: Pickup[] = [];
  for (const p of list) {
    if (p.lifeLeft === null) {
      left.push(p);
      continue;
    }
    const lifeLeft = p.lifeLeft - dt;
    if (lifeLeft > TIMER_EPSILON) left.push({ ...p, lifeLeft });
  }
  return left;
}

/** Hidden on the "off" half of each blink during a drop's last few seconds. */
function blinkedOff(p: Pickup): boolean {
  if (p.lifeLeft === null || p.lifeLeft > PICKUP_BLINK_SECONDS) return false;
  return Math.floor(p.lifeLeft * PICKUP_BLINK_HZ * 2) % 2 === 1;
}

export function drawPickups(ctx: CanvasRenderingContext2D, list: readonly Pickup[]): void {
  const half = PICKUP_SIZE / 2;
  for (const p of list) {
    if (blinkedOff(p)) continue;
    const x = p.pos.x - half;
    const y = p.pos.y - half;
    ctx.fillStyle = p.kind === 'ammo' ? COLOR_AMMO_BOX : COLOR_MEDKIT;
    ctx.fillRect(x, y, PICKUP_SIZE, PICKUP_SIZE);
    ctx.strokeStyle = COLOR_AMMO_BOX_EDGE;
    ctx.lineWidth = PICKUP_EDGE_WIDTH;
    ctx.strokeRect(x, y, PICKUP_SIZE, PICKUP_SIZE);
    if (p.kind === 'medkit') {
      const t = MEDKIT_CROSS_THICKNESS;
      ctx.fillStyle = COLOR_MEDKIT_CROSS;
      ctx.fillRect(p.pos.x - t / 2, y + PICKUP_EDGE_WIDTH, t, PICKUP_SIZE - PICKUP_EDGE_WIDTH * 2);
      ctx.fillRect(x + PICKUP_EDGE_WIDTH, p.pos.y - t / 2, PICKUP_SIZE - PICKUP_EDGE_WIDTH * 2, t);
    }
  }
}
