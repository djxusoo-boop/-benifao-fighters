const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Convert a pointer position into a stable fighting-game joystick intent.
 * The dead zones deliberately leave a generous neutral centre so a thumb can
 * rest on the stick without making the fighter twitch.
 */
export function joystickIntent(dx, dy, radius) {
  const safeRadius = Math.max(1, radius);
  const distance = Math.hypot(dx, dy);
  const scale = distance > safeRadius ? safeRadius / distance : 1;
  const x = clamp((dx * scale) / safeRadius, -1, 1);
  const y = clamp((dy * scale) / safeRadius, -1, 1);

  return {
    x,
    y,
    left: x < -0.24,
    right: x > 0.24,
    jump: y < -0.55,
    crouch: y > 0.46,
  };
}

/**
 * Track this contact even if pointer capture is unsupported or rejected.
 * @param {HTMLElement} element
 * @param {number} pointerId
 * @param {{ move?: (x: number, y: number) => void, release: () => void }} handlers
 */
export function trackHeldPointer(element, pointerId, { move, release }) {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const stop = () => controller.abort();
  const finish = () => {
    if (controller.signal.aborted) return;
    stop();
    release();
  };
  /** @param {PointerEvent} event */
  const endPointer = (event) => { if (event.pointerId === pointerId) finish(); };
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // Window listeners still receive motion and release outside the element.
  }
  view?.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId) move?.(event.clientX, event.clientY);
  }, options);
  view?.addEventListener("pointerup", endPointer, options);
  view?.addEventListener("pointercancel", endPointer, options);
  element.addEventListener("lostpointercapture", endPointer, options);
  view?.addEventListener("blur", finish, options);
  doc.addEventListener("visibilitychange", () => { if (doc.hidden) finish(); }, options);
  return stop;
}
