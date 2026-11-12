/** Plan a run that stays between Xuso and the opponent, even at close range. */
export function spookyPath(origin, target, direction, move) {
  const toward = direction === "toward-right" ? 1 : -1;
  const gap = Math.max(0, (target - origin) * toward);
  const clamp = (value) => Math.max(4, Math.min(96, value));
  const start = clamp(origin + toward * Math.min(3, gap / 3));
  const stop = clamp(origin + toward * (gap - Math.min(move === "dog" ? 5 : 13, gap / 3)));
  return { start, stop, peeLength: Math.abs(target - stop) };
}

/** The bite and stream must hit where their visible animation was aimed. */
export function spookyContact(origin, target, liveTarget, direction, move) {
  const point = move === "dog" ? spookyPath(origin, target, direction, move).stop : target;
  return Math.abs(liveTarget - point) <= 9;
}
