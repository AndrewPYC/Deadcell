import { describe, expect, it } from 'vitest';
import { canSprint, createStamina, updateStamina, type StaminaState } from '../src/systems/stamina';
import {
  FIXED_STEP_SECONDS,
  STAMINA_DRAIN_PER_SECOND,
  STAMINA_MAX,
  STAMINA_REGEN_DELAY_SECONDS,
  STAMINA_REGEN_PER_SECOND,
  STAMINA_RESUME_THRESHOLD,
} from '../src/data/config';

/** Simulate `seconds` of fixed 60 Hz steps. */
function run(s: StaminaState, sprinting: boolean, seconds: number): StaminaState {
  const steps = Math.round(seconds / FIXED_STEP_SECONDS);
  for (let i = 0; i < steps; i++) s = updateStamina(s, sprinting, FIXED_STEP_SECONDS);
  return s;
}

describe('stamina', () => {
  it('starts full and sprint-ready', () => {
    const s = createStamina();
    expect(s.current).toBe(STAMINA_MAX);
    expect(canSprint(s)).toBe(true);
  });

  it('drains 25 per second while sprinting', () => {
    const s = run(createStamina(), true, 1);
    expect(s.current).toBeCloseTo(STAMINA_MAX - STAMINA_DRAIN_PER_SECOND);
  });

  it('does not regenerate until 1 second after the last sprint', () => {
    const tired = run(createStamina(), true, 1); // 75
    const waited = run(tired, false, 0.9);
    expect(waited.current).toBeCloseTo(tired.current);
  });

  it('regenerates 20 per second once the delay has passed', () => {
    const tired = run(createStamina(), true, 1); // 75
    const s = run(tired, false, STAMINA_REGEN_DELAY_SECONDS + 0.5);
    expect(s.current).toBeCloseTo(tired.current + STAMINA_REGEN_PER_SECOND * 0.5);
  });

  it('counts only the part of a step that falls after the delay', () => {
    const s0: StaminaState = { current: 50, sinceSprint: 0.75, locked: false };
    const s1 = updateStamina(s0, false, 0.5); // 0.25 s of regen
    expect(s1.current).toBeCloseTo(50 + STAMINA_REGEN_PER_SECOND * 0.25);
  });

  it('never exceeds the maximum', () => {
    const s = run({ current: 95, sinceSprint: 5, locked: false }, false, 2);
    expect(s.current).toBe(STAMINA_MAX);
  });

  it('a short sprint resets the regen delay', () => {
    let s: StaminaState = { current: 50, sinceSprint: 5, locked: false };
    s = updateStamina(s, true, FIXED_STEP_SECONDS);
    const before = s.current;
    s = run(s, false, 0.5);
    expect(s.current).toBeCloseTo(before);
  });

  it('locks sprint at 0 stamina', () => {
    const s = run(createStamina(), true, STAMINA_MAX / STAMINA_DRAIN_PER_SECOND);
    expect(s.current).toBe(0);
    expect(s.locked).toBe(true);
    expect(canSprint(s)).toBe(false);
  });

  it('stays locked below 20 and unlocks once 20 has regenerated', () => {
    const empty: StaminaState = { current: 0, sinceSprint: 0, locked: true };
    const regenToThreshold = STAMINA_RESUME_THRESHOLD / STAMINA_REGEN_PER_SECOND; // 1 s

    const almost = updateStamina(empty, false, STAMINA_REGEN_DELAY_SECONDS + regenToThreshold * 0.95);
    expect(almost.current).toBeCloseTo(STAMINA_RESUME_THRESHOLD * 0.95);
    expect(almost.locked).toBe(true);
    expect(canSprint(almost)).toBe(false);

    const ready = updateStamina(empty, false, STAMINA_REGEN_DELAY_SECONDS + regenToThreshold);
    expect(ready.current).toBeCloseTo(STAMINA_RESUME_THRESHOLD);
    expect(ready.locked).toBe(false);
    expect(canSprint(ready)).toBe(true);
  });

  it('unlocks within one step of reaching 20 when stepped at 60 Hz', () => {
    let s: StaminaState = { current: 0, sinceSprint: 0, locked: true };
    s = run(s, false, STAMINA_REGEN_DELAY_SECONDS + 0.9);
    expect(s.locked).toBe(true);
    s = run(s, false, 0.1 + FIXED_STEP_SECONDS);
    expect(s.locked).toBe(false);
  });
});
