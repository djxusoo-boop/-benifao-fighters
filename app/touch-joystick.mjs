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
