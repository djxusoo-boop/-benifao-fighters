"use client";

import { rankScores } from "./leaderboard-policy.mjs";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type LeaderboardMode = "fight" | "orbs" | "adventure" | "coop" | "tournament" | "arcade" | "slug";
type Entry = { position?: number; id: number; playerName: string; score: number; fighter: string; createdAt: string };
type StoredEntry = Entry & { mode: LeaderboardMode };

const LABELS: Record<LeaderboardMode, string> = {
  fight: "LUCHA", orbs: "ROMPEOBJETOS", adventure: "AVENTURA", coop: "COOPERATIVO", tournament: "TORNEO", arcade: "ARCADE", slug: "PRISON SLUG",
};

const GAMEPAD_KEYS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "ESPACIO", "BORRAR", "GUARDAR"] as const;
const KEYBOARD_COLUMNS = 8;
const LOCAL_RANKING_KEY = "hardcore-fighters-local-ranking-v1";

const sortScores = <T extends Entry>(scores: T[]) =>
  rankScores(scores) as (T & { position: number })[];

const readLocalScores = (mode: LeaderboardMode): Entry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_RANKING_KEY) ?? "[]");
    const parsed: StoredEntry[] = Array.isArray(raw) ? raw : [];
    return sortScores(parsed.filter((entry) => entry.mode === mode));
  } catch { return []; }
};

const saveLocalScore = (mode: LeaderboardMode, score: number, fighter: string | undefined, playerName: string) => {
  if (typeof window === "undefined") return readLocalScores(mode);
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_RANKING_KEY) ?? "[]");
    const parsed: StoredEntry[] = Array.isArray(raw) ? raw : [];
    const nextEntry: StoredEntry = {
      id: Date.now(),
      mode,
      playerName,
      score,
      fighter: fighter ?? "maletilla",
      createdAt: new Date().toISOString(),
    };
    const next = [...parsed.filter((entry) => entry.mode !== mode), ...sortScores([...parsed.filter((entry) => entry.mode === mode), nextEntry])];
    window.localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(next));
    return next.filter((entry) => entry.mode === mode);
  } catch { return readLocalScores(mode); }
};

