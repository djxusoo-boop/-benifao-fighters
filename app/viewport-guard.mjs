// Pinch zoom changes the visual viewport, not the device layout viewport.
export function layoutViewport(width, height, visualHeight, scale, coarse, preference) {
  const stableHeight = scale > 1.01 ? height : (visualHeight || height);
  const mobile = preference === "mobile" ||
    preference === "auto" && (width <= 680 || Math.min(width, height) <= 600 && coarse);
  return { mobile, height: stableHeight };
}

// Cancel the synthetic click following a two-finger zoom outside game controls.
// Do not prevent touch/pointer events: the browser must still be able to zoom.
export function protectPinchClicks(target, now = () => Date.now()) {
  const touches = new Map();
  let suppressUntil = 0;
  let pinching = false;
  const controls = ".touch-controls, .touch-controls-p2, .coop-touch, .platform-touch-controls, .orb-touch, .online-controls, .final-controls, .joystick, .mobile-controls";
  const down = (event) => {
    if (event.pointerType !== "touch") return;
    const inControls = event.target instanceof Element && Boolean(event.target.closest(controls));
    touches.set(event.pointerId, inControls);
    if (touches.size > 1 && [...touches.values()].some(value => !value)) pinching = true;
  };
  const end = (event) => {
    if (!touches.has(event.pointerId)) return;
    touches.delete(event.pointerId);
    if (pinching) {
      suppressUntil = now() + 500;
      if (touches.size === 0) pinching = false;
    }
  };
  const click = (event) => {
    if (event.detail === 0 || (!pinching && now() > suppressUntil)) return;
    if (event.target instanceof Element && event.target.closest(controls)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressUntil = 0;
  };
  const clear = () => { touches.clear(); suppressUntil = 0; pinching = false; };
  target.addEventListener("pointerdown", down, true);
  target.addEventListener("pointerup", end, true);
  target.addEventListener("pointercancel", end, true);
  target.addEventListener("click", click, true);
  window.addEventListener("blur", clear);
  return () => {
    target.removeEventListener("pointerdown", down, true);
    target.removeEventListener("pointerup", end, true);
    target.removeEventListener("pointercancel", end, true);
    target.removeEventListener("click", click, true);
    window.removeEventListener("blur", clear);
  };
}
