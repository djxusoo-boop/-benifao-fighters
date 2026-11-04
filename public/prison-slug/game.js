"use strict";

const W = 1280;
const H = 720;
const PLAYER_SPRITE_SCALE = 1.18;
const ENEMY_SPRITE_SCALE = 1.2;
const WORLD_END = 6100;
const VAN_X = 4980;
const EXIT_X = 5880;

// The route is deliberately hand-authored: the player can read the road,
// climb over wreckage, and use the high ground instead of running across one
// flat strip. These are world coordinates, so the camera can move freely.
const TERRAIN = [
  { x1: 0, x2: 620, y1: 602, y2: 602, zone: "street" },
  { x1: 620, x2: 820, y1: 602, y2: 520, zone: "uphill" },
  { x1: 820, x2: 1150, y1: 520, y2: 520, zone: "overpass" },
  { x1: 1150, x2: 1450, y1: 520, y2: 608, zone: "downhill" },
  { x1: 1450, x2: 1970, y1: 608, y2: 608, zone: "street" },
  { x1: 1970, x2: 2250, y1: 608, y2: 535, zone: "uphill" },
  { x1: 2250, x2: 2520, y1: 535, y2: 535, zone: "ridge" },
  { x1: 2520, x2: 2820, y1: 535, y2: 612, zone: "downhill" },
  { x1: 2820, x2: 3350, y1: 612, y2: 612, zone: "street" },
  { x1: 3350, x2: 3650, y1: 612, y2: 470, zone: "ramp" },
  { x1: 3650, x2: 4040, y1: 470, y2: 470, zone: "bridge" },
  { x1: 4040, x2: 4320, y1: 470, y2: 590, zone: "downhill" },
  { x1: 4320, x2: 4620, y1: 590, y2: 590, zone: "street" },
  { x1: 4620, x2: 4860, y1: 590, y2: 520, zone: "uphill" },
  { x1: 4860, x2: 5250, y1: 520, y2: 520, zone: "van-yard" },
  { x1: 5250, x2: 5500, y1: 520, y2: 602, zone: "downhill" },
  { x1: 5500, x2: 5800, y1: 602, y2: 602, zone: "street" },
  { x1: 5800, x2: WORLD_END, y1: 602, y2: 560, zone: "exit-ramp" },
];

const VEHICLES = [
  { kind: "car", x: 300, w: 190, h: 78, tilt: -0.04 },
  { kind: "truck", x: 895, w: 270, h: 130, tilt: 0 },
  { kind: "tank", x: 1500, w: 250, h: 104, tilt: 0.02 },
  { kind: "bus", x: 2330, w: 292, h: 138, tilt: -0.02 },
  { kind: "car", x: 3075, w: 200, h: 78, tilt: 0.06 },
  { kind: "tank", x: 3710, w: 265, h: 106, tilt: 0 },
  { kind: "truck", x: 4300, w: 280, h: 132, tilt: 0.03 },
  { kind: "tank", x: 4635, w: 250, h: 104, tilt: -0.03 },
  { kind: "car", x: 5550, w: 190, h: 78, tilt: 0.04 },
];

const MAP_LANDMARKS = [
  { x: 430, kind: "district", label: "PRISON DISTRICT", accent: "#7dff38" },
  { x: 1420, kind: "tower", label: "SECTOR 02", accent: "#4defff" },
  { x: 2860, kind: "factory", label: "IRON YARD", accent: "#ffb449" },
  { x: 3820, kind: "bridge", label: "SKYLINE BRIDGE", accent: "#4defff" },
  { x: 4740, kind: "warehouse", label: "SOUND DEPOT", accent: "#ff3f75" },
  { x: 5710, kind: "gate", label: "NORTH EXIT", accent: "#7dff38" },
];

const WEAPONS = {
  pistol: { label: "PISTOLA", ammo: Infinity, color: "#f6f1de", fireRate: .18, damage: 12 },
  machinegun: { label: "METRALLADORA", ammo: 120, color: "#ffb449", fireRate: .075, damage: 9 },
  bomb: { label: "BOMBAS", ammo: 12, color: "#ff7048", fireRate: .34, damage: 48 },
  rocket: { label: "MISILES", ammo: 18, color: "#ff4b7c", fireRate: .28, damage: 44 },
  laser: { label: "LÁSER", ammo: 75, color: "#4defff", fireRate: .09, damage: 25 },
};
const FINAL_BOSSES = ["sprayboss", "juiceboss", "rockboss", "birdboss", "wolfboss", "drumboss"];
const BOSS_SPRITE_FRAMES = {
  rockboss: { label: "SEÑOR DEL ROCK", color: "#7dff38", image: "rock" },
  birdboss: { label: "AVE DE LA ENERGÍA", color: "#ff9a31", image: "bird" },
  wolfboss: { label: "LOBO DEL RUIDO", color: "#ff3f75", image: "wolf" },
  drumboss: { label: "CAPITÁN DEL RITMO", color: "#f6c34a", image: "drum" },
};
const DESTRUCTIBLES = [
  { kind: "crate", x: 470, w: 62, h: 58, hp: 26 },
  { kind: "barrel", x: 1065, w: 42, h: 65, hp: 20 },
  { kind: "crate", x: 1815, w: 58, h: 54, hp: 24 },
  { kind: "barrel", x: 2150, w: 42, h: 65, hp: 20 },
  { kind: "antenna", x: 2700, w: 48, h: 122, hp: 36 },
  { kind: "crate", x: 3180, w: 66, h: 60, hp: 27 },
  { kind: "barrel", x: 4110, w: 42, h: 65, hp: 20 },
  { kind: "crate", x: 4530, w: 62, h: 58, hp: 26 },
];

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

