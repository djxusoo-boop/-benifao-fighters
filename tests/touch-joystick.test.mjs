import assert from "node:assert/strict";
import test from "node:test";

import { joystickIntent } from "../app/touch-joystick.mjs";

test("keeps a forgiving neutral centre", () => {
  const intent = joystickIntent(8, -7, 50);
  assert.equal(intent.left, false);
  assert.equal(intent.right, false);
  assert.equal(intent.jump, false);
  assert.equal(intent.crouch, false);
});

test("maps horizontal movement and both vertical actions", () => {
  assert.equal(joystickIntent(-40, 0, 50).left, true);
  assert.equal(joystickIntent(40, 0, 50).right, true);
  assert.equal(joystickIntent(0, -40, 50).jump, true);
  assert.equal(joystickIntent(0, 40, 50).crouch, true);
});

test("supports diagonal jumping while advancing", () => {
  const intent = joystickIntent(44, -44, 50);
  assert.equal(intent.right, true);
  assert.equal(intent.jump, true);
  assert.equal(intent.crouch, false);
});

test("clamps a pointer dragged beyond the joystick rim", () => {
  const intent = joystickIntent(500, 500, 50);
  assert.ok(intent.x <= 1 && intent.y <= 1);
  assert.ok(Math.hypot(intent.x, intent.y) <= 1.000001);
});
