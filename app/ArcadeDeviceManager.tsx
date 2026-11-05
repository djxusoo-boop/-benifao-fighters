"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { enterFullscreen, exitFullscreen, isFullscreen, setOptOut } from "./fullscreen";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type WakeLockHandle = { release: () => Promise<void>; released?: boolean };

const BUILD_VERSION = "V2.34.5";
const BUILD_STORAGE_KEY = "hardcore-fighters-current-build";
const BUILD_RELOAD_KEY = "hardcore-fighters-build-reload";

const CORE_ASSETS = [
  "/assets/signature-v271/maletilla-00.webp",
  "/assets/signature-v271/vanessa-00.webp",
  "/assets/josevictor/idle.webp",
  "/assets/cristian/idle.webp",
  "/assets/new-fighters/borja-idle.webp",
  "/assets/new-fighters/bacora-idle.webp",
  "/assets/new-fighters/bonviure-idle.webp",
  "/assets/new-fighters/elchica-atlas.webp",
  "/assets/new-fighters/ogalla-atlas.webp",
  "/prison-slug/assets/duo-dog.webp",
  "/prison-slug/assets/hoe-hero.webp",
  "/prison-slug/assets/white-hero.webp",
] as const;


const safeStoredProjector = (): boolean | null => {
  try {
    const value = window.localStorage.getItem("hardcore-projector");
    return value === null ? null : value === "1";
  } catch { return null; }
};