const screens = {
  select: document.querySelector("#selectScreen"),
  game: document.querySelector("#gameScreen"),
  result: document.querySelector("#resultScreen"),
};
const ui = {
  cards: document.querySelector("#characterCards"),
  start: document.querySelector("#startButton"),
  mute: document.querySelector("#muteButton"),
  hero: document.querySelector("#heroName"),
  health: document.querySelector("#healthMeter"),
  lives: document.querySelector("#livesReadout"),
  weapon: document.querySelector("#weaponReadout"),
  energy: document.querySelector("#energyMeter"),
  ability: document.querySelector("#abilityReadout"),
  score: document.querySelector("#scoreReadout"),
  objective: document.querySelector("#objectiveReadout"),
  banner: document.querySelector("#eventBanner"),
  vanPrompt: document.querySelector("#vanPrompt"),
  pause: document.querySelector("#pausePanel"),
  resume: document.querySelector("#resumeButton"),
  quit: document.querySelector("#quitButton"),
  resultEyebrow: document.querySelector("#resultEyebrow"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultScore: document.querySelector("#resultScore"),
  again: document.querySelector("#againButton"),
  back: document.querySelector("#backButton"),
};

const characters = [
  {
    id: "xuso", name: "XUSO", title: "XUSO + SPOOKY", ability: "SPOOKY AL ATAQUE", color: "#7dff38",
    image: "assets/duo-dog.png", specialText: "¡SPOOKY, AL ATAQUE!", specialColor: "#7dff38",
    description: "El perro detecta las oleadas y su ladrido aturde a los drones.",
  },
  {
    id: "bomba", name: "EL BOMBA", title: "BARRIDO RURAL", ability: "ARCO DE AZADA", color: "#ff9a31",
    image: "assets/hoe-hero.png", specialText: "¡BARRIDO DE AZADA!", specialColor: "#ffb449",
    description: "Un golpe ancho limpia el camino y devuelve proyectiles enemigos.",
  },
  {
    id: "rafeta", name: "RAFETA", title: "PORTAESTANDARTE", ability: "EMBESTIDA DE BANDERA", color: "#e8c44d",
    image: "assets/white-hero.png", specialText: "¡EMBESTIDA DE BANDERA!", specialColor: "#e8c44d",
    description: "Ataca con su bandera de España y el águila del estandarte.",
  },
  {
    id: "nova", name: "YOYE", title: "PRISMA DE NEÓN", ability: "RÁFAGA PRISMÁTICA", color: "#ff4be9",
    image: "/assets/new-fighters/nova-card.png", specialText: "¡RÁFAGA PRISMÁTICA!", specialColor: "#ff4be9",
    description: "Sus trenzas canalizan energía rosa y azul en un disparo que atraviesa la línea enemiga.",
  },
  { id: "maletilla", name: "MALETILLA", title: "EL AMO DEL RUIDO", ability: "RÁFAGA DE CLORETILO", color: "#ff8b2b", image: "/assets/signature-v271/maletilla-00.webp", specialText: "¡TORMENTA DE SETAS!", specialColor: "#ff8b2b", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "vanessa", name: "VANESSA", title: "HARDCORE GIRL", ability: "MICRÓFONO GIGANTE", color: "#ff3f75", image: "/assets/signature-v271/vanessa-00.webp", specialText: "¡OREJAS AL VUELO!", specialColor: "#ff3f75", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "josevictor", name: "JOSEVICTOR", title: "EL REY DEL BILLETE", ability: "BOLSAS AL VUELO", color: "#f2c94c", image: "/assets/josevictor/idle.webp", specialText: "¡RÁFAGA DE BILLETES!", specialColor: "#f2c94c", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "cristian", name: "CRISTIAN", title: "EL DIOS DE LAS MEZCLAS", ability: "LLUVIA DE VINILOS", color: "#63f2d0", image: "/assets/cristian/idle.webp", specialText: "¡IMPACTO KRK 8!", specialColor: "#63f2d0", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "borja", name: "BORJA", title: "EL DOMADOR DEL SAPO", ability: "ATAQUE DEL SAPO", color: "#a9e450", image: "/assets/new-fighters/borja-idle.webp", specialText: "¡VENENO DEL SAPO!", specialColor: "#a9e450", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "bacora", name: "BACORA", title: "EL GUARDIÁN DE LA W", ability: "EMBESTIDA DE ESCUDO", color: "#e6b82e", image: "/assets/new-fighters/bacora-idle.png", specialText: "¡GOLPE DE VARA!", specialColor: "#e6b82e", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "bonviure", name: "BONVIURE", title: "EL ANCLA NEGRA", ability: "BARRIDO DE ANCLA", color: "#a68c72", image: "/assets/new-fighters/bonviure-idle.png", specialText: "¡LATIGAZO DE CADENA!", specialColor: "#a68c72", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "elchica", name: "EL CHICA", title: "EL REY DEL JÄGER", ability: "BOTELLA DEL CHICA", color: "#ec8d27", image: "/assets/new-fighters/elchica-atlas.png", specialText: "¡SALPICADURA ÁMBAR!", specialColor: "#ec8d27", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "ogalla", name: "OGALLA", title: "EL REY DE LA ALCACHOFA", ability: "BASTÓN DE ALCACHOFA", color: "#c89a46", image: "/assets/new-fighters/ogalla-atlas.png", specialText: "¡LLUVIA DE ALCACHOFAS!", specialColor: "#c89a46", description: "Combate con el arsenal de Hardcore Fighters." },
  { id: "estefy", name: "ESTEFY", title: "LA CAPITANA DEL MACHETE", ability: "MACHETAZO", color: "#ffd21f", image: "/assets/new-fighters/estefy/diseno.webp", specialText: "¡TORMENTA DE HOJAS!", specialColor: "#ffd21f", description: "Abre camino a machetazos y barre la ruta con una tormenta de hojas." },
  { id: "tonimassama", name: "TONI MASSAMA", title: "EL REY DE LA PEINETA", ability: "DISPARO DORADO", color: "#f0bd42", image: "/assets/new-fighters/tonimassama-frames/idle.webp", specialText: "¡PEINETAS VOLADORAS!", specialColor: "#f0bd42", description: "Combate con el arsenal de Hardcore Fighters." },
];

const atlasHeroPoses = (asset) => ({ idle: asset, walkA: asset, walkB: asset, walkC: asset, walkD: asset, walkE: asset, crouch: asset, rise: asset, fire: asset, heavyFire: asset, kick: asset, hit: asset });
const HERO_POSE_ASSETS = {
  xuso: {
    idle: "/assets/new-fighters/xuso-v3/xuso-reposo-01.webp", walkA: "/assets/new-fighters/xuso-v3/xuso-caminar-01.webp", walkB: "/assets/new-fighters/xuso-v3/xuso-caminar-02.webp",
    walkC: "/assets/new-fighters/xuso-v3/xuso-caminar-03.webp", walkD: "/assets/new-fighters/xuso-v3/xuso-caminar-04.webp", walkE: "/assets/new-fighters/xuso-v3/xuso-caminar-02.webp",
    crouch: "/assets/new-fighters/xuso-v3/xuso-agacharse.webp", rise: "/assets/new-fighters/xuso-v3/xuso-salto-aire.webp",
    fire: "/assets/new-fighters/xuso-v3/xuso-orden-perro-03.webp", heavyFire: "/assets/new-fighters/xuso-v3/xuso-superorden-03.webp", kick: "/assets/new-fighters/xuso-v3/xuso-patada-03.webp", hit: "/assets/new-fighters/xuso-v3/xuso-recibir-golpe.webp",
  },
  bomba: {
    idle: "/assets/new-fighters/bomba-idle-v2.webp", walkA: "/assets/new-fighters/bomba-walk-v2.webp", walkB: "/assets/new-fighters/bomba-idle-v2.webp",
    walkC: "/assets/new-fighters/bomba-walk-v2.webp", walkD: "/assets/new-fighters/bomba-idle-v2.webp", walkE: "/assets/new-fighters/bomba-walk-v2.webp",
    crouch: "/assets/new-fighters/bomba-crouch-v21849.webp", rise: "/assets/new-fighters/bomba-crouch-v21849.webp",
    fire: "/assets/new-fighters/bomba-rig-v21847-punch.webp", heavyFire: "/assets/new-fighters/bomba-hoe-attack-v2.webp", kick: "/assets/new-fighters/bomba-rig-v21847-kick.webp", hit: "/assets/new-fighters/bomba-guard-v2.webp",
  },
  rafeta: atlasHeroPoses("/prison-slug/assets/white-hero.png"),
  estefy: {
    idle: "/assets/new-fighters/estefy/punio-guardia.webp", walkA: "/assets/new-fighters/estefy/caminar-01.webp", walkB: "/assets/new-fighters/estefy/caminar-02.webp", walkC: "/assets/new-fighters/estefy/caminar-03.webp", walkD: "/assets/new-fighters/estefy/caminar-04.webp", walkE: "/assets/new-fighters/estefy/caminar-02.webp",
    crouch: "/assets/new-fighters/estefy/agacharse.webp", rise: "/assets/new-fighters/estefy/salto-aire.webp", fire: "/assets/new-fighters/estefy/machete-corte.webp", heavyFire: "/assets/new-fighters/estefy/machete-continuacion.webp", kick: "/assets/new-fighters/estefy/patada-contacto.webp", hit: "/assets/new-fighters/estefy/recibir-golpe.webp"
  },
  nova: {
    idle: "/assets/new-fighters/nova-frame-0.webp", walkA: "/assets/new-fighters/nova-frame-1.webp", walkB: "/assets/new-fighters/nova-frame-0.webp", walkC: "/assets/new-fighters/nova-frame-1.webp", walkD: "/assets/new-fighters/nova-frame-0.webp", walkE: "/assets/new-fighters/nova-frame-1.webp",
    crouch: "/assets/new-fighters/nova-frame-1.webp", rise: "/assets/new-fighters/nova-frame-3.webp", fire: "/assets/new-fighters/nova-frame-2.webp", heavyFire: "/assets/new-fighters/nova-frame-2.webp", kick: "/assets/new-fighters/nova-frame-3.webp", hit: "/assets/new-fighters/nova-frame-3.webp",
  },
  tonimassama: {
    idle: "/assets/new-fighters/tonimassama-frames/idle.webp",
    walkA: "/assets/new-fighters/tonimassama-frames/walk-a.webp",
    walkB: "/assets/new-fighters/tonimassama-frames/walk-b.webp",
    walkC: "/assets/new-fighters/tonimassama-frames/walk-c.webp",
    walkD: "/assets/new-fighters/tonimassama-frames/walk-b.webp",
    walkE: "/assets/new-fighters/tonimassama-frames/walk-a.webp",
    crouch: "/assets/new-fighters/tonimassama-frames/crouch.webp",
    rise: "/assets/new-fighters/tonimassama-frames/getup.webp",
    fire: "/assets/new-fighters/tonimassama-frames/pistol.webp",
    heavyFire: "/assets/new-fighters/tonimassama-frames/pistol.webp",
    kick: "/assets/new-fighters/tonimassama-frames/kick.webp",
    hit: "/assets/new-fighters/tonimassama-frames/hit.webp",
  },
  elchica: atlasHeroPoses("/assets/new-fighters/elchica-atlas.webp"),
  ogalla: atlasHeroPoses("/assets/new-fighters/ogalla-atlas.webp"),
  cesaret: {
    idle: "/assets/new-fighters/cesaret-idle.webp", walkA: "/assets/new-fighters/cesaret-walk.webp",
    walkB: "/assets/new-fighters/cesaret-idle.webp", walkC: "/assets/new-fighters/cesaret-walk2-v1.webp",
    walkD: "/assets/new-fighters/cesaret-idle.webp", walkE: "/assets/new-fighters/cesaret-walk.webp",
    crouch: "/assets/new-fighters/cesaret-crouch-v1.webp", rise: "/assets/new-fighters/cesaret-jump-v1.webp",
    fire: "/assets/new-fighters/cesaret-punch-v1.webp", heavyFire: "/assets/new-fighters/cesaret-punch-v1.webp", kick: "/assets/new-fighters/cesaret-kick-v1.webp", hit: "/assets/new-fighters/cesaret-hit-v1.webp",
  },
  borja: {
    idle: "/assets/new-fighters/borja-idle.webp", walkA: "/assets/new-fighters/borja-walk.webp",
    walkB: "/assets/new-fighters/borja-idle.webp", walkC: "/assets/new-fighters/borja-walk2-v1.webp",
    walkD: "/assets/new-fighters/borja-idle.webp", walkE: "/assets/new-fighters/borja-walk.webp",
    crouch: "/assets/new-fighters/borja-crouch-v1.webp", rise: "/assets/new-fighters/borja-jump-v1.webp",
    fire: "/assets/new-fighters/borja-punch-v1.webp", heavyFire: "/assets/new-fighters/borja-punch-v1.webp", kick: "/assets/new-fighters/borja-kick-v1.webp", hit: "/assets/new-fighters/borja-hit-v1.webp",
  },
  bacora: {
    idle: "/assets/new-fighters/bacora-idle.webp", walkA: "/assets/new-fighters/bacora-walk.webp",
    walkB: "/assets/new-fighters/bacora-idle.webp", walkC: "/assets/new-fighters/bacora-walk.webp",
    walkD: "/assets/new-fighters/bacora-idle.webp", walkE: "/assets/new-fighters/bacora-walk.webp",
    crouch: "/assets/new-fighters/bacora-crouch.webp", rise: "/assets/new-fighters/bacora-staff-v21849.webp",
    fire: "/assets/new-fighters/bacora-shield.webp", heavyFire: "/assets/new-fighters/bacora-staff-v21849.webp", kick: "/assets/new-fighters/bacora-kick.webp", hit: "/assets/new-fighters/bacora-crouch.webp",
  },
  bonviure: {
    idle: "/assets/new-fighters/bonviure-idle.webp", walkA: "/assets/new-fighters/bonviure-walk.webp",
    walkB: "/assets/new-fighters/bonviure-idle.webp", walkC: "/assets/new-fighters/bonviure-walk.webp",
    walkD: "/assets/new-fighters/bonviure-idle.webp", walkE: "/assets/new-fighters/bonviure-walk.webp",
    crouch: "/assets/new-fighters/bonviure-crouch-v21849.webp", rise: "/assets/new-fighters/bonviure-jump-v21849.webp",
    fire: "/assets/new-fighters/bonviure-anchor-v21849.webp", heavyFire: "/assets/new-fighters/bonviure-chain-clean.webp", kick: "/assets/new-fighters/bonviure-kick-clean.webp", hit: "/assets/new-fighters/bonviure-hit-v21849.webp",
  },
  maletilla: {
    idle: "/assets/signature-v271/maletilla-00.webp",
    walkA: "/assets/signature-v271/maletilla-01.webp",
    walkB: "/assets/signature-v271/maletilla-00.webp",
    walkC: "/assets/signature-v271/maletilla-02.webp",
    walkD: "/assets/signature-v271/maletilla-00.webp",
    walkE: "/assets/signature-v271/maletilla-01.webp",
    crouch: "/assets/signature-v271/maletilla-03.webp",
    rise: "/assets/signature-v271/maletilla-08.webp",
    fire: "/assets/actions-normalized-v1/maletilla/maletilla-05.webp",
    heavyFire: "/assets/maletilla-cloretilo-fire-v3.webp",
    kick: "/assets/signature-v271/maletilla-07-clean-v1.webp",
    hit: "/assets/actions-normalized-v1/maletilla/maletilla-motion-12-hit-v1.webp",
  },
  vanessa: {
    idle: "/assets/signature-v271/vanessa-00.webp",
    walkA: "/assets/signature-v271/vanessa-01.webp",
    walkB: "/assets/signature-v271/vanessa-00.webp",
    walkC: "/assets/signature-v271/vanessa-02.webp",
    walkD: "/assets/signature-v271/vanessa-00.webp",
    walkE: "/assets/signature-v271/vanessa-01.webp",
    crouch: "/assets/signature-v271/vanessa-03.webp",
    rise: "/assets/actions-normalized-v1/vanessa/vanessa-motion-11-jump-air-v1.webp",
    fire: "/assets/signature-v271/vanessa-05.webp",
    heavyFire: "/assets/signature-v271/vanessa-05.webp",
    kick: "/assets/actions-normalized-v1/vanessa/vanessa-motion-09-kick-contact-v1.webp",
    hit: "/assets/actions-normalized-v1/vanessa/vanessa-motion-12-hit-v1.webp",
  },
  josevictor: {
    idle: "/assets/josevictor/idle-clean-v1.webp",
    walkA: "/assets/josevictor/run-a-clean-v1.webp",
    walkB: "/assets/josevictor/idle-clean-v1.webp",
    walkC: "/assets/josevictor/run-b-clean-v1.webp",
    walkD: "/assets/josevictor/idle-clean-v1.webp",
    walkE: "/assets/josevictor/run-a-clean-v1.webp",
    crouch: "/assets/josevictor/jump-takeoff.webp",
    rise: "/assets/josevictor/jump-air.webp",
    fire: "/assets/actions-normalized-v1/josevictor/throw-money-clean-v1.webp",
    heavyFire: "/assets/actions-normalized-v1/josevictor/throw-money-clean-v1.webp",
    kick: "/assets/josevictor/kick.webp",
    hit: "/assets/josevictor/hit-clean-v1.webp",
  },
  cristian: {
    idle: "/assets/cristian/idle.webp",
    walkA: "/assets/cristian/walk-a.webp",
    walkB: "/assets/cristian/idle.webp",
    walkC: "/assets/cristian/walk-b.webp",
    walkD: "/assets/cristian/walk-c.webp",
    walkE: "/assets/cristian/walk-a.webp",
    crouch: "/assets/cristian/crouch.webp",
    rise: "/assets/cristian/getup.webp",
    fire: "/assets/cristian/throw-vinyl.webp",
    heavyFire: "/assets/cristian/throw-vinyl.webp",
    kick: "/assets/cristian/kick.webp",
    hit: "/assets/cristian/hit.webp",
  },
};

const HERO_ATLAS_POSES = new Set(["elchica", "ogalla"]);
const HERO_SHEET_POSES = new Set([]);
const imageCache = new Map();

const art = {
  van: loadImage("assets/prison-sound-van.png"),
  juiceWrestler: loadImage("assets/juice-wrestler.png"),
  waterBottleEnemy: loadImage("assets/water-bottle-enemy.webp"),
  waterBottleProjectile: loadImage("assets/water-bottle-projectile.webp"),
  sprayBoss: {
    ready: loadImage("assets/spray-boss-ready.webp"),
    attack: loadImage("assets/spray-boss-attack.webp"),
    hit: loadImage("assets/spray-boss-hit.webp"),
    defeated: loadImage("assets/spray-boss-defeated.webp"),
  },
  bossSheets: {
    rock: loadImage("assets/boss-central-rock-sheet.png"),
    bird: loadImage("assets/boss-energy-bird-sheet.png"),
    wolf: loadImage("assets/boss-punk-wolf-sheet.png"),
    drum: loadImage("assets/boss-drum-captain-sheet.png"),
  },
  hero: Object.fromEntries(characters.map((hero) => [hero.id, loadImage(hero.image)])),
  heroPoses: Object.fromEntries(Object.entries(HERO_POSE_ASSETS).map(([id, poses]) => [id, Object.fromEntries(Object.entries(poses).map(([pose, src]) => [pose, loadImage(src)]))])),
  spooky: loadImage("/assets/new-fighters/xuso-v3/perro-correr-02.webp"),
  masia: loadImage("/assets/new-fighters/masia-logo.png"),
  rafetaFlag: loadImage("/assets/new-fighters/rafeta-flag.svg"),
};

const requestedFighter = new URLSearchParams(window.location.search).get("fighter");
const requestedFighter2 = new URLSearchParams(window.location.search).get("fighter2");
let selectedId = characters.some((hero) => hero.id === requestedFighter) ? requestedFighter : "xuso";
let state = null;
let soundOn = false;
let audioContext = null;
const input = { left: false, right: false, jump: false, crouch: false, fire: false, special: false, activate: false };
const pressed = new Set();
let lastFrame = 0;

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const image = new Image();
  image.src = src;
  imageCache.set(src, image);
  return image;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.abs(a - b); }
function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, "0"); }
function heroFromId(id) { return characters.find((hero) => hero.id === id) ?? characters[0]; }
function terrainAt(worldX) {
  const piece = TERRAIN.find((segment) => worldX >= segment.x1 && worldX <= segment.x2) ?? TERRAIN[TERRAIN.length - 1];
  const ratio = clamp((worldX - piece.x1) / Math.max(1, piece.x2 - piece.x1), 0, 1);
  return piece.y1 + (piece.y2 - piece.y1) * ratio;
}
function vehicleTop(vehicle) { return terrainAt(vehicle.x + vehicle.w * .5) - vehicle.h; }
function supportAt(worldX, bottom, velocityY) {
  let support = terrainAt(worldX);
  if (velocityY >= 0) {
    for (const vehicle of VEHICLES) {
      const top = vehicleTop(vehicle);
      if (worldX + 24 > vehicle.x && worldX - 24 < vehicle.x + vehicle.w && bottom <= top + 92 && bottom >= top - 14) support = Math.min(support, top);
    }
  }
  return support;
}

function makeProps() {
  return DESTRUCTIBLES.map((prop) => ({
    ...prop,
    y: terrainAt(prop.x) - prop.h,
    maxHp: prop.hp,
    hit: 0,
  }));
}

function makeCards() {
  ui.cards.innerHTML = "";
  characters.forEach((hero) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-card${hero.id === selectedId ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(hero.id === selectedId));
    button.innerHTML = `<span class="card-art" style="background-image:url('${hero.image}')"></span><span class="card-vignette"></span><span class="card-info"><span>${hero.title}</span><b>${hero.name}</b><small>${hero.ability}</small></span>`;
    button.addEventListener("click", () => { selectedId = hero.id; makeCards(); blip(250, .035); });
    ui.cards.append(button);
  });
}

function initialState(hero) {
  return {
    status: "playing",
    hero,
    camera: 0,
    score: 0,
    elapsed: 0,
    message: "",
    messageUntil: 0,
    player: { x: 120, y: terrainAt(120) - 138, w: 72, h: 138, vx: 0, vy: 0, facing: 1, hp: 100, lives: 3, energy: hero.id === "xuso" ? 50 : 32, weapon: "pistol", ammo: Infinity, invincible: 0, fireCooldown: 0, specialCooldown: 0, landed: true, run: 0, weaponFlash: 0, poseKind: "idle", poseUntil: 0, crouching: false },
    bullets: [],
    enemyShots: [],
    enemies: [],
    deathSprites: [],
    particles: [],
    pickups: [],
    props: makeProps(),
    cameraShake: 0,
    hitFlash: 0,
    platforms: [
      { x: 760, y: 498, w: 230, h: 22 }, { x: 1260, y: 428, w: 190, h: 22 }, { x: 1680, y: 507, w: 180, h: 22 },
      { x: 2320, y: 468, w: 270, h: 22 }, { x: 3020, y: 414, w: 180, h: 22 }, { x: 3620, y: 500, w: 260, h: 22 },
      { x: 4290, y: 438, w: 230, h: 22 }, { x: 5535, y: 482, w: 260, h: 22 },
    ],
    checkpoints: [1300, 2900, 4450],
    checkpoint: 0,
    van: { active: false, charged: false, destroyed: false, charge: 0, waveClock: 0, pulseCooldown: 1.6, beamCooldown: 0, bursts: 0, hp: 100, damageFlash: 0, prompt: false, boarded: false, x: VAN_X, vx: 0, driverId: hero.id, roofRiderId: null },
    finaleSpawned: false,
    finalBossType: null,
    spawnClock: 0,
    waves: 0,
  };
}

