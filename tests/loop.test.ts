import { describe, expect, it } from 'vitest';
import { advanceAccumulator } from '../src/core/loop';

describe('advanceAccumulator', () => {
  const step = 1 / 60;

  it('runs one update per 1/60 s of frame time', () => {
    const r = advanceAccumulator(0, step * 3 + step / 2, step, 1);
    expect(r.steps).toBe(3);
    expect(r.remainder).toBeCloseTo(step / 2);
  });

  it('carries leftover time into the next frame', () => {
    const r = advanceAccumulator(step / 2, step / 2, step, 1);
    expect(r.steps).toBe(1);
    expect(r.remainder).toBeCloseTo(0);
  });

  it('caps a long stall so the loop cannot spiral', () => {
    expect(advanceAccumulator(0, 10, step, 0.25).steps).toBe(15);
  });
});
