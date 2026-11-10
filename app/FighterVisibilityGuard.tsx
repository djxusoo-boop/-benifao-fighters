"use client";

import { useEffect } from "react";
import { loadedFrames } from "./frame-registry";

// Safety net so a fighter can never vanish mid-fight. A few times per second it
// checks that each fighter shows an image that is actually loaded. If not
// (frame still downloading, mobile browser dropped a decoded image, an odd CSS
// rule…), it keeps the last good frame on screen until the real one is ready.

type Frame = { url: string; size: string; position: string };

const urlOf = (value: string) => {
  const match = /url\("?([^")]+)"?\)/.exec(value || "");
  return match ? match[1] : null;
};

const imageCache = new Map<string, HTMLImageElement>();
const isLoaded = (url: string) => {
  if (loadedFrames.has(url)) return true;
  let image = imageCache.get(url);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = url;
    // Do not retain every frame ever seen for the whole session.
    if (imageCache.size >= 12) {
      const oldest = imageCache.keys().next().value;
      if (oldest) imageCache.delete(oldest);
    }
    imageCache.set(url, image);
  }
  const ready = image.complete && image.naturalWidth > 0;
  if (ready) loadedFrames.add(url);
  return ready;
};

const visibleFrames = (fighter: HTMLElement): Frame[] => {
  const art = fighter.querySelector<HTMLElement>(".fighter-art");
  if (!art) return [];
  const frames: Frame[] = [];
  const consider = (style: CSSStyleDeclaration, pseudo: boolean) => {
    const url = urlOf(style.backgroundImage);
    if (!url || style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) <= 0.05) return;
    if (pseudo && (!style.content || style.content === "none")) return;
    frames.push({ url, size: style.backgroundSize, position: style.backgroundPosition });
  };
  consider(getComputedStyle(art), false);
  consider(getComputedStyle(art, "::before"), true);
  consider(getComputedStyle(art, "::after"), true);
  fighter.querySelectorAll<HTMLElement>(".fighter-walk-frame").forEach((frame) => {
    const layers = frame.parentElement ? getComputedStyle(frame.parentElement) : null;
    if (layers && (layers.display === "none" || layers.visibility === "hidden" || parseFloat(layers.opacity) <= 0.05)) return;
    consider(getComputedStyle(frame), false);
  });
  return frames;
};

const chainOpacity = (fighter: HTMLElement) => {
  let opacity = 1;
  for (let element: HTMLElement | null = fighter.querySelector<HTMLElement>(".fighter-art"); element && element !== fighter.parentElement; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return 0;
    opacity *= parseFloat(style.opacity);
  }
  return opacity;
};

// Inline !important beats every stylesheet rule, however specific it is.
const RESCUE_PROPS = ["background-image", "background-size", "background-position", "background-repeat", "opacity", "visibility", "display", "animation"] as const;
const applyRescue = (fighter: HTMLElement, art: HTMLElement, frame: Frame) => {
  art.style.setProperty("background-image", `url("${frame.url}")`, "important");
  art.style.setProperty("background-size", frame.size || "contain", "important");
  art.style.setProperty("background-position", frame.position || "center bottom", "important");
  art.style.setProperty("background-repeat", "no-repeat", "important");
  art.style.setProperty("opacity", "1", "important");
  art.style.setProperty("visibility", "visible", "important");
  art.style.setProperty("display", "block", "important");
  art.style.setProperty("animation", "none", "important");
  fighter.style.setProperty("opacity", "1", "important");
  fighter.style.setProperty("visibility", "visible", "important");
  fighter.classList.add("art-rescue");
};
const clearRescue = (fighter: HTMLElement, art: HTMLElement) => {
  RESCUE_PROPS.forEach((prop) => art.style.removeProperty(prop));
  fighter.style.removeProperty("opacity");
  fighter.style.removeProperty("visibility");
  fighter.classList.remove("art-rescue");
};

export default function FighterVisibilityGuard() {
  useEffect(() => {
    const lastGood = new WeakMap<HTMLElement, Frame>();
    // A CSS action swaps frames on purpose.  An image can be decoded a few
    // frames after the class changes, but the browser keeps painting the last
    // valid background meanwhile.  Treating that short decode window as a
    // disappearance used to pin an inline `animation:none`, which randomly
    // cancelled kicks (most noticeably Vanessa's).
    const invisibleChecks = new WeakMap<HTMLElement, number>();
    let frame = 0;
    let tick = 0;
    const check = () => {
      frame = window.requestAnimationFrame(check);
      tick += 1;
      if (tick % 2) return;
      const arena = document.querySelector(".arena.phase-fight, .arena.phase-ko, .arena.phase-intro");
      if (!arena) return;
      arena.querySelectorAll<HTMLElement>(":scope > .fighter").forEach((fighter) => {
        // During a SUPER the body is drawn by its own frame layer.
        if (fighter.classList.contains("super-anim")) return;
        const art = fighter.querySelector<HTMLElement>(".fighter-art");
        if (!art) return;
        // Measure the fighter's natural state; style changes inside one task never paint.
        const wasRescued = fighter.classList.contains("art-rescue");
        if (wasRescued) clearRescue(fighter, art);
        const frames = visibleFrames(fighter);
        const opacity = chainOpacity(fighter);
        const ready = frames.find((item) => isLoaded(item.url));
        // A visible frame is already a safe state, even while its replacement
        // is decoding. Never override an active combat animation in that case.
        if (frames.length > 0 && opacity > 0.15) {
          if (ready) lastGood.set(fighter, ready);
          invisibleChecks.delete(fighter);
          return;
        }
        const misses = (invisibleChecks.get(fighter) ?? 0) + 1;
        invisibleChecks.set(fighter, misses);
        // A single layout/paint frame can transiently report no art. Wait long
        // enough to distinguish that from a real vanished fighter.
        if (misses < 6) return;
        const fallback = lastGood.get(fighter) ?? frames[0];
        if (!fallback || !isLoaded(fallback.url)) return;
        applyRescue(fighter, art, fallback);
        if (!wasRescued) {
          const debug = window as unknown as { __hfRescues?: number; __hfRescueLog?: string[] };
          debug.__hfRescues = (debug.__hfRescues ?? 0) + 1;
          debug.__hfRescueLog = [...(debug.__hfRescueLog ?? []).slice(-19), `${fighter.className.replace(/\s+/g, " ").trim()} | ${frames.map((item) => item.url.split("/").pop()).join(",") || "sin imagen"} | opacidad ${opacity.toFixed(2)}`];
        }
      });
    };
    frame = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return null;
}
