export type LobbyInput = {
  locked: boolean;
  allReady: boolean;
  button: number;
  horizontal: number;
  vertical: number;
  /** Columns of the fighter grid, so up/down jumps a whole row. */
  columns?: number;
  /** Columns of the game-mode grid. */
  modeColumns?: number;
};

// Menu buttons are fixed PS4 controls; remapping only affects the fight.
// ✕ (or OPTIONS) picks the fighter and jumps to the modes; ✕ again starts the
// highlighted mode straight away — nobody has to wait for the other pad.
export function lobbyIntent(input: LobbyInput) {
  if (input.button === 1) return { action: "back", direction: 0 };
  if (!input.locked) {
    if (input.button === 0 || input.button === 9) return { action: "confirm", direction: 0 };
    const direction = input.horizontal || input.vertical * Math.max(1, input.columns ?? 2);
    return { action: direction ? "move" : "none", direction };
  }
  if (input.button === 0 || input.button === 9) return { action: "start", direction: 0 };
  const direction = input.horizontal || input.vertical * Math.max(1, input.modeColumns ?? 1);
  return { action: direction ? "mode" : "none", direction };
}
