import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Hardcore Fighters", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Hardcore Fighters — Web Arcade Edition<\/title>/i);
  assert.match(html, /HARDCORE/);
  assert.match(html, /FIGHTERS/);
  assert.match(html, /ELIGE TU LUCHADOR/);
  assert.doesNotMatch(html, /aria-label="Elegir CESARET para P[12]"/);
  assert.match(html, /aria-label="Elegir BORJA para P1"/);
  assert.match(html, /MODO ROMPEOBJETOS/);
  assert.match(html, /AVENTURA CENTRAL/);
  assert.match(html, /AVENTURA COOPERATIVA/);
  assert.match(html, /WEB · ARCADE EDITION/);
  assert.match(html, /MOVER · DASH/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|codex-preview/i);
});

test("server-renders the accessible game shell", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /lang="es"/);
  assert.match(html, /aria-label="Hardcore Fighters, ir al juego"/);
  assert.match(html, /aria-label="Dificultad"/);
  assert.match(html, /aria-label="Tipo de combate"/);
  assert.match(html, /PANTALLA/);
  assert.match(html, /PROYECTOR/);
  assert.match(html, /INSTALAR/);
  assert.match(html, /MANDOS/);
  assert.match(html, /SONIDO OFF/);
  assert.match(html, /MÚSICA OFF/);
  assert.match(html, /1P · [^<]*<!-- -->100<!-- -->%/);
  assert.match(html, /SUPER 0%/);
  assert.match(html, /1 JUGADOR \+ IA/);
});

test("ships the iPad install and offline files", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.equal(manifest.display, "fullscreen");
  assert.equal(manifest.orientation, "landscape");
  assert.match(serviceWorker, /OFFLINE_CORE/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
});

test("human movement tick uses the live fighter snapshot for spacing", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const snapshot = gameRef\.current;/);
  assert.match(source, /clampFighterStep\(next\.playerX, next\.cpuX, proposedX, minimumCombatGap\)/);
  assert.match(source, /clampFighterStep\(next\.cpuX, next\.playerX, proposedX, minimumCombatGap\)/);
  assert.doesNotMatch(source, /if \(current\.playerAirborne \|\| current\.cpuAirborne \|\| nextGap/);
  assert.match(source, /playerFighterRef\.current\.style\.left = `\$\{next\.playerX\}%`/);
  assert.match(source, /cpuFighterRef\.current\.style\.left = `\$\{next\.cpuX\}%`/);
});

test("new fighter sprites match the classic scale on desktop and portrait phones", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.arena \.fighter\.motion-rig:is\(\.cesaret,\.borja,\.bacora,\.bonviure,\.elchica,\.ogalla\)\s*\{\s*width:clamp\(157px,29\.333vh,274px\)!important;\s*height:clamp\(235px,44vh,410px\)!important;/);
  assert.match(css, /\.arena \.fighter\.motion-rig\.bonviure\s*\{\s*width:clamp\(164px,30\.667vh,286px\)!important;\s*height:clamp\(246px,46vh,428px\)!important;/);
  assert.match(css, /@media \(max-width:680px\) and \(orientation:portrait\)[\s\S]*?\.arena:not\(\.phase-select\) \.fighter\.motion-rig:is\(\.cesaret,\.borja,\.bacora,\.bonviure,\.elchica,\.ogalla\)[\s\S]*?height:min\(52\.5vw,225px\)!important;/);
});

test("all four fighters keep the jump arc during airborne attacks", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.equal((source.match(/<div className="fighter-pose">/g) ?? []).length, 2);
  assert.match(css, /\.arena \.fighter\.motion-rig\.airborne \.fighter-pose\s*\{\s*animation:fighter-flight-v2177 820ms/);
  assert.match(css, /\.arena \.fighter\.motion-rig\.airborne\s*\{\s*animation:none!important;\s*transform:translateX\(-50%\)!important;/);

  for (const fighter of ["maletilla", "vanessa", "josevictor", "cristian"]) {
    assert.match(css, new RegExp(`@keyframes ${fighter}-jump-v2175`));
  }
  assert.match(css, /\.arena \.fighter\.motion-rig\.punch \.fighter-art\.cristian\s*\{\s*animation:cristian-fight-punch-v2161 480ms/);
  assert.match(css, /\.arena \.fighter\.motion-rig\.kick \.fighter-art\.cristian\s*\{\s*animation:cristian-fight-kick-v2161 620ms/);
});
