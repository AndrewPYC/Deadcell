import type { Vec2 } from '../core/math';
import { NAV_CELL_SIZE, NAV_RECOMPUTE_SECONDS } from '../data/config';
import type { Rect } from './collision';
import { buildNavGrid, cellIndex, computeFlowField, type FlowField, type NavGrid } from './navigation';

/**
 * One grid per zombie size (walls are static, so grids are built once) and one cached
 * flow field per grid toward the player. Fields are rebuilt at most every
 * NAV_RECOMPUTE_SECONDS, and only if the player has moved to another cell.
 */
export interface NavCache {
  grids: Map<number, NavGrid>;
  fields: Map<number, FlowField>;
  timer: number;
  targetCell: number;
  rebuilds: number;
}

export function createNavCache(walls: readonly Rect[], width: number, height: number, radii: readonly number[]): NavCache {
  const grids = new Map<number, NavGrid>();
  for (const r of new Set(radii)) grids.set(r, buildNavGrid(width, height, NAV_CELL_SIZE, walls, r));
  return { grids, fields: new Map(), timer: 0, targetCell: -1, rebuilds: 0 };
}

export function updateNavCache(nav: NavCache, target: Vec2, dt: number): void {
  nav.timer -= dt;
  if (nav.timer > 0) return;
  const anyGrid = nav.grids.values().next().value;
  if (!anyGrid) return;
  const cell = cellIndex(anyGrid, target);
  if (cell === nav.targetCell && nav.fields.size) return;
  for (const [r, g] of nav.grids) nav.fields.set(r, computeFlowField(g, target));
  nav.targetCell = cell;
  nav.timer = NAV_RECOMPUTE_SECONDS;
  nav.rebuilds++;
}

export const fieldFor = (nav: NavCache, radius: number): FlowField | undefined => nav.fields.get(radius);
