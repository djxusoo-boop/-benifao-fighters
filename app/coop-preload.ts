// Cooperativa swaps background images on every pose change. A frame that is
// still downloading paints nothing, so the hero blinks out of existence. This
// loads and decodes every coop frame of a fighter before it is needed.

const urlPattern = /url\(["']?([^"')]+)["']?\)/g;
const started = new Set<string>();
const keep: HTMLImageElement[] = [];

const framesFor = (fighter: string) => {
  const urls = new Set<string>();
  const selector = `.coop-player.${fighter}`;
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

export const preloadCoopFrames = (fighters: string[]) => {
  fighters.forEach((fighter) => {
    framesFor(fighter).forEach((url) => {
      if (started.has(url)) return;
      started.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      keep.push(image);
      void image.decode?.().catch(() => undefined);
    });
  });
};