function beginMission() {
  const hero = heroFromId(selectedId);
  state = initialState(hero);
  screens.select.classList.add("hidden");
  screens.result.classList.add("hidden");
  screens.game.classList.remove("hidden");
  ui.hero.textContent = hero.name;
  ui.ability.textContent = hero.ability;
  ui.objective.textContent = "RUMBO A LA FURGONETA";
  ui.pause.classList.add("hidden");
  banner("MISIÓN 01 · RECUPERA LA FURGONETA", "#f6f1de", 2200);
  lastFrame = performance.now();
  requestAnimationFrame(loop);
  blip(180, .11);
}

function showSelection() {
  state = null;
  screens.game.classList.add("hidden");
  screens.result.classList.add("hidden");
  screens.select.classList.remove("hidden");
  makeCards();
}

// Inside Hardcore Fighters the menu buttons go back to the main lobby.
function exitToLobby() {
  if (window.parent && window.parent !== window) {
    state = null;
    window.parent.postMessage({ type: "hardcore-fighters-exit" }, window.location.origin);
    return;
  }
  showSelection();
}

function completeMission(won) {
  if (!state || state.status === "complete" || state.status === "lost") return;
  state.status = won ? "complete" : "lost";
  screens.game.classList.add("hidden");
  screens.result.classList.remove("hidden");
  ui.resultEyebrow.textContent = won ? "SEÑAL RESTAURADA" : "LA RUTA SE CERRÓ";
  ui.resultTitle.textContent = won ? "MISIÓN COMPLETA" : "MISIÓN FALLIDA";
  ui.resultText.textContent = won
    ? `La Furgoneta Resonante queda operativa. ${state.hero.name} abrió la salida con ${state.score} puntos.`
    : "La banda de drones expulsó al equipo de la ruta. Vuelve a intentarlo o regresa al menú principal.";
  ui.resultScore.textContent = formatScore(state.score);
  blip(won ? 740 : 100, .22);
}

function banner(message, color = "#f6f1de", duration = 1200) {
  if (!state) return;
  state.message = message;
  state.messageUntil = performance.now() + duration;
  ui.banner.textContent = message;
  ui.banner.style.color = color;
  ui.banner.classList.add("show");
  window.setTimeout(() => {
    if (!state || performance.now() >= state.messageUntil) ui.banner.classList.remove("show");
  }, duration + 30);
}

function spawnEnemy(x, type = "drone") {
  const specs = {
    sprayboss: { hp: 180, w: 142, h: 220, shot: 1.2, speed: 0 },
    juiceboss: { hp: 155, w: 132, h: 205, shot: 1.25, speed: 24 },
    rockboss: { hp: 230, w: 210, h: 250, shot: 1.05, speed: 0 },
    birdboss: { hp: 205, w: 230, h: 205, shot: 1.18, speed: 28 },
    wolfboss: { hp: 220, w: 188, h: 224, shot: .95, speed: 34 },
    drumboss: { hp: 190, w: 156, h: 220, shot: .82, speed: 22 },
    brute: { hp: 54, w: 112, h: 174, shot: 1.1, speed: 38 },
    tanklet: { hp: 120, w: 170, h: 110, shot: 1.4, speed: 18 },
    turret: { hp: 62, w: 100, h: 80, shot: .9, speed: 0 },
    grenadier: { hp: 32, w: 62, h: 106, shot: 1.25, speed: 24 },
    soldier: { hp: 28, w: 60, h: 106, shot: 1.4, speed: 58 },
    bottle: { hp: 30, w: 68, h: 110, shot: 1.1, speed: 34 },
    speaker: { hp: 34, w: 62, h: 101, shot: .68, speed: 42 },
    drone: { hp: 22, w: 62, h: 101, shot: 1.4, speed: 58 },
  };
  const spec = specs[type] ?? specs.drone;
  state.enemies.push({ x, y: terrainAt(x) - spec.h, w: spec.w, h: spec.h, type, hp: spec.hp, maxHp: spec.hp, vx: 0, shot: spec.shot + Math.random() * .45, hit: 0, dir: -1, grounded: true, speed: spec.speed, phase: Math.random() * Math.PI * 2 });
}

function spawnOpeningWave() {
  const progress = state.player.x;
  const count = progress > 4000 ? 4 : 3;
  for (let index = 0; index < count; index += 1) {
    const heavy = index === count - 1 && progress > 2300;
    const roll = (state.waves + index) % 7;
    const type = heavy ? (progress > 4200 ? "tanklet" : "brute") : roll === 1 ? "grenadier" : roll === 3 ? "bottle" : roll === 5 ? "soldier" : "drone";
    spawnEnemy(progress + 700 + index * 125, type);
  }
  state.waves += 1;
}

function equipWeapon(id, ammo = WEAPONS[id]?.ammo) {
  const weapon = WEAPONS[id] ? id : "pistol";
  state.player.weapon = weapon;
  state.player.ammo = weapon === "pistol" ? Infinity : ammo;
  banner(`${WEAPONS[weapon].label} · ${weapon === "pistol" ? "∞" : state.player.ammo}`, WEAPONS[weapon].color, 850);
  blip(weapon === "laser" ? 880 : 360, .08);
}

function consumeAmmo() {
  const player = state.player;
  if (player.weapon === "pistol") return true;
  player.ammo -= 1;
  if (player.ammo <= 0) {
    player.weapon = "pistol";
    player.ammo = Infinity;
    banner("MUNICIÓN AGOTADA · PISTOLA", "#f6f1de", 850);
  }
  return true;
}

function fire() {
  const player = state.player;
  if (player.fireCooldown > 0 || state.status !== "playing") return;
  if (state.van.boarded) { fireVanBeam(); return; }
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.pistol;
  if (player.weapon !== "pistol" && player.ammo <= 0) { equipWeapon("pistol"); return; }
  player.fireCooldown = weapon.fireRate;
  player.weaponFlash = .1;
  player.poseKind = "fire";
  player.poseUntil = state.elapsed + .34;
  const startX = player.x + (player.facing > 0 ? player.w : -10);
  const startY = player.y + 46;
  if (player.weapon === "machinegun") {
    state.bullets.push({ x: startX, y: startY + (Math.random() - .5) * 14, vx: player.facing * 790, vy: 0, w: 22, h: 7, life: 1.05, friendly: true, damage: weapon.damage, color: weapon.color });
  } else if (player.weapon === "bomb") {
    state.bullets.push({ x: startX, y: startY, vx: player.facing * 330, vy: -450, gravity: 940, w: 18, h: 18, life: 2.1, friendly: true, damage: weapon.damage, bomb: true, color: weapon.color });
  } else if (player.weapon === "rocket") {
    state.bullets.push({ x: startX, y: startY, vx: player.facing * 560, vy: 0, w: 28, h: 12, life: 1.8, friendly: true, damage: weapon.damage, rocket: true, color: weapon.color });
  } else if (player.weapon === "laser") {
    state.bullets.push({ x: startX + player.facing * 95, y: startY, vx: player.facing, vy: 0, w: 190, h: 10, life: .12, friendly: true, damage: weapon.damage, laser: true, color: weapon.color });
  } else {
    state.bullets.push({ x: startX, y: startY, vx: player.facing * 650, vy: 0, w: 20, h: 8, life: 1.15, friendly: true, damage: weapon.damage, color: weapon.color });
  }
  consumeAmmo();
  blip(player.weapon === "laser" ? 920 : player.weapon === "rocket" ? 180 : 520, player.weapon === "machinegun" ? .018 : .035);
}

function fireVanBeam() {
  const van = state.van;
  if (!van.boarded || van.destroyed || van.beamCooldown > 0) return;
  const { vanW, y } = vanLayout(van.x);
  van.beamCooldown = .58;
  state.player.weaponFlash = .18;
  state.player.poseKind = "fire";
  state.player.poseUntil = state.elapsed + .28;
  state.bullets.push({ x: van.x + vanW * .83, y: y + 178, vx: 1040, vy: 0, w: 360, h: 34, life: .24, friendly: true, damage: 54, laser: true, vanBeam: true, color: "#7dff38" });
  spark(van.x + vanW * .8, y + 178, "#7dff38", 16);
  banner("¡RAYO DE LOS ALTAVOCES!", "#7dff38", 650);
  blip(1040, .16);
}

function detonate(x, y, damage, radius, color) {
  spark(x, y, color, 22);
  smoke(x, y, 8, color);
  state.cameraShake = Math.max(state.cameraShake, Math.min(20, radius / 8));
  state.particles.push({ x, y, vx: 0, vy: 0, life: .22, maxLife: .22, color, size: radius * .35, blast: radius });
  state.enemies.forEach((enemy) => {
    if (distance(enemy.x + enemy.w / 2, x) <= radius) { enemy.hp -= damage; enemy.hit = .24; }
  });
  state.props.forEach((prop) => {
    if (prop.hp > 0 && distance(prop.x + prop.w / 2, x) <= radius) prop.hp -= Math.round(damage * .75);
  });
}

function special() {
  const player = state.player;
  if (player.energy < 42 || player.specialCooldown > 0 || state.status !== "playing") return;
  player.energy -= 42;
  player.specialCooldown = 1.1;
  player.poseKind = "heavyFire";
  player.poseUntil = state.elapsed + .48;
  if (state.hero.id === "xuso") {
    const target = [...state.enemies].filter((enemy) => enemy.hp > 0).sort((a, b) => distance(a.x, player.x) - distance(b.x, player.x))[0];
    const direction = target ? (target.x >= player.x ? 1 : -1) : player.facing;
    state.bullets.push({ x: player.x + player.w / 2 + direction * 46, y: player.y + 44, vx: direction * 740, vy: 0, w: 78, h: 58, life: 1.3, friendly: true, damage: 42, dog: true, color: state.hero.color });
    banner("¡SPOOKY, AL ATAQUE!", state.hero.specialColor, 1000);
    blip(230, .12);
    return;
  }
  if (state.hero.id === "rafeta") {
    const direction = player.facing;
    state.bullets.push({ x: player.x + player.w / 2 + direction * 58, y: player.y + 48, vx: direction * 680, vy: -18, w: 108, h: 78, life: 1.15, friendly: true, damage: 38, flag: true, color: state.hero.color });
    banner("¡EMBESTIDA DEL ESTANDARTE!", state.hero.specialColor, 1000);
    blip(250, .18);
    return;
  }
  if (state.hero.id === "nova") {
    const direction = player.facing;
    state.bullets.push({ x: player.x + player.w / 2 + direction * 58, y: player.y + 46, vx: direction * 820, vy: 0, w: 168, h: 30, life: 1.05, friendly: true, damage: 52, laser: true, color: state.hero.color, prism: true });
    banner("¡RÁFAGA PRISMÁTICA!", state.hero.specialColor, 1000);
    blip(980, .2);
    return;
  }
  banner(state.hero.specialText, state.hero.specialColor, 950);
  blip(state.hero.id === "rafeta" ? 90 : 160, .16);
  const area = state.hero.id === "bomba" ? 260 : 610;
  state.enemies.forEach((enemy) => {
    if (distance(enemy.x, player.x) < area) { enemy.hp -= state.hero.id === "bomba" ? 38 : 28; enemy.hit = .24; spark(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, state.hero.color, 16); }
  });
}

function activateVan() {
  if (!state || state.van.active || state.van.charged || state.van.destroyed || distance(state.player.x, VAN_X + 310) > 360) return;
  state.van.active = true;
  state.van.boarded = true;
  state.van.x = VAN_X;
  state.van.vx = 135;
  state.van.driverId = state.hero.id;
  state.van.roofRiderId = characters.some((hero) => hero.id === requestedFighter2) && requestedFighter2 !== state.hero.id
    ? requestedFighter2
    : (state.hero.id === "xuso" ? "bomba" : "xuso");
  state.van.charge = 0;
  state.van.waveClock = 0;
  state.van.pulseCooldown = 1.6;
  state.van.bursts = 0;
  ui.objective.textContent = "PROTEGE LA FURGONETA";
  banner("¡SUBE A LA FURGONETA! · P1 CONDUCE · P2 AL TECHO", "#7dff38", 2200);
  for (let index = 0; index < 4; index += 1) spawnEnemy(VAN_X - 480 + index * 185, index === 3 ? "speaker" : index === 1 ? "bottle" : index === 2 ? "grenadier" : "soldier");
  blip(58, .28);
}

function hurtPlayer(damage) {
  const player = state.player;
  if (player.invincible > 0) return;
  player.hp -= damage;
  player.invincible = 1.05;
  player.poseKind = "hit";
  player.poseUntil = state.elapsed + .38;
  state.cameraShake = Math.max(state.cameraShake, 8);
  state.hitFlash = .12;
  spark(player.x + player.w / 2, player.y + player.h / 2, "#ff5670", 16);
  blip(80, .09);
  if (player.hp <= 0) {
    player.lives -= 1;
    if (player.lives <= 0) { completeMission(false); return; }
    player.hp = 100;
    player.x = state.checkpoint ? state.checkpoint : 100;
    player.y = terrainAt(player.x) - player.h;
    player.vx = 0; player.vy = 0;
    state.enemies = state.enemies.filter((enemy) => enemy.x > player.x + 120 || enemy.x < player.x - 800);
    banner("VUELVES A LA RUTA", "#ffb449", 1200);
  }
}

function spark(x, y, color, count = 8) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 155;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30, life: .35 + Math.random() * .4, maxLife: .7, color, size: 2 + Math.random() * 4 });
  }
}

function smoke(x, y, count = 5, color = "#8e978e") {
  for (let index = 0; index < count; index += 1) {
    const size = 12 + Math.random() * 22;
    state.particles.push({ kind: "smoke", x: x + (Math.random() - .5) * 34, y: y + (Math.random() - .5) * 20, vx: (Math.random() - .5) * 42, vy: -22 - Math.random() * 58, life: .55 + Math.random() * .55, maxLife: 1.1, color, size });
  }
}

function dust(x, y, count = 5) {
  for (let index = 0; index < count; index += 1) {
    state.particles.push({ kind: "dust", x: x + (Math.random() - .5) * 40, y, vx: (Math.random() - .5) * 90, vy: -25 - Math.random() * 55, life: .3 + Math.random() * .25, maxLife: .55, color: "#c2a776", size: 4 + Math.random() * 7 });
  }
}

