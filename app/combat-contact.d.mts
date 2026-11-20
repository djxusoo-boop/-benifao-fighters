export function combatContact(input: {
  inFront: boolean;
  distance: number;
  range: number;
  evading: boolean;
  crouching: boolean;
  normalPunch: boolean;
}): "miss" | "evaded" | "hit";
export function directionToOpponent(attackerX: number, opponentX: number): "toward-right" | "toward-left";
export function attackFacesTarget(direction: "toward-right" | "toward-left", attackerX: number, targetX: number): boolean;
export function fighterAttackRange(specialMove: string | null, normalMove: "punch" | "kick", airborne?: boolean): number;
export function clampFighterStep(ownX: number, rivalX: number, proposedX: number, minimumGap: number): number;
export function combatApproachGap(arenaWidth: number, fighterWidth: number): number;
export function visibleFighterBounds(arenaWidth: number, fighterWidth: number, min?: number, max?: number, padding?: number, extraTravel?: number): { min: number; max: number };

export function advanceCombatStride(input: {
  velocity: number;
  held: number;
  input: number;
  airborne: boolean;
  retreating: boolean;
  speed: number;
  elapsed: number;
}): { velocity: number; held: number; distance: number };
export function advanceWalkPhase(phase: number, signedTravel: number): number;
export function weaponEndpoint(move: string | null, origin: number, target: number, airborne: boolean): number | null;
