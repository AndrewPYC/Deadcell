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

// Spec §4.1 Player body (values from task brief; verify against SPEC.pdf)
export const PLAYER_DIAMETER = 32;
export const PLAYER_RADIUS = PLAYER_DIAMETER / 2;
export const PLAYER_COLOR = '#2f7de1';
/** Fraction of the circle's circumference covered by the aim arrow's base. */
export const ARROW_BASE_ARC_FRACTION = 1 / 6;
/** Spec cap: the arrow's base may cover at most one-fifth of the circumference. */
export const ARROW_MAX_BASE_ARC_FRACTION = 1 / 5;
/** How far the arrow tip sticks out past the circle's edge, in px. */
export const ARROW_TIP_LENGTH = 12;

// Spec §4.2 Movement (values from task brief; verify against SPEC.pdf)
export const PLAYER_BASE_SPEED = 180; // px/s
export const PLAYER_SPRINT_SPEED = 270; // px/s

// Spec §4.3 Stamina (values from task brief; verify against SPEC.pdf)
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_PER_SECOND = 25;
export const STAMINA_REGEN_PER_SECOND = 20;
/** Seconds without sprinting before regeneration starts. */
export const STAMINA_REGEN_DELAY_SECONDS = 1;
/** After hitting 0, sprint stays locked until stamina is back to this value. */
export const STAMINA_RESUME_THRESHOLD = 20;

// Collision (engine tuning, not balance)
/** Resolution passes per step, so corners where two walls meet settle cleanly. */
export const COLLISION_ITERATIONS = 3;

// Test map walls (placeholder layout, not from spec)
export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}
export const MAP_WALLS: readonly WallDef[] = [
  { x: 180, y: 120, w: 260, h: 40, color: '#b5523b' },
  { x: 180, y: 160, w: 40, h: 180, color: '#b5523b' },
  { x: 860, y: 140, w: 60, h: 260, color: '#c99a2e' },
  { x: 520, y: 520, w: 300, h: 40, color: '#4f9a6a' },
  { x: 1020, y: 480, w: 140, h: 140, color: '#7d5ba6' },
  { x: 320, y: 470, w: 90, h: 90, color: '#3d8f9e' },
];

// HUD stamina bar (presentation)
export const STAMINA_BAR_WIDTH = 220;
export const STAMINA_BAR_HEIGHT = 14;
export const STAMINA_BAR_LABEL_GAP = 6;
export const STAMINA_THRESHOLD_TICK_WIDTH = 2;
export const COLOR_STAMINA_TRACK = '#2a2c30';
export const COLOR_STAMINA_FILL = '#4fc37a';
export const COLOR_STAMINA_LOCKED = '#e0703a';
export const COLOR_STAMINA_THRESHOLD = '#f2f3f5';
export const HUD_SMALL_FONT = '12px Consolas, ui-monospace, monospace';

// Spec §6.1, §6.2, §6.6 Weapons (values from task brief; verify against SPEC.pdf)
// Fields marked PLACEHOLDER were not in the brief and need values from the spec.
export type WeaponId = 'assaultRifle';
export interface WeaponStats {
  name: string;
  damage: number; // per projectile
  fireRate: number; // shots per second while the trigger is held
  magazineSize: number;
  startingReserve: number;
  reloadSeconds: number;
  projectilesPerShot: number; // >1 for pellet weapons like the shotgun
  pelletSpreadRadians: number; // fan width across all pellets of one shot
  movingSpreadRadians: number; // max random deviation either side while moving
  projectileSpeed: number; // px/s
  projectileLifetime: number; // seconds
  projectileRadius: number; // px
  projectileColor: string;
}
export const WEAPONS: Record<WeaponId, WeaponStats> = {
  assaultRifle: {
    name: 'Assault Rifle',
    damage: 12,
    fireRate: 6,
    magazineSize: 25,
    startingReserve: 75,
    reloadSeconds: 2,
    projectilesPerShot: 1,
    pelletSpreadRadians: 0,
    movingSpreadRadians: 0.07, // PLACEHOLDER (~4°)
    projectileSpeed: 900, // PLACEHOLDER
    projectileLifetime: 1.2, // PLACEHOLDER
    projectileRadius: 3, // PLACEHOLDER (visual size)
    projectileColor: '#ffd166',
  },
};
export const STARTING_WEAPON: WeaponId = 'assaultRifle';
/** Projectiles spawn at the tip of the aim arrow. */
export const MUZZLE_OFFSET = PLAYER_RADIUS + ARROW_TIP_LENGTH;
/** Tolerance for timer comparisons, so 10 steps of 1/60 s count as exactly 1/6 s. */
export const TIMER_EPSILON = 1e-9;

// TODO remove in the next step: static test targets (not from spec)
export const TARGET_HEALTH = 40;
export const TARGET_RADIUS = 20;
export const TARGET_FLASH_SECONDS = 0.1;
export const TARGET_POSITIONS: readonly { x: number; y: number }[] = [
  { x: 640, y: 200 },
  { x: 1080, y: 260 },
  { x: 420, y: 390 },
];
export const COLOR_TARGET = '#d94848';
export const COLOR_TARGET_FLASH = '#ffffff';

// HUD ammo readout (presentation)
export const HUD_AMMO_FONT_SIZE = 22;
export const HUD_AMMO_FONT = `bold ${HUD_AMMO_FONT_SIZE}px Consolas, ui-monospace, monospace`;
export const RELOAD_BAR_WIDTH = 160;
export const RELOAD_BAR_HEIGHT = 6;
export const HUD_LINE_GAP = 6;
export const COLOR_AMMO_EMPTY = '#e0703a';
export const COLOR_RELOAD_FILL = '#ffd166';
// TODO Spec §?: zombies
// TODO Spec §?: abilities
// TODO Spec §?: XP formula
// TODO Spec §?: chest odds
