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
