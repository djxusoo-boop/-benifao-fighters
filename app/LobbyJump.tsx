"use client";

export default function LobbyJump({ atModes, onChange }: { atModes: boolean; onChange: (showModes: boolean) => void }) {
  return (
    <button type="button" className="lobby-jump-modes" onClick={() => onChange(!atModes)} aria-label={atModes ? "Volver a los personajes" : "Ir a los modos de juego"}>
      {atModes ? "← PERSONAJES" : "ELEGIR MODO →"}
    </button>
  );
}
