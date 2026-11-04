"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { lobbyIntent } from "./lobby-input";

type PadAction = "jump" | "attack" | "kick" | "specialOne" | "specialTwo" | "block";
type PadMap = Record<PadAction, number>;
type PadMaps = [PadMap, PadMap];
type PadInfo = { index: number; id: string; mapping: string };
type Wizard = { slot: 0 | 1; step: number } | null;
type DirectionState = { left: boolean; right: boolean; up: boolean; down: boolean };

const ACTIONS: Array<{ id: PadAction; label: string; short: string }> = [
  { id: "jump", label: "SALTO", short: "SALTO" },
  { id: "attack", label: "PUÑO / DISPARO", short: "ATAQUE" },
  { id: "kick", label: "PATADA", short: "PATADA" },
  { id: "specialOne", label: "ESPECIAL 1", short: "ESP. 1" },
  { id: "specialTwo", label: "ESPECIAL 2", short: "ESP. 2" },
  { id: "block", label: "BLOQUEO", short: "BLOQUEO" },
];

const DEFAULT_MAP: PadMap = {
  jump: 0,
  attack: 2,
  kick: 1,
  specialOne: 3,
  specialTwo: 5,
  block: 4,
};

const SLOT_KEYS = [
  { left: "a", right: "d", down: "c", jump: "w", attack: "j", kick: "h", specialOne: "k", specialTwo: "l", block: "s" },
  { left: "arrowleft", right: "arrowright", down: "arrowdown", jump: "arrowup", attack: "1", kick: "2", specialOne: "3", specialTwo: "4", block: "o" },
] as const;

const cloneDefaultMaps = (): PadMaps => [{ ...DEFAULT_MAP }, { ...DEFAULT_MAP }];

const safeStorageGet = (key: string) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};

const safeStorageSet = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch { /* Storage may be blocked in private/embedded Safari. */ }
};

const safeLoadMaps = (): PadMaps => {
  try {
    const value = JSON.parse(safeStorageGet("benifaio-gamepad-maps") || "null") as PadMaps | null;
    if (Array.isArray(value) && value.length === 2) return value;
  } catch { /* Defaults are used for invalid saved values. */ }
  return cloneDefaultMaps();
};

const buttonName = (index: number) => {
  const known: Record<number, string> = { 0: "A / ✕", 1: "B / ○", 2: "X / □", 3: "Y / △", 4: "L1", 5: "R1", 6: "L2", 7: "R2", 8: "SELECT", 9: "START" };
  return known[index] || `BOTÓN ${index + 1}`;
};

const sendKey = (key: string, pressed: boolean) => {
  window.dispatchEvent(new KeyboardEvent(pressed ? "keydown" : "keyup", {
    key,
    code: key,
    bubbles: true,
    cancelable: true,
    repeat: false,
  }));
};

const MENU_SURFACES = [
  ".gamepad-panel",
  ".leaderboard-layer",
  ".arcade-tools-overlay",
  ".phase-select .select-screen",
  ".game-paused .pause-layer",
  ".result-screen",
  ".orb-result",
  ".adventure-map",
  ".platform-result",
  ".coop-result",
  ".campaign-champion",
];

const visibleMenuButtons = () => {
  const root = MENU_SURFACES
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .find((element) => element && element.getClientRects().length > 0);
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"))
    .filter((button) => button.getClientRects().length > 0)
    .filter((button) => !document.documentElement.classList.contains("arcade-dual-gamepad") || !button.closest(".character-cards, .local-fighter-picker, .coop-team-picker"));
};

