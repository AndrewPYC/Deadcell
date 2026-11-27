import { TIMER_EPSILON } from '../data/config';

/** Whole seconds left, rounded up, so a countdown reads N → 1 and never 0 while running. */
export const ceilSeconds = (t: number): number => Math.ceil(t - TIMER_EPSILON);