export default function Leaderboard({ initialMode = "fight", score, fighter, onClose }: {
  initialMode?: LeaderboardMode;
  score?: number | null;
  fighter?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<LeaderboardMode>(initialMode);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return window.localStorage.getItem("benifaio-player-name") ?? ""; }
    catch { return ""; }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(score == null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyIndex, setKeyIndex] = useState(0);
  const loadSequence = useRef(0);
  const submissionRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = async (nextMode: LeaderboardMode) => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/leaderboard?mode=${nextMode}`, { cache: "no-store" });
      const data = await response.json() as { scores?: Entry[]; error?: string; offline?: boolean };
      if (sequence !== loadSequence.current) return;
      if (!response.ok) throw new Error(data.error);
      setEntries(data.offline ? readLocalScores(nextMode) : (data.scores ?? []));
      if (data.offline) setNotice("Ranking online no disponible. Mostrando puntuaciones de este dispositivo.");
    } catch {
      if (sequence !== loadSequence.current) return;
      setEntries(readLocalScores(nextMode));
      setNotice("Ranking online no disponible. Mostrando puntuaciones de este dispositivo.");
    }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void load(initialMode); }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [initialMode]);

  useEffect(() => {
    if (score == null || saved) return;
    const onGamepad = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action;
      if (action === "left") setKeyIndex((value) => (value - 1 + GAMEPAD_KEYS.length) % GAMEPAD_KEYS.length);
      if (action === "right") setKeyIndex((value) => (value + 1) % GAMEPAD_KEYS.length);
      if (action === "up") setKeyIndex((value) => (value - KEYBOARD_COLUMNS + GAMEPAD_KEYS.length) % GAMEPAD_KEYS.length);
      if (action === "down") setKeyIndex((value) => (value + KEYBOARD_COLUMNS) % GAMEPAD_KEYS.length);
      if (action === "back") setName((value) => value.slice(0, -1));
      if (action === "accept") {
        const key = GAMEPAD_KEYS[keyIndex];
        if (key === "BORRAR") setName((value) => value.slice(0, -1));
        else if (key === "ESPACIO") setName((value) => value.length < 30 ? `${value} ` : value);
        else if (key === "GUARDAR") formRef.current?.requestSubmit();
        else setName((value) => value.length < 30 ? value + key : value);
      }
    };
    window.addEventListener("leaderboard:gamepad", onGamepad);
    return () => window.removeEventListener("leaderboard:gamepad", onGamepad);
  }, [keyIndex, saved, score]);

  const changeMode = (nextMode: LeaderboardMode) => { setMode(nextMode); void load(nextMode); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (score == null || saving) return;
    if (name.trim().length < 2 || name.trim().length > 30) { setError("Escribe un nombre de 2 a 30 caracteres"); return; }
    submissionRef.current ??= crypto.randomUUID();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerName: name, mode: initialMode, score, fighter, submissionId: submissionRef.current }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok && response.status < 500) { setError(data.error || "Revisa el nombre y la puntuación"); return; }
      if (!response.ok) throw new Error(data.error);
      try { window.localStorage.setItem("benifaio-player-name", name.trim()); } catch { /* optional */ }
      setSaved(true); setMode(initialMode); await load(initialMode);
    } catch {
      const cleanName = name.trim().replace(/\s+/g, " ");
      try {
        const pending = JSON.parse(localStorage.getItem("hf-ranking-outbox") || "[]");
        const item = { playerName: cleanName, mode: initialMode, score, fighter, submissionId: submissionRef.current };
        localStorage.setItem("hf-ranking-outbox", JSON.stringify([...pending.filter((row: { submissionId: string }) => row.submissionId !== item.submissionId), item]));
      } catch { /* Local saving is best effort. */ }
      setEntries(saveLocalScore(initialMode, score, fighter, cleanName));
      try { window.localStorage.setItem("benifaio-player-name", cleanName); } catch { /* optional */ }
      setSaved(true); setMode(initialMode);
      setNotice("Guardado en este dispositivo. Se volverá a enviar al recuperar la conexión.");
    }
    finally { setSaving(false); }
  };

  return <div className="leaderboard-layer" role="dialog" aria-modal="true" aria-label="Ranking mundial">
    <div className="leaderboard-panel">
      <button className="leaderboard-close" type="button" onClick={onClose} aria-label="Cerrar ranking">×</button>
      <span>TOP 100 · MÁXIMO 3 RESULTADOS POR NOMBRE EN EL TOP 20</span><h2>RANKING<br />MUNDIAL</h2>
      {score != null && !saved && <form ref={formRef} className="leaderboard-entry" onSubmit={submit}>
        <strong>{String(score).padStart(6, "0")} PUNTOS · {LABELS[initialMode]}</strong>
        <label>ESCRIBE TU NOMBRE COMPLETO
          <input required value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={30} autoComplete="name" placeholder="Nombre del jugador" />
        </label>
        <div className="leaderboard-gamepad-keyboard" aria-label="Teclado para mando">
          <small>MANDO: CRUCETA MUEVE · A/✕ ESCRIBE · B/○ BORRA</small>
          <div>{GAMEPAD_KEYS.map((key, index) => <button type="button" key={key} className={keyIndex === index ? "active" : ""} onClick={() => { setKeyIndex(index); if (key === "BORRAR") setName((value) => value.slice(0, -1)); else if (key === "ESPACIO") setName((value) => value.length < 30 ? `${value} ` : value); else if (key === "GUARDAR") formRef.current?.requestSubmit(); else setName((value) => value.length < 30 ? value + key : value); }}>{key}</button>)}</div>
        </div>
        <button className="fight-button" type="submit" disabled={saving || name.trim().length < 2}>{saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}</button>
      </form>}
      <div className="leaderboard-tabs" aria-label="Modo del ranking">
        {(Object.keys(LABELS) as LeaderboardMode[]).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => changeMode(item)}>{LABELS[item]}</button>)}
      </div>
      {error && <p className="leaderboard-error">{error}</p>}
      {notice && <p className="leaderboard-notice">{notice}</p>}
      <ol className="leaderboard-list">
        {loading ? <li className="empty">CARGANDO CLASIFICACIÓN…</li> : entries.length ? entries.map((entry, index) => <li key={entry.id}><b>{entry.position ?? index + 1}</b><span>{entry.playerName}<small>{entry.fighter === "vanessa" ? "VANESSA" : entry.fighter === "josevictor" ? "JOSEVICTOR" : entry.fighter === "cristian" ? "CRISTIAN" : entry.fighter === "cesaret" ? "CESARET" : entry.fighter === "borja" ? "BORJA" : entry.fighter === "bacora" ? "BACORA" : entry.fighter === "bonviure" ? "BONVIURE" : entry.fighter === "elchica" ? "EL CHICA" : entry.fighter === "ogalla" ? "OGALLA" : entry.fighter === "xuso" ? "XUSO" : entry.fighter === "bomba" ? "EL BOMBA" : entry.fighter === "tonimassama" ? "TONI MASSAMA" : entry.fighter === "nova" ? "YOYE" : entry.fighter === "estefy" ? "ESTEFY" : "MALETILLA"}</small></span><strong>{String(entry.score).padStart(6, "0")}</strong></li>) : <li className="empty">SÉ EL PRIMERO EN ESTE MODO</li>}
      </ol>
    </div>
  </div>;
}
