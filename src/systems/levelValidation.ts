import { vec } from '../core/math';
import {
  MAX_DIFFICULTY_SEGMENTS,
  MIN_DIFFICULTY_SEGMENTS,
  PLAYER_RADIUS,
  type LevelDef,
  type ZoneDef,
} from '../data/config';
import { PICKUP_RADIUS } from '../entities/pickup';
import { circleIntersectsRect } from './collision';

const inside = (x: number, y: number, r: number, width: number, height: number): boolean =>
  x >= r && y >= r && x <= width - r && y <= height - r;

const zoneOnMap = (z: ZoneDef, width: number, height: number): boolean =>
  z.w > 0 && z.h > 0 && z.x >= 0 && z.y >= 0 && z.x + z.w <= width && z.y + z.h <= height;

/** Problems with a level definition; empty when it is playable. */
export function validateLevel(level: LevelDef, width: number, height: number): string[] {
  const errors: string[] = [];
  const blocked = (x: number, y: number, r: number) => level.walls.some((w) => circleIntersectsRect(vec(x, y), r, w));

  const { x, y } = level.playerStart;
  if (!inside(x, y, PLAYER_RADIUS, width, height) || blocked(x, y, PLAYER_RADIUS)) {
    errors.push('player start is off the map or inside a wall');
  }
  level.supply.points.forEach((p, i) => {
    if (!inside(p.x, p.y, PICKUP_RADIUS, width, height) || blocked(p.x, p.y, PICKUP_RADIUS)) {
      errors.push(`supply point ${i} is off the map or inside a wall`);
    }
  });

  const n = level.segments.length;
  if (n < MIN_DIFFICULTY_SEGMENTS || n > MAX_DIFFICULTY_SEGMENTS) {
    errors.push(`needs ${MIN_DIFFICULTY_SEGMENTS} to ${MAX_DIFFICULTY_SEGMENTS} difficulty segments, has ${n}`);
  }
  const covered = level.segments.reduce((sum, s) => sum + s.waveCount, 0);
  if (covered !== level.waves.length) errors.push(`segments cover ${covered} waves, level has ${level.waves.length}`);
  if (level.segments.some((s) => s.waveCount < 1)) errors.push('every segment needs at least one wave');

  if (level.waves.length > 0 && level.waves.every((w) => w.mandatory === false)) {
    errors.push('at least one wave must be mandatory');
  }

  const o = level.objective;
  if (o.kind === 'extraction') {
    const cx = o.zone.x + o.zone.w / 2;
    const cy = o.zone.y + o.zone.h / 2;
    if (!zoneOnMap(o.zone, width, height) || blocked(cx, cy, PLAYER_RADIUS)) {
      errors.push('extraction zone is off the map or its centre is inside a wall');
    }
  }
  if (o.kind === 'protect' && (!zoneOnMap(o.target, width, height) || o.health <= 0)) {
    errors.push('protect target is off the map or has no health');
  }
  return errors;
}
