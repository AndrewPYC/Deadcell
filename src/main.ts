import { CANVAS_HEIGHT, CANVAS_WIDTH, LEVELS, LEVEL_1, RESTART_KEY, type CharacterId } from './data/config';
import { startLoop } from './core/loop';
import { createInput } from './core/input';
import { createWorld, isOver, renderWorld, updateWorld } from './world';
import { createFpsCounter } from './ui/fps';
import { applyLevelResult, createProfile } from './systems/profile';
import { validateLevel } from './systems/levelValidation';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d')!;
const input = createInput(canvas);
const fps = createFpsCounter();

for (const level of LEVELS) {
  for (const problem of validateLevel(level, CANVAS_WIDTH, CANVAS_HEIGHT)) console.warn(`${level.name}: ${problem}`);
}

// In memory until save/load arrives. Level 1 is the only level built so far, so a restart
// replays it with whatever the profile now owns.
let profile = createProfile();
const startLevel = (character?: CharacterId) => createWorld(character, LEVEL_1, profile.ownedWeapons);
let world = startLevel();

startLoop({
  update: (dt) => {
    if (isOver(world) && input.consumePress(RESTART_KEY)) world = startLevel(world.player.character);
    const result = updateWorld(world, input, dt);
    if (result) profile = applyLevelResult(profile, result);
    input.clearPresses();
  },
  render: (frameSeconds) => {
    fps.tick(frameSeconds);
    renderWorld(ctx, world);
    fps.draw(ctx);
  },
});
