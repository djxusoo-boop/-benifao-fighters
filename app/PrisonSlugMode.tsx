"use client";

type PrisonSlugModeProps = { fighter: string; onExit: () => void };

export default function PrisonSlugMode({ fighter, onExit }: PrisonSlugModeProps) {
  const src = `/prison-slug/index.html?fighter=${encodeURIComponent(fighter)}`;
  return (
    <section className="prison-slug-mode" aria-label="Modo Prison Slug">
      <button className="prison-slug-exit" type="button" onClick={onExit}>← VOLVER A HARDCORE FIGHTERS</button>
      <iframe title="Prison Slug" src={src} allow="autoplay; fullscreen" />
    </section>
  );
}
