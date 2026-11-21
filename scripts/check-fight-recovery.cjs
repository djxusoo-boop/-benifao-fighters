// Run against a local game with Playwright and Chrome available:
// node scripts/check-fight-recovery.cjs http://127.0.0.1:5188
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

async function checkRecovery(page, url, fighter) {
  await page.goto(url);
  const card = page.locator(`[data-fighter="${fighter}"]`);
  // The server-rendered menu can be visible before it accepts selections.
  for (let attempt = 0; attempt < 8; attempt++) {
    await card.click();
    if (await card.evaluate(el => el.classList.contains("selected-p1"))) break;
    await page.waitForTimeout(150);
  }
  await page.locator(".training-menu-button").click();
  const hero = page.locator(`.arena.phase-fight .fighter.${fighter}:not(.cpu)`);
  await hero.waitFor();

  const sequence = ["j", "h", "k", "l", "k", "l"];
  const seen = await hero.evaluate(async (el, keys) => {
    const attacks = { j: "punch", h: "kick", k: "special", l: "special" };
    const completed = [];
    for (const key of keys) {
      // Observe the rendered recovery itself. Sleeps between attacks can hide
      // lost input in the interval between DOM commit and React effects.
      await new Promise((resolve, reject) => {
        let started = false;
        const observer = new MutationObserver(() => {
          if (el.classList.contains(attacks[key])) started = true;
          if (started && el.classList.contains("idle")) {
            clearTimeout(timeout);
            observer.disconnect();
            resolve();
          }
        });
        const timeout = setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Key ${key} after ${completed.join(" ")}: ${el.className}`));
        }, 3200);
        observer.observe(el, { attributes: true, attributeFilter: ["class"] });
        for (const type of ["keydown", "keyup"]) {
          window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
        }
      });
      completed.push(key);
    }
    return completed;
  }, [...sequence, ...sequence]);
  assert.deepEqual(seen, [...sequence, ...sequence]);
  console.log(`${fighter}: ${seen.length} consecutive attacks completed`);
}

async function main() {
  const url = process.argv[2] || "http://127.0.0.1:5173";
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1140, height: 750 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("crash", () => errors.push("Page crashed"));
    await page.addInitScript(() => localStorage.setItem("hardcore-analytics-choice-v1", "limited"));
    for (const fighter of ["bacora", "bonviure"]) await checkRecovery(page, url, fighter);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
