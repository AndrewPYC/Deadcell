/**
 * Every balance and tuning number in the game lives here. No magic numbers elsewhere.
 *
 * NOTE: docs/SPEC.pdf was not available when this file was created. Values marked
 * "from task brief" came from the development prompts and must be checked against
 * the spec. Groups marked TODO still need their values from the spec.
 */

// Engine / display (not a spec balance value; project setup)
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const TARGET_FPS = 60;
export const FIXED_STEP_SECONDS = 1 / TARGET_FPS;
/** Longest frame the loop will simulate, so a stalled tab doesn't cause a spiral of updates. */
export const MAX_FRAME_SECONDS = 0.25;
export const FPS_SAMPLE_SECONDS = 0.5;

// Colors and HUD layout (presentation, not balance)
export const COLOR_BACKGROUND = '#6b6e73';
export const COLOR_HUD_TEXT = '#f2f3f5';
export const HUD_FONT = '14px Consolas, ui-monospace, monospace';
export const HUD_PADDING = 12;

// TODO Spec §?: weapons
// TODO Spec §?: zombies
// TODO Spec §?: abilities
// TODO Spec §?: XP formula
// TODO Spec §?: chest odds
