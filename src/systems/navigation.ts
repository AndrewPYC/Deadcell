import { normalize, vec, type Vec2 } from '../core/math';
import { circleIntersectsRect, type Rect } from './collision';

/** Walkable grid for one zombie size: a cell is blocked if a circle that size at its center would touch a wall. */
export interface NavGrid {
  cols: number;
  rows: number;
  cell: number;
  blocked: Uint8Array;
}

/** Path cost from every cell to the target cell (Infinity = unreachable). */
export interface FlowField {
  grid: NavGrid;
  cost: Float64Array;
  targetIndex: number;
}

const DIAGONAL_COST = Math.SQRT2;
const NEIGHBORS: readonly [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, DIAGONAL_COST], [1, -1, DIAGONAL_COST], [-1, 1, DIAGONAL_COST], [-1, -1, DIAGONAL_COST],
];

export function buildNavGrid(width: number, height: number, cell: number, walls: readonly Rect[], clearance: number): NavGrid {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const center = vec((c + 0.5) * cell, (r + 0.5) * cell);
      const offMap = center.x < clearance || center.y < clearance || center.x > width - clearance || center.y > height - clearance;
      if (offMap || walls.some((w) => circleIntersectsRect(center, clearance, w))) blocked[r * cols + c] = 1;
    }
  }
  return { cols, rows, cell, blocked };
}

export const cellIndex = (g: NavGrid, p: Vec2): number => {
  const c = Math.min(g.cols - 1, Math.max(0, Math.floor(p.x / g.cell)));
  const r = Math.min(g.rows - 1, Math.max(0, Math.floor(p.y / g.cell)));
  return r * g.cols + c;
};

export const cellCenter = (g: NavGrid, index: number): Vec2 =>
  vec(((index % g.cols) + 0.5) * g.cell, (Math.floor(index / g.cols) + 0.5) * g.cell);

/**
 * Diagonal moves are allowed only when both side cells are open, so paths never cut a
 * wall's corner. Moving out of a blocked cell is always allowed, so a zombie pressed
 * against a wall can still find its way.
 */
function canStep(g: NavGrid, c: number, r: number, dc: number, dr: number): boolean {
  const nc = c + dc;
  const nr = r + dr;
  if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) return false;
  if (g.blocked[nr * g.cols + nc]) return false;
  if (dc !== 0 && dr !== 0) {
    if (g.blocked[r * g.cols + nc] || g.blocked[nr * g.cols + c]) return false;
  }
  return true;
}

/** Dijkstra from the target outward over the grid (8-way, no corner cutting). */
export function computeFlowField(g: NavGrid, target: Vec2): FlowField {
  const cost = new Float64Array(g.cols * g.rows).fill(Infinity);
  const targetIndex = cellIndex(g, target);
  cost[targetIndex] = 0;

  // Binary min-heap of [cost, index].
  const heap: [number, number][] = [[0, targetIndex]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  while (heap.length) {
    const [d, i] = pop();
    if (d > cost[i]) continue;
    const c = i % g.cols;
    const r = Math.floor(i / g.cols);
    for (const [dc, dr, step] of NEIGHBORS) {
      // Search runs target→zombie, so check the reverse move (neighbor→here) is legal.
      if (!canStep(g, c, r, dc, dr)) continue;
      const n = (r + dr) * g.cols + (c + dc);
      const nd = d + step;
      if (nd < cost[n]) {
        cost[n] = nd;
        push([nd, n]);
      }
    }
  }
  return { grid: g, cost, targetIndex };
}

/** The neighbor cell to walk to next from `pos`, or -1 if at the target or unreachable. */
export function nextCell(f: FlowField, pos: Vec2): number {
  const g = f.grid;
  const here = cellIndex(g, pos);
  if (here === f.targetIndex) return -1;
  const c = here % g.cols;
  const r = Math.floor(here / g.cols);
  let best = -1;
  let bestCost = g.blocked[here] ? Infinity : f.cost[here];
  for (const [dc, dr] of NEIGHBORS) {
    const n = (r + dr) * g.cols + (c + dc);
    // The target cell may be "blocked" when the player hugs a wall; stepping toward it is still fine.
    const intoTarget = n === f.targetIndex && c + dc >= 0 && c + dc < g.cols;
    if (!canStep(g, c, r, dc, dr) && !intoTarget) continue;
    if (f.cost[n] < bestCost) {
      bestCost = f.cost[n];
      best = n;
    }
  }
  return best;
}

/** Unit direction along the flow field from `pos`, or zero if there's nowhere better to go. */
export function flowDirection(f: FlowField, pos: Vec2): Vec2 {
  const n = nextCell(f, pos);
  if (n < 0) return vec(0, 0);
  const target = cellCenter(f.grid, n);
  return normalize(vec(target.x - pos.x, target.y - pos.y));
}
