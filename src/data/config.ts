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
export const HUD_ROW_HEIGHT = 22; // top-left debug rows

// Spec §4.1 Player body (values from task brief; verify against SPEC.pdf)
export const PLAYER_DIAMETER = 32;
export const PLAYER_RADIUS = PLAYER_DIAMETER / 2;
/** Fraction of the circle's circumference covered by the aim arrow's base. */
export const ARROW_BASE_ARC_FRACTION = 1 / 6;
/** Spec cap: the arrow's base may cover at most one-fifth of the circumference. */
export const ARROW_MAX_BASE_ARC_FRACTION = 1 / 5;
/** How far the arrow tip sticks out past the circle's edge, in px. */
export const ARROW_TIP_LENGTH = 12;

// Spec §5.1–5.3 Characters and abilities (values from task brief; verify against SPEC.pdf)
// Both characters share speed, health, stamina and weapons; only color and ability differ.
export type CharacterId = 'zane' | 'nepbava';
export type AbilityId = 'windSurge' | 'frostPulse';
export interface CharacterDef {
  name: string;
  color: string; // body and aim arrow
  ability: AbilityId;
}
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  zane: { name: 'Zane', color: '#2f7de1', ability: 'windSurge' }, // blue
  nepbava: { name: 'Nepbava', color: '#f48fd0', ability: 'frostPulse' }, // pink, lighter than the Runner
};
export const DEFAULT_CHARACTER: CharacterId = 'zane';
export interface AbilityTiming {
  durationSeconds: number;
  /** Starts only after the ability ends. */
  cooldownSeconds: number;
}
export interface AbilityDef extends AbilityTiming {
  name: string;
}
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  windSurge: { name: 'Wind Surge', durationSeconds: 10, cooldownSeconds: 15 },
  frostPulse: { name: 'Frost Pulse', durationSeconds: 10, cooldownSeconds: 15 },
};
export const ABILITY_KEY = 'KeyQ';
/** Zane: bullets knock back, faster fire and reload. Ammo use and move speed unchanged. */
export const WIND_SURGE = {
  fireRateMultiplier: 1.25, // +25%
  reloadTimeMultiplier: 0.75, // -25%
  knockbackSpeed: 240, // PLACEHOLDER px/s pushed on a zombie with no resistance
  knockbackSeconds: 0.12, // PLACEHOLDER time for the push to decay to 0
};
/** Nepbava: one pulse on activation, then weapon hits slow for the rest of the ability. */
export const FROST_PULSE = {
  radius: 120, // px from the player's center to the zombie's center
  freezeSeconds: 1.5,
  hitSlowSeconds: 2, // refreshed by each hit; the slow amount is each zombie's iceSlowMultiplier
};
/**
 * Spec boss resistances: no knockback (but still takes damage), never frozen, 20% ice slow.
 * Used by the boss zombie type when it is added.
 */
export interface Resistances {
  knockbackResistance: number; // 0 = full knockback, 1 = immune
  freezeImmune: boolean; // true = can't be fully frozen; ice only slows
  iceSlowMultiplier: number; // speed is multiplied by this while slowed by ice
}
export const BOSS_RESISTANCES: Resistances = {
  knockbackResistance: 1,
  freezeImmune: true,
  iceSlowMultiplier: 0.8,
};
/** DEBUG: cycles through the characters. Remove once character select exists. */
export const DEBUG_SWITCH_CHARACTER_KEY = 'KeyC';

// Ability visuals and HUD (presentation)
export const COLOR_FROZEN_TINT = 'rgba(170, 225, 255, 0.7)';
export const COLOR_FROZEN_EDGE = '#e6f7ff';
export const COLOR_SLOWED_EDGE = '#8fd3ff';
export const STATUS_EDGE_WIDTH = 2;
export const COLOR_FROST_PULSE = '143, 211, 255'; // rgb triplet; alpha fades over the ring
export const ABILITY_ICON_SIZE = 44;
export const ABILITY_ICON_BORDER = 3;
export const ABILITY_TEXT_GAP = 10;
export const COLOR_ABILITY_DIM = 'rgba(10, 11, 13, 0.65)';
export const COLOR_ABILITY_READY = '#4fc37a';

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

