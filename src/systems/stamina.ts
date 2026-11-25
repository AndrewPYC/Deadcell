import {
  STAMINA_DRAIN_PER_SECOND,
  STAMINA_MAX,
  STAMINA_REGEN_DELAY_SECONDS,
  STAMINA_REGEN_PER_SECOND,
  STAMINA_RESUME_THRESHOLD,
} from '../data/config';

export interface StaminaState {
  current: number;
  /** Seconds since the player last sprinted. */
  sinceSprint: number;
  /** True after stamina hit 0, until it climbs back to the resume threshold. */
  locked: boolean;
}

export const createStamina = (): StaminaState => ({
  current: STAMINA_MAX,
  sinceSprint: STAMINA_REGEN_DELAY_SECONDS,
  locked: false,
});

export const canSprint = (s: StaminaState): boolean => !s.locked && s.current > 0;

/** Advances stamina by dt. `sprinting` means the player actually sprinted this step. */
export function updateStamina(s: StaminaState, sprinting: boolean, dt: number): StaminaState {
  if (sprinting) {
    const current = Math.max(0, s.current - STAMINA_DRAIN_PER_SECOND * dt);
    return { current, sinceSprint: 0, locked: s.locked || current === 0 };
  }

  // Only the part of this step that falls after the delay counts toward regen.
  const sinceSprint = s.sinceSprint + dt;
  const regenSeconds =
    Math.max(0, sinceSprint - STAMINA_REGEN_DELAY_SECONDS) -
    Math.max(0, s.sinceSprint - STAMINA_REGEN_DELAY_SECONDS);
  const current = Math.min(STAMINA_MAX, s.current + STAMINA_REGEN_PER_SECOND * regenSeconds);
  const locked = s.locked && current < STAMINA_RESUME_THRESHOLD;
  return { current, sinceSprint, locked };
}
