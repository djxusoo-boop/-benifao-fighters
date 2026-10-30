export type LobbyInput = {
  locked: boolean;
  allReady: boolean;
  button: number;
  horizontal: number;
  vertical: number;
};

// Menu buttons are fixed PS4 controls; remapping only affects the fight.
export function lobbyIntent(input: LobbyInput) {
  if (input.button === 1) return { action: "back", direction: 0 };
  if (!input.locked) {
    if (input.button === 0 || input.button === 9) return { action: "confirm", direction: 0 };
    const direction = input.horizontal || input.vertical * 2;
    return { action: direction ? "move" : "none", direction };
  }
  if (input.allReady && (input.button === 0 || input.button === 9)) return { action: "start", direction: 0 };
  const direction = input.horizontal || input.vertical;
  return { action: direction ? "mode" : "none", direction };
}