// Test map walls (placeholder layout, not from spec). One neutral color so zombies stand out.
export const COLOR_WALL = '#3a3d42';
export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}
export const MAP_WALLS: readonly WallDef[] = [
  { x: 180, y: 120, w: 260, h: 40, color: COLOR_WALL },
  { x: 180, y: 160, w: 40, h: 180, color: COLOR_WALL },
  { x: 860, y: 140, w: 60, h: 260, color: COLOR_WALL },
  { x: 520, y: 520, w: 300, h: 40, color: COLOR_WALL },
  { x: 1020, y: 480, w: 140, h: 140, color: COLOR_WALL },
  { x: 320, y: 470, w: 90, h: 90, color: COLOR_WALL },
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
export const HUD_SMALL_FONT_SIZE = 12;
export const HUD_SMALL_FONT = `${HUD_SMALL_FONT_SIZE}px Consolas, ui-monospace, monospace`;

// Spec §6.1, §6.2, §6.6 Weapons (values from task brief; verify against SPEC.pdf)
// Fields marked PLACEHOLDER were not in the brief and need values from the spec.
export type WeaponId = 'assaultRifle' | 'shotgun' | 'rpg';
export interface Splash {
  radius: number; // px
  centerDamage: number; // falls off linearly to 0 at the radius
}
export interface WeaponStats {
  name: string;
  shortName: string; // HUD slot label
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
  reserveCap: number; // most rounds the reserve can hold
  ammoBoxAmount: number; // rounds one ammo box adds to the reserve
  splash: Splash | null; // explosive weapons detonate on impact, wall or max range
}

// RPG rocket range and speed: lifetime is derived so the rocket detonates at max range.
const RPG_ROCKET_SPEED = 360; // PLACEHOLDER px/s ("slow-moving")
const RPG_MAX_RANGE = 800; // PLACEHOLDER px

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  assaultRifle: {
    name: 'Assault Rifle',
    shortName: 'RIFLE',
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
    reserveCap: 75,
    ammoBoxAmount: 25,
    splash: null,
  },
  shotgun: {
    name: 'Shotgun',
    shortName: 'SHOTGUN',
    damage: 12, // per pellet (raised from the brief's 8 by request); several pellets on one zombie add up
    fireRate: 1,
    magazineSize: 5,
    startingReserve: 20,
    reloadSeconds: 2.5,
    projectilesPerShot: 6,
    pelletSpreadRadians: (30 * Math.PI) / 180, // 30° total cone
    movingSpreadRadians: 0, // PLACEHOLDER: brief gives movement deviation only for the rifle
    projectileSpeed: 800, // PLACEHOLDER
    projectileLifetime: 0.45, // PLACEHOLDER (~360 px range)
    projectileRadius: 2.5, // PLACEHOLDER (visual size)
    projectileColor: '#ffe8a3',
    // SPEC CONFLICT: the spec says the shotgun reserve cap is 3x its magazine (15), but it
    // also gives a starting reserve of 20, which would start the player above the cap.
    // We use a cap of 20 so the starting reserve is legal. Revisit if the spec is updated.
    reserveCap: 20,
    ammoBoxAmount: 10,
    splash: null,
  },
  rpg: {
    name: 'RPG',
    shortName: 'RPG',
    damage: 90, // direct hit
    fireRate: 0.5,
    magazineSize: 1,
    startingReserve: 4,
    reloadSeconds: 3,
    projectilesPerShot: 1,
    pelletSpreadRadians: 0,
    movingSpreadRadians: 0, // PLACEHOLDER: brief gives movement deviation only for the rifle
    projectileSpeed: RPG_ROCKET_SPEED,
    projectileLifetime: RPG_MAX_RANGE / RPG_ROCKET_SPEED,
    projectileRadius: 6, // PLACEHOLDER (visual size)
    projectileColor: '#ff8c42',
    reserveCap: 8,
    ammoBoxAmount: 2,
    splash: { radius: 100, centerDamage: 60 },
  },
};
export const STARTING_WEAPON: WeaponId = 'assaultRifle';
/** Number-key slots: Digit1 → index 0, and so on. */
export const WEAPON_SLOTS: readonly WeaponId[] = ['assaultRifle', 'shotgun', 'rpg'];
export const WEAPON_SWITCH_SECONDS = 0.25;
/**
 * DEBUG: start with every weapon owned. Real unlock rules arrive with the level system;
 * set to false then so the player starts with only STARTING_WEAPON.
 */
export const DEBUG_ALL_WEAPONS_OWNED = true;

