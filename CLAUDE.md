# Zombie Shooter: Elemental Outbreak

A 2D top-down zombie shooter that runs in the browser. The player moves with WASD, aims with the mouse and survives waves of elemental zombies. Design and balance come from [docs/SPEC.pdf](docs/SPEC.pdf).

## Tech stack

- Vite + TypeScript (strict)
- HTML5 Canvas 2D, no game engine
- Vitest for unit tests

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Run tests once | `npm test` |
| Tests in watch mode | `npm run test:watch` |

## Folder structure

```
src/
  core/      game loop, input, math helpers
  entities/  player, zombies, projectiles, pickups
  systems/   movement, collision, stamina, combat, spawning
  ui/        HUD, menus, overlays
  data/      config.ts (all balance numbers), map data
  save/      save/load
  main.ts    boots the canvas and loop
tests/       Vitest unit tests (*.test.ts)
docs/        SPEC.pdf
```

## Rules

- Keep modules small and focused on one job.
- All numbers live in `src/data/config.ts`, grouped by spec section with a comment naming the section. No magic numbers anywhere else.
- Write unit tests for any pure logic: math, stamina, damage, XP, save/load.
- One feature per commit.
- Never break earlier features. Run `npm test` and `npm run build` before every commit.

## Development phases (spec section 17)

> SPEC.pdf was not in the repo when this file was written. Replace these placeholders with the four phases from section 17.

- [ ] Phase 1: TODO (from spec §17)
- [ ] Phase 2: TODO (from spec §17)
- [ ] Phase 3: TODO (from spec §17)
- [ ] Phase 4: TODO (from spec §17)
