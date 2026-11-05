"use client";

import { useEffect, useState } from "react";
import { enterFullscreen, fullscreenSupported, isFullscreen, isIphone, isStandaloneApp, optedOut } from "./fullscreen";

// Puts the game in fullscreen on the player's first touch, click or key press
// (browsers only allow it after a gesture) and again on later gestures if the
// browser dropped out of it — unless the player chose "SALIR PANTALLA".
export default function AutoFullscreen() {
  const [iphoneTip, setIphoneTip] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) return;
    if (!fullscreenSupported()) {
      let dismissed = false;
      try { dismissed = window.sessionStorage.getItem("hardcore-iphone-tip") === "1"; } catch { /* optional */ }
      if (isIphone() && !dismissed) {
        const timer = window.setTimeout(() => setIphoneTip(true), 1200);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const onGesture = (event: Event) => {
      if (optedOut() || isFullscreen()) return;
      // Don't hijack typing in the ranking name field.
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, a[href="/editor.html"]')) return;
      void enterFullscreen();
    };
    window.addEventListener("pointerup", onGesture, { capture: true });
    window.addEventListener("keyup", onGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerup", onGesture, { capture: true });
      window.removeEventListener("keyup", onGesture, { capture: true });
    };
  }, []);

  if (!iphoneTip) return null;
  return (
    <div className="iphone-fullscreen-tip" role="dialog" aria-label="Jugar a pantalla completa en iPhone">
      <strong>PANTALLA COMPLETA EN IPHONE</strong>
      <span>Pulsa <b>Compartir</b> <i aria-hidden="true">⬆︎</i> y elige <b>«Añadir a pantalla de inicio»</b>. Abre el juego desde ese icono y se verá a pantalla completa.</span>
      <button type="button" onClick={() => { setIphoneTip(false); try { window.sessionStorage.setItem("hardcore-iphone-tip", "1"); } catch { /* optional */ } }}>ENTENDIDO</button>
    </div>
  );
}