// Explosion visual (presentation)
export const EXPLOSION_VISUAL_SECONDS = 0.3;
export const EXPLOSION_START_RADIUS_FRACTION = 0.2;
export const COLOR_EXPLOSION = '255, 140, 66'; // rgb triplet; alpha fades over the blast

// Pickup visuals (presentation). Supply locations and drop rules are per level, below.
export const PICKUP_SIZE = 18;
export const COLOR_AMMO_BOX = '#c8b273';
export const COLOR_AMMO_BOX_EDGE = '#3b3423';
export const COLOR_MEDKIT = '#f2f3f5';
export const COLOR_MEDKIT_CROSS = '#e04848';
export const MEDKIT_CROSS_THICKNESS = 4;
export const PICKUP_EDGE_WIDTH = 2;
/** Dropped pickups blink for their last few seconds before vanishing. */
export const PICKUP_BLINK_SECONDS = 3;
export const PICKUP_BLINK_HZ = 4;
/** Projectiles spawn at the tip of the aim arrow. */
export const MUZZLE_OFFSET = PLAYER_RADIUS + ARROW_TIP_LENGTH;
/** Tolerance for timer comparisons, so 10 steps of 1/60 s count as exactly 1/6 s. */
export const TIMER_EPSILON = 1e-9;

/** How long something flashes white after being hit. */
export const HIT_FLASH_SECONDS = 0.1;
export const COLOR_HIT_FLASH = '#ffffff';

// Spec §4.4 Health and medkits (values from task brief; verify against SPEC.pdf)
export const PLAYER_MAX_HEALTH = 100;
/** A medkit heals this much, never above max health, and is left on the ground at full health. */
export const MEDKIT_HEAL = 30;
export const RESTART_KEY = 'Enter';

// Spec §7.1–7.7 Zombies (Runner/Tank/Spitter from task brief; verify against SPEC.pdf.
// Walker values are PLACEHOLDERS: the basic-zombie brief was never given.)
export type ZombieType = 'walker' | 'runner' | 'tank' | 'spitter';
export interface SpitStats {
  speed: number; // px/s
  lifetime: number; // seconds
  radius: number; // px
  color: string;
}
/** Resistances (knockback, freeze, ice slow) are the hooks the character abilities use. */
export interface ZombieStats extends Resistances {
  name: string;
  health: number;
  speed: number; // px/s
  damage: number; // per melee hit, or per spit for ranged zombies
  xp: number; // awarded on kill
  attackInterval: number; // seconds between attacks
  radius: number; // px; each type has its own size
  color: string; // each type has its own color
  behavior: 'melee' | 'ranged';
  /** Ranged zombies try to stay inside this distance band from the player. */
  preferredRange: { min: number; max: number } | null;
  spit: SpitStats | null;
}
export const ZOMBIES: Record<ZombieType, ZombieStats> = {
  walker: {
    name: 'Walker',
    health: 50, // PLACEHOLDER
    speed: 70, // PLACEHOLDER
    damage: 10, // PLACEHOLDER
    xp: 10, // PLACEHOLDER
    attackInterval: 1, // PLACEHOLDER
    radius: 17,
    color: '#7f9a5a', // olive
    behavior: 'melee',
    preferredRange: null,
    spit: null,
    knockbackResistance: 0,
    freezeImmune: false,
    iceSlowMultiplier: 0.5, // Frost Pulse hits slow by 50%
  },
  runner: {
    name: 'Runner',
    health: 25,
    speed: 145,
    damage: 8,
    xp: 15,
    attackInterval: 1.2,
    radius: 12, // small and quick
    color: '#ff5f8f', // pink
    behavior: 'melee',
    preferredRange: null,
    spit: null,
    knockbackResistance: 0,
    freezeImmune: false,
    iceSlowMultiplier: 0.5, // Frost Pulse hits slow by 50%
  },
  tank: {
    name: 'Tank',
    health: 300,
    speed: 45,
    damage: 20,
    xp: 50,
    attackInterval: 2,
    radius: 28, // big
    color: '#5b3b8c', // deep violet
    behavior: 'melee',
    preferredRange: null,
    spit: null,
    knockbackResistance: 0.75, // PLACEHOLDER: brief says "heavily reduced", not how much
    freezeImmune: true,
    iceSlowMultiplier: 0.75, // ice slows tanks by only 25%
  },
  spitter: {
    name: 'Spitter',
    health: 60,
    speed: 65,
    damage: 12,
    xp: 25,
    attackInterval: 2.5,
    radius: 15,
    color: '#c6ef3a', // acid lime
    behavior: 'ranged',
    preferredRange: { min: 180, max: 260 },
    spit: {
      speed: 240, // PLACEHOLDER: slow enough to dodge
      lifetime: 2.5, // PLACEHOLDER
      radius: 7, // PLACEHOLDER
      color: '#7dff6a',
    },
    knockbackResistance: 0,
    freezeImmune: false,
    iceSlowMultiplier: 0.5, // Frost Pulse hits slow by 50%
  },
};

