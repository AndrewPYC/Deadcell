import { describe, expect, it } from 'vitest';
import { buildNavGrid, cellCenter, cellIndex, computeFlowField, nextCell, type NavGrid } from '../src/systems/navigation';
import { createNavCache, updateNavCache } from '../src/systems/navCache';
import { hasClearPath, segmentIntersectsRect } from '../src/systems/collision';
import { vec } from '../src/core/math';
import { NAV_RECOMPUTE_SECONDS } from '../src/data/config';

const CELL = 20;
const idx = (g: NavGrid, c: number, r: number) => r * g.cols + c;

/** Follow the field from `start`; returns the visited cell indices. */
function walk(g: NavGrid, field: ReturnType<typeof computeFlowField>, start: number, maxSteps = 200): number[] {
  const path = [start];
  let at = start;
  for (let i = 0; i < maxSteps; i++) {
    const n = nextCell(field, cellCenter(g, at));
    if (n < 0) break;
    path.push(n);
    at = n;
  }
  return path;
}

describe('flow field on a 10x10 grid', () => {
  // A wall down column 5 from the top, leaving a gap in the bottom two rows.
  const wall = { x: 100, y: 0, w: 20, h: 160 };
  const g = buildNavGrid(200, 200, CELL, [wall], 1);
  const target = vec(30, 30); // cell (1,1)
  const field = computeFlowField(g, target);
  const start = idx(g, 8, 1);

  it('marks the wall cells blocked and leaves the gap open', () => {
    expect(g.cols).toBe(10);
    expect(g.rows).toBe(10);
    for (let r = 0; r < 8; r++) expect(g.blocked[idx(g, 5, r)]).toBe(1);
    expect(g.blocked[idx(g, 5, 8)]).toBe(0);
    expect(g.blocked[idx(g, 5, 9)]).toBe(0);
  });

  it('costs 0 at the target and Infinity inside walls', () => {
    expect(field.cost[cellIndex(g, target)]).toBe(0);
    expect(field.cost[idx(g, 5, 3)]).toBe(Infinity);
  });

  it('routes around the wall, costing more than the straight line', () => {
    expect(field.cost[start]).toBeGreaterThan(7);
    expect(Number.isFinite(field.cost[start])).toBe(true);
  });

  it('following the field reaches the target through the gap without entering a wall', () => {
    const path = walk(g, field, start);
    expect(path[path.length - 1]).toBe(cellIndex(g, target));
    for (const i of path) expect(g.blocked[i]).toBe(0);
    const throughGap = path.some((i) => i % g.cols === 5);
    expect(throughGap).toBe(true);
    for (const i of path.filter((i) => i % g.cols === 5)) expect(Math.floor(i / g.cols)).toBeGreaterThanOrEqual(8);
  });

  it('cost never increases along the path', () => {
    const path = walk(g, field, start);
    for (let i = 1; i < path.length; i++) expect(field.cost[path[i]]).toBeLessThan(field.cost[path[i - 1]]);
  });
});

describe('flow field edge cases', () => {
  it('leaves enclosed cells unreachable', () => {
    // A box around cell (7,7) on a 10x10 grid.
    const walls = [
      { x: 120, y: 120, w: 60, h: 20 },
      { x: 120, y: 160, w: 60, h: 20 },
      { x: 120, y: 140, w: 20, h: 20 },
      { x: 160, y: 140, w: 20, h: 20 },
    ];
    const g = buildNavGrid(200, 200, CELL, walls, 1);
    const field = computeFlowField(g, vec(10, 10));
    expect(field.cost[idx(g, 7, 7)]).toBe(Infinity);
    expect(nextCell(field, cellCenter(g, idx(g, 7, 7)))).toBe(-1);
  });

  it('never cuts a wall corner diagonally', () => {
    // Blocks right of and below the target cell (0,0); the diagonal (1,1) must go around.
    const walls = [
      { x: 20, y: 0, w: 20, h: 20 },
      { x: 0, y: 20, w: 20, h: 20 },
    ];
    const g = buildNavGrid(100, 100, CELL, walls, 1);
    const field = computeFlowField(g, vec(10, 10));
    expect(field.cost[idx(g, 1, 1)]).toBe(Infinity);
  });

  it('bigger zombies cannot fit through gaps that smaller ones can', () => {
    // Two walls with a 40 px gap between them.
    const walls = [
      { x: 100, y: 0, w: 20, h: 90 },
      { x: 100, y: 130, w: 20, h: 70 },
    ];
    const small = buildNavGrid(200, 200, CELL, walls, 12);
    const big = buildNavGrid(200, 200, CELL, walls, 28);
    const from = vec(170, 110);
    const to = vec(30, 110);
    expect(Number.isFinite(computeFlowField(small, to).cost[cellIndex(small, from)])).toBe(true);
    expect(computeFlowField(big, to).cost[cellIndex(big, from)]).toBe(Infinity);
  });
});

describe('nav cache', () => {
  it('rebuilds only occasionally, and only when the player changes cell', () => {
    const nav = createNavCache([], 200, 200, [12, 28]);
    updateNavCache(nav, vec(50, 50), 1 / 60);
    expect(nav.rebuilds).toBe(1);
    expect(nav.fields.size).toBe(2);

    // Moving to a new cell right away doesn't rebuild until the interval passes.
    updateNavCache(nav, vec(150, 150), 1 / 60);
    expect(nav.rebuilds).toBe(1);
    updateNavCache(nav, vec(150, 150), NAV_RECOMPUTE_SECONDS);
    expect(nav.rebuilds).toBe(2);

    // Standing still never rebuilds.
    for (let i = 0; i < 5; i++) updateNavCache(nav, vec(150, 150), NAV_RECOMPUTE_SECONDS);
    expect(nav.rebuilds).toBe(2);
  });
});

describe('line of sight', () => {
  const wall = { x: 100, y: 100, w: 50, h: 50 };

  it('segment vs rectangle', () => {
    expect(segmentIntersectsRect(vec(0, 125), vec(300, 125), wall)).toBe(true);
    expect(segmentIntersectsRect(vec(0, 50), vec(300, 50), wall)).toBe(false);
    expect(segmentIntersectsRect(vec(125, 0), vec(125, 90), wall)).toBe(false);
  });

  it('accounts for the mover radius', () => {
    expect(hasClearPath(vec(0, 90), vec(300, 90), 5, [wall])).toBe(true);
    expect(hasClearPath(vec(0, 90), vec(300, 90), 15, [wall])).toBe(false);
  });
});
