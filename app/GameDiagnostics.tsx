"use client";

import { useEffect, useState } from "react";

type Check = { label: string; status: "ok" | "warning" | "error"; detail: string };
const ERROR_KEY = "hardcore-diagnostics-last-error-v1";
const ASSETS = [
  ["Logo del menú", "/assets/new-fighters/prison-logo-clean.webp"],
  ["Patada de Vanessa", "/assets/actions-normalized-v1/vanessa/vanessa-motion-09-kick-contact-v1.webp"],
  ["Patada de El Bomba", "/assets/new-fighters/bomba-kick-strip-v21857.png"],
] as const;

async function checkAsset(label: string, path: string): Promise<Check> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(path, { method: "HEAD", cache: "no-store", signal: controller.signal });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && (!contentType || contentType.startsWith("image/"))
      ? { label, status: "ok", detail: "Disponible" }
      : { label, status: "error", detail: response.ok ? "La respuesta no es una imagen" : `No se pudo cargar (${response.status})` };
  } catch { return { label, status: "warning", detail: "No se pudo comprobar ahora" }; }
  finally { window.clearTimeout(timer); }
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [{ label: "Conexión", status: navigator.onLine ? "ok" : "warning", detail: navigator.onLine ? "El dispositivo indica que está conectado" : "El dispositivo indica que está sin conexión" }];
  const key = `hardcore-diagnostic-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    window.localStorage.setItem(key, "ok");
    const works = window.localStorage.getItem(key) === "ok";
    window.localStorage.removeItem(key);
    checks.push({ label: "Guardado en este dispositivo", status: works ? "ok" : "warning", detail: works ? "Disponible" : "No se ha podido verificar" });
  } catch { checks.push({ label: "Guardado en este dispositivo", status: "warning", detail: "El navegador no permite guardar ajustes" }); }
  try {
    const savedError = window.localStorage.getItem(ERROR_KEY) || window.localStorage.getItem("hardcore-last-error");
    checks.push({ label: "Último error registrado", status: savedError ? "warning" : "ok", detail: savedError ? savedError.split("\n")[0].slice(0, 220) : "No hay errores de JavaScript registrados" });
  } catch { checks.push({ label: "Último error registrado", status: "warning", detail: "No se puede leer el registro local" }); }
  checks.push(...await Promise.all(ASSETS.map(([label, path]) => checkAsset(label, path))));
  return checks;
}

export default function GameDiagnostics({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const remember = (message: string) => {
      try { window.localStorage.setItem(ERROR_KEY, `${new Date().toLocaleString("es-ES")} · ${message.slice(0, 180)}`); }
      catch { /* Diagnostics must never stop the game. */ }
    };
    const error = (event: ErrorEvent) => { if (event.message) remember(event.message); };
    const rejection = (event: PromiseRejectionEvent) => { if (event.reason) remember(String(event.reason)); };
    window.addEventListener("error", error);
    window.addEventListener("unhandledrejection", rejection);
    return () => { window.removeEventListener("error", error); window.removeEventListener("unhandledrejection", rejection); };
  }, []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void runChecks().then(result => { if (!cancelled) setChecks(result); });
    return () => { cancelled = true; };
  }, [open, run]);
  if (!open) return null;
  return <div className="diagnostics-overlay" role="dialog" aria-modal="true" aria-label="Diagnóstico del juego">
    <section className="diagnostics-panel">
      <header><div><small>COMPROBACIÓN BÁSICA</small><h2>DIAGNÓSTICO</h2></div><button type="button" onClick={onClose}>Cerrar</button></header>
      <p>Revisa la conexión, el guardado y algunas imágenes importantes.</p>
      {!checks ? <p role="status">Comprobando…</p> : <ul>{checks.map(check => <li key={check.label}><span aria-hidden="true">{check.status === "ok" ? "✓" : check.status === "warning" ? "!" : "✕"}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></li>)}</ul>}
      <p className="diagnostics-note">Un cierre completo de Safari puede no quedar registrado. Esta comprobación no sustituye a una prueba jugando.</p>
      <button type="button" onClick={() => { setChecks(null); setRun(current => current + 1); }}>Comprobar de nuevo</button>
    </section>
  </div>;
}