// Navigation (engine tuning, not balance)
export const NAV_CELL_SIZE = 20; // px per flow-field cell
/** Flow fields are rebuilt at most this often, and only when the player changes cell. */
export const NAV_RECOMPUTE_SECONDS = 0.25;
/** Zombies push apart when their edges are closer than this many px. */
export const SEPARATION_PADDING = 6;
/** Strength of the push-apart relative to the zombie's own speed. */
export const SEPARATION_WEIGHT = 0.9;
/** Melee reach beyond touching: attack when edges are within this many px. */
export const MELEE_REACH = 4;

// Spec §15–16 Waves and spawning (rules from task brief; timings PLACEHOLDER, verify against SPEC.pdf)
/** Player's safe area: no zombie ever appears closer than this many px. */
export const ZOMBIE_SPAWN_MIN_DISTANCE = 300;
export const ZOMBIE_SPAWN_MAX_TRIES = 60;
/** Most standard zombies alive at once. Extra ones wait in a queue until others die. */
export const ACTIVE_ZOMBIE_CAP = 40;
/** Types that don't count toward the cap (the boss will go here). */
export const CAP_EXEMPT_TYPES: readonly ZombieType[] = [];
/** A warning marker shows where a group will appear this long before it does. */
export const SPAWN_WARNING_SECONDS = 1.5; // PLACEHOLDER
/** Group members appear within this many px of the warning marker. */
export const SPAWN_GROUP_SPREAD = 40; // PLACEHOLDER
/** Seconds between a spawn group's batches when the level doesn't say. */
export const DEFAULT_GROUP_INTERVAL_SECONDS = 3; // PLACEHOLDER

/**
 * One line of a wave: `count` zombies of `type`, arriving in batches of `groupSize`.
 * The first batch comes `delaySeconds` after the wave starts, then one every `intervalSeconds`.
 */
export interface SpawnGroupDef {
  type: ZombieType;
  count: number;
  groupSize: number;
  delaySeconds: number;
  intervalSeconds?: number; // DEFAULT_GROUP_INTERVAL_SECONDS when left out
}
export interface WaveDef {
  groups: SpawnGroupDef[];
}

// Spec §4.4, §6.6 Supplies: pickups at supply locations and as zombie drops, set per level.
export type PickupKind = 'ammo' | 'medkit';
export interface WeightedPickup {
  kind: PickupKind;
  weight: number; // relative odds within its table
}
export interface SupplyConfig {
  /** Predefined supply locations; each holds one pickup and refills after it is taken. */
  points: readonly { x: number; y: number }[];
  table: WeightedPickup[];
  respawnSeconds: number;
}
export interface DropRule {
  /** Chance (0..1) that a killed zombie of each type drops something. */
  chance: Record<ZombieType, number>;
  table: WeightedPickup[];
  /** Dropped pickups vanish after this long; supply-point pickups stay. */
  lifetimeSeconds: number;
  /** No new drops while this many dropped pickups are already lying around. */
  maxOnGround: number;
}
export interface LevelDef {
  name: string;
  waves: WaveDef[];
  /** Countdown before the first wave and between waves. */
  intermissionSeconds: number;
  supply: SupplyConfig;
  drops: DropRule;
}

