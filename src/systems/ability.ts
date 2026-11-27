import { TIMER_EPSILON, type AbilityTiming } from '../data/config';
import { ceilSeconds } from '../core/time';

/** Ready → (press) Active for durationSeconds → Cooldown for cooldownSeconds → Ready. */
export type AbilityPhase = 'ready' | 'active' | 'cooldown';

export interface AbilityState {
  phase: AbilityPhase;
  /** Seconds left in the current phase; 0 when ready. */
  timeLeft: number;
}

export const createAbility = (): AbilityState => ({ phase: 'ready', timeLeft: 0 });

export const isAbilityActive = (a: AbilityState): boolean => a.phase === 'active';

/** Lets time pass. The cooldown begins only when the active phase runs out. */
export function tickAbility(a: AbilityState, t: AbilityTiming, dt: number): AbilityState {
  if (a.phase === 'ready') return a;
  const left = a.timeLeft - dt;
  if (left > TIMER_EPSILON) return { ...a, timeLeft: left };
  // Carry any overshoot into the next phase so the timing never drifts.
  if (a.phase === 'active') return { phase: 'cooldown', timeLeft: t.cooldownSeconds + Math.min(0, left) };
  return createAbility();
}

export interface AbilityStep {
  state: AbilityState;
  /** True on the step the ability was switched on. */
  activated: boolean;
}

/** Ticks the timer, then activates if the key was pressed and the ability is ready. */
export function updateAbility(a: AbilityState, t: AbilityTiming, dt: number, pressed: boolean): AbilityStep {
  const ticked = tickAbility(a, t, dt);
  if (!pressed || ticked.phase !== 'ready') return { state: ticked, activated: false };
  return { state: { phase: 'active', timeLeft: t.durationSeconds }, activated: true };
}

/** Whole seconds left, rounded up, so the HUD reads 10 → 1 and never 0 while still running. */
export const secondsShown = (a: AbilityState): number => ceilSeconds(a.timeLeft);

/** HUD status text: "READY", "ACTIVE 7s" or "COOLDOWN 24s". */
export function abilityStatusText(a: AbilityState): string {
  if (a.phase === 'ready') return 'READY';
  return `${a.phase === 'active' ? 'ACTIVE' : 'COOLDOWN'} ${secondsShown(a)}s`;
}

/** Fraction of the current phase still to go, 0..1 (0 when ready). */
export function phaseRemaining(a: AbilityState, t: AbilityTiming): number {
  if (a.phase === 'ready') return 0;
  return a.timeLeft / (a.phase === 'active' ? t.durationSeconds : t.cooldownSeconds);
}
