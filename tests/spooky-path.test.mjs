import { test } from "node:test";
import assert from "node:assert/strict";
import { spookyContact, spookyPath } from "../app/spooky-path.mjs";

test("Spooky approaches without crossing his opponent at long or close range", () => {
  for (const [origin, target, direction] of [[20, 80, "toward-right"], [45, 48, "toward-right"], [80, 20, "toward-left"], [48, 45, "toward-left"]]) {
    for (const move of ["dog", "howl"]) {
      const { start, stop } = spookyPath(origin, target, direction, move);
      assert.ok(start >= Math.min(origin, target) && start <= Math.max(origin, target));
      assert.ok(stop >= Math.min(origin, target) && stop <= Math.max(origin, target));
      assert.ok(direction === "toward-right" ? start <= stop : start >= stop);
    }
  }
});

test("Spooky's impact follows the visible target rather than Xuso's range", () => {
  assert.equal(spookyContact(15, 85, 85, "toward-right", "dog"), true);
  assert.equal(spookyContact(15, 85, 60, "toward-right", "dog"), false);
  assert.equal(spookyContact(85, 15, 15, "toward-left", "howl"), true);
  assert.equal(spookyContact(85, 15, 40, "toward-left", "howl"), false);
});

test("Spooky remains inside arena bounds", () => {
  for (const [origin, target, direction] of [[1, 3, "toward-right"], [99, 97, "toward-left"], [4, 96, "toward-right"]]) {
    const path = spookyPath(origin, target, direction, "dog");
    assert.ok(path.start >= 4 && path.start <= 96);
    assert.ok(path.stop >= 4 && path.stop <= 96);
  }
});
