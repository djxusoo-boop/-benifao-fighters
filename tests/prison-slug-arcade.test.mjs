import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const gameUrl = new URL("../public/prison-slug/game.js", import.meta.url);
const htmlUrl = new URL("../public/prison-slug/index.html", import.meta.url);
const cssUrl = new URL("../public/prison-slug/styles.css", import.meta.url);

async function mission() {
  const game = await readFile(gameUrl, "utf8");
  const elements = new Map();
  const element = () => ({
    handlers: new Map(), style: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, handler) { this.handlers.set(name, handler); },
    getContext: () => ({}), append() {}, setAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  });
  const select = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const win = { ...element(), location: { search: "", origin: "http://localhost" }, setTimeout() {}, dispatchEvent() {} };
  win.parent = win;
  const fire = select('[data-key="fire"]');
  fire.dataset = { key: "fire" };
  const context = vm.createContext({
    Image: class {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, URLSearchParams, window: win, performance: { now: () => 0 },
    document: { ...element(), createElement: element, querySelector: select, querySelectorAll: () => [fire] },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  const run = (code) => vm.runInContext(code, context);
  run(game);
  run("beginMission(); state.props = []; state.waves = ROUTE_ENCOUNTERS.length;");
  const event = (target, name, data) => target.handlers.get(name)({ preventDefault() {}, button: 0, ...data });
  return {
    run, key: (name, key) => event(win, name, { key }),
    touch: (target, name, pointerId, clientX = 0, clientY = 0) => event(target === "window" ? win : select(target), name, { pointerId, clientX, clientY }),
  };
}

test("held fire repeats, release stops it, and a quick tap is retained", async () => {
  const { run, key } = await mission();
  key("keydown", "j");
  run("for (let i = 0; i < 45; i++) update(1/60)");
  assert.ok(run("state.bullets.length >= 3"));
  key("keyup", "j");
  run("state.bullets = []; for (let i = 0; i < 25; i++) update(1/60)");
  assert.equal(run("state.bullets.length"), 0);
  key("keydown", "j");
  key("keyup", "j");
  run("update(1/60)");
  assert.equal(run("state.bullets.length"), 1);
});

test("keyboard aims up, turns immediately while crouched, and fires during a jump", async () => {
  const { run, key } = await mission();
  key("keydown", "w");
  key("keydown", "j");
  run("update(1/60)");
  assert.equal(run("state.bullets[0].vx"), 0);
  assert.ok(run("state.bullets[0].vy < 0 && state.player.landed"));
  key("keyup", "w");
  key("keydown", "s");
  key("keydown", "a");
  run("state.player.fireCooldown = 0; update(1/60)");
  assert.ok(run("state.bullets.at(-1).vx < 0 && state.bullets.at(-1).vy === 0 && state.player.crouching"));
  assert.equal(run("state.bullets.at(-1).y - state.player.y"), 96);
  key("keyup", "s");
  key("keydown", " ");
  run("state.player.fireCooldown = 0; update(1/60)");
  assert.ok(run("!state.player.landed && state.player.vy < 0 && state.bullets.at(-1).vx < 0"));
  key("keydown", "s");
  run("state.player.fireCooldown = 0; update(1/60)");
  assert.ok(run("state.bullets.at(-1).vx < 0 && state.bullets.at(-1).vy > 0"));
});

test("touch aim remains independent of movement and rotates van damage during one hold", async () => {
  const { run, touch } = await mission();
  const fire = '[data-key="fire"]';
  touch("#joystick", "pointerdown", 1, 86, 50);
  touch(fire, "pointerdown", 2, 300, 220);
  touch("window", "pointermove", 2, 270, 185);
  run("update(1/60)");
  assert.ok(run("state.player.vx > 0 && state.bullets[0].vx < 0 && state.bullets[0].vy < 0"));
  touch("window", "pointerup", 1);
  assert.ok(run('!isHeld("right") && isHeld("fire")'));
  run(`
    state.player.x = VAN_X + 300;
    activateVan();
    spawnEnemy(VAN_X + 750, "soldier");
    spawnEnemy(VAN_X - 180, "soldier");
  `);
  touch("window", "pointermove", 2, 340, 220);
  run("update(1/60)");
  assert.ok(run("state.enemies[0].hp < 28 && state.enemies[1].hp === 28"));
  touch("window", "pointermove", 2, 260, 220);
  run("state.van.beamCooldown = 0; update(1/60)");
  assert.ok(run("state.enemies[1].hp < 28 && state.van.aim.x < 0"));
  touch("window", "pointercancel", 2);
  assert.ok(run('!isHeld("fire") && touchAim === null'));
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

test("Prison Slug treats a long touch as game input, never selected text", async () => {
  const [game, css] = await Promise.all([readFile(gameUrl, "utf8"), readFile(cssUrl, "utf8")]);

  assert.match(css, /\.app-shell, \.app-shell \* \{[\s\S]*?-webkit-user-select: none;[\s\S]*?user-select: none;[\s\S]*?-webkit-touch-callout: none;/,
    "the game shell should opt out of iOS text selection and callouts");
  assert.match(game, /document\.addEventListener\("selectstart", \(event\) => \{\s*if \(state\?\.status === "playing"\) event\.preventDefault\(\);/,
    "a gameplay hold must cancel browser text selection");
  assert.match(game, /document\.addEventListener\("dragstart", \(event\) => \{\s*if \(state\?\.status === "playing"\) event\.preventDefault\(\);/,
    "a gameplay hold must not begin a drag gesture");
});

test("boarding opens a long road; reaching the former exit cannot finish the mission", async () => {
  const { run } = await mission();
  assert.ok(run("WORLD_END >= 18000 && EXIT_X - VAN_X > 12000"));
  run("state.player.x = VAN_X + 300; activateVan(); state.van.charged = true; state.van.x = 5880; update(1/60)");
  assert.equal(run("state.status"), "playing");
  assert.equal(run("state.extractionOpen"), false);
  assert.ok(run("travelLimit() > 7000"));
});

test("four checkpoints require their defenders defeated and only then unlock extraction", async () => {
  const { run } = await mission();
  run("state.player.x = VAN_X + 300; activateVan(); state.van.charged = true;");
  for(let gate = 0; gate < 4; gate++) {
    run(`state.player.x = ROAD_GATES[${gate}].x; updateDriveRoute(1/60)`);
    assert.equal(run("state.roadBossActive"), true);
    assert.equal(run("state.roadGate"), gate);
    assert.equal(run("state.enemies.filter(e => e.roadGate === state.roadGate).length"), 3);
    run("updateDriveRoute(1/60)");
    assert.equal(run("state.roadGate"), gate);
    run("for(const e of state.enemies) if(e.roadGate === state.roadGate) e.hp = 0; updateDriveRoute(1/60)");
    assert.equal(run("state.roadGate"), gate+1);
    assert.equal(run("state.extractionOpen"), gate === 3);
  }
  run("state.enemies = []; state.driveWave = DRIVE_ENCOUNTERS.length; state.van.x = EXIT_X; update(1/60)");
  assert.equal(run("state.status"), "complete");
});

test("destroying the van cannot bypass any checkpoint and the route remains playable on foot", async () => {
  const { run } = await mission();
  run("state.player.x = VAN_X + 300; activateVan(); damageVan(100); state.van.charged = true; state.player.x = ROAD_GATES[0].x; updateDriveRoute(1/60)");
  assert.equal(run("state.van.destroyed && !state.van.boarded"), true);
  assert.equal(run("state.roadBossActive"), true);
  assert.equal(run("state.extractionOpen"), false);
  run("state.player.x = EXIT_X; updateOnFoot(1/60)");
  assert.ok(run("state.player.x < EXIT_X && state.player.x <= ROAD_GATES[0].x + 290"));
});

test("road ambushes spawn once, repairs reach the driver, and every terrain joint is continuous", async () => {
  const { run } = await mission();
  run("state.player.x = VAN_X + 300; activateVan(); state.van.charged = true; state.player.x = 6200; updateDriveRoute(1/60); updateDriveRoute(1/60)");
  assert.equal(run("state.driveWave"), 1);
  assert.equal(run("state.enemies.length"), 3);
  run("state.van.hp = 20; state.pickups = [{x: state.van.x + 150, y: 10, type: 'repair', life: 60, bob: 0}]; updatePickups(1/60)");
  assert.equal(run("state.van.hp"), 48);
  assert.ok(run("TERRAIN.every((segment,i) => i===0 || segment.x1===TERRAIN[i-1].x2 && segment.y1===TERRAIN[i-1].y2)"));
  assert.ok(run("DRIVE_ENCOUNTERS.length >= 10 && ROAD_GATES.length === 4"));
});


test("a repair kit restores a wrecked van without jumping past the next checkpoint", async () => {
  const { run } = await mission();
  run("state.player.x = VAN_X + 300; activateVan(); state.van.charged = true; damageVan(100); state.player.x = 6500; repairVan(28)");
  assert.ok(run("state.van.boarded && state.van.active && !state.van.destroyed"));
  assert.equal(run("state.van.hp"), 55);
  assert.ok(run("state.van.x < ROAD_GATES[0].x && state.player.x > 6200 && state.player.x < 6600"));
  assert.equal(run("state.roadGate"), 0);
});