export default function ArcadeDeviceManager() {
  const [projector, setProjector] = useState(false);
  const [displayMode, setDisplayMode] = useState("auto");
  const [fullscreen, setFullscreen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [performanceNotice, setPerformanceNotice] = useState(false);
  const installPromptRef = useRef<InstallPromptEvent | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);

  useEffect(() => {
    try { const saved = localStorage.getItem("hardcore-display-mode"); if (["auto", "mobile", "tablet"].includes(saved || "")) queueMicrotask(() => setDisplayMode(saved!)); } catch { /* Optional preference. */ }
  }, []);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      const mobile = displayMode === "mobile" || displayMode === "auto" && (width <= 680 || Math.min(width, height) <= 600 && matchMedia("(pointer: coarse)").matches);
      document.documentElement.dataset.displayMode = mobile ? "mobile" : "tablet";
      document.documentElement.style.setProperty("--visible-height", `${height}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => { window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); };
  }, [displayMode]);

  const requestWakeLock = useCallback(async () => {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (kind: "screen") => Promise<WakeLockHandle> } }).wakeLock;
    if (!wakeLock || document.visibilityState !== "visible" || wakeLockRef.current && !wakeLockRef.current.released) return;
    try { wakeLockRef.current = await wakeLock.request("screen"); } catch { /* Keeping the screen awake is optional. */ }
  }, []);

  useEffect(() => {
    const isIpad = /iPad/i.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const savedProjector = safeStoredProjector();
    const initialProjector = savedProjector ?? false;
    const initialStateFrame = window.requestAnimationFrame(() => {
      setStandalone(isStandalone);
      setProjector(initialProjector);
      setOnline(navigator.onLine);
    });
    document.documentElement.classList.toggle("arcade-ipad", isIpad);
    document.documentElement.classList.toggle("arcade-ipad-tuned", isIpad);
    document.documentElement.classList.toggle("arcade-performance-lite", isIpad);
    document.documentElement.classList.toggle("arcade-standalone", isStandalone);
    document.documentElement.classList.toggle("arcade-projector", initialProjector);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as InstallPromptEvent;
    };
    const onFullscreen = () => setFullscreen(isFullscreen());
    const onFirstInteraction = () => { void requestWakeLock(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void requestWakeLock(); };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    window.addEventListener("pointerdown", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      const register = () => {
        const hadController = Boolean(navigator.serviceWorker.controller);
        let reloading = false;
        const onControllerChange = () => {
          if (!hadController || reloading) return;
          reloading = true;
          try {
            if (window.sessionStorage.getItem(BUILD_RELOAD_KEY) === BUILD_VERSION) return;
            window.sessionStorage.setItem(BUILD_RELOAD_KEY, BUILD_VERSION);
          } catch { /* Reloading once is still safe when session storage is unavailable. */ }
          // Never reload in the middle of a match: wait until the player is
          // back in the lobby (or the game is in the background).
          const inLobby = () => Boolean(document.querySelector(".arena.phase-select"));
          if (inLobby()) { window.location.reload(); return; }
          const waitForLobby = window.setInterval(() => {
            if (!inLobby()) return;
            window.clearInterval(waitForLobby);
            window.location.reload();
          }, 1500);
        };
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        void (async () => {
          try {
            const storedBuild = window.localStorage.getItem(BUILD_STORAGE_KEY);
            if (storedBuild !== BUILD_VERSION && "caches" in window) {
              const cacheNames = await window.caches.keys();
              await Promise.all(cacheNames.filter((name) => name.startsWith("hardcore-fighters-")).map((name) => window.caches.delete(name)));
            }
            window.localStorage.setItem(BUILD_STORAGE_KEY, BUILD_VERSION);
          } catch { /* Cache cleanup is best effort on restrictive Safari modes. */ }

          const registration = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_VERSION}`, {
            scope: "/",
            updateViaCache: "none",
          });
          const activateWaitingWorker = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          activateWaitingWorker();
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed") activateWaitingWorker();
            });
          });
          await registration.update();
        })()
          .catch(() => undefined);
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.cancelAnimationFrame(initialStateFrame);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.documentElement.classList.remove("arcade-ipad", "arcade-ipad-tuned", "arcade-performance-lite", "arcade-standalone", "arcade-projector");
      void wakeLockRef.current?.release();
    };
  }, [requestWakeLock]);

  useEffect(() => {
    let frame = 0;
    let startTimer = 0;
    let sampleStarted = performance.now();
    let sampledFrames = 0;
    let slowSamples = 0;
    let adaptiveModeAdded = false;

    const samplePerformance = (now: number) => {
      frame = window.requestAnimationFrame(samplePerformance);
      if (document.visibilityState !== "visible") {
        sampleStarted = now;
        sampledFrames = 0;
        slowSamples = 0;
        return;
      }
      sampledFrames += 1;
      const elapsed = now - sampleStarted;
      if (elapsed < 1800) return;
      const fps = sampledFrames * 1000 / elapsed;
      sampleStarted = now;
      sampledFrames = 0;
      slowSamples = fps < 43 ? slowSamples + 1 : Math.max(0, slowSamples - 1);
      if (slowSamples < 2 || document.documentElement.classList.contains("arcade-performance-lite")) return;
      adaptiveModeAdded = true;
      document.documentElement.classList.add("arcade-performance-lite", "arcade-adaptive-lite");
      setPerformanceNotice(true);
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    startTimer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(samplePerformance);
    }, 3500);

    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(frame);
      if (adaptiveModeAdded) document.documentElement.classList.remove("arcade-performance-lite", "arcade-adaptive-lite");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let completed = 0;
    const activeImages = new Set<HTMLImageElement>();
    const loadImage = (source: string) => new Promise<void>((resolve) => {
      const image = new window.Image();
      let settled = false;
      const settleOnce = () => {
        if (settled) return;
        settled = true;
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
        activeImages.delete(image);
        completed += 1;
        if (!cancelled) setPreloadProgress(Math.round(completed / CORE_ASSETS.length * 100));
        resolve();
      };
      const decodeAndSettle = () => {
        if (typeof image.decode !== "function") return settleOnce();
        void image.decode().catch(() => undefined).finally(settleOnce);
      };
      activeImages.add(image);
      image.decoding = "async";
      image.onload = decodeAndSettle;
      image.onerror = settleOnce;
      image.src = source;
      if (image.complete) decodeAndSettle();
    });
    const preload = async () => {
      for (let index = 0; index < CORE_ASSETS.length; index += 4) {
        await Promise.all(CORE_ASSETS.slice(index, index + 4).map(loadImage));
        if (cancelled) return;
      }
      document.documentElement.classList.add("arcade-assets-ready");
      window.dispatchEvent(new CustomEvent("arcade:assets-ready"));
      setShowReady(true);
    };
    void preload();
    return () => {
      cancelled = true;
      activeImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
      });
      activeImages.clear();
    };
  }, []);

  useEffect(() => {
    if (!showReady) return;
    const timer = window.setTimeout(() => setShowReady(false), 1800);
    return () => window.clearTimeout(timer);
  }, [showReady]);

  useEffect(() => {
    if (!performanceNotice) return;
    const timer = window.setTimeout(() => setPerformanceNotice(false), 2400);
    return () => window.clearTimeout(timer);
  }, [performanceNotice]);

  const toggleProjector = () => {
    const next = !projector;
    setProjector(next);
    document.documentElement.classList.toggle("arcade-projector", next);
    try { window.localStorage.setItem("hardcore-projector", next ? "1" : "0"); } catch { /* Local settings are optional. */ }
    void requestWakeLock();
  };

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen()) {
        // The player chose to leave: stop re-entering fullscreen automatically.
        setOptOut(true);
        await exitFullscreen();
      } else {
        setOptOut(false);
        const entered = await enterFullscreen();
        if (!entered) setInstallOpen(true);
      }
      void requestWakeLock();
    } catch { setInstallOpen(true); }
  };

  const install = async () => {
    const prompt = installPromptRef.current;
    if (!prompt) {
      setInstallOpen(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      setStandalone(true);
      installPromptRef.current = null;
    }
  };

  return (
    <>
      <label className="display-mode-control">VISTA
        <select aria-label="Adaptación de pantalla" value={displayMode} onChange={event => {
          setDisplayMode(event.target.value);
          try { localStorage.setItem("hardcore-display-mode", event.target.value); } catch { /* Optional preference. */ }
        }}>
          <option value="auto">AUTOMÁTICA</option><option value="mobile">MÓVIL</option><option value="tablet">TABLET / PC</option>
        </select>
      </label>
      <button className={`sound-button projector-button ${projector ? "active" : ""}`} type="button" onClick={toggleProjector} aria-pressed={projector}>
        {projector ? "PROYECTOR ON" : "PROYECTOR"}
      </button>
      <button className="sound-button fullscreen-button" type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
        {fullscreen ? "SALIR PANTALLA" : "PANTALLA"}
      </button>
      {!standalone && <button className="sound-button install-button" type="button" onClick={install}>INSTALAR</button>}
      {!online && <span className="arcade-offline-badge">SIN INTERNET · JUEGO LOCAL</span>}

      {preloadProgress < 100 && <div className="arcade-preload-status" aria-live="polite"><i style={{ width: `${preloadProgress}%` }} /><span>PREPARANDO JUEGO · {preloadProgress}%</span></div>}
      {showReady && <div className="arcade-ready-toast" role="status">✓ JUEGO PRECARGADO · LISTO PARA JUGAR</div>}
      {performanceNotice && <div className="arcade-performance-toast" role="status">⚡ RENDIMIENTO AJUSTADO · MOVIMIENTOS MÁS FLUIDOS</div>}

      <div className="orientation-advice" role="status">
        <b>GIRA EL DISPOSITIVO</b><span>El juego está preparado para jugar en horizontal.</span>
      </div>

      {installOpen && (
        <div className="device-overlay" role="dialog" aria-modal="true" aria-label="Instalar Hardcore Fighters">
          <div className="device-panel">
            <button className="device-close" type="button" onClick={() => setInstallOpen(false)} aria-label="Cerrar">×</button>
            <span>IPHONE · ANDROID · IPAD</span>
            <h2>INSTALAR<br />EL JUEGO</h2>
            <ol>
              <li>En iPhone o iPad, abre el enlace en <b>Safari</b>. En Android, usa <b>Chrome</b>.</li>
              <li>Pulsa <b>Compartir</b> en Safari o el menú <b>⋮</b> en Chrome.</li>
              <li>Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar aplicación</b>.</li>
              <li>Abre Hardcore Fighters desde su nuevo icono y conecta los dos mandos.</li>
            </ol>
            <p>Así tendrás pantalla completa, orientación horizontal y el juego seguirá funcionando después de haber cargado sus recursos, incluso sin conexión.</p>
            <button className="fight-button" type="button" onClick={() => setInstallOpen(false)}>ENTENDIDO</button>
          </div>
        </div>
      )}
    </>
  );
}
