// Source sheets have different grids; these indices refer to the individual
// 400 × 360 cuts rather than to a shared, assumed sheet layout.
export const NEW_FIGHTER_POSES = {
  "mad-dog": {
    idle: ["combat-01"], walk: ["move-04", "move-05", "move-06", "move-07"],
    crouch: ["move-10"], jump: ["move-12", "move-13", "move-14"], land: ["move-15"],
    block: ["combat-13"], punch: ["combat-01", "combat-02", "combat-03"],
    strong: ["combat-04", "combat-05", "combat-06"], kick: ["combat-07", "combat-08", "combat-09"],
    hit: ["combat-15", "combat-16"], down: ["combat-17"], getup: ["combat-18", "combat-19"], victory: ["combat-20"],
  },
  angerfist: {
    idle: ["combat-01", "combat-02"], walk: ["move-04", "move-05", "move-06", "move-07"],
    crouch: ["move-10"], jump: ["move-12", "move-13", "move-14"], land: ["move-15"],
    block: ["combat-02"], punch: ["combat-03", "combat-04", "combat-05"],
    strong: ["combat-06", "combat-07", "combat-08"], kick: ["combat-09", "combat-10", "combat-11"],
    hit: ["combat-12", "combat-13"], down: ["combat-14"], getup: ["combat-15"], victory: ["combat-16"],
  },
  dalmau: {
    idle: ["move-01", "move-02"], walk: ["move-05", "move-06", "move-07", "move-08"],
    crouch: ["move-16"], jump: ["move-11", "move-12", "move-13"], land: ["move-14"],
    block: ["combat-01"], punch: ["combat-03", "combat-04", "combat-05"],
    strong: ["combat-06", "combat-07", "combat-08"], kick: ["combat-09", "combat-10", "combat-11"],
    hit: ["combat-12", "combat-13"], down: ["combat-14"], getup: ["combat-15", "combat-16"], victory: ["combat-01"],
  },
} as const;

export type NewFighterId = keyof typeof NEW_FIGHTER_POSES;
export const newFighterFrame = (fighter: NewFighterId, frame: string) => `/assets/new-fighters/${fighter === "mad-dog" ? "mad-dog-cap-v1" : `${fighter}-draft`}/${frame}.png`;