function vanWorldX() { return state?.van?.x ?? VAN_X; }

function vanLayout(worldX) {
  const vanW = 610;
  const vanH = 395;
  const y = terrainAt(worldX + vanW / 2) - vanH + 18;
  return { vanW, vanH, y, driverGround: y + 315, roofGround: y + 78 };
}

function updateVanRide(dt) {
  const van = state.van;
  const player = state.player;
  const steering = Number(input.right) - Number(input.left);
  van.vx += steering * 620 * dt;
  if (!steering) van.vx += 38 * dt;
  van.vx *= Math.pow(.35, dt);
  van.vx = clamp(van.vx, -70, 340);
  van.x = clamp(van.x + van.vx * dt, VAN_X, EXIT_X + 640);
  const layout = vanLayout(van.x);
  player.x = van.x + layout.vanW * .5 - player.w * .5;
  player.y = layout.driverGround - player.h;
  player.vx = van.vx;
  player.vy = 0;
  player.landed = true;
  player.crouching = Boolean(input.crouch);
  player.facing = 1;
  player.run += dt * (8 + Math.abs(van.vx) * .025);
  state.camera += ((clamp(van.x + layout.vanW * .5 - W * .35, 0, WORLD_END - W)) - state.camera) * Math.min(1, dt * 4.4);
}

function damageVan(damage) {
  const van = state.van;
  if (!van.boarded || van.destroyed || van.hp <= 0) return;
  van.hp = clamp(van.hp - damage, 0, 100);
  van.damageFlash = .18;
  state.cameraShake = Math.max(state.cameraShake, damage > 14 ? 12 : 6);
  const layout = vanLayout(van.x);
  spark(van.x + layout.vanW * .54, layout.y + 170, damage > 14 ? "#ff7048" : "#ffb449", damage > 14 ? 12 : 6);
  if (Math.random() < .38) smoke(van.x + layout.vanW * .56, layout.y + 120, 3, "#5b625f");
  if (van.hp <= 0) {
    van.destroyed = true;
    van.active = false;
    van.boarded = false;
    van.vx = 0;
    state.player.x = van.x + layout.vanW * .5;
    state.player.y = terrainAt(state.player.x) - state.player.h;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.landed = true;
    state.player.hp = Math.max(1, state.player.hp - 35);
    detonate(van.x + layout.vanW * .54, layout.y + 210, 0, 185, "#ff7048");
    banner("¡FURGONETA DESTRUIDA! · SIGUE A PIE", "#ff7048", 1800);
    return;
  }
  if (van.hp <= 35) banner("¡ALTAVOCES CRÍTICOS!", "#ff7048", 650);
}

function sonicPulse() {
  const van = state.van;
  const { vanW, y } = vanLayout(van.x);
  const x = van.x + vanW * .58;
  state.bullets.push({ x, y: y + 186, vx: 0, vy: 0, w: 84, h: 84, life: .42, friendly: true, damage: 20, ring: true, pulse: true, color: "#4defff" });
  spark(x, y + 186, "#4defff", 10);
  blip(180, .08);
}

function update(dt) {
  if (!state || state.status !== "playing") return;
  state.elapsed += dt;
  state.cameraShake = Math.max(0, state.cameraShake - dt * 26);
  state.hitFlash = Math.max(0, state.hitFlash - dt);
  state.van.damageFlash = Math.max(0, state.van.damageFlash - dt);
  state.van.beamCooldown = Math.max(0, state.van.beamCooldown - dt);
  state.props.forEach((prop) => { prop.hit = Math.max(0, prop.hit - dt); });
  const player = state.player;
  if (input.fire) { fire(); input.fire = false; }
  if (input.special) { special(); input.special = false; }
  if (input.activate) { activateVan(); input.activate = false; }
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.specialCooldown = Math.max(0, player.specialCooldown - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.weaponFlash = Math.max(0, player.weaponFlash - dt);
  if (state.van.boarded) updateVanRide(dt);
  else {
  const wasLanded = player.landed;
  const moving = Number(input.right) - Number(input.left);
  player.vx += moving * 1900 * dt;
  if (!moving) player.vx *= Math.pow(.0005, dt);
  player.crouching = Boolean(input.crouch && player.landed);
  if (player.crouching) player.vx *= Math.pow(.06, dt);
  player.vx = clamp(player.vx, -290, 290);
  if (moving) { player.facing = moving > 0 ? 1 : -1; player.run += dt * 12; }
  if (input.jump && player.landed && !player.crouching) { player.vy = -590; player.landed = false; input.jump = false; blip(230, .045); }
  player.vy += 1450 * dt;
  player.x = clamp(player.x + player.vx * dt, 0, WORLD_END);
  player.y += player.vy * dt;
  player.landed = false;
  const support = supportAt(player.x + player.w / 2, player.y + player.h, player.vy);
  if (player.vy >= 0 && player.y + player.h >= support && player.y + player.h <= support + 120) {
    player.y = support - player.h; player.vy = 0; player.landed = true;
    if (!wasLanded) dust(player.x + player.w / 2, support, 7);
  }
  state.platforms.forEach((platform) => {
    const feet = player.y + player.h;
    if (player.vy >= 0 && player.x + player.w > platform.x && player.x < platform.x + platform.w && feet >= platform.y && feet <= platform.y + 26) {
      player.y = platform.y - player.h; player.vy = 0; player.landed = true;
    }
  });
  if (state.checkpoints.some((mark) => player.x >= mark && mark > state.checkpoint)) {
    state.checkpoint = Math.max(...state.checkpoints.filter((mark) => player.x >= mark));
    banner("PUNTO DE CONTROL", "#4defff", 900);
  }
  state.camera += ((clamp(player.x - W * .34, 0, WORLD_END - W)) - state.camera) * Math.min(1, dt * 3.7);
  }

  state.spawnClock -= dt;
  if (!state.van.active && state.spawnClock <= 0 && player.x < VAN_X - 600 && state.enemies.length < 7) { spawnOpeningWave(); state.spawnClock = 4.8 + Math.random() * 2.4; }
  // Show the interaction prompt only inside the same radius used by the
  // activation itself, so a visible F prompt never appears too early.
  state.van.prompt = !state.van.active && !state.van.charged && !state.van.destroyed && distance(player.x, VAN_X + 310) <= 360;

  if (state.van.active && !state.van.charged && !state.van.destroyed) {
    const movingVanX = vanWorldX();
    state.van.charge += dt;
    state.van.waveClock -= dt;
    state.van.pulseCooldown -= dt;
    if (state.van.pulseCooldown <= 0) {
      state.van.pulseCooldown = 2.15;
      sonicPulse();
    }
    if (state.van.waveClock <= 0 && state.van.bursts < 3) {
      state.van.bursts += 1;
      state.van.waveClock = 4.6;
      for (let index = 0; index < 3 + state.van.bursts; index += 1) {
        const specialType = index === 2 ? "speaker" : index === 4 ? "tanklet" : index % 3 === 1 ? "bottle" : index % 2 ? "grenadier" : "soldier";
        spawnEnemy(movingVanX - 500 + index * 145, specialType);
      }
      banner(`OLEADA ${state.van.bursts}/3`, "#ffb449", 750);
    }
    if (state.van.bursts >= 3 && !state.finaleSpawned) {
      state.finaleSpawned = true;
      state.finalBossType = FINAL_BOSSES[Math.floor(Math.random() * FINAL_BOSSES.length)];
      spawnEnemy(movingVanX + 500, state.finalBossType);
      const bossLabel = BOSS_SPRITE_FRAMES[state.finalBossType]?.label ?? (state.finalBossType === "juiceboss" ? "CAMPEÓN DEL ZUMO" : "MAESTRO DEL ESPRAY");
      banner(`¡${bossLabel}!`, BOSS_SPRITE_FRAMES[state.finalBossType]?.color ?? "#ff8a35", 1500);
      blip(72, .25);
    }
    if (state.van.bursts >= 3 && state.enemies.length === 0 && state.van.charge > 11) {
      state.van.charged = true;
      ui.objective.textContent = "ESCAPA POR LA RUTA NORTE";
      banner("¡RUTA DE ESCAPE ABIERTA!", "#7dff38", 1600);
      state.score += 1500;
      blip(740, .24);
    }
  }
  if ((state.van.charged || state.van.destroyed) && (state.van.boarded ? state.van.x >= EXIT_X : player.x >= EXIT_X)) { completeMission(true); return; }

  updateBullets(dt);
  updateEnemies(dt);
  updateDeathSprites(dt);
  updateParticles(dt);
  updatePickups(dt);
  ui.vanPrompt.classList.toggle("hidden", !state.van.prompt);
  updateHud();
}

function updateBullets(dt) {
  const player = state.player;
  state.bullets = state.bullets.filter((bullet) => {
    bullet.life -= dt; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
    if (bullet.gravity) { bullet.vy += bullet.gravity * dt; }
    if (bullet.ring) { bullet.w += 180 * dt; bullet.h += 180 * dt; bullet.life -= dt * .3; }
    if (bullet.friendly) {
      if (bullet.bomb && bullet.y >= terrainAt(bullet.x) - 8) { detonate(bullet.x, terrainAt(bullet.x) - 8, bullet.damage, 150, bullet.color); return false; }
      for (const prop of state.props) {
        const hitbox = { x: bullet.x - bullet.w / 2, y: bullet.y - bullet.h / 2, w: bullet.w, h: bullet.h };
        if (prop.hp > 0 && rectsOverlap(hitbox, prop)) {
          prop.hp -= bullet.rocket || bullet.bomb ? bullet.damage : bullet.damage * .7;
          prop.hit = .18;
          spark(bullet.x, bullet.y, bullet.color, 6);
          if (prop.hp <= 0) { detonate(prop.x + prop.w / 2, prop.y + prop.h / 2, 12, 94, prop.kind === "barrel" ? "#ff9a31" : "#caa56a"); state.score += 80; }
          if (!bullet.ring && !bullet.pulse && !bullet.laser) bullet.life = 0;
          return bullet.life > 0;
        }
      }
      for (const enemy of state.enemies) {
        const hitbox = { x: bullet.x - bullet.w / 2, y: bullet.y - bullet.h / 2, w: bullet.w, h: bullet.h };
        if (enemy.hp > 0 && rectsOverlap(hitbox, enemy)) {
          if (bullet.rocket || bullet.bomb) detonate(bullet.x, bullet.y, bullet.damage, bullet.rocket ? 128 : 150, bullet.color);
          else { enemy.hp -= bullet.damage; enemy.hit = .16; spark(bullet.x, bullet.y, bullet.color, 6); }
          if (!bullet.ring && !bullet.pulse && !bullet.laser) bullet.life = 0;
          break;
        }
      }
    } else {
      const bulletBox = { x: bullet.x, y: bullet.y, w: bullet.w, h: bullet.h };
      if (state.van.boarded) {
        const layout = vanLayout(state.van.x);
        const vanBox = { x: state.van.x + 48, y: layout.y + 36, w: layout.vanW - 90, h: layout.vanH - 70 };
        if (rectsOverlap(bulletBox, vanBox)) {
          damageVan(bullet.explosive ? 18 : bullet.tankShell ? 20 : 8);
          if (bullet.explosive) detonate(bullet.x, bullet.y, 0, 74, bullet.color);
          return false;
        }
      }
      if (rectsOverlap(bulletBox, player)) {
        hurtPlayer(bullet.explosive ? 24 : bullet.tankShell ? 20 : 13);
        if (bullet.explosive) detonate(bullet.x, bullet.y, 0, 74, bullet.color);
        return false;
      }
    }
    return bullet.life > 0 && bullet.x > state.camera - 200 && bullet.x < state.camera + W + 250;
  });
}

function weaponDropFor(enemy) {
  if (["sprayboss", "rockboss", "birdboss"].includes(enemy.type)) return "laser";
  if (["juiceboss", "wolfboss"].includes(enemy.type) || enemy.type === "brute") return "rocket";
  if (enemy.type === "drumboss") return "machinegun";
  if (enemy.type === "tanklet") return "machinegun";
  if (enemy.type === "bottle") return "bomb";
  if (enemy.type === "speaker" || enemy.type === "turret") return "laser";
  const roll = Math.random();
  if (roll < .16) return "machinegun";
  if (roll < .25) return "bomb";
  return null;
}

function updateEnemies(dt) {
  const player = state.player;
  state.enemies.forEach((enemy) => {
    enemy.hit = Math.max(0, enemy.hit - dt);
    enemy.dir = player.x < enemy.x ? -1 : 1;
    const gap = distance(player.x, enemy.x);
    enemy.phase += dt;
    const stationary = ["turret", "tanklet", "sprayboss", "rockboss"].includes(enemy.type);
    const bodySeparation = (player.w + enemy.w) * .5 + 30;
    if (!stationary && gap < 620 && gap > bodySeparation) enemy.x += enemy.dir * enemy.speed * dt;
    if (enemy.type === "grenadier" && gap < 250) enemy.x -= enemy.dir * 40 * dt;
    enemy.y = terrainAt(enemy.x) - enemy.h;
    enemy.shot -= dt;
    if (gap < 530 && enemy.shot <= 0) {
      enemy.shot = enemy.type === "sprayboss" ? 1.15 : enemy.type === "rockboss" ? 1.65 : enemy.type === "birdboss" ? 1.35 : enemy.type === "wolfboss" ? 1.08 : enemy.type === "drumboss" ? .9 : enemy.type === "tanklet" ? 2.1 : enemy.type === "turret" ? 1.15 : enemy.type === "speaker" ? .68 : enemy.type === "grenadier" ? 1.7 : 1.4 + Math.random() * .8;
      if (enemy.type === "sprayboss") {
        for (let sprayIndex = 0; sprayIndex < 5; sprayIndex += 1) {
          state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -12 : enemy.w + 12), y: enemy.y + 72 + (sprayIndex - 2) * 12, vx: enemy.dir * (290 + sprayIndex * 22), vy: (sprayIndex - 2) * 26, w: 24, h: 18, life: 3, friendly: false, spray: true, color: sprayIndex % 2 ? "#4defff" : "#ff9a31" });
        }
      } else if (enemy.type === "juiceboss") {
        for (let bottleIndex = 0; bottleIndex < 4; bottleIndex += 1) {
          state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -12 : enemy.w + 12), y: enemy.y + 68 - bottleIndex * 8, vx: enemy.dir * (265 + bottleIndex * 34), vy: -150 + bottleIndex * 62, w: 26, h: 34, life: 3, friendly: false, waterBottle: true, gravity: 475, color: "#4defff" });
        }
      } else if (enemy.type === "rockboss") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -20 : enemy.w + 20), y: enemy.y + 108, vx: enemy.dir * 360, vy: 0, w: 260, h: 44, life: 1.2, friendly: false, rockBeam: true, laser: true, color: "#7dff38" });
      } else if (enemy.type === "birdboss") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -12 : enemy.w + 12), y: enemy.y + 84, vx: enemy.dir * 330, vy: -45, w: 92, h: 92, life: 1.5, friendly: false, birdWave: true, ring: true, color: "#ff9a31" });
      } else if (enemy.type === "wolfboss") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -18 : enemy.w + 18), y: enemy.y + 74, vx: enemy.dir * 390, vy: 0, w: 160, h: 84, life: 1.45, friendly: false, howl: true, explosive: true, color: "#ff3f75" });
      } else if (enemy.type === "drumboss") {
        for (let beat = -1; beat <= 1; beat += 1) {
          state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -12 : enemy.w + 12), y: enemy.y + 86, vx: enemy.dir * (290 + Math.abs(beat) * 30), vy: beat * 150 - 45, w: 28, h: 28, life: 2.4, friendly: false, drumBeat: true, gravity: 360, color: "#f6c34a" });
        }
      } else if (enemy.type === "bottle") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -8 : enemy.w), y: enemy.y + 30, vx: enemy.dir * 280, vy: -115, w: 20, h: 28, life: 3, friendly: false, waterBottle: true, gravity: 475, color: "#4defff" });
      } else if (enemy.type === "grenadier") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -8 : enemy.w), y: enemy.y + 28, vx: enemy.dir * 240, vy: -365, w: 18, h: 18, life: 3.4, friendly: false, grenade: true, explosive: true, gravity: 850, color: "#a7ff50" });
      } else if (enemy.type === "tanklet") {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -15 : enemy.w + 15), y: enemy.y + 24, vx: enemy.dir * 285, vy: -85, w: 30, h: 22, life: 3.5, friendly: false, tankShell: true, explosive: true, gravity: 320, color: "#ff7c3a" });
      } else if (enemy.type === "turret") {
        for (let shot = -1; shot <= 1; shot += 1) {
          state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -8 : enemy.w + 8), y: enemy.y + 21 + shot * 9, vx: enemy.dir * 330, vy: shot * 24, w: 17, h: 8, life: 2.4, friendly: false, color: "#ff4b7c" });
        }
      } else {
        state.bullets.push({ x: enemy.x + (enemy.dir < 0 ? -8 : enemy.w), y: enemy.y + 28, vx: enemy.dir * (enemy.type === "speaker" ? 320 : 230), vy: 0, w: enemy.type === "speaker" ? 18 : 12, h: enemy.type === "speaker" ? 18 : 12, life: 3, friendly: false, color: "#ff4b7c" });
      }
    }
    const contactRange = ["sprayboss", "juiceboss", "rockboss", "birdboss", "wolfboss", "drumboss"].includes(enemy.type) ? 118 : enemy.type === "tanklet" ? 132 : bodySeparation + 8;
    if (gap < contactRange && Math.abs(player.y - enemy.y) < 82) {
      const contactDamage = ["sprayboss", "juiceboss", "rockboss", "birdboss", "wolfboss", "drumboss"].includes(enemy.type) ? 20 : enemy.type === "brute" || enemy.type === "tanklet" ? 16 : 9;
      if (state.van.boarded) damageVan(Math.ceil(contactDamage * .7));
      else hurtPlayer(contactDamage);
    }
  });
  const survivors = [];
  state.enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      if (BOSS_SPRITE_FRAMES[enemy.type]) state.deathSprites.push({ ...enemy, life: .72 });
      const isBoss = ["sprayboss", "juiceboss", "rockboss", "birdboss", "wolfboss", "drumboss"].includes(enemy.type);
      state.score += isBoss ? 1500 : enemy.type === "tanklet" ? 650 : enemy.type === "brute" ? 250 : enemy.type === "speaker" ? 180 : 100;
      player.energy = clamp(player.energy + (isBoss ? 30 : enemy.type === "tanklet" ? 22 : enemy.type === "brute" ? 18 : 10), 0, 100);
      spark(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.type === "speaker" ? "#4defff" : "#ffb449", 20);
      smoke(enemy.x + enemy.w / 2, enemy.y + enemy.h * .45, enemy.type === "tanklet" ? 14 : 5, enemy.type === "tanklet" ? "#7f8e7f" : "#8e978e");
      state.cameraShake = Math.max(state.cameraShake, enemy.type === "tanklet" ? 15 : 5);
      const weaponDrop = weaponDropFor(enemy);
      if (weaponDrop) state.pickups.push({ x: enemy.x + enemy.w / 2, y: terrainAt(enemy.x) - 44, type: "weapon", weapon: weaponDrop, life: 18, bob: Math.random() * 4 });
      if (Math.random() < .3) state.pickups.push({ x: enemy.x, y: enemy.y, type: Math.random() < .55 ? "energy" : "score", life: 10, bob: Math.random() * 4 });
    } else survivors.push(enemy);
  });
  state.enemies = survivors;
}

