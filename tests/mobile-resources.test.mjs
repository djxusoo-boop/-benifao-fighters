import test from "node:test";
import assert from "node:assert/strict";
import { isAppleMobile, retainPreloadImage } from "../app/mobile-resources.mjs";

test("recognises iPhone and desktop-mode iPad without treating ordinary Macs as phones", () => {
  assert.equal(isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone", 5), true);
  assert.equal(isAppleMobile("Mozilla/5.0 Macintosh", "MacIntel", 5), true);
  assert.equal(isAppleMobile("Mozilla/5.0 Macintosh", "MacIntel", 0), false);
  assert.equal(isAppleMobile("Mozilla/5.0 Android", "Linux", 5), false);
});

test("mobile preload references stay bounded; desktop can retain all frames", () => {
  const mobile = [], desktop = [];
  for (let i = 0; i < 100; i++) {
    retainPreloadImage(mobile, i, 8);
    retainPreloadImage(desktop, i, Infinity);
  }
  assert.equal(mobile.length, 8);
  assert.equal(desktop.length, 100);
});
