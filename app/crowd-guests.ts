// Supplied three-pose spectators, shared by rendering and asset preloading.
export const GUEST_ANIMATORS = [
  "guestblack", "guestgray", "guestwhite", "guestneon", "guestdj",
] as const;

export const DOLL_CROWD_ASSETS = [1, 2, 3, 4].map(
  (frame) => `/assets/mobile/crowd-doll-${frame}-v1.webp`,
);

export const GUEST_CROWD_ASSETS = [
  ...DOLL_CROWD_ASSETS,
  ...GUEST_ANIMATORS.flatMap((person) =>
    ["idle", "point", "cheer"].map((pose) => `/assets/mobile/crowd-${person}-${pose}-v1.webp`),
  ),
];

// Advance independently of scenery changes: all five appear in three groups.
export function getGuestPair(rotation: number, modeOffset: number) {
  const start = ((rotation * 2 + modeOffset) % GUEST_ANIMATORS.length + GUEST_ANIMATORS.length) % GUEST_ANIMATORS.length;
  return [GUEST_ANIMATORS[start], GUEST_ANIMATORS[(start + 1) % GUEST_ANIMATORS.length]] as const;
}
