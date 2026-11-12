import assert from "node:assert/strict";
import test from "node:test";
import { balanceFactor, normalAttackDuration } from "../app/fighter-balance.mjs";

test("Xuso's saved settings change his stats without changing other fighters", () => {
  const saved = { xuso: { speed: 150, power: 150, defense: 150 } };
  for (const stat of ["speed", "power", "defense"]) {
    assert.equal(balanceFactor(saved, "xuso", stat), 1.5);
    assert.equal(balanceFactor(saved, "vanessa", stat), 1);
  }
  assert.equal(normalAttackDuration(620, balanceFactor(saved, "xuso", "speed")), 413);
  assert.equal(normalAttackDuration(480, balanceFactor(saved, "xuso", "speed")), 400);
  assert.equal(normalAttackDuration(480, 1), 480);
});

test("invalid or extreme settings do not produce unsafe values", () => {
  assert.equal(balanceFactor({ xuso: { speed: NaN } }, "xuso", "speed"), 1);
  assert.equal(balanceFactor({ xuso: { speed: 400 } }, "xuso", "speed"), 1.5);
  assert.equal(balanceFactor({ xuso: { speed: 0 } }, "xuso", "speed"), .5);
});
