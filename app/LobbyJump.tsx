"use client";

import { useEffect, useState } from "react";

// On phones the lobby is taller than the screen: a floating button jumps
// between the fighters and the game modes.
export default function LobbyJump() {
  const [atModes, setAtModes] = useState(false);

  useEffect(() => {
    const modes = document.querySelector(".lobby-games");
    if (!modes || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setAtModes(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(modes);
    return () => observer.disconnect();
  }, []);

  const jump = () => {
    const target = document.querySelector(atModes ? ".lobby-roster" : ".lobby-games");
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <button type="button" className="lobby-jump-modes" onClick={jump} aria-label={atModes ? "Volver a los personajes" : "Ir a los modos de juego"}>
      {atModes ? "↑ PERSONAJES" : "MODOS DE JUEGO ↓"}
    </button>
  );
}