const moveMenuFocus = (direction: -1 | 1) => {
  const buttons = visibleMenuButtons();
  if (!buttons.length) return false;
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = current < 0
    ? direction > 0 ? 0 : buttons.length - 1
    : (current + direction + buttons.length) % buttons.length;
  buttons[next].focus({ preventScroll: true });
  buttons[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
};

const activateMenuFocus = () => {
  const buttons = visibleMenuButtons();
  if (!buttons.length) return false;
  const focused = buttons.find((button) => button === document.activeElement);
  const target = focused ?? buttons.find((button) => button.dataset.gamepadDefault === "true") ?? buttons[0];
  target.focus({ preventScroll: true });
  target.click();
  return true;
};

// How many columns a lobby grid shows right now (it changes with the screen).
const gridColumns = (root: HTMLElement, selector: string, fallback: number) => {
  try {
    const grid = root.querySelector?.<HTMLElement>(selector);
    if (!grid || typeof getComputedStyle !== "function") return fallback;
    const count = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    return count > 0 ? count : fallback;
  } catch {
    return fallback;
  }
};

export default function GamepadManager() {
  const [open, setOpen] = useState(false);
  const [pads, setPads] = useState<PadInfo[]>([]);
  const [maps, setMaps] = useState<PadMaps>(() => typeof window === "undefined" ? cloneDefaultMaps() : safeLoadMaps());
  const [reversed, setReversed] = useState(() => typeof window !== "undefined" && safeStorageGet("benifaio-gamepad-reversed") === "1");
  const [wizard, setWizard] = useState<Wizard>(null);
  const [message, setMessage] = useState("Conecta el receptor USB y pulsa un botón del mando.");
  const [lastInput, setLastInput] = useState<[string, string]>(["—", "—"]);
  const [disconnectNotice, setDisconnectNotice] = useState(false);
  const openRef = useRef(open);
  const mapsRef = useRef(maps);
  const reversedRef = useRef(reversed);
  const wizardRef = useRef(wizard);
  const heldKeysRef = useRef<[Set<string>, Set<string>]>([new Set(), new Set()]);
  const previousButtonsRef = useRef<Record<number, boolean[]>>({});
  const pulseTimersRef = useRef<Set<number>>(new Set());
  const signatureRef = useRef("");
  const previousPadCountRef = useRef(0);
  const hadTwoPadsRef = useRef(false);
  const previousDirectionsRef = useRef<Record<number, DirectionState>>({});
  const lastUiUpdateRef = useRef(0);
  const lastPollRef = useRef(0);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { mapsRef.current = maps; }, [maps]);
  useEffect(() => { reversedRef.current = reversed; }, [reversed]);
  useEffect(() => { wizardRef.current = wizard; }, [wizard]);

  const releaseSlot = useCallback((slot: 0 | 1) => {
    heldKeysRef.current[slot].forEach((key) => sendKey(key, false));
    heldKeysRef.current[slot].clear();
  }, []);

  const releaseAll = useCallback(() => {
    releaseSlot(0);
    releaseSlot(1);
  }, [releaseSlot]);

  const pulseKey = useCallback((key: string) => {
    sendKey(key, true);
    const timer = window.setTimeout(() => {
      pulseTimersRef.current.delete(timer);
      sendKey(key, false);
    }, 45);
    pulseTimersRef.current.add(timer);
  }, []);

  useEffect(() => {
    const connected = () => setMessage("Mando detectado. Pulsa un botón para activarlo.");
    const disconnected = (event: GamepadEvent) => {
      releaseAll();
      delete previousButtonsRef.current[event.gamepad.index];
      setMessage("Mando desconectado. Vuelve a conectarlo para continuar.");
    };
    const releaseWhenHidden = () => { if (document.hidden) releaseAll(); };
    window.addEventListener("gamepadconnected", connected);
    window.addEventListener("gamepaddisconnected", disconnected);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("gamepadconnected", connected);
      window.removeEventListener("gamepaddisconnected", disconnected);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      document.documentElement.classList.remove("arcade-gamepad-active", "arcade-dual-gamepad");
      document.documentElement.removeAttribute("data-gamepads");
    };
  }, [releaseAll]);

  const updateKey = useCallback((slot: 0 | 1, key: string, pressed: boolean) => {
    const held = heldKeysRef.current[slot];
    if (pressed && !held.has(key)) {
      held.add(key);
      sendKey(key, true);
    } else if (!pressed && held.has(key)) {
      held.delete(key);
      sendKey(key, false);
    }
  }, []);

  const closePanel = useCallback(() => {
    setWizard(null);
    setOpen(false);
    releaseAll();
  }, [releaseAll]);

  const togglePanel = useCallback(() => {
    releaseAll();
    setWizard(null);
    setOpen((value) => !value);
  }, [releaseAll]);

  useEffect(() => {
    const activeHeld = heldKeysRef.current;
    const activePulseTimers = pulseTimersRef.current;
    let frame = 0;

    const refresh = () => {
      const now = performance.now();
      if (!openRef.current && !signatureRef.current && now - lastPollRef.current < 240) {
        frame = window.requestAnimationFrame(refresh);
        return;
      }
      lastPollRef.current = now;
      let available: Gamepad[] = [];
      try {
        available = Array.from(navigator.getGamepads?.() || []).filter((pad): pad is Gamepad => Boolean(pad));
      } catch {
        // Safari can reject Gamepad access until the first controller gesture.
      }
      const signature = available.map((pad) => `${pad.index}:${pad.id}`).join("|");
      if (signature !== signatureRef.current) {
        releaseAll();
        previousDirectionsRef.current = {};
        signatureRef.current = signature;
        const activeIndexes = new Set(available.map((pad) => pad.index));
        Object.keys(previousButtonsRef.current).forEach((index) => {
          if (!activeIndexes.has(Number(index))) delete previousButtonsRef.current[Number(index)];
        });
        setPads(available.map((pad) => ({ index: pad.index, id: pad.id, mapping: pad.mapping })));
        setMessage(available.length ? `${available.length} mando${available.length > 1 ? "s" : ""} conectado${available.length > 1 ? "s" : ""}.` : "Conecta el receptor USB y pulsa un botón del mando.");
        const activeCount = Math.min(available.length, 2);
        document.documentElement.dataset.gamepads = String(activeCount);
        document.documentElement.classList.toggle("arcade-gamepad-active", activeCount >= 1);
        document.documentElement.classList.toggle("arcade-dual-gamepad", activeCount >= 2);
        window.dispatchEvent(new CustomEvent("arcade:gamepads", { detail: { count: activeCount } }));
        if (activeCount >= 2) {
          hadTwoPadsRef.current = true;
          setDisconnectNotice(false);
        } else if (hadTwoPadsRef.current && previousPadCountRef.current >= 2) {
          setDisconnectNotice(true);
        }
        previousPadCountRef.current = activeCount;
        if (!available.length) releaseAll();
      }

      const ordered = reversedRef.current && available.length > 1 ? [available[1], available[0], ...available.slice(2)] : available;
      const liveLabels: [string, string] = ["—", "—"];

      ([0, 1] as const).forEach((slot) => {
        const pad = ordered[slot];
        if (!pad) { releaseSlot(slot); return; }
        const previous = previousButtonsRef.current[pad.index] || pad.buttons.map(() => false);
        const currentButtons = pad.buttons.map((button) => button.pressed || button.value > .55);
        const justPressed = currentButtons.findIndex((pressed, index) => pressed && !previous[index]);
        previousButtonsRef.current[pad.index] = currentButtons;

        const horizontal = Math.abs(pad.axes[0] || 0) > .35 ? pad.axes[0] : 0;
        const vertical = Math.abs(pad.axes[1] || 0) > .42 ? pad.axes[1] : 0;
        const directions: DirectionState = {
          left: horizontal < 0 || Boolean(pad.buttons[14]?.pressed),
          right: horizontal > 0 || Boolean(pad.buttons[15]?.pressed),
          up: vertical < 0 || Boolean(pad.buttons[12]?.pressed),
          down: vertical > 0 || Boolean(pad.buttons[13]?.pressed),
        };
        const previousDirections = previousDirectionsRef.current[pad.index] ?? { left: false, right: false, up: false, down: false };
        const menuBackward = (directions.left && !previousDirections.left) || (directions.up && !previousDirections.up);
        const menuForward = (directions.right && !previousDirections.right) || (directions.down && !previousDirections.down);
        previousDirectionsRef.current[pad.index] = directions;

        const activeWizard = wizardRef.current;
        if (openRef.current) {
          releaseSlot(slot);
          if (activeWizard?.slot === slot && justPressed >= 0) {
            const action = ACTIONS[activeWizard.step];
            const duplicate = Object.entries(mapsRef.current[slot]).find(([id, button]) => id !== action.id && button === justPressed);
            if ([8, 9, 12, 13, 14, 15, 16].includes(justPressed)) {
              setMessage("SHARE, OPTIONS y la cruceta están reservados. Pulsa otro botón.");
            } else {
              const nextMaps: PadMaps = [{ ...mapsRef.current[0] }, { ...mapsRef.current[1] }];
              if (duplicate) nextMaps[slot][duplicate[0] as PadAction] = nextMaps[slot][action.id];
              nextMaps[slot][action.id] = justPressed;
              mapsRef.current = nextMaps;
              setMaps(nextMaps);
              safeStorageSet("benifaio-gamepad-maps", JSON.stringify(nextMaps));
              const nextStep = activeWizard.step + 1;
              if (nextStep >= ACTIONS.length) {
                wizardRef.current = null;
                setWizard(null);
                setMessage(`Mando P${slot + 1} configurado y guardado.`);
              } else {
                const nextWizard = { slot, step: nextStep } as Wizard;
                wizardRef.current = nextWizard;
                setWizard(nextWizard);
                setMessage(`Ahora pulsa el botón para ${ACTIONS[nextStep].label}.`);
              }
            }
          } else if (!activeWizard) {
            if (menuBackward) moveMenuFocus(-1);
            else if (menuForward) moveMenuFocus(1);
            if (justPressed === 0 || justPressed === 9) activateMenuFocus();
            if (justPressed === 8) closePanel();
          }
          return;
        }

        if (slot === 0 && document.querySelector(".leaderboard-gamepad-keyboard")) {
          releaseSlot(slot);
          const dispatch = (action: string) => window.dispatchEvent(new CustomEvent("leaderboard:gamepad", { detail: { action } }));
          if (directions.left && !previousDirections.left) dispatch("left");
          else if (directions.right && !previousDirections.right) dispatch("right");
          else if (directions.up && !previousDirections.up) dispatch("up");
          else if (directions.down && !previousDirections.down) dispatch("down");
          if (justPressed === mapsRef.current[slot].attack || justPressed === 9) dispatch("accept");
          if (justPressed === mapsRef.current[slot].kick) dispatch("back");
          if (justPressed === 8) pulseKey("escape");
          liveLabels[slot] = "TECLADO RANKING";
          return;
        }

        const left = directions.left;
        const right = directions.right;
        const up = directions.up;
        const down = directions.down;
        const keys = SLOT_KEYS[slot];
        const map = mapsRef.current[slot];

        const lobby = document.querySelector<HTMLElement>(".phase-select .select-screen");
        const otherMenu = document.querySelector(".arcade-tools-overlay, .leaderboard-layer, .leaderboard-gamepad-keyboard");
        if (lobby && !otherMenu) {
          releaseSlot(slot);
          if (justPressed === 8) {
            releaseAll(); openRef.current = true; setOpen(true); return;
          }
          const intent = lobbyIntent({
            locked: lobby.dataset[slot === 0 ? "p1Locked" : "p2Locked"] === "true",
            allReady: lobby.dataset.allReady === "true",
            button: justPressed,
            horizontal: directions.left && !previousDirections.left ? -1 : directions.right && !previousDirections.right ? 1 : 0,
            vertical: directions.up && !previousDirections.up ? -1 : directions.down && !previousDirections.down ? 1 : 0,
            columns: gridColumns(lobby, ".character-cards", 2),
            modeColumns: gridColumns(lobby, ".mode-start-actions", 1),
          });
          if (["confirm", "back", "move"].includes(intent.action)) {
            window.dispatchEvent(new CustomEvent("arcade:lobby", { detail: { slot, ...intent } }));
          } else if (intent.action === "mode" || intent.action === "start") {
            const buttons = Array.from(lobby.querySelectorAll<HTMLButtonElement>(".lobby-games button:not(:disabled)"))
              .filter(button => button.getClientRects().length > 0);
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const target = intent.action === "mode"
              ? buttons[current < 0 ? 0 : (current + intent.direction + buttons.length) % buttons.length]
              : buttons[current < 0 ? 0 : current];
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: "center", inline: "nearest" });
            if (intent.action === "start") target?.click();
          }
          liveLabels[slot] = lobby.dataset[slot === 0 ? "p1Locked" : "p2Locked"] === "true" ? "ELIGE MODO · ✕ JUGAR · ○ VOLVER" : "ELIGE PERSONAJE · ✕ LISTO";
          return;
        }

        if (visibleMenuButtons().length) {
          releaseSlot(slot);
          if (slot === 1) return;
          if (menuBackward) moveMenuFocus(-1);
          else if (menuForward) moveMenuFocus(1);
          if (justPressed === 0 || justPressed === 9) activateMenuFocus();
          if (justPressed === 8) pulseKey("escape");
          liveLabels[slot] = menuBackward ? "ANTERIOR" : menuForward ? "SIGUIENTE" : justPressed === map.attack || justPressed === 9 ? "ACEPTAR" : "MENÚ";
          return;
        }

        // One-player modes also listen to arrows, so controller two must not
        // accidentally drive player one in them.
        if (slot === 1 && document.querySelector(".orb-mode, .platform-mode, .campaign-final")) {
          releaseSlot(slot);
          return;
        }

        updateKey(slot, keys.left, left);
        updateKey(slot, keys.right, right);
        updateKey(slot, keys.down, down);
        updateKey(slot, keys.jump, up || Boolean(pad.buttons[map.jump]?.pressed));
        updateKey(slot, keys.attack, Boolean(pad.buttons[map.attack]?.pressed));
        updateKey(slot, keys.kick, Boolean(pad.buttons[map.kick]?.pressed));
        updateKey(slot, keys.specialOne, Boolean(pad.buttons[map.specialOne]?.pressed));
        updateKey(slot, keys.specialTwo, Boolean(pad.buttons[map.specialTwo]?.pressed));
        updateKey(slot, keys.block, Boolean(pad.buttons[map.block]?.pressed));

        if (justPressed === 9) {
          pulseKey(document.querySelector(".phase-fight") ? "p" : "enter");
        }
        if (justPressed === 8) {
          pulseKey("escape");
        }

        const active = ACTIONS.find((action) => pad.buttons[map[action.id]]?.pressed);
        liveLabels[slot] = active?.short || (left ? "IZQUIERDA" : right ? "DERECHA" : up ? "ARRIBA" : down ? "ABAJO" : "LISTO");
      });

      if ((available.length || openRef.current) && now - lastUiUpdateRef.current > 120) {
        lastUiUpdateRef.current = now;
        setLastInput(liveLabels);
      }
      frame = window.requestAnimationFrame(refresh);
    };

    frame = window.requestAnimationFrame(refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      activePulseTimers.forEach((timer) => window.clearTimeout(timer));
      activePulseTimers.clear();
      activeHeld.forEach((held) => held.forEach((key) => sendKey(key, false)));
      activeHeld.forEach((held) => held.clear());
    };
  }, [closePanel, pulseKey, releaseAll, releaseSlot, updateKey]);

  const orderedPads = useMemo(() => reversed && pads.length > 1 ? [pads[1], pads[0], ...pads.slice(2)] : pads, [pads, reversed]);

  const beginWizard = (slot: 0 | 1) => {
    if (!orderedPads[slot]) {
      setMessage(`Primero conecta y activa el mando P${slot + 1}.`);
      return;
    }
    releaseAll();
    const next = { slot, step: 0 } as Wizard;
    wizardRef.current = next;
    setWizard(next);
    setMessage(`Pulsa en el mando P${slot + 1} el botón para ${ACTIONS[0].label}.`);
  };

  const resetMappings = () => {
    const next = cloneDefaultMaps();
    mapsRef.current = next;
    setMaps(next);
    setWizard(null);
    safeStorageSet("benifaio-gamepad-maps", JSON.stringify(next));
    setMessage("Botones restaurados al esquema recomendado.");
  };

  const swapPlayers = () => {
    releaseAll();
    const next = !reversed;
    reversedRef.current = next;
    setReversed(next);
    safeStorageSet("benifaio-gamepad-reversed", next ? "1" : "0");
    setMessage("Mandos P1 y P2 intercambiados.");
  };

  return (
    <>
      <button className={`sound-button gamepad-button ${pads.length ? "connected" : ""}`} type="button" onClick={togglePanel} aria-haspopup="dialog" aria-expanded={open}>
        🎮 MANDOS · MAPEAR {pads.length ? `${Math.min(pads.length, 2)}/2` : ""}
      </button>

      {disconnectNotice && (
        <div className="gamepad-disconnect" role="alertdialog" aria-modal="true" aria-label="Mando desconectado">
          <div>
            <span>⚠ MANDO DESCONECTADO</span>
            <h2>FALTA UN JUGADOR</h2>
            <p>Vuelve a conectar el mando y pulsa cualquier botón. También puedes continuar usando la pantalla.</p>
            <button type="button" onClick={() => setDisconnectNotice(false)}>CONTINUAR CON LA PANTALLA</button>
            <button type="button" onClick={() => { setDisconnectNotice(false); setOpen(true); }}>REVISAR MANDOS</button>
          </div>
        </div>
      )}

      {open && (
        <div className="gamepad-overlay" role="dialog" aria-modal="true" aria-label="Configurar mandos">
          <div className="gamepad-panel">
            <button className="gamepad-close" type="button" onClick={closePanel} aria-label="Cerrar configuración">×</button>
            <span className="eyebrow">CONFIGURACIÓN ARCADE</span>
            <h2>MANDOS</h2>
            <p>Conecta los dos mandos PS4 por Bluetooth o USB y pulsa ✕ en cada uno. Cada mando elige su luchador con la cruceta. ✕ confirma tu personaje y pasa a los juegos. ○ vuelve a elegir. SHARE abre este menú.</p>

            <div className="gamepad-status" aria-live="polite"><i className={pads.length ? "online" : ""} />{message}</div>

            <div className="gamepad-cards">
              {([0, 1] as const).map((slot) => {
                const pad = orderedPads[slot];
                return (
                  <section className={`gamepad-card ${pad ? "ready" : ""}`} key={slot}>
                    <header><b>P{slot + 1}</b><span>{pad ? "CONECTADO" : "SIN MANDO"}</span></header>
                    <strong>{pad ? pad.id.replace(/\([^)]*\)/g, "").slice(0, 44) : "Pulsa START para activarlo"}</strong>
                    <div className="gamepad-live"><span>{lastInput[slot]}</span><small>PRUEBA EN DIRECTO</small></div>
                    <div className="gamepad-map-list">
                      {ACTIONS.map((action) => <span key={action.id}><small>{action.label}</small><b>{buttonName(maps[slot][action.id])}</b></span>)}
                    </div>
                    <button type="button" className="gamepad-map-button" onClick={() => beginWizard(slot)} disabled={!pad}>{wizard?.slot === slot ? `ESPERANDO: ${ACTIONS[wizard.step].label}` : "MAPEAR BOTONES"}</button>
                  </section>
                );
              })}
            </div>

            <div className="gamepad-panel-actions">
              <button type="button" onClick={swapPlayers} disabled={pads.length < 2}>⇄ INTERCAMBIAR P1 / P2</button>
              <button type="button" onClick={resetMappings}>RESTAURAR RECOMENDADOS</button>
              <button type="button" className="gamepad-done" onClick={closePanel}>LISTO PARA JUGAR</button>
            </div>
            <small className="gamepad-tip">Cruceta: personaje/modo · ✕: confirmar · ○: volver · OPTIONS: aceptar · SHARE: mapear. Los botones se guardan por jugador.</small>
          </div>
        </div>
      )}
    </>
  );
}
