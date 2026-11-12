// The editor uses percentages; invalid values safely retain the original stats.
export function balanceFactor(balance, fighter, stat) {
  const value = balance?.[fighter]?.[stat];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(.5, Math.min(1.5, value / 100))
    : 1;
}

// Preserve time for every attack pose even at maximum speed.
export function normalAttackDuration(baseDuration, speedFactor) {
  return Math.max(Math.min(baseDuration, 400), Math.round(baseDuration / speedFactor));
}