function updateDeathSprites(dt) {
  state.deathSprites = state.deathSprites.filter((sprite) => (sprite.life -= dt) > 0);
}

function updateParticles(dt) {
  state.particles = state.particles.filter((particle) => {
    particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt;
    if (particle.kind === "smoke") { particle.vx *= .98; particle.vy *= .98; particle.size += 12 * dt; }
    else { particle.vy += 300 * dt; }
    return particle.life > 0;
  });
}

function updatePickups(dt) {
  const player = state.player;
  state.pickups = state.pickups.filter((pickup) => {
    pickup.life -= dt; pickup.bob += dt * 4;
    if (distance(pickup.x, player.x) < 56 && Math.abs(pickup.y - player.y) < 100) {
      if (pickup.type === "weapon") equipWeapon(pickup.weapon);
      else if (pickup.type === "energy") { player.energy = clamp(player.energy + 25, 0, 100); banner("ENERGÍA +25", "#4defff", 500); }
      else state.score += 300;
      blip(820, .05); return false;
    }
    return pickup.life > 0;
  });
}

function updateHud() {
  const player = state.player;
  ui.health.style.width = `${clamp(player.hp, 0, 100)}%`;
  ui.energy.style.width = `${clamp(player.energy, 0, 100)}%`;
  ui.lives.textContent = String(player.lives).padStart(2, "0");
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.pistol;
  ui.weapon.textContent = `${weapon.label} · ${player.weapon === "pistol" ? "∞" : Math.max(0, player.ammo)}`;
  ui.weapon.style.color = weapon.color;
  ui.score.textContent = formatScore(state.score);
  if (state.van.boarded && !state.van.charged) ui.objective.textContent = `CONDUCE ${Math.min(100, Math.floor(state.van.charge / 11 * 100)).toString().padStart(2, "0")}% · VAN ${Math.ceil(state.van.hp)}%`;
  else if (state.van.active && !state.van.charged) ui.objective.textContent = `CARGA SONORA ${Math.min(100, Math.floor(state.van.charge / 11 * 100)).toString().padStart(2, "0")}%`;
  else if (state.van.destroyed) ui.objective.textContent = "FURGONETA CAÍDA · SIGUE A PIE";
}

function worldX(x) { return Math.round(x - state.camera); }

function draw() {
  if (!state) return;
  ctx.clearRect(0, 0, W, H);
  const shake = state.cameraShake > 0 ? state.cameraShake : 0;
  ctx.save();
  if (shake) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake * .55);
  drawSky();
  drawWorld();
  drawActors();
  drawForeground();
  ctx.restore();
  if (state.hitFlash > 0) { ctx.fillStyle = `rgba(255,48,76,${state.hitFlash * 1.8})`; ctx.fillRect(0, 0, W, H); }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#071827"); gradient.addColorStop(.56, "#102d3a"); gradient.addColorStop(1, "#221922");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  const moonX = 980 - state.camera * .045;
  const moon = ctx.createRadialGradient(moonX, 115, 6, moonX, 115, 130);
  moon.addColorStop(0, "rgba(212,255,225,.92)"); moon.addColorStop(.32, "rgba(107,255,191,.25)"); moon.addColorStop(1, "rgba(107,255,191,0)");
  ctx.fillStyle = moon; ctx.fillRect(moonX - 140, -20, 280, 275);
  ctx.fillStyle = "rgba(224,253,255,.7)";
  for (let index = 0; index < 42; index += 1) {
    const x = ((index * 173 + 65) - state.camera * (index % 3 ? .08 : .16)) % 1450;
    const y = 45 + (index * 71) % 290;
    ctx.fillRect(x < 0 ? x + 1450 : x, y, index % 5 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1);
  }
  const mountainLayer = (parallax, base, color, peak) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, base);
    for (let index = -2; index < 13; index += 1) {
      const x = index * 150 - (state.camera * parallax) % 150;
      ctx.lineTo(x + 75, base - peak - (index % 3) * 22);
      ctx.lineTo(x + 150, base);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  };
  mountainLayer(.08, 430, "#0b2630", 125);
  mountainLayer(.16, 492, "#10252c", 96);
  mountainLayer(.28, 555, "#17252a", 72);
  ctx.fillStyle = "#102d34";
  for (let index = 0; index < 17; index += 1) {
    const width = 70 + (index * 29) % 140;
    const height = 90 + (index * 47) % 190;
    const x = ((index * 188) - state.camera * .18) % 1700 - 100;
    const base = 560 + (index % 2) * 12;
    ctx.fillRect(x, base - height, width, height);
    ctx.fillStyle = "rgba(125,255,56,.12)";
    for (let window = 0; window < 4; window += 1) ctx.fillRect(x + 14 + window * 15, base - height + 18, 7, 10);
    ctx.fillStyle = "#102d34";
  }
  ctx.strokeStyle = "rgba(77,239,255,.24)"; ctx.lineWidth = 2;
  for (let tower = 0; tower < 5; tower += 1) {
    const x = ((tower * 320 + 130) - state.camera * .2) % 1500;
    ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x + 16, 335); ctx.lineTo(x + 34, 470); ctx.moveTo(x + 7, 405); ctx.lineTo(x + 27, 405); ctx.stroke();
  }
}

function drawMapLandmarks(left, right) {
  MAP_LANDMARKS.forEach((landmark) => {
    if (landmark.x < left - 520 || landmark.x > right + 520) return;
    const x = worldX(landmark.x);
    const base = Math.min(570, terrainAt(landmark.x) - 12);
    ctx.save();
    ctx.globalAlpha = .92;
    if (landmark.kind === "district") {
      ctx.fillStyle = "#111d28"; ctx.fillRect(x - 280, base - 300, 560, 300);
      ctx.fillStyle = "#203844"; for (let column = 0; column < 8; column += 1) ctx.fillRect(x - 250 + column * 72, base - 272 + (column % 2) * 28, 48, 220);
      ctx.fillStyle = landmark.accent; ctx.fillRect(x - 196, base - 198, 392, 58); ctx.fillStyle = "#071018"; ctx.font = "900 28px Arial"; ctx.textAlign = "center"; ctx.fillText(landmark.label, x, base - 160);
    } else if (landmark.kind === "tower") {
      ctx.strokeStyle = "#2d4e58"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x - 94, base); ctx.lineTo(x - 50, base - 292); ctx.lineTo(x + 38, base - 292); ctx.lineTo(x + 84, base); ctx.stroke();
      ctx.strokeStyle = landmark.accent; ctx.lineWidth = 4; for (let level = 0; level < 4; level += 1) { const y = base - 74 - level * 54; ctx.beginPath(); ctx.moveTo(x - 74 + level * 8, y); ctx.lineTo(x + 64 - level * 8, y); ctx.stroke(); }
      ctx.fillStyle = "#172a32"; ctx.fillRect(x - 130, base - 350, 260, 46); ctx.fillStyle = landmark.accent; ctx.font = "900 20px Arial"; ctx.textAlign = "center"; ctx.fillText(landmark.label, x, base - 318);
    } else if (landmark.kind === "factory" || landmark.kind === "warehouse") {
      const width = landmark.kind === "factory" ? 520 : 620;
      ctx.fillStyle = landmark.kind === "factory" ? "#1c2c32" : "#242936"; ctx.fillRect(x - width / 2, base - 230, width, 230);
      ctx.fillStyle = "#0b151b"; ctx.fillRect(x - width / 2 + 28, base - 188, width - 56, 78);
      ctx.fillStyle = "#708178"; for (let window = 0; window < 7; window += 1) ctx.fillRect(x - width / 2 + 52 + window * 68, base - 170, 38, 30);
      ctx.fillStyle = landmark.accent; ctx.fillRect(x - 150, base - 84, 300, 38); ctx.fillStyle = "#071018"; ctx.font = "900 22px Arial"; ctx.textAlign = "center"; ctx.fillText(landmark.label, x, base - 56);
      if (landmark.kind === "factory") { ctx.fillStyle = "#344950"; ctx.fillRect(x + 126, base - 318, 56, 88); ctx.fillRect(x + 218, base - 370, 62, 140); ctx.fillStyle = "rgba(186,197,180,.22)"; ctx.beginPath(); ctx.arc(x + 152, base - 342 - Math.sin(state.elapsed * 1.5) * 8, 38, 0, Math.PI * 2); ctx.arc(x + 250, base - 400 - Math.sin(state.elapsed * 1.2) * 11, 44, 0, Math.PI * 2); ctx.fill(); }
    } else if (landmark.kind === "bridge") {
      ctx.strokeStyle = "#304d57"; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x - 360, base - 220); ctx.lineTo(x - 220, base - 90); ctx.lineTo(x + 250, base - 90); ctx.lineTo(x + 370, base - 220); ctx.stroke();
      ctx.strokeStyle = landmark.accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 320, base - 232); ctx.lineTo(x - 200, base - 122); ctx.lineTo(x + 225, base - 122); ctx.lineTo(x + 332, base - 232); ctx.stroke();
      ctx.fillStyle = "#0b151b"; ctx.fillRect(x - 150, base - 294, 300, 42); ctx.fillStyle = landmark.accent; ctx.font = "900 20px Arial"; ctx.textAlign = "center"; ctx.fillText(landmark.label, x, base - 266);
    } else if (landmark.kind === "gate") {
      ctx.fillStyle = "#273c41"; ctx.fillRect(x - 240, base - 280, 62, 280); ctx.fillRect(x + 178, base - 280, 62, 280); ctx.fillRect(x - 240, base - 280, 480, 32);
      ctx.fillStyle = landmark.accent; ctx.fillRect(x - 168, base - 194, 336, 52); ctx.fillStyle = "#071018"; ctx.font = "900 24px Arial"; ctx.textAlign = "center"; ctx.fillText(landmark.label, x, base - 160);
      ctx.strokeStyle = landmark.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 176, base - 118); ctx.lineTo(x + 176, base - 118); ctx.stroke();
    }
    ctx.restore();
  });
}

