/** Determine contact at the impact frame, not when the move starts. */
export function combatContact({ inFront, distance, range, evading, crouching, normalPunch }) {
  if (!inFront || distance > range) return "miss";
  if (evading) return "evaded";
  if (normalPunch && crouching) return "miss";
  return "hit";
}

/** Return the horizontal direction from an attacker to the live target. */
export function directionToOpponent(attackerX, opponentX) {
  return opponentX >= attackerX ? "toward-right" : "toward-left";
}

/** Treat a same-position target as in front so overlap cannot create a blind side. */
export function attackFacesTarget(direction, attackerX, targetX) {
  return direction === "toward-right" ? targetX >= attackerX : targetX <= attackerX;
}

/** Match projectile and extended-weapon contact distance to their on-screen travel. */
export function fighterAttackRange(specialMove, normalMove, airborne = false) {
  const normalRange = normalMove === "kick" ? 24 : 19;
  // These projectiles cross the whole arena, including the opening positions.
  if (specialMove === "goldPistol" || specialMove === "fingerPeinetas") return 100;
  const longRangeMoves = new Set([
    "fish", "fishstorm", "toad", "venom", "shield", "staff", "anchor", "chain",
    "jager", "amber", "artichokes",
  ]);
  const weaponRange = specialMove === "scepter" ? 28 : longRangeMoves.has(specialMove) ? 70 : 58;
  return (specialMove ? weaponRange : normalRange) + (airborne ? 7 : 0);
}

/** Keep a step on the fighter's current side while allowing escape from overlap. */
export function clampFighterStep(ownX, rivalX, proposedX, minimumGap) {
  const currentDistance = Math.abs(rivalX - ownX);
  const nextDistance = Math.abs(rivalX - proposedX);
  const crossed = (ownX < rivalX && proposedX >= rivalX) || (ownX > rivalX && proposedX <= rivalX);
  if (crossed || (nextDistance < minimumGap && nextDistance < currentDistance)) {
    if (currentDistance <= minimumGap) return ownX;
    return rivalX + Math.sign(ownX - rivalX) * minimumGap;
  }
  return proposedX;
}

/** Let large fighters close in without their transparent frame boxes keeping them apart. */
export function combatApproachGap(arenaWidth, fighterWidth) {
  if (!Number.isFinite(arenaWidth) || !Number.isFinite(fighterWidth) || arenaWidth <= 0 || fighterWidth <= 0) {
    return 17.5;
  }
  const gapPixels = fighterWidth * 0.48 + 12;
  // Keep the closest approach inside normal-punch reach at narrow phone widths.
  return Math.max(14, Math.min(17.5, (gapPixels / arenaWidth) * 100));
}

/** Keep a full-size fighter sprite inside the visible arena at either edge. */
export function visibleFighterBounds(arenaWidth, fighterWidth, min = 7, max = 93, padding = 12, extraTravel = 0) {
  if (!Number.isFinite(arenaWidth) || !Number.isFinite(fighterWidth) || arenaWidth <= 0 || fighterWidth <= 0) {
    return { min, max };
  }
  const safeEdge = Math.max(min, Math.min(49, ((fighterWidth / 2 + padding + extraTravel) / arenaWidth) * 100));
  return { min: safeEdge, max: 100 - safeEdge };
}
