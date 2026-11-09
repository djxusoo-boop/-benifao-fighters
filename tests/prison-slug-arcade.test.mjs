import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const gameUrl = new URL("../public/prison-slug/game.js", import.meta.url);
const htmlUrl = new URL("../public/prison-slug/index.html", import.meta.url);
const cssUrl = new URL("../public/prison-slug/styles.css", import.meta.url);

test("Prison Slug supports held fire without losing a quick tap", async () => {
  const game = await readFile(gameUrl, "utf8");

  assert.match(game, /fireHeld: false/, "the input state needs a held-fire channel");
  assert.match(game, /if \(input\.fire \|\| input\.fireHeld\) \{ fire\(\); input\.fire = false; \}/,
    "the main loop should fire from either a tap or a held button");
  assert.match(game, /if \(key === "fire"\) \{\s*if \(value\) \{ input\.fire = true; input\.fireHeld = true; \}\s*else input\.fireHeld = false;/,
    "releasing fire must keep the tap and only end the hold");
  assert.match(game, /const heldActions = new Set\(\["left", "right", "crouch", "fire"\]\)/,
    "keyboard and touch release paths must clear held fire");
});

test("Prison Slug has original arcade mission pacing feedback", async () => {
  const [game, html, css] = await Promise.all([
    readFile(gameUrl, "utf8"),
    readFile(htmlUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);

  assert.match(game, /rush: \{ chain: 0, timer: 0, multiplier: 1, best: 0 \}/,
    "the mission needs a timed defeat-chain state");
  assert.match(game, /function registerDefeat\(enemy\)/, "defeats should feed the arcade chain");
  assert.match(game, /function updateSector\(\)/, "the route should be split into readable sectors");
  assert.match(game, /EN FURIA!/, "bosses should telegraph their faster second phase");
  assert.match(html, /id="rushReadout"/, "the player needs an on-screen RUSH readout");
  assert.match(css, /\.rush-readout\.hot/, "an active RUSH chain should be visibly distinct");
});
