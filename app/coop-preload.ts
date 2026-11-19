// Cooperativa swaps background images on every pose change. A frame that is
// still downloading paints nothing, so the hero blinks out of existence. This
// loads and decodes every coop frame of a fighter before it is needed.

const urlPattern = /url\(["']?([^"')]+)["']?\)/g;
const started = new Set<string>();
const decoded = new Map<string, HTMLImageElement>();
const MAX_RETAINED_FRAMES = 48;

const framesFor = (fighter: string, root = "coop-player") => {
  const urls = new Set<string>();
  const selector = `.${root}.${fighter}`;
  const keyframeNames = [`coop-walk-${fighter}`, `${fighter}-v3-walk`];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        if (rule.selectorText.includes(selector)) for (const match of rule.cssText.matchAll(urlPattern)) urls.add(match[1]);
      } else if (rule instanceof CSSKeyframesRule) {
        if (keyframeNames.includes(rule.name)) for (const match of rule.cssText.matchAll(urlPattern)) urls.add(match[1]);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules); } catch { /* Cross-origin sheets are skipped. */ }
  }
  return [...urls];
};

// Heroes: load and decode (kept in memory). Clones: only warm the download
// cache, so a phone never holds every fighter's bitmaps at once.
export const preloadCoopFrames = (fighters: string[], decode = true, root = "coop-player") => {
  fighters.forEach((fighter) => {
    framesFor(fighter, root).forEach((url) => {
      if (decode ? decoded.has(url) : started.has(url)) return;
      started.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      if (decode) {
        decoded.set(url, image);
        if (decoded.size > MAX_RETAINED_FRAMES) {
          const oldest = decoded.keys().next().value;
          if (oldest) decoded.delete(oldest);
        }
        void image.decode?.().catch(() => { if (decoded.get(url) === image) decoded.delete(url); });
      }
    });
  });
};
