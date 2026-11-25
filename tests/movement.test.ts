import { describe, expect, it } from 'vitest';
import { moveDirection, moveVelocity, type MoveKeys } from '../src/systems/movement';
import { length } from '../src/core/math';
import { PLAYER_BASE_SPEED, PLAYER_SPRINT_SPEED } from '../src/data/config';

const keys = (k: Partial<MoveKeys>): MoveKeys => ({ up: false, down: false, left: false, right: false, ...k });

describe('movement', () => {
  it('stands still with no keys', () => {
    expect(length(moveVelocity(keys({}), false))).toBe(0);
  });

  it('moves at 180 px/s in a straight line', () => {
    const v = moveVelocity(keys({ right: true }), false);
    expect(v.x).toBeCloseTo(PLAYER_BASE_SPEED);
    expect(v.y).toBeCloseTo(0);
  });

  it('diagonal speed equals straight speed', () => {
    for (const k of [{ up: true, right: true }, { down: true, left: true }, { up: true, left: true }]) {
      expect(length(moveVelocity(keys(k), false))).toBeCloseTo(PLAYER_BASE_SPEED);
      expect(length(moveVelocity(keys(k), true))).toBeCloseTo(PLAYER_SPRINT_SPEED);
    }
  });

  it('sprints at 270 px/s', () => {
    expect(length(moveVelocity(keys({ up: true }), true))).toBeCloseTo(PLAYER_SPRINT_SPEED);
  });

  it('opposite keys cancel out', () => {
    const d = moveDirection(keys({ left: true, right: true }));
    expect(length(d)).toBe(0);
  });

  it('W is up (negative y) on the canvas', () => {
    expect(moveDirection(keys({ up: true })).y).toBe(-1);
  });
});
