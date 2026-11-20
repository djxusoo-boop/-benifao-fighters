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

const closeRanges = { scepter: 28, hoe: 32, hoeSweep: 35 };

/** Match projectile and extended-weapon contact distance to their on-screen travel. */
export function fighterAttackRange(specialMove, normalMove, airborne = false) {
  const normalRange = normalMove === "kick" ? 24 : 19;
  // These projectiles cross the whole arena, including the opening positions.
  if (specialMove === "goldPistol" || specialMove === "fingerPeinetas") return 100;
  const longRangeMoves = new Set([
    "fish", "fishstorm", "toad", "venom", "shield", "staff", "anchor", "chain",
    "jager", "amber", "artichokes",
  ]);

  const weaponRange = closeRanges[specialMove] ?? (longRangeMoves.has(specialMove) ? 70 : 58);
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

/** Move the same distance over real time, splitting slower frames into short steps. */
export function advanceCombatStride({ velocity, held, input, airborne, retreating, speed, elapsed }) {
  const speedFactor = speed * (retreating ? 0.82 : 1);
  const acceleration = airborne ? 0.08 : retreating ? 0.125 : 0.15;
  const damping = airborne ? 0.88 : 0.68;
  let distance = 0;
  // Limit catch-up on long stalls while allowing a full 30 FPS frame.
  for (let remaining = Math.min(50, Math.max(0, elapsed)) / 20; remaining > 0;) {
    const step = Math.min(0.5, remaining);
    remaining -= step;
    const previous = velocity;
    if (input) {
      held = Math.sign(previous) === input ? held + step : step;
      const maxSpeed = airborne ? 0.51 : (held > 9 ? 0.95 : 0.68) * speedFactor;
      const difference = input * maxSpeed - velocity;
      velocity += Math.sign(difference) * Math.min(Math.abs(difference), acceleration * step);
      velocity = Math.max(-maxSpeed, Math.min(maxSpeed, velocity));
    } else {
      held = 0;
      velocity = Math.abs(previous) < 0.045 ? 0 : previous * Math.pow(damping, step);
    }
    distance += (previous + velocity) * 0.5 * step;
  }
  return { velocity, held, distance };
}

/** Each pose spans 4.8 percent of the arena. Retreat plays the cycle backwards. */
export function advanceWalkPhase(phase, signedTravel) {
  return ((phase + signedTravel / 4.8) % 4 + 4) % 4;
}

// The art and the contact test use the same endpoint, fixed when the swing begins.
export function weaponEndpoint(move, origin, target, airborne) {
  if (!["anchor", "hoe", "hoeSweep", "scepter"].includes(move)) return null;
  const reach = fighterAttackRange(move, "punch", airborne);
  return origin + Math.sign(target - origin) * Math.min(Math.abs(target - origin), reach);
}
