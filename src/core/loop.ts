import { FIXED_STEP_SECONDS, MAX_FRAME_SECONDS } from '../data/config';

export interface AccumulatorResult {
  steps: number;
  remainder: number;
}

/** Pure fixed-timestep accounting: how many updates to run for this frame. */
export function advanceAccumulator(
  accumulator: number,
  frameSeconds: number,
  step: number = FIXED_STEP_SECONDS,
  maxFrame: number = MAX_FRAME_SECONDS,
): AccumulatorResult {
  let remainder = accumulator + Math.min(Math.max(frameSeconds, 0), maxFrame);
  let steps = 0;
  while (remainder >= step) {
    remainder -= step;
    steps++;
  }
  return { steps, remainder };
}

export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (frameSeconds: number) => void;
}

/** Runs update at a fixed 60 Hz and render once per animation frame. */
export function startLoop({ update, render }: LoopCallbacks): () => void {
  let last = performance.now();
  let accumulator = 0;
  let handle = 0;

  const frame = (now: number) => {
    const frameSeconds = (now - last) / 1000;
    last = now;
    const result = advanceAccumulator(accumulator, frameSeconds);
    accumulator = result.remainder;
    for (let i = 0; i < result.steps; i++) update(FIXED_STEP_SECONDS);
    render(frameSeconds);
    handle = requestAnimationFrame(frame);
  };

  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}
