"use client";

import { useRef, useState } from "react";

export type LobbyDesign = {
  brandName: string;
  brandKicker: string;
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
  logoScale: number;
  cardGap: number;
  cardRadius: number;
  modeGap: number;
  backgroundImage: string;
  backgroundDim: number;
  fighterNames: Record<string, string>;
  fighterTitles: Record<string, string>;
  portraitUrls: Record<string, string>;
  modeNames: Record<string, string>;
  modeSubtitles: Record<string, string>;
  labels: Record<string, string>;
  styleOverrides?: Record<string, boolean>;
  placements?: Record<string, { x: number; y: number; size: number; width: number }>;
  textStyles?: Record<string, { color?: string; background?: string; opacity?: number; fontSize?: number; letterSpacing?: number; align?: "left" | "center" | "right"; hidden?: boolean }>;
  fighterOrder?: string[];
  modeOrder?: string[];
};

export const DEFAULT_LOBBY_DESIGN: LobbyDesign = {
  brandName: "HARDCORE FIGHTERS",
  brandKicker: "ARCADE DE LA RIBERA",
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
  logoScale: 100,
  cardGap: 10,
  cardRadius: 10,
  modeGap: 10,
  backgroundImage: "",
  backgroundDim: 78,
  fighterNames: {},
  fighterTitles: {},
  portraitUrls: {},
  modeNames: {},
  modeSubtitles: {},
  labels: {},
  textStyles: {},
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
  const [section, setSection] = useState<"general" | "look" | "fighters" | "modes">("general");
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
        onChange({ ...DEFAULT_LOBBY_DESIGN, ...parsed, fighterNames: parsed.fighterNames ?? {}, fighterTitles: parsed.fighterTitles ?? {}, portraitUrls: parsed.portraitUrls ?? {}, modeNames: parsed.modeNames ?? {}, modeSubtitles: parsed.modeSubtitles ?? {}, labels: parsed.labels ?? {} });
      } catch { window.alert("Ese archivo no es una configuración válida del menú."); }
    };
    reader.readAsText(file);
  };
  return <div className="lobby-editor-backdrop" role="dialog" aria-modal="true" aria-label="Editor visual del menú">
    <section className="lobby-editor-panel">
      <header><div><small>EDITOR VISUAL</small><h2>PERSONALIZA EL MENÚ</h2><p>Todo se ve al momento. Se guarda solo en este dispositivo.</p></div><button type="button" onClick={onClose}>✕ CERRAR</button></header>
      <nav className="lobby-editor-tabs" aria-label="Secciones del editor">
        {[["general", "TÍTULOS"], ["look", "ESTILO"], ["fighters", "Luchadores"], ["modes", "MODOS"]].map(([id, label]) => <button key={id} type="button" className={section === id ? "active" : ""} onClick={() => setSection(id as typeof section)}>{label}</button>)}
      </nav>
      <div className="lobby-editor-grid">
        {section === "general" && <fieldset><legend>TÍTULOS</legend>
          <label>Marca del juego<input value={value.brandName} onChange={e => onChange(set(value, "brandName", e.target.value))} /></label>
          <label>Frase sobre la marca<input value={value.brandKicker} onChange={e => onChange(set(value, "brandKicker", e.target.value))} /></label>
          <label>Título principal<input value={value.heading} onChange={e => onChange(set(value, "heading", e.target.value))} /></label>
          <label>Texto pequeño<input value={value.eyebrow} onChange={e => onChange(set(value, "eyebrow", e.target.value))} /></label>
          <label>Título de modos<input value={value.modesHeading} onChange={e => onChange(set(value, "modesHeading", e.target.value))} /></label>
          <label>Subtítulo de modos<input value={value.modesSubtitle} onChange={e => onChange(set(value, "modesSubtitle", e.target.value))} /></label>
        </fieldset>}
        {section === "look" && <fieldset><legend>COLORES Y TAMAÑO</legend>
          <label>Color principal<input type="color" value={value.accent} onChange={e => onChange(set(value, "accent", e.target.value))} /></label>
          <label>Fondo de panel<input type="color" value={value.panel} onChange={e => onChange(set(value, "panel", e.target.value))} /></label>
          <label>Color de letras<input type="color" value={value.ink} onChange={e => onChange(set(value, "ink", e.target.value))} /></label>
          <label>Escala del menú <output>{value.scale}%</output><input type="range" min="80" max="130" value={value.scale} onChange={e => onChange(set(value, "scale", Number(e.target.value)))} /></label>
          <label>Alto de tarjetas <output>{value.cardHeight}px</output><input type="range" min="135" max="330" value={value.cardHeight} onChange={e => onChange(set(value, "cardHeight", Number(e.target.value)))} /></label>
          <label>Columnas <output>{value.columns}</output><input type="range" min="2" max="5" value={value.columns} onChange={e => onChange(set(value, "columns", Number(e.target.value)))} /></label>
          <label>Tamaño de nombres <output>{value.nameSize}%</output><input type="range" min="70" max="150" value={value.nameSize} onChange={e => onChange(set(value, "nameSize", Number(e.target.value)))} /></label>
          <label>Tamaño del logo PRISON <output>{value.logoScale}%</output><input type="range" min="55" max="180" value={value.logoScale} onChange={e => onChange(set(value, "logoScale", Number(e.target.value)))} /></label>
          <label>Separación entre tarjetas <output>{value.cardGap}px</output><input type="range" min="0" max="28" value={value.cardGap} onChange={e => onChange(set(value, "cardGap", Number(e.target.value)))} /></label>
          <label>Foto de fondo (URL opcional)<input placeholder="https://..." value={value.backgroundImage} onChange={e => onChange(set(value, "backgroundImage", e.target.value))} /></label>
          <label>Oscuridad del fondo <output>{value.backgroundDim}%</output><input type="range" min="20" max="100" value={value.backgroundDim} onChange={e => onChange(set(value, "backgroundDim", Number(e.target.value)))} /></label>
        </fieldset>}
        {section === "fighters" && <fieldset><legend>Luchadores</legend><p className="editor-hint">Cambia nombre, frase e imagen de cada tarjeta. Para borrar una foto personalizada, deja su URL vacía.</p><div className="lobby-editor-list">{fighters.map(fighter => <div key={fighter.id}><b>{fighter.name}</b><input aria-label={`Nombre de ${fighter.name}`} value={value.fighterNames[fighter.id] ?? fighter.name} onChange={e => onChange({ ...value, fighterNames: { ...value.fighterNames, [fighter.id]: e.target.value } })} /><input aria-label={`Título de ${fighter.name}`} value={value.fighterTitles[fighter.id] ?? fighter.title} onChange={e => onChange({ ...value, fighterTitles: { ...value.fighterTitles, [fighter.id]: e.target.value } })} /><input aria-label={`Foto de ${fighter.name}`} placeholder="URL de foto" value={value.portraitUrls[fighter.id] ?? ""} onChange={e => onChange({ ...value, portraitUrls: { ...value.portraitUrls, [fighter.id]: e.target.value } })} /></div>)}</div></fieldset>}
        {section === "modes" && <fieldset><legend>MODOS Y AJUSTES</legend><p className="editor-hint">Cada fila cambia el nombre grande y la frase pequeña del botón.</p><div className="lobby-editor-list">{modes.map(mode => <div key={mode.id}><b>{mode.name}</b><input aria-label={`Nombre de ${mode.name}`} value={value.modeNames[mode.id] ?? mode.name} onChange={e => onChange({ ...value, modeNames: { ...value.modeNames, [mode.id]: e.target.value } })} /><input aria-label={`Subtítulo de ${mode.name}`} placeholder="Subtítulo" value={value.modeSubtitles[mode.id] ?? ""} onChange={e => onChange({ ...value, modeSubtitles: { ...value.modeSubtitles, [mode.id]: e.target.value } })} /></div>)}<label>Configuración de partida<input value={value.labels.settings ?? "CONFIGURACIÓN DE PARTIDA"} onChange={e => onChange({ ...value, labels: { ...value.labels, settings: e.target.value } })} /></label><label>Subtítulo configuración<input value={value.labels.settingsSub ?? "AJUSTA TU COMBATE"} onChange={e => onChange({ ...value, labels: { ...value.labels, settingsSub: e.target.value } })} /></label></div></fieldset>}
      </div>
      <footer><button type="button" onClick={exportDesign}>DESCARGAR COPIA</button><button type="button" onClick={() => importRef.current?.click()}>CARGAR COPIA</button><input ref={importRef} hidden type="file" accept="application/json" onChange={e => importDesign(e.target.files?.[0])} /><button type="button" className="danger" onClick={onReset}>RESTABLECER DISEÑO</button></footer>
    </section>
  </div>;
}
