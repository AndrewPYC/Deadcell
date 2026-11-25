import { describe, expect, it } from 'vitest';
import { arrowPoints } from '../src/entities/player';
import { vec } from '../src/core/math';
import {
  ARROW_BASE_ARC_FRACTION,
  ARROW_MAX_BASE_ARC_FRACTION,
  ARROW_TIP_LENGTH,
  PLAYER_RADIUS,
} from '../src/data/config';

describe('aim arrow', () => {
  const c = vec(200, 200);

  it('base covers no more than one-fifth of the circumference', () => {
    expect(ARROW_BASE_ARC_FRACTION).toBeLessThanOrEqual(ARROW_MAX_BASE_ARC_FRACTION);
    const [a, , b] = arrowPoints(c, PLAYER_RADIUS, 0);
    const arc = Math.abs(Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
    expect(arc / (Math.PI * 2)).toBeLessThanOrEqual(ARROW_MAX_BASE_ARC_FRACTION);
  });

  it('base corners sit on the circle edge', () => {
    for (const p of [arrowPoints(c, PLAYER_RADIUS, 1)[0], arrowPoints(c, PLAYER_RADIUS, 1)[2]]) {
      expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(PLAYER_RADIUS);
    }
  });

  it('tip points along the aim angle', () => {
    const aim = Math.PI / 3;
    const [, tip] = arrowPoints(c, PLAYER_RADIUS, aim);
    expect(Math.atan2(tip.y - c.y, tip.x - c.x)).toBeCloseTo(aim);
    expect(Math.hypot(tip.x - c.x, tip.y - c.y)).toBeCloseTo(PLAYER_RADIUS + ARROW_TIP_LENGTH);
  });
});
