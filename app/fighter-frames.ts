// The fight loads only the two selected fighters, rather than every pose in
// the roster. These are the images used by the fight's CSS animations.
const normalized = (fighter: string, names: string[]) => names.map((name) => `/assets/actions-normalized-v1/${fighter}/${name}.webp`);
const walk = (fighter: string) => [1, 2, 3].map((frame) => `/assets/walk-normalized-v1/${fighter}/frame-${frame}.png`);
const newFighter = (fighter: string) => ["idle", "walk", "walk2-v1", "attack", "punch-v1", "kick-v1", "jump-v1", "crouch-v1", "guard-v1", "dodge-v1", "hit-v1", "knockdown-v1", "getup-v1"].map((name) => `/assets/new-fighters/${fighter}-${name}.webp`);
const rig = (fighter: string, revision = "v21845") => ["idle", "walk", "punch", "kick", "recover"].map((pose) => `/assets/new-fighters/${fighter}-rig-${revision}-${pose}.png`);

export const FIGHTER_FRAMES = {
  maletilla: [
    ...normalized("maletilla", ["maletilla-00", "maletilla-01", "maletilla-02", "maletilla-03", "maletilla-06", "maletilla-07-clean-v1", "maletilla-08", "maletilla-09-clean-v1", "maletilla-extra-09-knockdown-v2", "maletilla-extra-10-defeated-v2"]),
    "/assets/safe-frames/maletilla-punch.svg",
  ],
  vanessa: [
    ...walk("vanessa"),
    ...normalized("vanessa", ["vanessa-00", "vanessa-03", "vanessa-05", "vanessa-09-clean-v1", "vanessa-10-clean-v1", "vanessa-motion-05-punch-windup-clean-v1", "vanessa-motion-08-kick-windup-v1", "vanessa-motion-09-kick-contact-v1", "vanessa-motion-10-jump-crouch-v1", "vanessa-motion-11-jump-air-v1"]),
  ],
  josevictor: [
    ...walk("josevictor"),
    ...normalized("josevictor", ["idle-clean-v1", "guard", "punch-clean-v1", "kick-windup", "kick", "jump-takeoff", "jump-air", "crouch", "throw-money-clean-v1", "hit-clean-v1", "getup", "defeated-clean-v1"]),
  ],
  cristian: [
    ...walk("cristian"),
    ...normalized("cristian", ["idle", "block", "punch", "crouch", "kick", "getup", "jump", "throw-vinyl", "hit"]),
  ],
  cesaret: newFighter("cesaret"),
  borja: [...newFighter("borja"), ...["punch", "kick"].map((move) => `/assets/new-fighters/borja-${move}-strip-v21836.png`)],
  bacora: [...rig("bacora", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/bacora-${move}-strip-v21836.png`), "/assets/new-fighters/bacora-crouch.webp", "/assets/new-fighters/bacora-jump-v1.webp", "/assets/new-fighters/bacora-release-shield-v1.webp", "/assets/new-fighters/bacora-staff-v21849.webp"],
  bonviure: [...rig("bonviure", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/bonviure-${move}-strip-v21836.png`), ...["crouch", "jump", "guard", "hit", "down", "anchor"].map((pose) => `/assets/new-fighters/bonviure-${pose}-v21849.png`), "/assets/new-fighters/bonviure-chain-clean.webp"],
  elchica: [...rig("elchica", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/elchica-${move}-strip-v21836.png`), "/assets/new-fighters/elchica-crouch-v21849.webp", "/assets/new-fighters/elchica-bottle-special-v2.webp", "/assets/new-fighters/elchica-throw-special-v2.webp"],
  ogalla: [...["punch-1", "punch-2", "punch-3", "punch-4", "kick-1", "kick-3"].map((pose) => `/assets/new-fighters/ogalla-${pose}.png`), ...["punch", "kick"].map((move) => `/assets/new-fighters/ogalla-${move}-strip-v21836.png`), ...["idle", "walk", "guard"].map((pose) => `/assets/new-fighters/ogalla-${pose}-v2.png`), "/assets/new-fighters/ogalla-staff-special-v2.webp", "/assets/new-fighters/ogalla-artichoke-attack-v2.webp"],
  xuso: [...rig("xuso", "v21849"), ...["idle", "walk", "guard"].map((pose) => `/assets/new-fighters/xuso-${pose}-v2.png`), "/assets/new-fighters/dog.svg", "/assets/new-fighters/xuso-dog-attack-v2.webp"],
  bomba: [...["idle", "walk", "guard"].map((pose) => `/assets/new-fighters/bomba-${pose}-v2.png`), "/assets/new-fighters/hoe.svg", "/assets/new-fighters/bomba-hoe-attack-v2.webp"],
  rafeta: [
    ...["idle", "walk-a", "walk-b", "walk-c", "guard", "jump", "land", "crouch", "crouch-attack", "punch", "kick", "flag-sweep"].map((pose) => `/assets/new-fighters/rafeta-frames/${pose}.png`),
    "/assets/new-fighters/rafeta-flag.svg", "/assets/new-fighters/masia-logo.webp",
  ],
  tonimassama: [
    ...rig("tonimassama", "v21849"),
    "/assets/new-fighters/tonimassama-crouch-v21849.webp",
    "/assets/new-fighters/tonimassama-bullet.svg", "/assets/new-fighters/tonimassama-peineta.svg",
  ],
  nova: [
    "/assets/new-fighters/nova-frame-0.webp", "/assets/new-fighters/nova-frame-1.webp",
    "/assets/new-fighters/nova-frame-2.webp", "/assets/new-fighters/nova-frame-3.webp",
  ],
} as const;
