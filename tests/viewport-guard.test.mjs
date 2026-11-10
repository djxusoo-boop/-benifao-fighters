import test from "node:test";
import assert from "node:assert/strict";
import { layoutViewport, protectPinchClicks } from "../app/viewport-guard.mjs";

test("pinch zoom does not change device mode or shrink the game layout", () => {
  assert.deepEqual(layoutViewport(1024, 768, 768, 1, true, "auto"), { mobile: false, height: 768 });
  assert.deepEqual(layoutViewport(1024, 768, 384, 2, true, "auto"), { mobile: false, height: 768 });
  assert.deepEqual(layoutViewport(844, 390, 195, 2, true, "auto"), { mobile: true, height: 390 });
  assert.deepEqual(layoutViewport(1024, 768, 650, 1, true, "auto"), { mobile: false, height: 650 });
});

test("a pinch suppresses the ensuing click, while two game controls remain independent", () => {
  const previousWindow = globalThis.window;
  const previousElement = globalThis.Element;
  class ElementStub { constructor(control) { this.control = control; } closest() { return this.control ? this : null; } }
  class TargetStub {
    handlers = new Map();
    addEventListener(name, fn) { this.handlers.set(name, fn); }
    removeEventListener(name) { this.handlers.delete(name); }
    emit(name, value) { this.handlers.get(name)?.(value); }
  }
  globalThis.Element = ElementStub;
  globalThis.window = new TargetStub();
  const target = new TargetStub();
  let time = 100;
  const dispose = protectPinchClicks(target, () => time);
  const pointer = (id, control = false) => ({ pointerType: "touch", pointerId: id, target: new ElementStub(control) });
  const click = (control = false) => {
    const result = { prevented: false, stopped: false };
    target.emit("click", { detail: 1, target: new ElementStub(control), preventDefault() { result.prevented = true; }, stopImmediatePropagation() { result.stopped = true; } });
    return result;
  };
  try {
    target.emit("pointerdown", pointer(1));
    target.emit("pointerdown", pointer(2));
    time += 3000;
    target.emit("pointerup", pointer(1));
    target.emit("pointerup", pointer(2));
    assert.deepEqual(click(), { prevented: true, stopped: true });
    assert.deepEqual(click(), { prevented: false, stopped: false });
    target.emit("pointerdown", pointer(3, true));
    target.emit("pointerdown", pointer(4, true));
    target.emit("pointerup", pointer(3, true));
    target.emit("pointerup", pointer(4, true));
    assert.deepEqual(click(true), { prevented: false, stopped: false });
  } finally {
    dispose();
    globalThis.window = previousWindow;
    globalThis.Element = previousElement;
  }
});
