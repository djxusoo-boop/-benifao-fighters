import test from "node:test";
import assert from "node:assert/strict";
import { canvasResolutionScale, isAppleMobile, retainPreloadImage } from "../app/mobile-resources.mjs";

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

test("retains ordinary mobile canvas density and caps large high-DPI backing stores", () => {
  assert.equal(canvasResolutionScale(844, 390, 3, 1.75), 1.75);
  assert.equal(canvasResolutionScale(1920, 1080, 1, 1.75), 1);
  const fullscreenRatio = canvasResolutionScale(1920, 1080, 2, 1.75);
  assert.ok(fullscreenRatio > 1 && fullscreenRatio < 1.1);
  assert.ok(1920 * 1080 * fullscreenRatio ** 2 <= 2_400_001);
});
