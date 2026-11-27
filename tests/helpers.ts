import type { Input } from '../src/core/input';
import { vec } from '../src/core/math';

/** Small seeded PRNG (mulberry32) so a run is the same every time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Input with the given keys held and nothing else. */
export const heldKeys = (...codes: string[]): Input => ({
  isDown: (code) => codes.includes(code),
  consumePress: () => false,
  clearPresses: () => {},
  mouse: vec(0, 0),
  mouseDown: () => false,
});

export const idleInput: Input = heldKeys();
