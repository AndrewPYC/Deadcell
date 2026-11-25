import { describe, expect, it } from 'vitest';
import { clampCircleToBounds, moveCircle, resolveCircleRect, type Rect } from '../src/systems/collision';
import { vec } from '../src/core/math';

const wall: Rect = { x: 100, y: 100, w: 100, h: 100 };
const R = 16;

describe('circle vs rectangle', () => {
  it('leaves a circle that is not touching alone', () => {
    const p = vec(50, 50);
    expect(resolveCircleRect(p, R, wall)).toEqual(p);
  });

  it('pushes a circle out of a wall face', () => {
    const p = resolveCircleRect(vec(90, 150), R, wall);
    expect(p.x).toBeCloseTo(100 - R);
    expect(p.y).toBeCloseTo(150);
  });

  it('pushes a circle out of a corner along the diagonal', () => {
    const p = resolveCircleRect(vec(95, 95), R, wall);
    expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(R);
  });

  it('ejects a circle whose center is inside by the nearest side', () => {
    const p = resolveCircleRect(vec(105, 150), R, wall);
    expect(p.x).toBeCloseTo(100 - R);
  });

  it('slides along a wall instead of sticking', () => {
    // Touching the left face, moving diagonally into it: x is blocked, y keeps going.
    const start = vec(100 - R, 150);
    const next = moveCircle(start, vec(5, 5), R, [wall], 1000, 1000);
    expect(next.x).toBeCloseTo(100 - R);
    expect(next.y).toBeCloseTo(155);
  });

  it('keeps the circle inside the canvas', () => {
    expect(clampCircleToBounds(vec(-20, 900), R, 800, 600)).toEqual(vec(R, 600 - R));
  });
});