function drawRoadsideDetails(left, right) {
  const start = Math.floor(left / 240) * 240;
  for (let world = start; world < right; world += 240) {
    const x = worldX(world + 120);
    const ground = terrainAt(world + 120);
    if (x < -80 || x > W + 80) continue;
    const tilt = Math.atan2(terrainAt(world + 132) - ground, 12);
    ctx.save(); ctx.translate(x, ground); ctx.rotate(tilt);
    ctx.fillStyle = world % 480 === 0 ? "#c8543f" : "#d0ad54"; ctx.fillRect(-22, -74, 44, 28);
    ctx.fillStyle = "#3f4642"; ctx.fillRect(-3, -46, 6, 46);
    ctx.fillStyle = "rgba(125,255,56,.55)"; ctx.fillRect(-16, -68, 32, 4);
    ctx.restore();
  }
  for (let world = Math.floor(left / 170) * 170; world < right; world += 170) {
    const x = worldX(world + 22); const ground = terrainAt(world + 22);
    if (x < -60 || x > W + 60) continue;
    ctx.fillStyle = "#171d22"; ctx.fillRect(x, ground - 32, 12, 32); ctx.fillStyle = world % 340 ? "#ffb449" : "#ff3f75"; ctx.fillRect(x - 4, ground - 38, 20, 7);
  }
}

function drawWorld() {
  const left = Math.max(0, state.camera - 60); const right = Math.min(WORLD_END, state.camera + W + 60);
  drawMapLandmarks(left, right);
  ctx.beginPath(); ctx.moveTo(worldX(left), H);
  for (let x = left; x <= right; x += 18) ctx.lineTo(worldX(x), terrainAt(x));
  ctx.lineTo(worldX(right), H); ctx.closePath(); ctx.fillStyle = "#24242a"; ctx.fill();
  ctx.beginPath();
  for (let x = left; x <= right; x += 12) { const y = terrainAt(x); if (x === left) ctx.moveTo(worldX(x), y); else ctx.lineTo(worldX(x), y); }
  ctx.strokeStyle = "#86a06b"; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath();
  for (let x = left; x <= right; x += 12) { const y = terrainAt(x) + 13; if (x === left) ctx.moveTo(worldX(x), y); else ctx.lineTo(worldX(x), y); }
  ctx.strokeStyle = "rgba(6,10,14,.78)"; ctx.lineWidth = 24; ctx.stroke();
  for (let x = Math.floor(left / 96) * 96; x < right; x += 96) {
    const sx = worldX(x); const y = terrainAt(x) + 39;
    ctx.fillStyle = x % 192 ? "rgba(203,188,137,.36)" : "rgba(125,255,56,.26)";
    ctx.save(); ctx.translate(sx, y); ctx.rotate(Math.atan2(terrainAt(x + 10) - terrainAt(x), 10)); ctx.fillRect(0, 0, 52, 5); ctx.restore();
  }
  state.platforms.forEach((platform) => {
    const x = worldX(platform.x); if (x + platform.w < -80 || x > W + 80) return;
    ctx.fillStyle = "#3c3d42"; ctx.fillRect(x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#7dff38"; ctx.fillRect(x, platform.y, platform.w, 4);
    ctx.fillStyle = "rgba(0,0,0,.38)"; ctx.fillRect(x + 10, platform.y + 8, platform.w - 20, 5);
  });
  drawRoadsideDetails(left, right);
  drawVehicles();
  drawProps();
  const vanScreenX = worldX(vanWorldX());
  if (vanScreenX > -780 && vanScreenX < W + 160) drawVan(vanScreenX);
  const exit = worldX(EXIT_X);
  if (exit > -100 && exit < W + 100) {
    ctx.fillStyle = state.van.charged ? "#7dff38" : "#5c1924";
    ctx.fillRect(exit, 280, 12, terrainAt(EXIT_X) - 280);
    ctx.fillStyle = "#f6f1de"; ctx.font = "18px Impact"; ctx.fillText(state.van.charged ? "SALIDA" : "BLOQUEADO", exit - 35, 264);
  }
}

function drawProps() {
  state.props.forEach((prop) => {
    if (prop.hp <= 0) return;
    const x = worldX(prop.x);
    if (x + prop.w < -80 || x > W + 80) return;
    const hit = prop.hit > 0;
    ctx.save();
    ctx.translate(x + prop.w / 2, prop.y + prop.h / 2);
    if (prop.kind === "barrel") {
      ctx.fillStyle = hit ? "#fff2be" : "#b74e3c"; ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.fillStyle = "#e2af4b"; ctx.fillRect(-prop.w / 2, -prop.h / 2 + 10, prop.w, 8); ctx.fillRect(-prop.w / 2, prop.h / 2 - 18, prop.w, 8);
      ctx.fillStyle = "#5e251f"; ctx.font = "900 12px Arial"; ctx.textAlign = "center"; ctx.fillText("!", 0, 6);
    } else if (prop.kind === "antenna") {
      ctx.strokeStyle = hit ? "#fff2be" : "#9ba795"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, prop.h / 2); ctx.lineTo(0, -prop.h / 2); ctx.stroke();
      ctx.strokeStyle = "#ff4b7c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -prop.h / 2 + 8, 25 + Math.sin(state.elapsed * 5) * 5, Math.PI, 0); ctx.stroke();
    } else {
      ctx.fillStyle = hit ? "#fff2be" : "#aa7543"; ctx.fillRect(-prop.w / 2, -prop.h / 2, prop.w, prop.h);
      ctx.strokeStyle = "#513324"; ctx.lineWidth = 4; ctx.strokeRect(-prop.w / 2 + 4, -prop.h / 2 + 4, prop.w - 8, prop.h - 8);
      ctx.beginPath(); ctx.moveTo(-prop.w / 2 + 7, -prop.h / 2 + 7); ctx.lineTo(prop.w / 2 - 7, prop.h / 2 - 7); ctx.moveTo(prop.w / 2 - 7, -prop.h / 2 + 7); ctx.lineTo(-prop.w / 2 + 7, prop.h / 2 - 7); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x, prop.y - 9, prop.w, 4); ctx.fillStyle = prop.kind === "barrel" ? "#ff8c39" : "#7dff38"; ctx.fillRect(x, prop.y - 9, prop.w * clamp(prop.hp / prop.maxHp, 0, 1), 4);
  });
}

function drawVehicles() {
  VEHICLES.forEach((vehicle) => {
    const x = worldX(vehicle.x);
    if (x + vehicle.w < -120 || x > W + 120) return;
    drawVehicle(vehicle, x, vehicleTop(vehicle));
  });
}

