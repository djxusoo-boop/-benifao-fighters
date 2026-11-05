import test from "node:test";
import { strict as assert } from "node:assert";
import { arrangedOrder } from "../app/lobby-order.mjs";

test("saved character order keeps new entries and ignores removed or duplicate entries", () => {
  const base = ["maletilla", "vanessa", "bacora", "new-fighter"];
  const saved = ["bacora", "removed", "bacora", "maletilla"];
  assert.deepEqual(arrangedOrder(base, saved), ["bacora", "maletilla", "vanessa", "new-fighter"]);
  assert.deepEqual(base, ["maletilla", "vanessa", "bacora", "new-fighter"]);
  assert.deepEqual(saved, ["bacora", "removed", "bacora", "maletilla"]);
});

test("missing or malformed saved order falls back to every original entry", () => {
  assert.deepEqual(arrangedOrder(["fight", "training"], null), ["fight", "training"]);
  assert.deepEqual(arrangedOrder(["fight", "training"], [false, null, "training"]), ["training", "fight"]);
});
