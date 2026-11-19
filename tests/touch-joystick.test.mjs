import assert from "node:assert/strict";
import test from "node:test";

import { joystickIntent, trackHeldPointer } from "../app/touch-joystick.mjs";

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

test("a held contact follows motion outside the stick and releases only for its own pointer", () => {
  const view = new EventTarget();
  const doc = Object.assign(new EventTarget(), { defaultView: view, hidden: false });
  const stick = Object.assign(new EventTarget(), { ownerDocument: doc, setPointerCapture() { throw new Error("no capture"); } });
  let motion = [];
  let releases = 0;
  trackHeldPointer(stick, 1, { move: (x, y) => { motion = [x, y]; }, release: () => { releases += 1; } });
  view.dispatchEvent(Object.assign(new Event("pointermove"), { pointerId: 1, clientX: 43, clientY: 21 }));
  assert.deepEqual(motion, [43, 21]);
  view.dispatchEvent(Object.assign(new Event("pointerup"), { pointerId: 2 }));
  assert.equal(releases, 0);
  view.dispatchEvent(Object.assign(new Event("pointerup"), { pointerId: 1 }));
  view.dispatchEvent(new Event("blur"));
  assert.equal(releases, 1);
});
