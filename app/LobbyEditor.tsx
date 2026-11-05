"use client";

import { useRef } from "react";

export type LobbyDesign = {
  heading: string;
  eyebrow: string;
  modesHeading: string;
  modesSubtitle: string;
  accent: string;
  panel: string;
  ink: string;
  scale: number;
  cardHeight: number;
  columns: number;
  nameSize: number;
  fighterNames: Record<string, string>;
  fighterTitles: Record<string, string>;
  modeNames: Record<string, string>;
};

export const DEFAULT_LOBBY_DESIGN: LobbyDesign = {
  heading: "ELIGE TU LUCHADOR",
  eyebrow: "LUCHADORES DISPONIBLES",
  modesHeading: "MODOS DE JUEGO",
  modesSubtitle: "ELIGE CÓMO QUIERES JUGAR",
  accent: "#ff9a34",
  panel: "#0c1520",
  ink: "#f5f2e9",
  scale: 100,
  cardHeight: 214,
  columns: 3,
  nameSize: 100,
  fighterNames: {},
  fighterTitles: {},
  modeNames: {},
};

type Props = {
  value: LobbyDesign;
  onChange: (value: LobbyDesign) => void;
  onClose: () => void;
  onReset: () => void;
  fighters: { id: string; name: string; title: string }[];
  modes: { id: string; name: string }[];
};

const set = <K extends keyof LobbyDesign>(value: LobbyDesign, key: K, next: LobbyDesign[K]) => ({ ...value, [key]: next });

export default function LobbyEditor({ value, onChange, onClose, onReset, fighters, modes }: Props) {
  const importRef = useRef<HTMLInputElement>(null);
  const exportDesign = () => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hardcore-fighters-menu.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const importDesign = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onChange({ ...DEFAULT_LOBBY_DESIGN, ...parsed, fighterNames: parsed.fighterNames ?? {}, fighterTitles: parsed.fighterTitles ?? {}, modeNames: parsed.modeNames ?? {} });
      } catch { window.alert("Ese archivo no es una configuración válida del menú."); }
    };
    reader.readAsText(file);
  };
  return <div className="lobby-editor-backdrop" role="dialog" aria-modal="true" aria-label="Editor visual del menú">
    <section className="lobby-editor-panel">
      <header><div><small>EDITOR VISUAL</small><h2>PERSONALIZA EL MENÚ</h2><p>Todo se ve al momento. Se guarda solo en este dispositivo.</p></div><button type="button" onClick={onClose}>✕ CERRAR</button></header>
      <div className="lobby-editor-grid">
        <fieldset><legend>TÍTULOS</legend>
          <label>Título principal<input value={value.heading} onChange={e => onChange(set(value, "heading", e.target.value))} /></label>
          <label>Texto pequeño<input value={value.eyebrow} onChange={e => onChange(set(value, "eyebrow", e.target.value))} /></label>
          <label>Título de modos<input value={value.modesHeading} onChange={e => onChange(set(value, "modesHeading", e.target.value))} /></label>
          <label>Subtítulo de modos<input value={value.modesSubtitle} onChange={e => onChange(set(value, "modesSubtitle", e.target.value))} /></label>
        </fieldset>
        <fieldset><legend>COLORES Y TAMAÑO</legend>
          <label>Color principal<input type="color" value={value.accent} onChange={e => onChange(set(value, "accent", e.target.value))} /></label>
          <label>Fondo de panel<input type="color" value={value.panel} onChange={e => onChange(set(value, "panel", e.target.value))} /></label>
          <label>Color de letras<input type="color" value={value.ink} onChange={e => onChange(set(value, "ink", e.target.value))} /></label>
          <label>Escala del menú <output>{value.scale}%</output><input type="range" min="80" max="130" value={value.scale} onChange={e => onChange(set(value, "scale", Number(e.target.value)))} /></label>
          <label>Alto de tarjetas <output>{value.cardHeight}px</output><input type="range" min="135" max="330" value={value.cardHeight} onChange={e => onChange(set(value, "cardHeight", Number(e.target.value)))} /></label>
          <label>Columnas <output>{value.columns}</output><input type="range" min="2" max="5" value={value.columns} onChange={e => onChange(set(value, "columns", Number(e.target.value)))} /></label>
          <label>Tamaño de nombres <output>{value.nameSize}%</output><input type="range" min="70" max="150" value={value.nameSize} onChange={e => onChange(set(value, "nameSize", Number(e.target.value)))} /></label>
        </fieldset>
        <fieldset><legend>Luchadores</legend><div className="lobby-editor-list">{fighters.map(fighter => <div key={fighter.id}><b>{fighter.name}</b><input aria-label={`Nombre de ${fighter.name}`} value={value.fighterNames[fighter.id] ?? fighter.name} onChange={e => onChange({ ...value, fighterNames: { ...value.fighterNames, [fighter.id]: e.target.value } })} /><input aria-label={`Título de ${fighter.name}`} value={value.fighterTitles[fighter.id] ?? fighter.title} onChange={e => onChange({ ...value, fighterTitles: { ...value.fighterTitles, [fighter.id]: e.target.value } })} /></div>)}</div></fieldset>
        <fieldset><legend>MODOS</legend><div className="lobby-editor-list">{modes.map(mode => <label key={mode.id}>{mode.name}<input value={value.modeNames[mode.id] ?? mode.name} onChange={e => onChange({ ...value, modeNames: { ...value.modeNames, [mode.id]: e.target.value } })} /></label>)}</div></fieldset>
      </div>
      <footer><button type="button" onClick={exportDesign}>DESCARGAR COPIA</button><button type="button" onClick={() => importRef.current?.click()}>CARGAR COPIA</button><input ref={importRef} hidden type="file" accept="application/json" onChange={e => importDesign(e.target.files?.[0])} /><button type="button" className="danger" onClick={onReset}>RESTABLECER DISEÑO</button></footer>
    </section>
  </div>;
}