function drawVehicle(vehicle, x, top) {
  const base = terrainAt(vehicle.x + vehicle.w * .5);
  ctx.save(); ctx.translate(x + vehicle.w / 2, base); ctx.rotate(vehicle.tilt);
  ctx.fillStyle = "rgba(0,0,0,.42)"; ctx.beginPath(); ctx.ellipse(0, 9, vehicle.w * .52, 18, 0, 0, Math.PI * 2); ctx.fill();
  if (vehicle.kind === "tank") {
    ctx.fillStyle = "#31423d"; ctx.fillRect(-vehicle.w / 2, -45, vehicle.w, 39);
    ctx.fillStyle = "#111a1d"; ctx.fillRect(-vehicle.w / 2 - 8, -13, vehicle.w + 16, 24);
    ctx.fillStyle = "#6b7651"; for (let wheel = -2; wheel <= 2; wheel += 1) { ctx.beginPath(); ctx.arc(wheel * 42, -1, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#4f5c45"; ctx.fillRect(-52, -71, 105, 27); ctx.fillRect(-11, -91, 70, 19);
    ctx.fillStyle = "#222b29"; ctx.fillRect(44, -87, 104, 9);
    ctx.strokeStyle = "#a47a42"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-vehicle.w / 2 + 25, -52); ctx.lineTo(vehicle.w / 2 - 12, -52); ctx.stroke();
  } else if (vehicle.kind === "truck" || vehicle.kind === "bus") {
    const cab = vehicle.kind === "bus" ? 76 : 88;
    ctx.fillStyle = vehicle.kind === "bus" ? "#48544d" : "#4b514a"; ctx.fillRect(-vehicle.w / 2, -vehicle.h + 12, vehicle.w, vehicle.h - 22);
    ctx.fillStyle = "#131b1d"; ctx.fillRect(-vehicle.w / 2 + cab, -vehicle.h + 28, vehicle.w - cab - 18, 42);
    ctx.fillStyle = "#8ea49a"; for (let window = 0; window < (vehicle.kind === "bus" ? 5 : 3); window += 1) ctx.fillRect(-vehicle.w / 2 + cab + 10 + window * 41, -vehicle.h + 36, 27, 24);
    ctx.fillStyle = "#a66b3a"; ctx.fillRect(-vehicle.w / 2 + 8, -vehicle.h + 58, cab - 16, 44);
    ctx.fillStyle = "#dfbd52"; ctx.fillRect(-vehicle.w / 2, -38, vehicle.w, 9);
    ctx.fillStyle = "#1b2224"; for (const wheel of [-vehicle.w * .32, vehicle.w * .28]) { ctx.beginPath(); ctx.arc(wheel, -7, 23, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#8e9385"; ctx.beginPath(); ctx.arc(wheel, -7, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1b2224"; }
    ctx.strokeStyle = "#ffb449"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(vehicle.w * .2, -vehicle.h + 5); ctx.lineTo(vehicle.w * .28, -vehicle.h - 36); ctx.stroke();
  } else {
    ctx.fillStyle = "#42504d"; ctx.fillRect(-vehicle.w / 2, -58, vehicle.w, 44);
    ctx.fillStyle = "#8e9a91"; ctx.fillRect(-vehicle.w / 2 + 34, -50, 60, 22); ctx.fillRect(24, -50, 54, 22);
    ctx.fillStyle = "#20292a"; for (const wheel of [-vehicle.w * .31, vehicle.w * .31]) { ctx.beginPath(); ctx.arc(wheel, -7, 19, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#9a9f90"; ctx.beginPath(); ctx.arc(wheel, -7, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#20292a"; }
    ctx.fillStyle = "#b04b3d"; ctx.fillRect(vehicle.w * .31, -42, 16, 8);
    ctx.strokeStyle = "#c7a64f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-vehicle.w * .18, -56); ctx.lineTo(-vehicle.w * .1, -83); ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,180,73,.45)"; ctx.fillRect(-vehicle.w * .42, -vehicle.h + 7, 24, 5);
  ctx.fillStyle = "rgba(125,255,56,.25)"; ctx.fillRect(vehicle.w * .2, -vehicle.h + 7, 34, 5);
  ctx.restore();
  ctx.fillStyle = "rgba(186,197,180,.22)"; ctx.beginPath(); ctx.arc(x + vehicle.w * .58, top - 28 - Math.sin(state.elapsed * 1.8 + vehicle.x) * 5, 18, 0, Math.PI * 2); ctx.fill();
}

function drawVan(x) {
  const active = state.van.active && !state.van.charged && !state.van.destroyed;
  const image = art.van;
  const { vanW, vanH, y, driverGround, roofGround } = vanLayout(vanWorldX());
  if (active) {
    const glow = ctx.createRadialGradient(x + vanW / 2, y + 170, 30, x + vanW / 2, y + 170, 440);
    glow.addColorStop(0, "rgba(125,255,56,.38)"); glow.addColorStop(1, "rgba(125,255,56,0)"); ctx.fillStyle = glow; ctx.fillRect(x - 120, y - 110, vanW + 240, vanH + 210);
  }
  if (image.complete) {
    // Keep the supplied rear photo orientation: the speaker wall leads the
    // route while the cab trails behind it.
    ctx.drawImage(image, 0, y, vanW, vanH);
  }
  else { ctx.fillStyle = "#17252b"; ctx.fillRect(x, y + 120, vanW, 230); }
  if (state.van.damageFlash > 0 || state.van.destroyed) {
    ctx.fillStyle = state.van.destroyed ? "rgba(255,58,56,.32)" : `rgba(255,112,72,${state.van.damageFlash * 1.7})`;
    ctx.fillRect(x + 20, y + 28, vanW - 40, vanH - 56);
  }
  const labelX = x + 168;
  ctx.fillStyle = "rgba(2,11,12,.82)"; ctx.fillRect(labelX, y + 320, 280, 34);
  ctx.fillStyle = state.van.destroyed ? "#ff7048" : "#7dff38"; ctx.font = "20px Impact"; ctx.fillText(state.van.destroyed ? "FURGONETA DESTROZADA" : state.van.charged ? "FURGONETA LISTA" : active ? "CARGANDO SONIDO" : "FURGONETA RESONANTE", labelX + 14, y + 343);
  if (active) {
    const ratio = clamp(state.van.charge / 11, 0, 1);
    ctx.fillStyle = "#0a1515"; ctx.fillRect(labelX, y + 361, 280, 8);
    ctx.fillStyle = "#7dff38"; ctx.fillRect(labelX, y + 361, 280 * ratio, 8);
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.strokeStyle = `rgba(77,239,255,${.35 - ring * .08})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x + 309, y + 190, 90 + ring * 52 + Math.sin(state.elapsed * 7 + ring) * 10, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (state.van.boarded) {
    const driverPose = heroPoseFor(state.player);
    drawCharacterSprite(state.van.driverId, x + vanW * .54, driverGround, 1, driverPose, .84, 1);
    drawCharacterSprite(state.van.roofRiderId, x + vanW * .43, roofGround, 1, "idle", .68, .96);
    ctx.fillStyle = "rgba(3,8,12,.78)"; ctx.fillRect(x + vanW * .33, y + 44, 188, 22);
    ctx.fillStyle = "#7dff38"; ctx.font = "14px Impact"; ctx.textAlign = "center"; ctx.fillText("P1 · CONDUCTOR", x + vanW * .54, y + 60); ctx.fillText("P2 · TECHO", x + vanW * .43, y + 88); ctx.textAlign = "left";
  }
}

function drawActors() {
  state.pickups.forEach((pickup) => {
    const x = worldX(pickup.x), y = pickup.y + Math.sin(pickup.bob) * 9;
    const weapon = pickup.type === "weapon" ? WEAPONS[pickup.weapon] : null;
    ctx.save(); ctx.translate(x, y); ctx.rotate(pickup.type === "weapon" ? 0 : pickup.bob);
    ctx.fillStyle = weapon?.color ?? (pickup.type === "energy" ? "#4defff" : "#ffb449");
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = weapon ? 18 : 8;
    ctx.fillRect(-14, -14, 28, 28); ctx.shadowBlur = 0;
    ctx.fillStyle = "#071018"; ctx.font = "900 13px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(weapon ? ({ machinegun: "M", bomb: "B", rocket: "R", laser: "L" }[pickup.weapon]) : pickup.type === "energy" ? "+" : "$", 0, 1);
    ctx.restore();
  });
  state.enemies.forEach(drawEnemy);
  state.deathSprites.forEach(drawDeathBoss);
  state.bullets.forEach(drawBullet);
  if (!state.van.boarded) drawHero();
  state.particles.forEach((particle) => {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1); ctx.fillStyle = particle.color;
    if (particle.blast) { ctx.globalAlpha *= .35; ctx.beginPath(); ctx.arc(worldX(particle.x), particle.y, particle.blast * (1 - particle.life / particle.maxLife), 0, Math.PI * 2); ctx.fill(); }
    else if (particle.kind === "smoke") { ctx.globalAlpha *= .48; ctx.beginPath(); ctx.arc(worldX(particle.x), particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillRect(worldX(particle.x), particle.y, particle.size, particle.size); }
    ctx.globalAlpha = 1;
  });
}

function heroPoseFor(player) {
  const now = state.elapsed;
  if (player.poseUntil > now) return player.poseKind;
  if (player.crouching && player.landed) return "crouch";
  if (!player.landed) return player.vy < 110 ? "rise" : "kick";
  if (Math.abs(player.vx) > 35) {
    const cycle = ["walkD", "walkB", "walkE", "walkA", "walkC", "walkA"];
    return cycle[Math.floor(state.elapsed * 10.5) % cycle.length];
  }
  return "idle";
}

function heroAtlasCell(heroId, pose) {
  if (HERO_SHEET_POSES.has(heroId)) {
    const columnByPose = { walkA: 1, walkB: 1, walkC: 1, walkD: 1, walkE: 1, fire: 2, heavyFire: 2, rise: 3, kick: 3, hit: 3 };
    return { column: columnByPose[pose] ?? 0, row: 0, columns: 4, rows: 1 };
  }
  if (!HERO_ATLAS_POSES.has(heroId)) return undefined;
  if (pose === "walkA" || pose === "walkE") return { column: 1, row: 0 };
  if (pose === "walkC") return { column: 2, row: 0 };
  if (pose === "crouch" || pose === "hit") return { column: 2, row: 2 };
  if (pose === "rise") return { column: 2, row: 1 };
  if (pose === "fire") return { column: 0, row: 2 };
  if (pose === "heavyFire") return { column: 1, row: 2 };
  if (pose === "kick") return { column: 1, row: 1 };
  return { column: 0, row: 0 };
}

function drawHeroFrame(image, x, y, width, height, atlasCell) {
  if (!image?.complete || !image.naturalWidth) return false;
  const columns = atlasCell?.columns ?? 3;
  const rows = atlasCell?.rows ?? 3;
  const sourceWidth = image.naturalWidth / (atlasCell ? columns : 1);
  const sourceHeight = image.naturalHeight / (atlasCell ? rows : 1);
  const sourceX = atlasCell ? atlasCell.column * sourceWidth : 0;
  const sourceY = atlasCell ? atlasCell.row * sourceHeight : 0;
  const ratio = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * ratio;
  const drawHeight = sourceHeight * ratio;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x + (width - drawWidth) / 2, y + height - drawHeight, drawWidth, drawHeight);
  return true;
}

function drawCharacterSprite(heroId, screenX, groundY, facing = 1, pose = "idle", scale = 1, alpha = 1) {
  const hero = heroFromId(heroId);
  const poseImage = art.heroPoses[heroId]?.[pose] ?? art.heroPoses[heroId]?.idle ?? art.hero[heroId];
  const poseWidth = (pose === "crouch" || pose === "fire" || pose === "heavyFire" ? 194 : 154) * PLAYER_SPRITE_SCALE * scale;
  const poseHeight = (pose === "crouch" ? 145 : 170) * PLAYER_SPRITE_SCALE * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(screenX, groundY);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.shadowColor = `${hero.color}aa`;
  ctx.shadowBlur = 10 * scale;
  // Transparent cutouts are drawn normally; only Rafeta's legacy sprite still has a dark backdrop.
  ctx.globalCompositeOperation = heroId === "rafeta" ? "screen" : "source-over";
  // These two attack drawings face left, everything else faces right.
  if ((heroId === "cristian" || heroId === "bacora") && pose === "fire") ctx.scale(-1, 1);
  const drawn = drawHeroFrame(poseImage, -poseWidth / 2, -poseHeight, poseWidth, poseHeight, heroAtlasCell(heroId, pose));
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  if (!drawn) { ctx.fillStyle = hero.color; ctx.fillRect(-24 * scale, -145 * scale, 48 * scale, 145 * scale); }
  if (heroId === "rafeta" && art.masia.complete) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(art.masia, 10 * scale, -poseHeight * .46, 15 * scale, 34 * scale); ctx.restore(); }
  ctx.restore();
  return { poseWidth, poseHeight };
}

function drawHero() {
  const player = state.player;
  const pose = heroPoseFor(player);
  const x = worldX(player.x);
  const bob = player.landed && !player.crouching ? Math.sin(player.run) * 2 : 0;
  const poseHeight = (pose === "crouch" ? 145 : 170) * PLAYER_SPRITE_SCALE;
  const alpha = player.invincible > 0 && Math.floor(player.invincible * 20) % 2 === 0 ? .45 : 1;
  drawCharacterSprite(state.hero.id, x + player.w / 2, player.y + player.h + bob, player.facing, pose, 1, alpha);
  ctx.save();
  ctx.translate(x + player.w / 2, player.y + player.h + bob);
  if (player.facing < 0) ctx.scale(-1, 1);
  if (player.weaponFlash > 0) {
    ctx.fillStyle = state.hero.color; ctx.fillRect(34, -poseHeight * .48, 42, 9); ctx.globalAlpha = .35; ctx.beginPath(); ctx.arc(78, -poseHeight * .48, 28, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const x = worldX(enemy.x);
  if (x + enemy.w < -90 || x > W + 90) return;
  const bossSprite = BOSS_SPRITE_FRAMES[enemy.type];
  ctx.save(); ctx.translate(x + enemy.w / 2, enemy.y + enemy.h / 2 + Math.sin(enemy.phase * 5) * 2);
  if (enemy.dir > 0) ctx.scale(-1, 1);
  const flash = enemy.hit > 0;
  if (bossSprite) {
    const sheet = art.bossSheets[bossSprite.image];
    const frame = flash ? 1 : enemy.shot < .28 ? 2 : Math.floor(enemy.phase * 2) % 2;
    if (sheet.complete && sheet.naturalWidth) {
      const sourceWidth = sheet.naturalWidth / 4;
      const drawWidth = enemy.w * 2.05;
      const drawHeight = enemy.h * 1.48;
      ctx.globalAlpha = flash ? .68 : 1;
      ctx.shadowColor = bossSprite.color; ctx.shadowBlur = enemy.shot < .28 ? 28 : 18;
      ctx.drawImage(sheet, sourceWidth * frame, 0, sourceWidth, sheet.naturalHeight, -drawWidth / 2, enemy.h / 2 - drawHeight, drawWidth, drawHeight);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.84)"; ctx.fillRect(x - 26, enemy.y - 24, enemy.w + 52, 8);
    ctx.fillStyle = bossSprite.color; ctx.fillRect(x - 26, enemy.y - 24, (enemy.w + 52) * clamp(enemy.hp / enemy.maxHp, 0, 1), 8);
    ctx.fillStyle = "#fff0b0"; ctx.font = "15px Impact"; ctx.textAlign = "center"; ctx.fillText(bossSprite.label, x + enemy.w / 2, enemy.y - 38); ctx.textAlign = "left";
    return;
  }
  if (enemy.type === "bottle" && art.waterBottleEnemy.complete) {
    ctx.globalAlpha = flash ? .62 : 1;
    ctx.shadowColor = "#4defff"; ctx.shadowBlur = 16;
    const bottleScale = ENEMY_SPRITE_SCALE;
    ctx.drawImage(art.waterBottleEnemy, -44 * bottleScale, enemy.h / 2 - 112 * bottleScale, 88 * bottleScale, 112 * bottleScale);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(x, enemy.y - 12, enemy.w, 5); ctx.fillStyle = "#4defff"; ctx.fillRect(x, enemy.y - 12, enemy.w * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
    return;
  }
  if (enemy.type === "juiceboss" && art.juiceWrestler.complete) {
    ctx.globalAlpha = flash ? .62 : 1;
    ctx.shadowColor = "#ff9a31"; ctx.shadowBlur = 24;
    const bossScale = ENEMY_SPRITE_SCALE;
    ctx.drawImage(art.juiceWrestler, -110 * bossScale, enemy.h / 2 - 264 * bossScale, 220 * bossScale, 264 * bossScale);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.82)"; ctx.fillRect(x - 24, enemy.y - 22, enemy.w + 48, 7); ctx.fillStyle = "#ff9a31"; ctx.fillRect(x - 24, enemy.y - 22, (enemy.w + 48) * clamp(enemy.hp / enemy.maxHp, 0, 1), 7);
    ctx.fillStyle = "#fff0b0"; ctx.font = "14px Impact"; ctx.textAlign = "center"; ctx.fillText("CAMPEÓN DEL ZUMO", x + enemy.w / 2, enemy.y - 34); ctx.textAlign = "left";
    return;
  }
  if (enemy.type === "sprayboss") {
    const bossImage = flash ? art.sprayBoss.hit : enemy.shot < .28 ? art.sprayBoss.attack : art.sprayBoss.ready;
    ctx.globalAlpha = flash ? .68 : 1;
    ctx.shadowColor = enemy.shot < .28 ? "#ff9a31" : "#4defff"; ctx.shadowBlur = 24;
    if (bossImage.complete) ctx.drawImage(bossImage, -126 * ENEMY_SPRITE_SCALE, enemy.h / 2 - 276 * ENEMY_SPRITE_SCALE, 252 * ENEMY_SPRITE_SCALE, 276 * ENEMY_SPRITE_SCALE);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.82)"; ctx.fillRect(x - 22, enemy.y - 56, enemy.w + 44, 7);
    ctx.fillStyle = "#ff7c2a"; ctx.fillRect(x - 22, enemy.y - 56, (enemy.w + 44) * clamp(enemy.hp / enemy.maxHp, 0, 1), 7);
    ctx.fillStyle = "#fff0b0"; ctx.font = "14px Impact"; ctx.textAlign = "center"; ctx.fillText("MAESTRO DEL ESPRAY", x + enemy.w / 2, enemy.y - 68); ctx.textAlign = "left";
    return;
  }
  if (art.juiceWrestler.complete && enemy.type === "brute") {
    ctx.globalAlpha = flash ? .62 : 1;
    const scale = (enemy.type === "brute" ? 1 : enemy.type === "speaker" ? .78 : .7) * ENEMY_SPRITE_SCALE;
    const imageW = enemy.w * 1.56 * scale;
    const imageH = enemy.h * 1.44 * scale;
    ctx.drawImage(art.juiceWrestler, -imageW / 2, enemy.h / 2 - imageH, imageW, imageH);
    if (enemy.type === "speaker") { ctx.globalAlpha = .8; ctx.strokeStyle = "#7dff38"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 6, enemy.w * .34, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(x, enemy.y - 12, enemy.w, 5); ctx.fillStyle = "#ff7844"; ctx.fillRect(x, enemy.y - 12, enemy.w * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
    return;
  }
  if (enemy.type === "tanklet") {
    ctx.fillStyle = flash ? "#fff8d1" : "#485c50"; ctx.fillRect(-enemy.w * .5, -18, enemy.w, 35);
    ctx.fillStyle = "#161f21"; ctx.fillRect(-enemy.w * .55, 12, enemy.w * 1.1, 24);
    ctx.fillStyle = "#76845b"; for (let wheel = -2; wheel <= 2; wheel += 1) { ctx.beginPath(); ctx.arc(wheel * 27, 29, 12, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#60745b"; ctx.fillRect(-30, -47, 68, 28); ctx.fillStyle = "#222b29"; ctx.fillRect(25, -42, 88, 8);
  } else if (enemy.type === "turret") {
    ctx.fillStyle = flash ? "#fff8d1" : "#59645d"; ctx.fillRect(-enemy.w * .48, -18, enemy.w * .96, 36);
    ctx.fillStyle = "#222c2d"; ctx.fillRect(-enemy.w * .32, -38, enemy.w * .64, 24); ctx.fillStyle = "#ff4b7c"; ctx.fillRect(-8, -33, 16, 7);
    ctx.strokeStyle = "#a0b29c"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(58, -37); ctx.stroke();
  } else {
    const body = enemy.type === "speaker" ? "#6539a0" : enemy.type === "grenadier" ? "#4d7b55" : enemy.type === "soldier" ? "#56708a" : "#d4613b";
    const torsoW = enemy.w * .62;
    const torsoTop = -enemy.h * .2;
    const torsoH = enemy.h * .46;
    const headY = -enemy.h * .39;
    ctx.lineCap = "round";
    // Boots and legs make the little enemies read as characters rather than UI blocks.
    ctx.fillStyle = flash ? "#fff8d1" : "#202a31";
    ctx.fillRect(-torsoW * .32, enemy.h * .22, torsoW * .23, enemy.h * .22);
    ctx.fillRect(torsoW * .09, enemy.h * .22, torsoW * .23, enemy.h * .22);
    ctx.fillStyle = "#0d1419"; ctx.fillRect(-torsoW * .4, enemy.h * .4, torsoW * .38, 8); ctx.fillRect(torsoW * .03, enemy.h * .4, torsoW * .38, 8);
    ctx.fillStyle = flash ? "#fff8d1" : body; ctx.fillRect(-torsoW / 2, torsoTop, torsoW, torsoH);
    ctx.fillStyle = enemy.type === "grenadier" ? "#304437" : "#111d26"; ctx.beginPath(); ctx.arc(0, headY, enemy.w * .24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = enemy.type === "grenadier" ? "#a7ff50" : enemy.type === "speaker" ? "#ffb449" : "#4defff"; ctx.fillRect(-enemy.w * .14, headY - 2, enemy.w * .28, 5);
    ctx.fillStyle = flash ? "#fff8d1" : body; ctx.fillRect(-enemy.w * .3, headY - enemy.w * .31, enemy.w * .6, 8);
    ctx.strokeStyle = flash ? "#fff8d1" : body; ctx.lineWidth = Math.max(7, enemy.w * .12);
    ctx.beginPath(); ctx.moveTo(-torsoW * .42, torsoTop + 14); ctx.lineTo(-enemy.w * .5, torsoTop + 34); ctx.moveTo(torsoW * .42, torsoTop + 14); ctx.lineTo(torsoW * .7, torsoTop + 32); ctx.stroke();
    ctx.strokeStyle = "#202b32"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(torsoW * .35, torsoTop + 30); ctx.lineTo(enemy.w * .72, torsoTop + 18); ctx.stroke();
    ctx.fillStyle = "#d8e2e3"; ctx.fillRect(enemy.w * .67, torsoTop + 14, enemy.w * .22, 7);
    if (enemy.type === "grenadier") { ctx.fillStyle = "#26382b"; ctx.fillRect(-torsoW * .62, torsoTop + 8, 11, torsoH * .62); ctx.fillStyle = "#a7ff50"; ctx.beginPath(); ctx.arc(-torsoW * .72, torsoTop + 28, 7, 0, Math.PI * 2); ctx.fill(); }
    if (enemy.type === "speaker") { ctx.strokeStyle = "#7dff38"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, enemy.h * .02, enemy.w * .24, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "#d7a7ff"; ctx.beginPath(); ctx.arc(0, enemy.h * .02, enemy.w * .12, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(x, enemy.y - 12, enemy.w, 5); ctx.fillStyle = enemy.type === "brute" ? "#ff7844" : "#ffce55"; ctx.fillRect(x, enemy.y - 12, enemy.w * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
}

function drawDeathBoss(enemy) {
  const spec = BOSS_SPRITE_FRAMES[enemy.type];
  const sheet = spec && art.bossSheets[spec.image];
  if (!spec || !sheet?.complete || !sheet.naturalWidth) return;
  const x = worldX(enemy.x + enemy.w / 2);
  if (x + enemy.w < -180 || x > W + 180) return;
  const sourceWidth = sheet.naturalWidth / 4;
  const drawWidth = enemy.w * 2.05;
  const drawHeight = enemy.h * 1.48;
  ctx.save();
  ctx.globalAlpha = clamp(enemy.life / .72, 0, 1);
  ctx.translate(x, enemy.y + enemy.h / 2);
  if (enemy.dir > 0) ctx.scale(-1, 1);
  ctx.shadowColor = spec.color; ctx.shadowBlur = 18;
  ctx.drawImage(sheet, sourceWidth * 3, 0, sourceWidth, sheet.naturalHeight, -drawWidth / 2, enemy.h / 2 - drawHeight, drawWidth, drawHeight);
  ctx.restore();
}

function drawBullet(bullet) {
  const x = worldX(bullet.x);
  ctx.save();
  ctx.globalAlpha = clamp(bullet.life * 2, 0, 1);
  if (bullet.dog) {
    ctx.translate(x, bullet.y);
    if (bullet.vx < 0) ctx.scale(-1, 1);
    if (art.spooky.complete) ctx.drawImage(art.spooky, -bullet.w / 2, -bullet.h / 2, bullet.w, bullet.h);
  }
  else if (bullet.flag) {
    ctx.translate(x, bullet.y);
    if (bullet.vx < 0) ctx.scale(-1, 1);
    ctx.rotate(-.08);
    if (art.rafetaFlag.complete) ctx.drawImage(art.rafetaFlag, -bullet.w / 2, -bullet.h / 2, bullet.w, bullet.h);
  }
  else if (bullet.rockBeam) {
    ctx.fillStyle = "rgba(125,255,56,.24)"; ctx.fillRect(x - bullet.w / 2, bullet.y - 25, bullet.w, 50);
    ctx.fillStyle = "#7dff38"; ctx.fillRect(x - bullet.w / 2, bullet.y - 7, bullet.w, 14);
  }
  else if (bullet.howl) {
    ctx.fillStyle = "rgba(255,63,117,.2)"; ctx.beginPath(); ctx.ellipse(x, bullet.y, bullet.w * .6, bullet.h * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = bullet.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, bullet.y, bullet.w * .44, -.65, .65); ctx.stroke();
  }
  else if (bullet.drumBeat) {
    ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(x, bullet.y, bullet.w * .5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff5c4"; ctx.beginPath(); ctx.arc(x - 3, bullet.y - 4, 4, 0, Math.PI * 2); ctx.fill();
  }
  else if (bullet.vanBeam) {
    const beam = ctx.createLinearGradient(x - bullet.w / 2, 0, x + bullet.w / 2, 0);
    beam.addColorStop(0, "rgba(125,255,56,.08)"); beam.addColorStop(.18, "rgba(125,255,56,.82)"); beam.addColorStop(.72, "rgba(77,239,255,.72)"); beam.addColorStop(1, "rgba(246,241,222,.12)");
    ctx.fillStyle = beam; ctx.fillRect(x - bullet.w / 2, bullet.y - 18, bullet.w, 36);
    ctx.fillStyle = "rgba(246,241,222,.9)"; ctx.fillRect(x - bullet.w / 2, bullet.y - 4, bullet.w, 8);
    ctx.strokeStyle = "rgba(125,255,56,.78)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - bullet.w / 2, bullet.y - 24); ctx.lineTo(x + bullet.w / 2, bullet.y - 7); ctx.moveTo(x - bullet.w / 2, bullet.y + 24); ctx.lineTo(x + bullet.w / 2, bullet.y + 7); ctx.stroke();
  }
  else if (bullet.laser) {
    if (bullet.prism) {
      const prism = ctx.createLinearGradient(x - bullet.w / 2, 0, x + bullet.w / 2, 0);
      prism.addColorStop(0, "rgba(77,239,255,.12)"); prism.addColorStop(.32, "rgba(77,239,255,.72)"); prism.addColorStop(.68, "rgba(255,75,233,.72)"); prism.addColorStop(1, "rgba(255,154,49,.12)");
      ctx.fillStyle = prism; ctx.fillRect(x - bullet.w / 2, bullet.y - 17, bullet.w, 34);
      ctx.fillStyle = "#fff4ff"; ctx.fillRect(x - bullet.w / 2, bullet.y - 4, bullet.w, 8);
    } else {
      ctx.fillStyle = "rgba(77,239,255,.24)"; ctx.fillRect(x - bullet.w / 2, bullet.y - 13, bullet.w, 26); ctx.fillStyle = bullet.color; ctx.fillRect(x - bullet.w / 2, bullet.y - 4, bullet.w, 8);
    }
  }
  else if (bullet.rocket) { ctx.fillStyle = bullet.color; ctx.fillRect(x - 14, bullet.y - 5, 28, 10); ctx.fillStyle = "#f6f1de"; ctx.fillRect(x - 18, bullet.y - 2, 7, 4); ctx.fillStyle = "#ffb449"; ctx.fillRect(x + (bullet.vx > 0 ? -18 : 10), bullet.y - 3, 8, 6); }
  else if (bullet.bomb) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(x, bullet.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffb449"; ctx.fillRect(x - 2, bullet.y - 14, 4, 6); }
  else if (bullet.grenade) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(x, bullet.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#071018"; ctx.fillRect(x - 6, bullet.y - 2, 12, 4); }
  else if (bullet.tankShell) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(x, bullet.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffdb72"; ctx.fillRect(x - 18, bullet.y - 3, 7, 6); }
  else if (bullet.waterBottle) { if (art.waterBottleProjectile.complete) ctx.drawImage(art.waterBottleProjectile, x - 15, bullet.y - 24, 30, 48); else { ctx.fillStyle = "#4defff"; ctx.fillRect(x - 8, bullet.y - 16, 16, 32); } }
  else if (bullet.spray) { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.ellipse(x, bullet.y, bullet.w / 2, bullet.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(246,241,222,.8)"; ctx.fillRect(x - 3, bullet.y - 3, 6, 6); }
  else if (bullet.ring) { ctx.strokeStyle = bullet.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, bullet.y, bullet.w / 2, 0, Math.PI * 2); ctx.stroke(); }
  else if (bullet.pulse) { ctx.fillStyle = bullet.color; ctx.fillRect(x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h); }
  else { ctx.fillStyle = bullet.color; ctx.fillRect(x, bullet.y, bullet.w, bullet.h); ctx.fillStyle = "#f6f1de"; ctx.fillRect(x - (bullet.vx > 0 ? 16 : -16), bullet.y + 2, 16, Math.max(2, bullet.h - 4)); }
  ctx.restore();
}

function drawForeground() {
  const offset = -(state.camera * .64) % 180;
  ctx.fillStyle = "rgba(7,18,18,.78)";
  for (let index = -1; index < 10; index += 1) {
    const x = index * 180 + offset;
    const postY = 510 + ((index * 37) % 80);
    ctx.fillRect(x, postY, 58, 20); ctx.fillRect(x + 26, postY - 42, 10, 42);
    ctx.fillStyle = "rgba(125,255,56,.22)"; ctx.fillRect(x + 5, postY - 5, 48, 4); ctx.fillStyle = "rgba(7,18,18,.78)";
  }
  ctx.strokeStyle = "rgba(77,239,255,.32)"; ctx.lineWidth = 3;
  for (let sign = 0; sign < 7; sign += 1) {
    const x = ((sign * 247 + 90) - state.camera * .48) % 1500;
    const y = 445 + (sign % 3) * 38;
    ctx.beginPath(); ctx.moveTo(x, y + 62); ctx.lineTo(x + 3, y); ctx.stroke();
    ctx.fillStyle = sign % 2 ? "#b04b3d" : "#c7a64f"; ctx.fillRect(x - 18, y - 15, 42, 26);
  }
  const shade = ctx.createLinearGradient(0, H - 120, 0, H); shade.addColorStop(0, "rgba(2,3,6,0)"); shade.addColorStop(1, "rgba(1,3,7,.76)"); ctx.fillStyle = shade; ctx.fillRect(0, H - 130, W, 130);
}

function loop(now) {
  if (!state || state.status !== "playing") return;
  const dt = Math.min(.033, Math.max(.001, (now - lastFrame) / 1000));
  lastFrame = now;
  update(dt); draw();
  if (state && state.status === "playing") requestAnimationFrame(loop);
}

function setPaused(value) {
  if (!state || state.status !== "playing") return;
  state.status = value ? "paused" : "playing";
  ui.pause.classList.toggle("hidden", !value);
  if (!value) { lastFrame = performance.now(); requestAnimationFrame(loop); }
}

function blip(frequency, duration) {
  if (!soundOn) return;
  try {
    if (!audioContext) audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.type = "square"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* audio is optional */ }
}

function setInput(key, value) { if (key in input) input[key] = value; }
function releaseInputs() {
  input.left = false; input.right = false; input.crouch = false; input.jump = false; input.fire = false; input.special = false; input.activate = false;
  pressed.clear();
}

const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
let joystickPointerId = null;
function resetJoystick() {
  joystickPointerId = null;
  setInput("left", false); setInput("right", false);
  if (joystickKnob) joystickKnob.style.transform = "translate(-50%, -50%)";
}
function moveJoystick(event) {
  if (!joystick || joystickPointerId !== event.pointerId) return;
  const rect = joystick.getBoundingClientRect();
  const radius = Math.max(1, Math.min(rect.width, rect.height) * .5);
  const maxTravel = radius * .58;
  const dx = event.clientX - (rect.left + rect.width * .5);
  const dy = event.clientY - (rect.top + rect.height * .5);
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.min(1, maxTravel / length);
  const knobX = dx * scale;
  const knobY = dy * scale;
  if (joystickKnob) joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  setInput("left", dx < -radius * .18);
  setInput("right", dx > radius * .18);
}
if (joystick) {
  joystick.addEventListener("pointerdown", (event) => { event.preventDefault(); joystickPointerId = event.pointerId; joystick.setPointerCapture?.(event.pointerId); moveJoystick(event); });
  joystick.addEventListener("pointermove", moveJoystick);
  joystick.addEventListener("pointerup", resetJoystick);
  joystick.addEventListener("pointercancel", resetJoystick);
  joystick.addEventListener("lostpointercapture", resetJoystick);
}
const keyMap = { a: "left", arrowleft: "left", d: "right", arrowright: "right", s: "crouch", c: "crouch", arrowdown: "crouch", w: "jump", arrowup: "jump", " ": "jump", j: "fire", x: "fire", k: "special", z: "special", f: "activate" };
const heldActions = new Set(["left", "right", "crouch"]);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "p" && state) { setPaused(state.status === "playing"); return; }
  if (key === "escape" && state?.status === "playing") { setPaused(true); return; }
  const action = keyMap[key];
  if (!action) return;
  event.preventDefault();
  if (!pressed.has(key)) { setInput(action, true); pressed.add(key); }
});
window.addEventListener("keyup", (event) => { const key = event.key.toLowerCase(); const action = keyMap[key]; if (action) { if (heldActions.has(action)) setInput(action, false); pressed.delete(key); } });
document.querySelectorAll("[data-key]").forEach((button) => {
  const key = button.dataset.key;
  const down = (event) => { event.preventDefault(); setInput(key, true); button.setPointerCapture?.(event.pointerId); };
  const up = (event) => { event.preventDefault(); if (heldActions.has(key)) setInput(key, false); };
  button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointercancel", up); button.addEventListener("pointerleave", up);
});
window.addEventListener("pointerup", () => { input.left = false; input.right = false; input.crouch = false; });
window.addEventListener("blur", releaseInputs);
document.addEventListener("visibilitychange", () => { if (document.hidden) releaseInputs(); });
ui.start.addEventListener("click", beginMission);
ui.resume.addEventListener("click", () => setPaused(false));
ui.quit.addEventListener("click", exitToLobby);
ui.again.addEventListener("click", beginMission);
ui.back.addEventListener("click", exitToLobby);
ui.mute.addEventListener("click", () => { soundOn = !soundOn; ui.mute.textContent = `SONIDO: ${soundOn ? "ON" : "OFF"}`; ui.mute.setAttribute("aria-pressed", String(soundOn)); if (soundOn) blip(440, .05); });

makeCards();
if (requestedFighter && characters.some((hero) => hero.id === requestedFighter)) beginMission();
