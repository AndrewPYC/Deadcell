import { angleTo, vec, type Vec2 } from '../core/math';
import type { Input } from '../core/input';
import {
  ARROW_BASE_ARC_FRACTION,
  ARROW_TIP_LENGTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_WALLS,
  PLAYER_COLOR,
  PLAYER_RADIUS,
  DEBUG_ALL_WEAPONS_OWNED,
  STARTING_WEAPON,
  WEAPON_SLOTS,
  type WeaponId,
} from '../data/config';
import { createLoadout, type Loadout } from '../systems/loadout';
import { moveDirection, moveVelocity, type MoveKeys } from '../systems/movement';
import { canSprint, createStamina, updateStamina, type StaminaState } from '../systems/stamina';
import { moveCircle } from '../systems/collision';

export interface Player {
  pos: Vec2;
  aim: number;
  stamina: StaminaState;
  sprinting: boolean;
  moving: boolean;
  loadout: Loadout;
}

const startingWeapons = (): WeaponId[] => (DEBUG_ALL_WEAPONS_OWNED ? [...WEAPON_SLOTS] : [STARTING_WEAPON]);

export const createPlayer = (pos: Vec2): Player => ({
  pos,
  aim: 0,
  stamina: createStamina(),
  sprinting: false,
  moving: false,
  loadout: createLoadout(startingWeapons(), STARTING_WEAPON),
});

const readMoveKeys = (input: Input): MoveKeys => ({
  up: input.isDown('KeyW'),
  down: input.isDown('KeyS'),
  left: input.isDown('KeyA'),
  right: input.isDown('KeyD'),
});

export function updatePlayer(p: Player, input: Input, dt: number): void {
  const keys = readMoveKeys(input);
  const dir = moveDirection(keys);
  p.moving = dir.x !== 0 || dir.y !== 0;
  p.sprinting = p.moving && input.isDown('ShiftLeft') && canSprint(p.stamina);
  p.stamina = updateStamina(p.stamina, p.sprinting, dt);

  const v = moveVelocity(keys, p.sprinting);
  p.pos = moveCircle(p.pos, vec(v.x * dt, v.y * dt), PLAYER_RADIUS, MAP_WALLS, CANVAS_WIDTH, CANVAS_HEIGHT);
  p.aim = angleTo(p.pos, input.mouse);
}

/** Triangle whose base sits on the circle edge, centred on the aim angle: [baseA, tip, baseB]. */
export function arrowPoints(center: Vec2, radius: number, aim: number): [Vec2, Vec2, Vec2] {
  const halfArc = Math.PI * ARROW_BASE_ARC_FRACTION; // full arc angle = 2π · fraction
  const at = (angle: number, dist: number) =>
    vec(center.x + Math.cos(angle) * dist, center.y + Math.sin(angle) * dist);
  return [at(aim - halfArc, radius), at(aim, radius + ARROW_TIP_LENGTH), at(aim + halfArc, radius)];
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player): void {
  ctx.fillStyle = PLAYER_COLOR;
  ctx.beginPath();
  ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  const [a, tip, b] = arrowPoints(p.pos, PLAYER_RADIUS, p.aim);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.fill();
}
