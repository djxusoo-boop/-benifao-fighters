import assert from "node:assert/strict";
import test from "node:test";
import { attackFacesTarget, clampFighterStep, combatApproachGap, combatContact, directionToOpponent, fighterAttackRange, visibleFighterBounds } from "../app/combat-contact.mjs";

const base = { inFront: true, distance: 12, range: 19, evading: false, crouching: false, normalPunch: true };
test("only attacks in reach and facing the opponent connect", () => {
  assert.equal(combatContact(base), "hit");
  assert.equal(combatContact({ ...base, distance: 20 }), "miss");
  assert.equal(combatContact({ ...base, inFront: false }), "miss");
});
test("jump steps stay on the correct side and can escape an overlap", () => {
  assert.equal(clampFighterStep(40, 50, 35, 15), 35);
  assert.equal(clampFighterStep(40, 50, 45, 15), 40);
  assert.equal(clampFighterStep(20, 50, 45, 15), 35);
  assert.equal(clampFighterStep(80, 50, 45, 15), 65);
  assert.equal(clampFighterStep(60, 50, 65, 15), 65);
  assert.equal(clampFighterStep(40, 50, 55, 15), 40);
  assert.equal(clampFighterStep(40, 50, 30, 15), 30);
  assert.equal(clampFighterStep(60, 50, 45, 15), 60);
  assert.equal(clampFighterStep(40, 50, 80, 15), 40);
  assert.equal(clampFighterStep(60, 50, 20, 15), 60);
});
test("attack facing follows the opponent's live side, including overlap", () => {
  assert.equal(directionToOpponent(30, 70), "toward-right");
  assert.equal(directionToOpponent(70, 30), "toward-left");
  assert.equal(attackFacesTarget("toward-right", 30, 70), true);
  assert.equal(attackFacesTarget("toward-left", 70, 30), true);
  assert.equal(attackFacesTarget("toward-right", 70, 30), false);
  assert.equal(attackFacesTarget("toward-left", 30, 70), false);
  assert.equal(attackFacesTarget("toward-right", 50, 50), true);
});
test("ranged and extended new-fighter specials reach the visible opponent", () => {
  for (const move of ["fish", "fishstorm", "toad", "venom", "shield", "staff", "anchor", "chain", "jager", "amber", "artichokes"]) {
    assert.equal(fighterAttackRange(move, "punch"), 70, `${move} range`);
  }
  assert.equal(fighterAttackRange("scepter", "punch"), 28);
  assert.equal(fighterAttackRange(null, "punch"), 19);
  assert.equal(fighterAttackRange(null, "kick"), 24);
  assert.equal(fighterAttackRange("shield", "punch", true), 77);
});
test("Toni's visible projectiles can reach across the full arena", () => {
  for (const move of ["goldPistol", "fingerPeinetas"]) {
    const range = fighterAttackRange(move, "punch");
    assert.equal(combatContact({ ...base, distance: 90, range, normalPunch: false }), "hit");
    assert.equal(combatContact({ ...base, distance: 90, range, normalPunch: false, evading: true }), "evaded");
  }
});
test("evasion needs an attack in reach; crouching avoids punches but not kicks", () => {
  assert.equal(combatContact({ ...base, evading: true }), "evaded");
  assert.equal(combatContact({ ...base, evading: true, distance: 40 }), "miss");
  assert.equal(combatContact({ ...base, crouching: true }), "miss");
  assert.equal(combatContact({ ...base, crouching: true, normalPunch: false }), "hit");
});
test("large fighters stay fully inside the arena on desktop and mobile widths", () => {
  const desktop = visibleFighterBounds(705, 274, 7, 93, 12, 28);
  assert.ok(desktop.min > 25 && desktop.min < 26);
  assert.equal(desktop.max, 100 - desktop.min);
  const mobile = visibleFighterBounds(360, 180, 7, 93, 12, 20);
  assert.ok(mobile.min > 33 && mobile.min < 35);
  assert.equal(mobile.max, 100 - mobile.min);
  assert.deepEqual(visibleFighterBounds(0, 180), { min: 7, max: 93 });
});
test("large fighters can close into normal-punch reach on desktop and mobile", () => {
  const desktopGap = combatApproachGap(705, 274);
  const mobileGap = combatApproachGap(360, 180);
  assert.ok(desktopGap >= 14 && desktopGap <= 17.5);
  assert.ok(mobileGap >= 14 && mobileGap <= 17.5);
  assert.ok(desktopGap < 19 && mobileGap < 19);
  assert.equal(combatApproachGap(0, 180), 17.5);
});
