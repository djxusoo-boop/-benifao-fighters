"use client";

import { useEffect, useRef } from "react";

type PrisonSlugModeProps = { fighter: string; onExit: () => void };

export default function PrisonSlugMode({ fighter, onExit }: PrisonSlugModeProps) {
  const src = `/prison-slug/index.html?fighter=${encodeURIComponent(fighter)}`;
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  // The game's "back to menu" buttons ask to return to the main lobby.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string } | null)?.type === "hardcore-fighters-exit") onExitRef.current();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <section className="prison-slug-mode" aria-label="Modo Prison Slug">
      <button className="prison-slug-exit" type="button" onClick={onExit}>← VOLVER A HARDCORE FIGHTERS</button>
      <iframe title="Prison Slug" src={src} allow="autoplay; fullscreen" />
    </section>
  );
}
