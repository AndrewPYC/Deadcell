import { normalize, vec, type Vec2 } from '../core/math';
import { PLAYER_BASE_SPEED, PLAYER_SPRINT_SPEED } from '../data/config';

export interface MoveKeys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Unit-length direction from WASD state, so diagonals are no faster than straight lines. */
export function moveDirection(keys: MoveKeys): Vec2 {
  const x = Number(keys.right) - Number(keys.left);
  const y = Number(keys.down) - Number(keys.up);
  return normalize(vec(x, y));
}

export const moveSpeed = (sprinting: boolean): number =>
  sprinting ? PLAYER_SPRINT_SPEED : PLAYER_BASE_SPEED;

export function moveVelocity(keys: MoveKeys, sprinting: boolean): Vec2 {
  const dir = moveDirection(keys);
  const speed = moveSpeed(sprinting);
  return vec(dir.x * speed, dir.y * speed);
}