/** Test level: three waves using all four zombie types. Wave 3 sends 60 to exercise the cap. */
export const TEST_LEVEL: LevelDef = {
  name: 'Test Waves',
  intermissionSeconds: 5,
  waves: [
    {
      groups: [
        { type: 'walker', count: 8, groupSize: 4, delaySeconds: 0, intervalSeconds: 5 },
        { type: 'runner', count: 4, groupSize: 2, delaySeconds: 6, intervalSeconds: 4 },
      ],
    },
    {
      groups: [
        { type: 'walker', count: 12, groupSize: 4, delaySeconds: 0, intervalSeconds: 4 },
        { type: 'spitter', count: 4, groupSize: 2, delaySeconds: 3, intervalSeconds: 6 },
        { type: 'runner', count: 6, groupSize: 3, delaySeconds: 8, intervalSeconds: 5 },
        { type: 'tank', count: 1, groupSize: 1, delaySeconds: 12 },
      ],
    },
    {
      groups: [
        { type: 'walker', count: 30, groupSize: 6, delaySeconds: 0, intervalSeconds: 2 },
        { type: 'runner', count: 16, groupSize: 4, delaySeconds: 2, intervalSeconds: 2 },
        { type: 'spitter', count: 8, groupSize: 2, delaySeconds: 4, intervalSeconds: 3 },
        { type: 'tank', count: 6, groupSize: 2, delaySeconds: 6, intervalSeconds: 5 },
      ],
    },
  ],
  supply: {
    points: [
      { x: 120, y: 620 },
      { x: 760, y: 90 },
      { x: 1180, y: 380 },
      { x: 560, y: 640 },
    ],
    table: [
      { kind: 'ammo', weight: 2 },
      { kind: 'medkit', weight: 1 },
    ],
    respawnSeconds: 20,
  },
  drops: {
    chance: { walker: 0.08, runner: 0.08, tank: 0.5, spitter: 0.15 },
    table: [
      { kind: 'ammo', weight: 3 },
      { kind: 'medkit', weight: 1 },
    ],
    lifetimeSeconds: 20,
    maxOnGround: 8,
  },
};

// Wave HUD and spawn warnings (presentation)
export const COLOR_SPAWN_WARNING = '224, 72, 72'; // rgb triplet; alpha pulses
export const SPAWN_WARNING_PULSE_HZ = 3;
export const SPAWN_WARNING_MIN_ALPHA = 0.4; // outer ring pulses between this and 1
export const SPAWN_WARNING_INNER_ALPHA = 0.8;
export const SPAWN_WARNING_LINE_WIDTH = 3;
export const SPAWN_WARNING_FONT = 'bold 20px Consolas, ui-monospace, monospace';
export const COLOR_WAVE_CLEAR = '#4fc37a';

/** DEBUG: kills every zombie on the map, to step through waves quickly. */
export const DEBUG_KILL_ALL_KEY = 'KeyK';
/** DEBUG: press these keys to spawn one zombie of that type. */
export const DEBUG_SPAWN_KEYS: Record<ZombieType, string> = {
  walker: 'Digit6',
  runner: 'Digit7',
  tank: 'Digit8',
  spitter: 'Digit9',
};
/** DEBUG: spawns a mixed horde for the 60 FPS stress test. */
export const DEBUG_HORDE_KEY = 'Digit0';
export const DEBUG_HORDE_SIZE = 40;
export const DEBUG_HELP_TEXT = '6 Walker  7 Runner  8 Tank  9 Spitter  0 Horde of 40  K Kill all  C Switch character';

// Zombie health bars (presentation)
export const ZOMBIE_HEALTH_BAR_HEIGHT = 4;
export const ZOMBIE_HEALTH_BAR_GAP = 4;
export const COLOR_ZOMBIE_HEALTH = '#e04848';

// HUD player health and XP (presentation)
export const COLOR_HEALTH_FILL = '#e04848';
export const HUD_BAR_STACK_GAP = 26; // vertical gap between health and stamina bars
export const COLOR_OVERLAY = 'rgba(10, 11, 13, 0.6)';
export const HUD_TITLE_FONT = 'bold 44px Consolas, ui-monospace, monospace';
export const HUD_TITLE_GAP = 40;

// HUD ammo readout (presentation)
export const HUD_AMMO_FONT_SIZE = 22;
export const HUD_AMMO_FONT = `bold ${HUD_AMMO_FONT_SIZE}px Consolas, ui-monospace, monospace`;
export const RELOAD_BAR_WIDTH = 160;
export const RELOAD_BAR_HEIGHT = 6;
export const HUD_LINE_GAP = 6;
export const COLOR_AMMO_EMPTY = '#e0703a';
export const COLOR_RELOAD_FILL = '#ffd166';
export const HUD_SLOT_GAP = 14;
export const COLOR_SLOT_ACTIVE = '#ffd166';
export const COLOR_SLOT_LOCKED = '#8a8d93';
// TODO Spec §?: zombies
// TODO Spec §?: XP formula
// TODO Spec §?: chest odds
