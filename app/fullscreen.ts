// Cross-browser fullscreen helpers (Chrome, Edge, Firefox, Android, iPad Safari).
// iPhone Safari has no fullscreen API for pages; there the game runs fullscreen
// once it is added to the home screen (manifest "display": "fullscreen").

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void;
};

export const OPT_OUT_KEY = "hardcore-fullscreen-optout";

export const isFullscreen = () => {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
};

export const isStandaloneApp = () =>
  matchMedia("(display-mode: fullscreen)").matches
  || matchMedia("(display-mode: standalone)").matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export const fullscreenSupported = () => {
  const element = document.documentElement as FullscreenElement;
  return Boolean(element.requestFullscreen || element.webkitRequestFullscreen);
};

export const isIphone = () => /iPhone|iPod/i.test(navigator.userAgent);

export const enterFullscreen = async () => {
  if (isFullscreen()) return true;
  const element = document.documentElement as FullscreenElement;
  try {
    if (element.requestFullscreen) await element.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
    else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
    else return false;
    const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: "landscape") => Promise<void> };
    await orientation?.lock?.("landscape").catch(() => undefined);
    return true;
  } catch {
    return false;
  }
};

export const exitFullscreen = async () => {
  const doc = document as FullscreenDocument;
  try {
    if (doc.exitFullscreen && doc.fullscreenElement) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
  } catch { /* Already out of fullscreen. */ }
};

export const optedOut = () => {
  try { return window.localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; }
};

export const setOptOut = (value: boolean) => {
  try {
    if (value) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch { /* Settings are optional. */ }
};
