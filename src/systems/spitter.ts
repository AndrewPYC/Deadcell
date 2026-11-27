export type RangeIntent = 'approach' | 'retreat' | 'hold';

/**
 * Distance keeping for ranged zombies. Inside the band they hold and shoot; too close they
 * back off; too far, or with no line of sight, they close in (along the flow field).
 */
export function rangeIntent(distance: number, band: { min: number; max: number }, hasLineOfSight: boolean): RangeIntent {
  if (distance < band.min) return 'retreat';
  if (distance > band.max || !hasLineOfSight) return 'approach';
  return 'hold';
}

/** A ranged zombie spits when its cooldown is ready, it can see the player and the player is in range. */
export const canSpit = (cooldown: number, distance: number, maxRange: number, hasLineOfSight: boolean): boolean =>
  cooldown <= 0 && hasLineOfSight && distance <= maxRange;
