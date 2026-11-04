"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ArcadeCrowd, { type CrowdCue } from "./ArcadeCrowd";
import TouchStick from "./TouchStick";

type FighterId = "maletilla" | "vanessa" | "josevictor" | "cristian" | "cesaret" | "borja" | "bacora" | "bonviure" | "elchica" | "ogalla" | "xuso" | "bomba" | "rafeta" | "tonimassama" | "nova" | "estefy";
type AdventureStatus = "map" | "playing" | "level-complete" | "won" | "lost";
type HeroPose = "idle" | "walkA" | "walkB" | "walkC" | "walkD" | "walkE" | "crouch" | "rise" | "fire" | "heavyFire" | "kick" | "hit";
type EnemyKind = "walker" | "runner" | "heavy" | "hopper" | "shooter" | "flyer" | "charger" | "miniboss" | "boss";
type BossStyle = "charge" | "turret" | "aerial" | "spray";
type Difficulty = "easy" | "normal";

type PlatformModeProps = {
  fighter: FighterId;
  fighterName: string;
  soundOn: boolean;
  difficulty: Difficulty;
  campaign?: boolean;
  onComplete: (score?: number) => void;
  onExit: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };
type TokenKind = 0 | 1 | 2 | 3 | 4 | 5;
type Collectible = { x: number; y: number; type: TokenKind; collected: boolean; secret?: boolean };
type PowerUp = { x: number; y: number; collected: boolean };
type LifeUp = { x: number; y: number; collected: boolean };
type MovingPlatform = Rect & { originX: number; originY: number; range: number; speed: number; axis: "x" | "y"; phase: number };
type SecretBlock = Rect & { state: "ready" | "broken"; content: "token" | "mushroom"; type?: TokenKind; crate?: boolean };
type Enemy = Rect & {
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  baseY: number;
  state: "bottle" | "cap" | "defeated" | "gone";
  kind: EnemyKind;
  hp: number;
  nextJumpAt: number;
  nextAttackAt: number;
  attackCount: number;
  attackUntil: number;
  hitUntil: number;
  defeatedUntil: number;
  facing: -1 | 1;
  bossStyle?: BossStyle;
  clone?: FighterId;
};
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Projectile = { x: number; y: number; vx: number; vy: number; rotation: number; size: number; kind: "bottle" | "microphone" | "mushroom" | "ear" | "bag" | "money" | "vinyl" | "speaker" | "fish" | "venom" | "shield" | "staff" | "anchor" | "chain" | "jager" | "amber" | "scepter" | "artichokes" | "dog" | "hoe" | "flag" | "flagSweep" | "pistol" | "peineta" | "machete" | "leaves" };
type MonsterShot = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string; kind: "spray" | "pulse" | "drop" | "waterBottle" };
type ImpactText = { x: number; y: number; text: string; color: string; life: number };
type EnemyBlueprint = { x: number; minX: number; maxX: number; vx: number; kind: EnemyKind; y?: number; hp?: number; bossStyle?: BossStyle };
type HazardKind = "spikes" | "laser" | "crusher" | "spring" | "wind";
type HazardBlueprint = Rect & { kind: HazardKind; cycle?: number; phase?: number; range?: number; strength?: number; label?: string };
type Hazard = HazardBlueprint & { triggeredUntil: number };
type BattleGate = { x: number; enemyStart: number; enemyEnd: number; label: string };
type LevelObjective = { kind: "collect" | "eliminate" | "gates" | "premium" | "boss"; target: number; label: string };
type LevelResult = { level: number; stars: number; elapsed: number; treasures: number; total: number; damage: number; score: number };
type LevelDefinition = {
  name: string;
  detail: string;
  objective: LevelObjective;
  timeGoal: number;
  worldWidth: number;
  finishX: number;
  surfaces: Rect[];
  movingPlatforms: Omit<MovingPlatform, "x" | "y">[];
  collectibles: Omit<Collectible, "collected">[];
  powerUps: Omit<PowerUp, "collected">[];
  lifeUps: Omit<LifeUp, "collected">[];
  blocks: Omit<SecretBlock, "state">[];
  enemies: EnemyBlueprint[];
  checkpoints: number[];
  hazards?: HazardBlueprint[];
  gates?: BattleGate[];
};

const WORLD_HEIGHT = 720;
const GROUND_Y = 650;
const LANDSCAPE_VIEW_TOP = 170;
const LANDSCAPE_VIEW_HEIGHT = 540;
const PORTRAIT_VIEW_TOP = 80;
const PORTRAIT_VIEW_HEIGHT = 640;
const STARTING_LIVES = 6;
const MAX_LIVES = 9;
const TOKEN_ASSETS = [
  "/assets/platform-card-token.webp",
  "/assets/platform-owl-token.webp",
  "/assets/platform-flame-token.webp",
  "/assets/mobile/arcade-pickup-wrap-v1.webp",
  "/assets/mobile/arcade-pickup-powder-v1.webp",
  "/assets/mobile/arcade-pickup-rush-v1.webp",
] as const;
const TOKEN_GLOWS = ["#ffd233", "#ff9f8e", "#ff42ac", "#f3ffff", "#7feaff", "#ffbd24"] as const;
const LEVEL_PALETTES = [
  { sky: "rgba(12,22,35,.02)", fog: "rgba(18,5,8,.38)", city: "rgba(11,18,27,.3)", light: "#ff9a2f", dark: "#6e2c18", window: "rgba(255,154,48,.25)" },
  { sky: "rgba(5,37,48,.04)", fog: "rgba(3,18,26,.46)", city: "rgba(7,27,34,.42)", light: "#56e5ef", dark: "#164c58", window: "rgba(80,236,242,.32)" },
  { sky: "rgba(48,19,4,.03)", fog: "rgba(34,8,3,.4)", city: "rgba(42,17,8,.4)", light: "#ffb02e", dark: "#7b3018", window: "rgba(255,190,52,.32)" },
  { sky: "rgba(47,4,67,.05)", fog: "rgba(20,2,35,.48)", city: "rgba(35,7,53,.42)", light: "#ff4fd8", dark: "#522673", window: "rgba(123,246,255,.35)" },
  { sky: "rgba(52,3,10,.05)", fog: "rgba(26,1,7,.5)", city: "rgba(41,4,12,.45)", light: "#ff4c38", dark: "#6c1520", window: "rgba(255,81,54,.34)" },
] as const;

const LEVELS: LevelDefinition[] = [
  {
    name: "RUTA CENTRAL",
    detail: "SALTOS, SECRETOS Y PRIMERAS TRAMPAS",
    objective: { kind: "collect", target: 12, label: "REÚNE 12 TESOROS" },
    timeGoal: 150,
    worldWidth: 3400,
    finishX: 3320,
    surfaces: [
      { x: 0, y: GROUND_Y, width: 720, height: 90 },
      { x: 820, y: GROUND_Y, width: 680, height: 90 },
      { x: 1610, y: GROUND_Y, width: 670, height: 90 },
      { x: 2390, y: GROUND_Y, width: 1010, height: 90 },
      { x: 235, y: 515, width: 190, height: 26 },
      { x: 500, y: 410, width: 165, height: 26 },
      { x: 900, y: 500, width: 180, height: 26 },
      { x: 1185, y: 395, width: 170, height: 26 },
      { x: 1695, y: 500, width: 190, height: 26 },
      { x: 1995, y: 390, width: 175, height: 26 },
      { x: 2480, y: 505, width: 190, height: 26 },
      { x: 2760, y: 405, width: 170, height: 26 },
      { x: 3035, y: 510, width: 175, height: 26 },
    ],
    movingPlatforms: [
      { originX: 715, originY: 545, width: 108, height: 20, range: 52, speed: 1.35, axis: "y", phase: 0 },
      { originX: 1500, originY: 535, width: 110, height: 20, range: 62, speed: 1.1, axis: "x", phase: 1.4 },
      { originX: 2280, originY: 525, width: 110, height: 20, range: 55, speed: 1.28, axis: "y", phase: 2.7 },
    ],
    collectibles: [
      { x: 280, y: 455, type: 0 }, { x: 350, y: 455, type: 1 },
      { x: 535, y: 350, type: 2 }, { x: 610, y: 350, type: 0 },
      { x: 875, y: 585, type: 1 }, { x: 950, y: 440, type: 2 },
      { x: 1230, y: 335, type: 0 }, { x: 1305, y: 335, type: 1 },
      { x: 1660, y: 585, type: 2 }, { x: 1750, y: 440, type: 0 },
      { x: 2040, y: 330, type: 1 }, { x: 2115, y: 330, type: 2 },
      { x: 2445, y: 585, type: 0 }, { x: 2525, y: 445, type: 1 },
      { x: 2805, y: 345, type: 2 }, { x: 2880, y: 345, type: 0 },
      { x: 3075, y: 450, type: 1 }, { x: 3160, y: 585, type: 2 },
      { x: 1050, y: 575, type: 3 }, { x: 1860, y: 575, type: 4 }, { x: 3000, y: 575, type: 5 },
    ],
    powerUps: [{ x: 1030, y: 590 }, { x: 2170, y: 590 }, { x: 2870, y: 350 }],
    lifeUps: [{ x: 1415, y: 585 }, { x: 2670, y: 585 }],
    blocks: [
      { x: 710, y: 420, width: 62, height: 58, content: "token", type: 2 },
      { x: 1430, y: 440, width: 62, height: 58, content: "mushroom" },
      { x: 2240, y: 405, width: 62, height: 58, content: "token", type: 0 },
      { x: 2915, y: 592, width: 58, height: 58, content: "token", type: 1, crate: true },
    ],
    enemies: [
      { x: 565, minX: 450, maxX: 680, vx: -62, kind: "walker" },
      { x: 1110, minX: 860, maxX: 1450, vx: 92, kind: "runner" },
      { x: 1900, minX: 1640, maxX: 2230, vx: -66, kind: "heavy" },
      { x: 2600, minX: 2420, maxX: 2740, vx: 62, kind: "hopper" },
      { x: 3100, minX: 2960, maxX: 3260, vx: -98, kind: "runner" },
      { x: 3210, minX: 2980, maxX: 3305, vx: -82, kind: "miniboss", bossStyle: "charge" },
    ],
    checkpoints: [1120, 2380],
    hazards: [
      { kind: "spring", x: 732, y: 626, width: 74, height: 24, strength: 920, label: "IMPULSO" },
      { kind: "spikes", x: 1500, y: 626, width: 110, height: 24, label: "PINCHOS" },
      { kind: "spring", x: 2295, y: 626, width: 74, height: 24, strength: 980, label: "IMPULSO" },
    ],
  },
  {
    name: "NOCHE EN LA FÁBRICA",
    detail: "LÁSERES, PRENSAS Y TIRADORES",
    objective: { kind: "eliminate", target: 6, label: "DERRIBA 6 MONSTRUOS" },
    timeGoal: 165,
    worldWidth: 3900,
    finishX: 3815,
    surfaces: [
      { x: 0, y: GROUND_Y, width: 520, height: 90 },
      { x: 650, y: GROUND_Y, width: 570, height: 90 },
      { x: 1360, y: GROUND_Y, width: 510, height: 90 },
      { x: 2010, y: GROUND_Y, width: 600, height: 90 },
      { x: 2730, y: GROUND_Y, width: 470, height: 90 },
      { x: 3320, y: GROUND_Y, width: 580, height: 90 },
      { x: 190, y: 505, width: 160, height: 24 },
      { x: 430, y: 390, width: 145, height: 24 },
      { x: 760, y: 485, width: 155, height: 24 },
      { x: 1035, y: 365, width: 150, height: 24 },
      { x: 1430, y: 505, width: 155, height: 24 },
      { x: 1715, y: 385, width: 150, height: 24 },
      { x: 2070, y: 490, width: 155, height: 24 },
      { x: 2395, y: 365, width: 155, height: 24 },
      { x: 2790, y: 485, width: 155, height: 24 },
      { x: 3055, y: 370, width: 145, height: 24 },
      { x: 3390, y: 500, width: 160, height: 24 },
      { x: 3620, y: 390, width: 150, height: 24 },
    ],
    movingPlatforms: [
      { originX: 520, originY: 535, width: 125, height: 20, range: 78, speed: 1.45, axis: "x", phase: 0 },
      { originX: 1220, originY: 505, width: 135, height: 20, range: 95, speed: 1.25, axis: "y", phase: 1.5 },
      { originX: 1870, originY: 520, width: 135, height: 20, range: 75, speed: 1.55, axis: "x", phase: 2.4 },
      { originX: 2610, originY: 520, width: 120, height: 20, range: 85, speed: 1.35, axis: "x", phase: 3.4 },
      { originX: 3195, originY: 500, width: 125, height: 20, range: 90, speed: 1.25, axis: "y", phase: 0.8 },
    ],
    collectibles: [
      { x: 230, y: 445, type: 1 }, { x: 305, y: 445, type: 2 },
      { x: 470, y: 330, type: 0 }, { x: 540, y: 330, type: 1 },
      { x: 700, y: 585, type: 2 }, { x: 805, y: 425, type: 0 },
      { x: 1075, y: 305, type: 1 }, { x: 1145, y: 305, type: 2 },
      { x: 1410, y: 585, type: 0 }, { x: 1470, y: 445, type: 1 },
      { x: 1750, y: 325, type: 2 }, { x: 1820, y: 325, type: 0 },
      { x: 2055, y: 585, type: 1 }, { x: 2110, y: 430, type: 2 },
      { x: 2435, y: 305, type: 0 }, { x: 2505, y: 305, type: 1 },
      { x: 2765, y: 585, type: 2 }, { x: 2835, y: 425, type: 0 },
      { x: 3090, y: 310, type: 1 }, { x: 3155, y: 310, type: 2 },
      { x: 3365, y: 585, type: 0 }, { x: 3430, y: 440, type: 1 },
      { x: 3655, y: 330, type: 2 }, { x: 3730, y: 330, type: 0 },
      { x: 715, y: 575, type: 3 }, { x: 2065, y: 575, type: 4 }, { x: 3405, y: 435, type: 5 },
    ],
    powerUps: [{ x: 900, y: 590 }, { x: 2220, y: 430 }, { x: 3490, y: 585 }],
    lifeUps: [{ x: 1840, y: 325 }, { x: 3000, y: 585 }],
    blocks: [
      { x: 600, y: 400, width: 62, height: 58, content: "token", type: 1 },
      { x: 1275, y: 330, width: 62, height: 58, content: "mushroom" },
      { x: 1930, y: 390, width: 62, height: 58, content: "token", type: 2 },
      { x: 2660, y: 380, width: 62, height: 58, content: "mushroom" },
      { x: 3240, y: 330, width: 62, height: 58, content: "token", type: 0 },
      { x: 2290, y: 592, width: 58, height: 58, content: "mushroom", crate: true },
      { x: 3535, y: 592, width: 58, height: 58, content: "token", type: 2, crate: true },
    ],
    enemies: [
      { x: 390, minX: 40, maxX: 500, vx: -76, kind: "hopper" },
      { x: 820, minX: 680, maxX: 1180, vx: 108, kind: "runner" },
      { x: 1080, minX: 980, maxX: 1180, vx: -34, kind: "shooter", hp: 2 },
      { x: 1510, minX: 1380, maxX: 1830, vx: -68, kind: "heavy" },
      { x: 1780, minX: 1520, maxX: 1900, vx: 88, kind: "flyer", y: 285 },
      { x: 2140, minX: 2040, maxX: 2570, vx: 72, kind: "hopper" },
      { x: 2450, minX: 2040, maxX: 2570, vx: -112, kind: "runner" },
      { x: 2860, minX: 2760, maxX: 3160, vx: 65, kind: "heavy" },
      { x: 3090, minX: 2790, maxX: 3180, vx: -38, kind: "shooter", hp: 2 },
      { x: 3470, minX: 3350, maxX: 3830, vx: -118, kind: "runner" },
      { x: 3660, minX: 3500, maxX: 3805, vx: -54, kind: "boss", bossStyle: "turret" },
    ],
    checkpoints: [1380, 2730],
    hazards: [
      { kind: "laser", x: 1192, y: 342, width: 24, height: 308, cycle: 2350, phase: 0, label: "LÁSER" },
      { kind: "spikes", x: 1870, y: 626, width: 140, height: 24, label: "CUCHILLAS" },
      { kind: "laser", x: 2610, y: 356, width: 25, height: 294, cycle: 1900, phase: 780, label: "LÁSER" },
      { kind: "crusher", x: 3215, y: 210, width: 105, height: 175, cycle: 2600, phase: 650, range: 225, label: "PRENSA" },
    ],
  },
  {
    name: "ASALTO CENTRAL",
    detail: "DOS ZONAS DE COMBATE CERRADO",
    objective: { kind: "gates", target: 2, label: "ABRE LAS 2 PUERTAS" },
    timeGoal: 180,
    worldWidth: 4300,
    finishX: 4210,
    surfaces: [
      { x: 0, y: GROUND_Y, width: 760, height: 90 },
      { x: 880, y: GROUND_Y, width: 720, height: 90 },
      { x: 1730, y: GROUND_Y, width: 680, height: 90 },
      { x: 2530, y: GROUND_Y, width: 730, height: 90 },
      { x: 3370, y: GROUND_Y, width: 930, height: 90 },
      { x: 260, y: 500, width: 170, height: 24 }, { x: 530, y: 385, width: 155, height: 24 },
      { x: 970, y: 490, width: 170, height: 24 }, { x: 1280, y: 370, width: 155, height: 24 },
      { x: 1810, y: 495, width: 170, height: 24 }, { x: 2130, y: 365, width: 155, height: 24 },
      { x: 2620, y: 485, width: 170, height: 24 }, { x: 2950, y: 370, width: 155, height: 24 },
      { x: 3460, y: 500, width: 180, height: 24 }, { x: 3800, y: 380, width: 165, height: 24 },
    ],
    movingPlatforms: [
      { originX: 760, originY: 525, width: 120, height: 20, range: 75, speed: 1.45, axis: "x", phase: 0 },
      { originX: 1600, originY: 510, width: 130, height: 20, range: 90, speed: 1.35, axis: "y", phase: 1.2 },
      { originX: 2410, originY: 520, width: 120, height: 20, range: 75, speed: 1.6, axis: "x", phase: 2.1 },
      { originX: 3260, originY: 510, width: 110, height: 20, range: 95, speed: 1.4, axis: "y", phase: 3.1 },
    ],
    collectibles: [
      { x: 300, y: 440, type: 0 }, { x: 375, y: 440, type: 1 }, { x: 570, y: 325, type: 2 },
      { x: 930, y: 585, type: 0 }, { x: 1015, y: 430, type: 1 }, { x: 1320, y: 310, type: 2 },
      { x: 1780, y: 585, type: 1 }, { x: 1855, y: 435, type: 2 }, { x: 2170, y: 305, type: 0 },
      { x: 2580, y: 585, type: 2 }, { x: 2670, y: 425, type: 0 }, { x: 2990, y: 310, type: 1 },
      { x: 3420, y: 585, type: 0 }, { x: 3500, y: 440, type: 1 }, { x: 3840, y: 320, type: 2 },
      { x: 920, y: 575, type: 3 }, { x: 2740, y: 575, type: 4 }, { x: 3710, y: 575, type: 5 },
    ],
    powerUps: [{ x: 1150, y: 585 }, { x: 2780, y: 425 }, { x: 3900, y: 320 }],
    lifeUps: [{ x: 1415, y: 310 }, { x: 3230, y: 585 }],
    blocks: [
      { x: 700, y: 415, width: 62, height: 58, content: "token", type: 2 },
      { x: 1490, y: 390, width: 62, height: 58, content: "mushroom" },
      { x: 2320, y: 400, width: 58, height: 58, content: "token", type: 0, crate: true },
      { x: 3150, y: 395, width: 58, height: 58, content: "mushroom", crate: true },
    ],
    enemies: [
      { x: 600, minX: 430, maxX: 740, vx: -112, kind: "runner" },
      { x: 730, minX: 480, maxX: 750, vx: -92, kind: "charger", hp: 2 },
      { x: 1100, minX: 900, maxX: 1550, vx: 72, kind: "hopper" },
      { x: 1440, minX: 1180, maxX: 1560, vx: -38, kind: "shooter", hp: 2 },
      { x: 2050, minX: 1760, maxX: 2360, vx: -70, kind: "heavy" },
      { x: 2250, minX: 1840, maxX: 2380, vx: -110, kind: "charger", hp: 2 },
      { x: 2820, minX: 2560, maxX: 3200, vx: 118, kind: "runner" },
      { x: 3130, minX: 2750, maxX: 3230, vx: -40, kind: "shooter", hp: 2 },
      { x: 3550, minX: 3400, maxX: 3850, vx: -78, kind: "hopper" },
      { x: 3770, minX: 3420, maxX: 3890, vx: 120, kind: "charger", hp: 2 },
      { x: 3970, minX: 3820, maxX: 4195, vx: -62, kind: "boss", bossStyle: "charge" },
    ],
    checkpoints: [1450, 2920],
    hazards: [
      { kind: "spikes", x: 760, y: 626, width: 120, height: 24, label: "BARRICADA" },
      { kind: "crusher", x: 1605, y: 230, width: 120, height: 160, cycle: 2500, phase: 200, range: 240, label: "PRENSA" },
      { kind: "laser", x: 2410, y: 355, width: 25, height: 295, cycle: 2050, phase: 940, label: "ALARMA" },
      { kind: "crusher", x: 3260, y: 215, width: 110, height: 175, cycle: 2300, phase: 1200, range: 235, label: "PRENSA" },
    ],
    gates: [
      { x: 1570, enemyStart: 880, enemyEnd: 1570, label: "LIMPIA EL PATIO" },
      { x: 3270, enemyStart: 2530, enemyEnd: 3270, label: "ROMPE EL CERCO" },
    ],
  },
  {
    name: "RUTA DE NEÓN",
    detail: "VIENTO, REBOTES Y MONSTRUOS VOLADORES",
    objective: { kind: "premium", target: 3, label: "CAPTURA 3 OBJETOS NEÓN" },
    timeGoal: 170,
    worldWidth: 4100,
    finishX: 4020,
    surfaces: [
      { x: 0, y: GROUND_Y, width: 800, height: 90 }, { x: 910, y: GROUND_Y, width: 630, height: 90 },
      { x: 1650, y: GROUND_Y, width: 710, height: 90 }, { x: 2480, y: GROUND_Y, width: 770, height: 90 },
      { x: 3360, y: GROUND_Y, width: 740, height: 90 },
      { x: 230, y: 500, width: 175, height: 24 }, { x: 520, y: 380, width: 165, height: 24 },
      { x: 1010, y: 475, width: 170, height: 24 }, { x: 1310, y: 360, width: 155, height: 24 },
      { x: 1750, y: 500, width: 175, height: 24 }, { x: 2070, y: 370, width: 160, height: 24 },
      { x: 2580, y: 480, width: 180, height: 24 }, { x: 2910, y: 355, width: 160, height: 24 },
      { x: 3460, y: 490, width: 180, height: 24 }, { x: 3760, y: 370, width: 165, height: 24 },
    ],
    movingPlatforms: [
      { originX: 800, originY: 525, width: 110, height: 20, range: 72, speed: 1.55, axis: "x", phase: 0 },
      { originX: 1540, originY: 510, width: 110, height: 20, range: 88, speed: 1.42, axis: "y", phase: 1.3 },
      { originX: 2360, originY: 520, width: 120, height: 20, range: 80, speed: 1.6, axis: "x", phase: 2.1 },
      { originX: 3250, originY: 510, width: 110, height: 20, range: 92, speed: 1.5, axis: "y", phase: 3.2 },
    ],
    collectibles: [
      { x: 270, y: 440, type: 0 }, { x: 350, y: 440, type: 1 }, { x: 555, y: 320, type: 2 },
      { x: 960, y: 585, type: 3 }, { x: 1050, y: 415, type: 0 }, { x: 1350, y: 300, type: 1 },
      { x: 1710, y: 585, type: 2 }, { x: 1790, y: 440, type: 4 }, { x: 2110, y: 310, type: 0 },
      { x: 2535, y: 585, type: 1 }, { x: 2625, y: 420, type: 2 }, { x: 2950, y: 295, type: 5 },
      { x: 3410, y: 585, type: 0 }, { x: 3505, y: 430, type: 1 }, { x: 3800, y: 310, type: 2 },
    ],
    powerUps: [{ x: 720, y: 585 }, { x: 2210, y: 310 }, { x: 3880, y: 310 }],
    lifeUps: [{ x: 1470, y: 300 }, { x: 3070, y: 295 }],
    blocks: [
      { x: 700, y: 410, width: 62, height: 58, content: "token", type: 3 },
      { x: 1470, y: 400, width: 62, height: 58, content: "mushroom" },
      { x: 2310, y: 390, width: 62, height: 58, content: "token", type: 4 },
      { x: 3190, y: 395, width: 62, height: 58, content: "mushroom" },
    ],
    enemies: [
      { x: 610, minX: 430, maxX: 770, vx: -118, kind: "runner" }, { x: 1150, minX: 940, maxX: 1490, vx: 74, kind: "hopper" },
      { x: 1370, minX: 1030, maxX: 1510, vx: -105, kind: "flyer", y: 270 },
      { x: 1840, minX: 1680, maxX: 2300, vx: -74, kind: "heavy" }, { x: 2200, minX: 1680, maxX: 2320, vx: 122, kind: "runner" },
      { x: 2100, minX: 1760, maxX: 2290, vx: 116, kind: "flyer", y: 310 },
      { x: 2700, minX: 2510, maxX: 3200, vx: -82, kind: "hopper" }, { x: 3070, minX: 2510, maxX: 3200, vx: 128, kind: "runner" },
      { x: 2940, minX: 2600, maxX: 3220, vx: -128, kind: "flyer", y: 245 },
      { x: 3470, minX: 3390, maxX: 3700, vx: 42, kind: "shooter", hp: 2 },
      { x: 3690, minX: 3400, maxX: 3990, vx: -82, kind: "heavy" },
      { x: 3920, minX: 3600, maxX: 4020, vx: -112, kind: "flyer", y: 285 },
      { x: 3850, minX: 3540, maxX: 3995, vx: -92, kind: "miniboss", y: 300, bossStyle: "aerial" },
    ],
    checkpoints: [1380, 2760],
    hazards: [
      { kind: "spring", x: 790, y: 626, width: 92, height: 24, strength: 1050, label: "SÚPER SALTO" },
      { kind: "wind", x: 1080, y: 235, width: 410, height: 395, strength: 235, label: "VIENTO →" },
      { kind: "spring", x: 1555, y: 626, width: 88, height: 24, strength: 1080, label: "REBOTE" },
      { kind: "wind", x: 1980, y: 225, width: 360, height: 405, strength: -260, label: "← VIENTO" },
      { kind: "spring", x: 2375, y: 626, width: 92, height: 24, strength: 1100, label: "REBOTE" },
      { kind: "laser", x: 3260, y: 330, width: 26, height: 320, cycle: 1650, phase: 400, label: "NEÓN" },
      { kind: "spring", x: 3270, y: 626, width: 78, height: 24, strength: 1020, label: "SÚPER SALTO" },
    ],
  },
  {
    name: "FORTALEZA DEL SPRAY",
    detail: "TODAS LAS TRAMPAS · DEFENSA FINAL",
    objective: { kind: "boss", target: 1, label: "VENCE AL MAESTRO DEL ESPRAY" },
    timeGoal: 200,
    worldWidth: 4600,
    finishX: 4515,
    surfaces: [
      { x: 0, y: GROUND_Y, width: 720, height: 90 }, { x: 850, y: GROUND_Y, width: 650, height: 90 },
      { x: 1620, y: GROUND_Y, width: 660, height: 90 }, { x: 2400, y: GROUND_Y, width: 620, height: 90 },
      { x: 3150, y: GROUND_Y, width: 650, height: 90 }, { x: 3910, y: GROUND_Y, width: 690, height: 90 },
      { x: 210, y: 500, width: 170, height: 24 }, { x: 500, y: 380, width: 155, height: 24 },
      { x: 930, y: 480, width: 170, height: 24 }, { x: 1250, y: 360, width: 155, height: 24 },
      { x: 1710, y: 490, width: 170, height: 24 }, { x: 2040, y: 355, width: 155, height: 24 },
      { x: 2470, y: 485, width: 170, height: 24 }, { x: 2780, y: 365, width: 155, height: 24 },
      { x: 3230, y: 495, width: 170, height: 24 }, { x: 3540, y: 370, width: 155, height: 24 },
      { x: 4000, y: 490, width: 170, height: 24 }, { x: 4270, y: 350, width: 155, height: 24 },
    ],
    movingPlatforms: [
      { originX: 720, originY: 520, width: 130, height: 20, range: 82, speed: 1.65, axis: "x", phase: 0 },
      { originX: 1500, originY: 505, width: 120, height: 20, range: 95, speed: 1.5, axis: "y", phase: 1.4 },
      { originX: 2280, originY: 515, width: 120, height: 20, range: 80, speed: 1.7, axis: "x", phase: 2.2 },
      { originX: 3020, originY: 505, width: 130, height: 20, range: 96, speed: 1.55, axis: "y", phase: 3.1 },
      { originX: 3800, originY: 515, width: 110, height: 20, range: 82, speed: 1.7, axis: "x", phase: .8 },
    ],
    collectibles: [
      { x: 250, y: 440, type: 0 }, { x: 330, y: 440, type: 3 }, { x: 535, y: 320, type: 2 },
      { x: 900, y: 585, type: 1 }, { x: 975, y: 420, type: 4 }, { x: 1290, y: 300, type: 0 },
      { x: 1670, y: 585, type: 2 }, { x: 1755, y: 430, type: 1 }, { x: 2080, y: 295, type: 5 },
      { x: 2445, y: 585, type: 0 }, { x: 2515, y: 425, type: 1 }, { x: 2820, y: 305, type: 2 },
      { x: 3195, y: 585, type: 3 }, { x: 3270, y: 435, type: 0 }, { x: 3580, y: 310, type: 4 },
      { x: 3955, y: 585, type: 1 }, { x: 4045, y: 430, type: 2 }, { x: 4310, y: 290, type: 5 },
    ],
    powerUps: [{ x: 650, y: 585 }, { x: 2180, y: 585 }, { x: 3650, y: 310 }],
    lifeUps: [{ x: 1940, y: 585 }, { x: 3740, y: 585 }, { x: 4340, y: 290 }],
    blocks: [
      { x: 680, y: 400, width: 62, height: 58, content: "token", type: 5 }, { x: 1440, y: 390, width: 62, height: 58, content: "mushroom" },
      { x: 2240, y: 395, width: 62, height: 58, content: "token", type: 3 }, { x: 2960, y: 390, width: 62, height: 58, content: "mushroom" },
      { x: 3740, y: 390, width: 62, height: 58, content: "token", type: 4 },
    ],
    enemies: [
      { x: 590, minX: 400, maxX: 690, vx: -124, kind: "runner" }, { x: 1100, minX: 880, maxX: 1460, vx: 82, kind: "hopper" },
      { x: 1370, minX: 880, maxX: 1460, vx: -78, kind: "heavy" }, { x: 1440, minX: 1150, maxX: 1470, vx: -42, kind: "shooter", hp: 2 },
      { x: 1880, minX: 1650, maxX: 2240, vx: 130, kind: "runner" }, { x: 2180, minX: 1780, maxX: 2260, vx: -126, kind: "charger", hp: 2 },
      { x: 2580, minX: 2450, maxX: 2990, vx: 105, kind: "flyer", y: 275 }, { x: 2660, minX: 2430, maxX: 2980, vx: -86, kind: "heavy" },
      { x: 2960, minX: 2700, maxX: 3010, vx: -44, kind: "shooter", hp: 2 }, { x: 3350, minX: 3180, maxX: 3760, vx: 134, kind: "runner" },
      { x: 3560, minX: 3200, maxX: 3780, vx: 132, kind: "flyer", y: 250 }, { x: 3660, minX: 3180, maxX: 3760, vx: -84, kind: "hopper" },
      { x: 4070, minX: 3940, maxX: 4300, vx: 132, kind: "charger", hp: 2 }, { x: 4320, minX: 4020, maxX: 4495, vx: -68, kind: "boss", bossStyle: "spray" },
    ],
    checkpoints: [1480, 3000],
    hazards: [
      { kind: "laser", x: 720, y: 340, width: 25, height: 310, cycle: 1800, phase: 250, label: "SEGURIDAD" },
      { kind: "crusher", x: 1505, y: 205, width: 115, height: 185, cycle: 2200, phase: 900, range: 245, label: "PRENSA" },
      { kind: "spikes", x: 2280, y: 626, width: 120, height: 24, label: "TRAMPA" },
      { kind: "wind", x: 2700, y: 245, width: 290, height: 385, strength: -260, label: "EXTRACTOR" },
      { kind: "laser", x: 3030, y: 335, width: 24, height: 315, cycle: 1750, phase: 1050, label: "SEGURIDAD" },
      { kind: "crusher", x: 3800, y: 210, width: 108, height: 180, cycle: 2050, phase: 350, range: 240, label: "PRENSA FINAL" },
    ],
    gates: [
      { x: 2280, enemyStart: 1620, enemyEnd: 2280, label: "SALA DE GUARDIA" },
      { x: 3890, enemyStart: 3150, enemyEnd: 3890, label: "DEFENSA FINAL" },
    ],
  },
];

const LEVEL_END_BOSS_STYLES: BossStyle[] = ["charge", "turret", "charge", "aerial", "spray"];
const getAdventureBossHp = (levelIndex: number, easy: boolean, kind: EnemyKind) => {
  const base = kind === "boss" ? 16 : 9;
  const scale = kind === "boss" ? 5 : 3;
  return base + levelIndex * scale + (easy ? -4 : 4);
};
const buildLevelEnemies = (level: LevelDefinition, levelIndex: number, easy: boolean): EnemyBlueprint[] => {
  const boosted = level.enemies.map((enemy) => (enemy.kind === "boss" || enemy.kind === "miniboss")
    ? { ...enemy, hp: enemy.hp ?? getAdventureBossHp(levelIndex, easy, enemy.kind) }
    : enemy);
  if (boosted.some((enemy) => enemy.kind === "boss")) return boosted;
  const x = Math.max(level.finishX - 210, level.worldWidth - 360);
  return [
    ...boosted,
    {
      x,
      minX: Math.max(0, x - 280),
      maxX: Math.min(level.worldWidth - 70, level.finishX - 35),
      vx: levelIndex % 2 === 0 ? -74 : 68,
      kind: "boss",
      bossStyle: LEVEL_END_BOSS_STYLES[levelIndex % LEVEL_END_BOSS_STYLES.length],
      hp: getAdventureBossHp(levelIndex, easy, "boss"),
    },
  ];
};

const atlasHeroPoses = (asset: string): Record<HeroPose, string> => ({
  idle: asset, walkA: asset, walkB: asset, walkC: asset, walkD: asset, walkE: asset,
  crouch: asset, rise: asset, fire: asset, heavyFire: asset, kick: asset, hit: asset,
});

const HERO_POSE_ASSETS: Record<FighterId, Record<HeroPose, string>> = {
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
  rafeta: atlasHeroPoses("/prison-slug/assets/white-hero.webp"),
  estefy: {
    idle: "/assets/new-fighters/estefy/punio-guardia.webp", walkA: "/assets/new-fighters/estefy/caminar-01.webp", walkB: "/assets/new-fighters/estefy/caminar-02.webp",
    walkC: "/assets/new-fighters/estefy/caminar-03.webp", walkD: "/assets/new-fighters/estefy/caminar-04.webp", walkE: "/assets/new-fighters/estefy/caminar-02.webp",
    crouch: "/assets/new-fighters/estefy/agacharse.webp", rise: "/assets/new-fighters/estefy/salto-aire.webp",
    fire: "/assets/new-fighters/estefy/machete-corte.webp", heavyFire: "/assets/new-fighters/estefy/machete-continuacion.webp", kick: "/assets/new-fighters/estefy/patada-contacto.webp", hit: "/assets/new-fighters/estefy/recibir-golpe.webp",
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

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export default function PlatformMode({ fighter, fighterName, soundOn, difficulty, campaign = false, onComplete, onExit }: PlatformModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef({ left: false, right: false, jump: false });
  const jumpRef = useRef<() => void>(() => undefined);
  const stickJumpRef = useRef(false);
  const attackRef = useRef<() => void>(() => undefined);
  const specialRef = useRef<() => void>(() => undefined);
  const onExitRef = useRef(onExit);
  const onCompleteRef = useRef(onComplete);
  const soundOnRef = useRef(soundOn);
  const audioRef = useRef<AudioContext | null>(null);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<AdventureStatus>(campaign ? "playing" : "map");
  const [startLevel, setStartLevel] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(() => campaign ? 0 : Math.min(LEVELS.length - 1, Number(globalThis.localStorage?.getItem("hardcore-adventure-unlocked") || 0)));
  const [levelStars, setLevelStars] = useState<number[]>(() => {
    if (campaign) return Array(LEVELS.length).fill(0);
    try { return JSON.parse(globalThis.localStorage?.getItem("hardcore-adventure-stars") || "[]"); } catch { return Array(LEVELS.length).fill(0); }
  });
  const unlockedLevelRef = useRef(unlockedLevel);
  const levelStarsRef = useRef(levelStars);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: STARTING_LIVES, collected: 0, total: LEVELS[0].collectibles.length, level: 1, ready: true, checkpoint: 0, objective: "", objectiveProgress: 0, objectiveTarget: 1, elapsed: 0 });
  const [crowdCue, setCrowdCue] = useState<CrowdCue | null>(null);

  useEffect(() => { onExitRef.current = onExit; }, [onExit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => { unlockedLevelRef.current = unlockedLevel; }, [unlockedLevel]);
  useEffect(() => { levelStarsRef.current = levelStars; }, [levelStars]);

  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    const timers = new Set<number>();
    const later = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
      return timer;
    };
    let previousTime = performance.now();
    let cssWidth = 0;
    let cssHeight = 0;
    let viewportWidth = 0;
    let viewportTop = 0;
    let viewportHeight = WORLD_HEIGHT;
    let scale = 1;
    let cameraX = 0;
    let currentStatus: AdventureStatus = "playing";
    let levelIndex = campaign ? 0 : startLevel;
    let level = LEVELS[levelIndex];
    let score = 0;
    let lives = STARTING_LIVES;
    let collectedCount = 0;
    let activeCheckpoint = -1;
    let levelStartedAt = performance.now();
    let damageTaken = 0;
    let enemiesDefeated = 0;
    let premiumCollected = 0;
    let lastHudSecond = -1;
    let invulnerableUntil = 0;
    let poweredUntil = 0;
    let jumpQueued = false;
    let jumpPrepUntil = 0;
    let jumpBufferUntil = 0;
    let lastGroundedAt = performance.now();
    let stompPoseUntil = 0;
    let hurtPoseUntil = 0;
    let landingPoseUntil = 0;
    let attackPoseUntil = 0;
    let attackPoseKind: "fire" | "heavyFire" | "kick" = "fire";
    let attackReadyAt = 0;
    let queuedAttackLevel: 0 | 1 | 2 = 0;
    let queuedAttackUntil = 0;
    let attackChain = 0;
    let attackChainUntil = 0;
    let shakeUntil = 0;
    let levelCallUntil = performance.now() + 1800;
    let crowdCueKey = "";
    let crowdCueCheckAt = 0;
    let crowdCelebrateUntil = 0;
    let activePose: HeroPose = "idle";
    let poseChangedAt = 0;
    const input = inputRef.current;
    const player = { x: 70, y: GROUND_Y - 108, width: 58, height: 108, vx: 0, vy: 0, onGround: true, facing: 1 };
    let surfaces: Rect[] = [];
    let movingPlatforms: MovingPlatform[] = [];
    let collectibles: Collectible[] = [];
    let powerUps: PowerUp[] = [];
    let lifeUps: LifeUp[] = [];
    let blocks: SecretBlock[] = [];
    let enemies: Enemy[] = [];
    let hazards: Hazard[] = [];
    let completedGates = new Set<number>();
    const projectiles: Projectile[] = [];
    const monsterShots: MonsterShot[] = [];
    const sparks: Spark[] = [];
    const impactTexts: ImpactText[] = [];
    const images: Record<string, HTMLImageElement> = {};

    const loadImage = (key: string, source: string) => {
      const resolver = (globalThis as typeof globalThis & { __asset?: (src: string) => string }).__asset;
      const resolvedSource = typeof resolver === "function" ? resolver(source) : source;
      const existing = Object.values(images).find((loaded) => loaded.src === resolvedSource);
      if (existing) {
        images[key] = existing;
        return;
      }
      const image = new Image();
      image.src = resolvedSource;
      images[key] = image;
    };

    TOKEN_ASSETS.forEach((source, index) => loadImage(`token-${index}`, source));
    Object.entries(HERO_POSE_ASSETS[fighter]).forEach(([pose, source]) => {
      const matchedSource = source;
      loadImage(`hero-${pose}`, matchedSource);
    });
    loadImage("hero-fire-windup", HERO_POSE_ASSETS[fighter].crouch);
    loadImage("hero-fire-aim", HERO_POSE_ASSETS[fighter].fire);
    loadImage("hero-fire-recoil", HERO_POSE_ASSETS[fighter].idle);
    loadImage("mushroom", "/assets/mushroom-attack-mobile.webp");
    loadImage("bottle", "/assets/platform-water-bottle-enemy.webp");
    loadImage("cap", "/assets/platform-blue-cap-shell.webp");
    loadImage("weapon-bottle", "/assets/mobile/cloretilo-projectile-v1.webp");
    loadImage("weapon-microphone", "/assets/microphone-attack-mobile.webp");
    loadImage("weapon-mushroom", "/assets/mushroom-attack-mobile.webp");
    loadImage("weapon-ear", "/assets/ear-attack-mobile.webp");
    loadImage("weapon-bag", "/assets/josevictor/white-bag.webp");
    loadImage("weapon-money", "/assets/josevictor/money-tube.webp");
    loadImage("weapon-vinyl", "/assets/cristian/vinyl.webp");
    loadImage("weapon-speaker", "/assets/cristian/speaker-krk8.webp");
    loadImage("weapon-fish", "/assets/new-fighters/fish.svg");
    loadImage("weapon-venom", "/assets/new-fighters/venom.svg");
    loadImage("weapon-shield", "/assets/new-fighters/shield.svg");
    loadImage("weapon-staff", "/assets/new-fighters/staff.svg");
    loadImage("weapon-anchor", "/assets/new-fighters/anchor.svg");
    loadImage("weapon-chain", "/assets/new-fighters/chain.svg");
    loadImage("weapon-jager", "/assets/new-fighters/jager.svg");
    loadImage("weapon-amber", "/assets/new-fighters/amber.svg");
    loadImage("weapon-scepter", "/assets/new-fighters/scepter.svg");
    loadImage("weapon-artichokes", "/assets/new-fighters/artichokes.svg");
    loadImage("weapon-dog", "/assets/new-fighters/xuso-v3/perro-correr-02.webp");
    loadImage("weapon-hoe", "/assets/new-fighters/hoe.svg");
    loadImage("weapon-flag", "/assets/new-fighters/rafeta-flag.svg");
    loadImage("weapon-flagSweep", "/assets/new-fighters/rafeta-flag.svg");
    loadImage("weapon-pistol", "/assets/new-fighters/tonimassama-bullet.svg");
    loadImage("weapon-peineta", "/assets/new-fighters/tonimassama-peineta-logo.webp");
    loadImage("weapon-machete", "/assets/new-fighters/estefy/machete-arco.webp");
    loadImage("weapon-leaves", "/assets/new-fighters/estefy/machete-hojas.webp");
    loadImage("weapon-masia", "/assets/new-fighters/masia-logo.webp");
    loadImage("boss-ready", "/assets/mobile/spray-boss-ready-v1.webp");
    loadImage("boss-attack", "/assets/mobile/spray-boss-attack-v1.webp");
    loadImage("boss-hit", "/assets/mobile/spray-boss-hit-v1.webp");
    loadImage("boss-defeated", "/assets/mobile/spray-boss-defeated-v1.webp");
    loadImage("boss-ready-a", "/assets/motion-v2/referee-boss-01-idle-v2.webp");
    loadImage("boss-ready-b", "/assets/motion-v2/referee-boss-02-watch-left-v2.webp");
    loadImage("boss-ready-c", "/assets/motion-v2/referee-boss-03-watch-right-v2.webp");
    loadImage("boss-aim", "/assets/motion-v2/referee-boss-09-attack-aim-v2.webp");
    loadImage("boss-fire", "/assets/motion-v2/referee-boss-10-attack-fire-v2.webp");
    loadImage("boss-hit-v2", "/assets/motion-v2/referee-boss-11-hit-v2.webp");
    loadImage("boss-defeated-v2", "/assets/motion-v2/referee-boss-12-defeated-v2.webp");

    const playTone = (frequency: number, duration = 0.07, type: OscillatorType = "square") => {
      if (!soundOnRef.current) return;
      try {
        const audio = audioRef.current ?? new window.AudioContext();
        audioRef.current = audio;
        if (audio.state === "suspended") void audio.resume();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        gain.gain.setValueAtTime(0.045, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch {
        // The game remains playable if Safari blocks audio.
      }
    };

    const getObjectiveProgress = () => level.objective.kind === "collect" ? collectedCount : level.objective.kind === "eliminate" ? enemiesDefeated : level.objective.kind === "gates" ? completedGates.size : level.objective.kind === "premium" ? premiumCollected : enemies.some((enemy) => (enemy.kind === "boss" || enemy.kind === "miniboss") && enemy.state !== "gone") ? 0 : 1;

    const updateHud = (now = performance.now()) => {
      const objectiveProgress = getObjectiveProgress();
      setHud({
        score,
        lives,
        collected: collectedCount,
        total: collectibles.length,
        level: levelIndex + 1,
        ready: now >= attackReadyAt,
        checkpoint: activeCheckpoint + 1,
        objective: level.objective.label,
        objectiveProgress: Math.min(level.objective.target, objectiveProgress),
        objectiveTarget: level.objective.target,
        elapsed: Math.max(0, Math.floor((now - levelStartedAt) / 1000)),
      });
    };

    const burst = (x: number, y: number, color: string, count = 14, size = 5) => {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.PI * 2 * index / count;
        const speed = 65 + Math.random() * 175;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.38 + Math.random() * 0.32, color, size: size * (0.6 + Math.random() * 0.8) });
      }
      if (sparks.length > 120) sparks.splice(0, sparks.length - 120);
    };

    const impact = (x: number, y: number, text: string, color: string, now: number) => {
      // A new label replaces a fresh one at the same spot so texts never pile up.
      for (let index = impactTexts.length - 1; index >= 0; index -= 1) {
        const item = impactTexts[index];
        if (Math.abs(item.x - x) < 90 && Math.abs(item.y - y) < 70) impactTexts.splice(index, 1);
      }
      if (impactTexts.length > 7) impactTexts.splice(0, impactTexts.length - 7);
      impactTexts.push({ x, y, text, color, life: 0.7 });
      shakeUntil = now + 145;
    };

    const showCrowdCelebration = (label: string, now: number) => {
      crowdCelebrateUntil = now + 1150;
      crowdCueKey = `celebrate-${label}-${Math.round(now)}`;
      setCrowdCue({ direction: "center", label });
    };

    const updateCrowdCue = (now: number) => {
      if (now < crowdCelebrateUntil || now < crowdCueCheckAt) return;
      crowdCueCheckAt = now + 260;
      const nearby = [
        ...lifeUps.filter((item) => !item.collected && lives < MAX_LIVES).map((item) => ({ x: item.x, label: "¡VIDA!", priority: 0 })),
        ...powerUps.filter((item) => !item.collected).map((item) => ({ x: item.x, label: "¡PODER!", priority: 1 })),
        ...collectibles.filter((item) => !item.collected && (item.secret || item.type >= 3)).map((item) => ({ x: item.x, label: item.secret ? "¡SECRETO!" : "¡PREMIO!", priority: 2 })),
      ]
        .filter((item) => Math.abs(item.x - player.x) < 760)
        .sort((a, b) => (a.priority * 150 + Math.abs(a.x - player.x)) - (b.priority * 150 + Math.abs(b.x - player.x)))[0];

      if (!nearby) {
        if (crowdCueKey) {
          crowdCueKey = "";
          setCrowdCue(null);
        }
        return;
      }

      const direction = nearby.x < player.x - 70 ? "left" : nearby.x > player.x + 70 ? "right" : "center";
      const nextKey = `${nearby.label}-${direction}-${Math.round(nearby.x / 45)}`;
      if (nextKey === crowdCueKey) return;
      crowdCueKey = nextKey;
      setCrowdCue({ direction, label: nearby.label });
    };

    const clonePool = (Object.keys(HERO_POSE_ASSETS) as FighterId[]).filter((id) => id !== fighter);
    const CLONE_POSES = ["idle", "walkA", "fire", "hit"] as const;
    const loadClone = (id: FighterId) => CLONE_POSES.forEach((pose) => {
      if (!images[`clone-${id}-${pose}`]) loadImage(`clone-${id}-${pose}`, HERO_POSE_ASSETS[id][pose]);
    });
    const makeEnemy = (blueprint: EnemyBlueprint, index: number): Enemy => {
      const boss = blueprint.kind === "boss";
      const miniboss = blueprint.kind === "miniboss";
      const heavy = blueprint.kind === "heavy";
      const width = boss ? 118 : miniboss ? 92 : heavy ? 70 : blueprint.kind === "runner" ? 49 : blueprint.kind === "shooter" ? 64 : blueprint.kind === "flyer" ? 66 : blueprint.kind === "charger" ? 74 : 56;
      const height = boss ? 190 : miniboss ? 142 : heavy ? 112 : blueprint.kind === "runner" ? 82 : blueprint.kind === "shooter" ? 102 : blueprint.kind === "flyer" ? 78 : blueprint.kind === "charger" ? 108 : 94;
      const baseY = blueprint.y ?? GROUND_Y - height;
      const defaultHp = boss ? getAdventureBossHp(levelIndex, difficulty === "easy", "boss") : miniboss ? getAdventureBossHp(levelIndex, difficulty === "easy", "miniboss") : heavy || blueprint.kind === "charger" || blueprint.kind === "shooter" ? 2 : 1;
      return {
        ...blueprint,
        y: baseY,
        width,
        height,
        baseY,
        vy: 0,
        state: "bottle",
        hp: blueprint.hp ?? defaultHp,
        nextJumpAt: performance.now() + 900 + index * 270,
        nextAttackAt: performance.now() + 2300 + index * 170,
        attackCount: 0,
        attackUntil: 0,
        hitUntil: 0,
        defeatedUntil: 0,
        facing: blueprint.vx >= 0 ? 1 : -1,
        // Tough enemies are shadow clones of the other fighters.
        clone: heavy || blueprint.kind === "charger" || blueprint.kind === "shooter" ? clonePool[(index * 5 + levelIndex * 3) % clonePool.length] : undefined,
      };
    };

    const loadLevel = (nextLevel: number, now: number, keepStats: boolean) => {
      queuedAttackLevel = 0;
      queuedAttackUntil = 0;
      attackReadyAt = now;
      attackPoseUntil = 0;
      levelIndex = nextLevel;
      level = LEVELS[levelIndex];
      levelStartedAt = now;
      damageTaken = 0;
      enemiesDefeated = 0;
      premiumCollected = 0;
      surfaces = level.surfaces.map((item) => ({ ...item }));
      movingPlatforms = level.movingPlatforms.map((item) => ({ ...item, x: item.originX, y: item.originY }));
      collectibles = level.collectibles.map((item) => ({ ...item, collected: false }));
      powerUps = level.powerUps.map((item) => ({ ...item, collected: false }));
      lifeUps = level.lifeUps.map((item) => ({ ...item, collected: false }));
      blocks = level.blocks.map((item) => ({ ...item, state: "ready" }));
      enemies = buildLevelEnemies(level, levelIndex, difficulty === "easy").map(makeEnemy);
      enemies.forEach((enemy) => { if (enemy.clone) loadClone(enemy.clone); });
      hazards = (level.hazards ?? []).map((item) => ({ ...item, triggeredUntil: 0 }));
      completedGates = new Set<number>();
      projectiles.length = 0;
      monsterShots.length = 0;
      sparks.length = 0;
      impactTexts.length = 0;
      collectedCount = 0;
      activeCheckpoint = -1;
      player.x = 70;
      player.y = GROUND_Y - player.height;
      player.vx = 0;
      player.vy = 0;
      player.facing = 1;
      player.onGround = true;
      cameraX = 0;
      jumpQueued = false;
      input.jump = false;
      invulnerableUntil = now + 1500;
      levelCallUntil = now + 1900;
      crowdCueKey = "";
      crowdCueCheckAt = now + 650;
      crowdCelebrateUntil = 0;
      setCrowdCue(null);
      if (!keepStats) {
        score = 0;
        lives = STARTING_LIVES;
      }
      updateHud(now);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      cssWidth = Math.max(320, bounds.width);
      cssHeight = Math.max(360, bounds.height);
      const closeLandscapeCamera = cssWidth / cssHeight >= 1.15;
      viewportTop = closeLandscapeCamera ? LANDSCAPE_VIEW_TOP : PORTRAIT_VIEW_TOP;
      viewportHeight = closeLandscapeCamera ? LANDSCAPE_VIEW_HEIGHT : PORTRAIT_VIEW_HEIGHT;
      const cores = navigator.hardwareConcurrency || 8;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      const isRaspberryPi = /linux arm|aarch64/i.test(navigator.userAgent);
      const ratioCap = isRaspberryPi ? 1.3 : cores <= 4 && memory < 6 ? 1.35 : 1.75;
      const pixelRatio = Math.min(ratioCap, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      viewportWidth = cssWidth * viewportHeight / cssHeight;
      scale = cssHeight / viewportHeight;
      context.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, 0, -viewportTop * pixelRatio * scale);
      cameraX = clamp(cameraX, 0, Math.max(0, level.worldWidth - viewportWidth));
    };

    const respawn = (now: number) => {
      lives -= 1;
      playTone(72, 0.24, "sawtooth");
      if (lives <= 0) {
        currentStatus = "lost";
        setStatus("lost");
        updateHud(now);
        return;
      }
      const respawnX = activeCheckpoint >= 0 ? level.checkpoints[activeCheckpoint] + 35 : 70;
      player.x = respawnX;
      player.y = GROUND_Y - player.height;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      jumpQueued = false;
      hurtPoseUntil = now + 420;
      invulnerableUntil = now + 2200;
      cameraX = clamp(respawnX - viewportWidth * 0.3, 0, Math.max(0, level.worldWidth - viewportWidth));
      impact(player.x, player.y, "¡VUELVE!", "#ffcf59", now);
      updateHud(now);
    };

    const damagePlayer = (now: number, enemyX: number) => {
      if (now < invulnerableUntil || currentStatus !== "playing") return;
      hurtPoseUntil = now + 540;
      damageTaken += 1;
      invulnerableUntil = now + 2050;
      player.vx = player.x < enemyX ? -410 : 410;
      player.vy = -470;
      burst(player.x + player.width / 2, player.y + player.height / 2, "#ff4f72", 18, 6);
      impact(player.x + player.width / 2, player.y, "¡OUCH!", "#ff4f72", now);
      playTone(75, 0.22, "sawtooth");
      if (now < poweredUntil) {
        poweredUntil = 0;
      } else {
        lives -= 1;
        if (lives <= 0) {
          currentStatus = "lost";
          setStatus("lost");
        }
      }
      updateHud(now);
    };

    const requestJump = () => {
      const now = performance.now();
      if (currentStatus !== "playing") return;
      input.jump = true;
      jumpBufferUntil = now + 170;
      if ((player.onGround || now - lastGroundedAt < 105) && !jumpQueued) {
        jumpQueued = true;
        jumpPrepUntil = now + 100;
        player.vx *= 0.78;
        burst(player.x + player.width / 2, player.y + player.height, "rgba(255,191,115,.8)", 7, 4);
        playTone(118, 0.055, "triangle");
      }
    };
    jumpRef.current = requestJump;

    const attack = (level: 1 | 2 = 1) => {
      const now = performance.now();
      if (currentStatus !== "playing") return;
      if (now < attackReadyAt) {
        if (attackReadyAt - now <= 180) {
          queuedAttackLevel = level;
          queuedAttackUntil = now + 180;
        }
        return;
      }
      attackChain = now <= attackChainUntil ? attackChain + 1 : 1;
      attackChainUntil = now + 820;
      const cooldown = level === 2 ? 780 : 480;
      attackReadyAt = now + cooldown;
      attackPoseUntil = now + cooldown;
      attackPoseKind = level === 2
        ? fighter === "bacora" || fighter === "bonviure" || fighter === "elchica" || fighter === "ogalla" || fighter === "xuso" || fighter === "bomba" || fighter === "rafeta" || fighter === "tonimassama" || fighter === "estefy" ? "heavyFire" : "kick"
        : "fire";
      const direction = player.facing;
      const startX = player.x + player.width / 2 + direction * 28;
      const startY = player.y + 36;
      if (fighter === "cesaret" || fighter === "borja" || fighter === "bacora" || fighter === "bonviure" || fighter === "elchica" || fighter === "ogalla" || fighter === "xuso" || fighter === "bomba" || fighter === "rafeta" || fighter === "tonimassama") {
        const kind: Projectile["kind"] = fighter === "cesaret" ? "fish" : fighter === "borja" ? "venom" : fighter === "bacora" ? level === 2 ? "staff" : "shield" : fighter === "bonviure" ? level === 2 ? "chain" : "anchor" : fighter === "elchica" ? level === 2 ? "amber" : "jager" : fighter === "ogalla" ? level === 2 ? "artichokes" : "scepter" : fighter === "xuso" ? "dog" : fighter === "bomba" ? "hoe" : fighter === "rafeta" ? level === 2 ? "flagSweep" : "flag" : level === 2 ? "peineta" : "pistol";
        const spreads = fighter === "rafeta" || fighter === "tonimassama" && level === 1 ? [0] : level === 2 ? [-130, -40, 40, 130] : [-60, 0, 60];
        const projectileSize = fighter === "rafeta" ? level === 2 ? 126 : 102 : fighter === "tonimassama" ? level === 2 ? 62 : 42 : kind === "scepter" ? 70 : kind === "artichokes" ? 58 : 64;
        spreads.forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 520, vy: verticalSpeed, rotation: 0, size: projectileSize, kind }));
        playTone(fighter === "borja" ? 145 : fighter === "tonimassama" ? level === 2 ? 310 : 680 : 240, 0.1, "sine");
      } else if (fighter === "estefy") {
        // Machete arc on J, a fan of leaves on K.
        if (level === 2) [-120, -40, 40, 120].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 540, vy: verticalSpeed, rotation: 0, size: 70, kind: "leaves" }));
        else projectiles.push({ x: startX, y: startY - 6, vx: direction * 640, vy: 0, rotation: 0, size: 104, kind: "machete" });
        playTone(level === 2 ? 420 : 760, 0.09, "triangle");
      } else if (fighter === "maletilla" && level === 1) {
        [-72, 0, 72].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 600, vy: verticalSpeed, rotation: 0, size: 62, kind: "bottle" }));
        playTone(205, 0.08, "square");
      } else if (fighter === "vanessa" && level === 1) {
        [-90, 0, 90].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 560, vy: verticalSpeed, rotation: 0, size: 47, kind: "microphone" }));
        playTone(350, 0.09, "sine");
      } else if (fighter === "josevictor" && level === 1) {
        [-78, 0, 78].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 555, vy: verticalSpeed, rotation: 0, size: 58, kind: "bag" }));
        playTone(285, 0.09, "triangle");
      } else if (fighter === "cristian" && level === 1) {
        [-88, 0, 88].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 590, vy: verticalSpeed, rotation: 0, size: 60, kind: "vinyl" }));
        playTone(245, 0.09, "sawtooth");
      } else if (fighter === "maletilla") {
        [-260, -120, 25, 150].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 475, vy: verticalSpeed, rotation: 0, size: 60, kind: "mushroom" }));
        playTone(255, 0.13, "sawtooth");
      } else if (fighter === "vanessa") {
        [-150, -45, 65, 170].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 500, vy: verticalSpeed, rotation: 0, size: 56, kind: "ear" }));
        playTone(410, 0.13, "sine");
      } else if (fighter === "cristian") {
        [-125, 0, 125].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 430, vy: verticalSpeed, rotation: 0, size: 92, kind: "speaker" }));
        playTone(120, 0.17, "square");
      } else {
        [-150, -45, 65, 170].forEach((verticalSpeed) => projectiles.push({ x: startX, y: startY, vx: direction * 520, vy: verticalSpeed, rotation: 0, size: 72, kind: "money" }));
        playTone(315, 0.13, "square");
      }
      const label = fighter === "estefy" ? level === 2 ? "¡TORMENTA DE HOJAS!" : "¡MACHETAZO!" : fighter === "tonimassama" ? level === 2 ? "¡PEINETAS VOLADORAS!" : "¡DISPARO DORADO!" : fighter === "cesaret" ? (level === 2 ? "¡LLUVIA DE PECES!" : "¡GOLPE DE PESCADO!") : fighter === "borja" ? (level === 2 ? "¡VENENO DEL SAPO!" : "¡ATAQUE DEL SAPO!") : fighter === "elchica" ? (level === 2 ? "¡SALPICADURA ÁMBAR!" : "¡BOTELLA DEL CHICA!") : fighter === "ogalla" ? (level === 2 ? "¡LLUVIA DE ALCACHOFAS!" : "¡BASTÓN DE ALCACHOFA!") : fighter === "xuso" ? "¡SPOOKY AL ATAQUE!" : fighter === "bomba" ? (level === 2 ? "¡BARRIDO DE AZADA!" : "¡AZADAZO!") : fighter === "rafeta" ? (level === 2 ? "¡GIRO DEL ESTANDARTE!" : "¡EMBESTIDA DE BANDERA!") : level === 2 ? (fighter === "maletilla" ? "¡TORMENTA DE SETAS!" : fighter === "vanessa" ? "¡OREJAS AL VUELO!" : fighter === "josevictor" ? "¡TUBOS DE BILLETES!" : "¡IMPACTO KRK 8!") : attackChain >= 3 ? `¡CADENA ×${attackChain}!` : fighter === "maletilla" ? "¡TRIPLE CLORETILO!" : fighter === "vanessa" ? "¡TRIPLE MICRO!" : fighter === "josevictor" ? "¡BOLSAS AL VUELO!" : "¡LLUVIA DE VINILOS!";
      impact(startX, startY, label, fighter === "maletilla" ? "#ff9b35" : fighter === "vanessa" ? "#ff4f9b" : fighter === "josevictor" ? "#f2c94c" : fighter === "elchica" ? "#ef8b26" : fighter === "ogalla" ? "#c89a46" : "#63f2d0", now);
      updateHud(now);
      later(() => updateHud(performance.now()), cooldown + 30);
    };
    attackRef.current = () => attack(1);
    specialRef.current = () => attack(2);

    const releaseSecret = (block: SecretBlock, now: number) => {
      if (block.state === "broken") return;
      block.state = "broken";
      burst(block.x + block.width / 2, block.y + block.height / 2, "#ffc34d", 18, 6);
      impact(block.x + block.width / 2, block.y, "¡SECRETO!", "#ffc34d", now);
      if (block.content === "mushroom") {
        powerUps.push({ x: block.x + block.width / 2, y: block.y - 42, collected: false });
      } else {
        collectibles.push({ x: block.x + block.width / 2, y: block.y - 42, type: block.type ?? 0, collected: false, secret: true });
      }
      score += 100;
      playTone(280, 0.08, "square");
      updateHud(now);
    };

    const defeatEnemy = (enemy: Enemy, now: number, kickDirection = 0) => {
      enemiesDefeated += 1;
      if (enemy.kind === "boss" || enemy.kind === "miniboss") {
        enemy.state = "defeated";
        enemy.defeatedUntil = now + 1900;
        enemy.vx = 0;
        enemy.vy = 0;
        score += enemy.kind === "boss" ? 3000 : 1500;
        burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff6a42", 48, 10);
        impact(enemy.x - 35, enemy.y, enemy.kind === "boss" ? "¡MAESTRO K.O.!" : "¡GUARDIÁN K.O.!", "#fff09b", now);
        playTone(62, 0.38, "sawtooth");
        updateHud(now);
        return;
      }
      if (enemy.clone) {
        enemy.state = "defeated";
        enemy.defeatedUntil = now + 900;
        enemy.vx = 0;
        enemy.vy = 0;
        score += 400;
        burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff3d5e", 26, 7);
        impact(enemy.x + enemy.width / 2, enemy.y, "¡SOMBRA K.O.!", "#ff8fa3", now);
        playTone(92, 0.16, "sawtooth");
        updateHud(now);
        return;
      }
      enemy.state = "cap";
      enemy.height = 40;
      enemy.width = 62;
      enemy.y = GROUND_Y - enemy.height;
      enemy.baseY = enemy.y;
      enemy.vy = 0;
      enemy.vx = kickDirection ? kickDirection * 560 : 0;
      score += 250;
      burst(enemy.x + enemy.width / 2, enemy.y, "#4fcaff", 20, 6);
      impact(enemy.x + enemy.width / 2, enemy.y, enemy.kind === "heavy" ? "¡CRACK!" : "¡PAM!", "#55dbff", now);
      playTone(105, 0.11, "square");
      updateHud(now);
    };

    const finishLevel = (now: number) => {
      if (currentStatus !== "playing") return;
      const objectiveProgress = getObjectiveProgress();
      if (objectiveProgress < level.objective.target) {
        player.x = Math.min(player.x, level.finishX - 15);
        if (!impactTexts.some((label) => label.text === "¡MISIÓN INCOMPLETA!")) impact(player.x - 135, player.y, "¡MISIÓN INCOMPLETA!", "#ffcf58", now);
        return;
      }
      score += 1000 + lives * 250 + collectedCount * 25;
      const elapsed = Math.max(1, Math.floor((now - levelStartedAt) / 1000));
      const stars = 1 + (collectedCount >= Math.ceil(collectibles.length * .65) ? 1 : 0) + (elapsed <= level.timeGoal && damageTaken <= 4 ? 1 : 0);
      const result: LevelResult = { level: levelIndex, stars, elapsed, treasures: collectedCount, total: collectibles.length, damage: damageTaken, score };
      if (!campaign) {
        const nextUnlocked = Math.min(LEVELS.length - 1, Math.max(unlockedLevelRef.current, levelIndex + 1));
        const nextStars = [...levelStarsRef.current];
        nextStars[levelIndex] = Math.max(nextStars[levelIndex] || 0, stars);
        window.localStorage.setItem("hardcore-adventure-unlocked", String(nextUnlocked));
        window.localStorage.setItem("hardcore-adventure-stars", JSON.stringify(nextStars));
        setUnlockedLevel(nextUnlocked);
        setLevelStars(nextStars);
        unlockedLevelRef.current = nextUnlocked;
        levelStarsRef.current = nextStars;
        setLevelResult(result);
        if (levelIndex === LEVELS.length - 1) onCompleteRef.current(score);
        currentStatus = "level-complete";
        setStatus("level-complete");
        updateHud(now);
        playTone(440, 0.11, "sine");
        later(() => playTone(660, 0.13, "sine"), 100);
      } else if (levelIndex < LEVELS.length - 1) {
        playTone(440, 0.11, "sine");
        later(() => playTone(660, 0.13, "sine"), 100);
        loadLevel(levelIndex + 1, now, true);
      } else {
        currentStatus = "won";
        setStatus("won");
        if (campaign) later(() => onCompleteRef.current(score), 1800);
        else onCompleteRef.current(score);
        const previousBest = Number(window.localStorage.getItem("benifaio-adventure-best") || 0);
        if (score > previousBest) window.localStorage.setItem("benifaio-adventure-best", String(score));
        updateHud(now);
        playTone(440, 0.12, "sine");
        later(() => playTone(660, 0.18, "sine"), 120);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "a", "d", "w", "h", "j", "k", "l", "f", " "].includes(key)) event.preventDefault();
      if (key === "arrowleft" || key === "a") input.left = true;
      if (key === "arrowright" || key === "d") input.right = true;
      if ((key === "arrowup" || key === "w" || key === " ") && !event.repeat) requestJump();
      if ((key === "h" || key === "j" || key === "f") && !event.repeat) attack(1);
      if ((key === "k" || key === "l") && !event.repeat) attack(2);
      if ((key === "1" || key === "2") && !event.repeat) attack(1);
      if ((key === "3" || key === "4") && !event.repeat) attack(2);
      if (key === "escape") onExitRef.current();
      if (key === "enter" && !event.repeat) requestJump();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") input.left = false;
      if (key === "arrowright" || key === "d") input.right = false;
      if (key === "arrowup" || key === "w" || key === " ") input.jump = false;
    };

    const drawImageContained = (image: HTMLImageElement, x: number, y: number, width: number, height: number, flip = false, alpha = 1, atlasCell?: { column: number; row: number }) => {
      if (!image.complete || !image.naturalWidth) return false;
      const sourceWidth = image.naturalWidth / (atlasCell ? 3 : 1);
      const sourceHeight = image.naturalHeight / (atlasCell ? 3 : 1);
      const sourceX = atlasCell ? atlasCell.column * sourceWidth : 0;
      const sourceY = atlasCell ? atlasCell.row * sourceHeight : 0;
      const ratio = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * ratio;
      const drawHeight = sourceHeight * ratio;
      context.save();
      context.globalAlpha = alpha;
      if (flip) {
        context.translate(x + width, 0);
        context.scale(-1, 1);
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, (width - drawWidth) / 2, y + height - drawHeight, drawWidth, drawHeight);
      } else {
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x + (width - drawWidth) / 2, y + height - drawHeight, drawWidth, drawHeight);
      }
      context.restore();
      return true;
    };

    const updateMovingPlatforms = (now: number) => {
      movingPlatforms.forEach((platform) => {
        const wave = Math.sin(now / 1000 * platform.speed + platform.phase) * platform.range;
        platform.x = platform.originX + (platform.axis === "x" ? wave : 0);
        platform.y = platform.originY + (platform.axis === "y" ? wave : 0);
      });
    };

    const hazardIsActive = (hazard: Hazard, now: number) => {
      if (hazard.kind !== "laser") return true;
      const cycle = hazard.cycle ?? 2100;
      return ((now + (hazard.phase ?? 0)) % cycle) / cycle < 0.58;
    };

    const hazardRectAt = (hazard: Hazard, now: number): Rect => {
      if (hazard.kind !== "crusher") return hazard;
      const cycle = hazard.cycle ?? 2400;
      const wave = (Math.sin((now + (hazard.phase ?? 0)) / cycle * Math.PI * 2) + 1) / 2;
      return { x: hazard.x, y: hazard.y, width: hazard.width, height: hazard.height + wave * (hazard.range ?? 210) };
    };

    const update = (dt: number, now: number) => {
      if (currentStatus !== "playing") return;
      updateMovingPlatforms(now);
      const elapsedSecond = Math.floor((now - levelStartedAt) / 1000);
      if (elapsedSecond !== lastHudSecond) {
        lastHudSecond = elapsedSecond;
        updateHud(now);
      }

      if (queuedAttackLevel && now > queuedAttackUntil) queuedAttackLevel = 0;
      if (queuedAttackLevel && now >= attackReadyAt) {
        const nextAttack = queuedAttackLevel;
        queuedAttackLevel = 0;
        attack(nextAttack);
      }

      if (jumpBufferUntil >= now && (player.onGround || now - lastGroundedAt < 105) && !jumpQueued) {
        jumpQueued = true;
        jumpPrepUntil = now + 100;
      }
      if (jumpQueued && now >= jumpPrepUntil) {
        jumpQueued = false;
        jumpBufferUntil = 0;
        player.vy = -755;
        player.onGround = false;
        player.vx += player.facing * 52;
        burst(player.x + player.width / 2, player.y + player.height, "rgba(255,191,115,.85)", 9, 4);
        playTone(185, 0.085, "triangle");
      }

      const previousTop = player.y;
      const previousBottom = player.y + player.height;
      const wasGrounded = player.onGround;
      if (wasGrounded) lastGroundedAt = now;
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const acceleration = jumpQueued ? 0 : player.onGround ? 1580 : 930;
      if (direction) {
        const targetVelocity = direction * (player.onGround ? 360 : 330);
        player.vx += direction * acceleration * dt;
        player.vx += (targetVelocity - player.vx) * Math.min(1, dt * (player.onGround ? 4.6 : 1.5));
        player.facing = direction;
      } else {
        player.vx *= Math.pow(player.onGround ? 0.78 : 0.962, dt * 60);
      }
      player.vx = clamp(player.vx, -375, 375);
      if (attackPoseUntil - now > 300 && player.onGround) player.vx *= Math.pow(.9, dt * 60);
      player.x = clamp(player.x + player.vx * dt, 0, level.worldWidth - player.width);
      const gravityMultiplier = player.vy < 0 && input.jump ? 0.72 : player.vy < 0 ? 1.72 : 1;
      player.vy += 1900 * gravityMultiplier * dt;
      player.y += player.vy * dt;
      player.onGround = false;

      const activeBlocks = blocks.filter((block) => block.state === "ready");
      if (player.vy < 0) {
        for (const block of activeBlocks) {
          const blockBottom = block.y + block.height;
          if (player.x + player.width > block.x + 5 && player.x < block.x + block.width - 5 && previousTop >= blockBottom - 6 && player.y <= blockBottom) {
            player.y = blockBottom;
            player.vy = 90;
            releaseSecret(block, now);
            break;
          }
        }
      }

      if (player.vy >= 0) {
        const landingSurfaces: Rect[] = [...surfaces, ...movingPlatforms, ...activeBlocks];
        for (const surface of landingSurfaces) {
          const bottom = player.y + player.height;
          if (player.x + player.width > surface.x + 7 && player.x < surface.x + surface.width - 7 && previousBottom <= surface.y + 9 && bottom >= surface.y) {
            player.y = surface.y - player.height;
            player.vy = 0;
            player.onGround = true;
            lastGroundedAt = now;
            if (!wasGrounded) {
              landingPoseUntil = now + 120;
              burst(player.x + player.width / 2, surface.y, "rgba(255,203,134,.72)", 7, 4);
              playTone(92, 0.035, "square");
            }
            break;
          }
        }
      }

      if (player.y > WORLD_HEIGHT + 100) {
        respawn(now);
        return;
      }

      level.checkpoints.forEach((checkpointX, index) => {
        if (index > activeCheckpoint && player.x >= checkpointX) {
          activeCheckpoint = index;
          score += 200;
          burst(checkpointX, GROUND_Y - 95, "#ffcf4d", 24, 5);
          impact(checkpointX, GROUND_Y - 160, "¡CONTROL!", "#ffcf4d", now);
          playTone(520, 0.09, "sine");
          updateHud(now);
        }
      });

      const playerRect = player as Rect;
      collectibles.forEach((item) => {
        if (item.collected) return;
        if (!overlaps(playerRect, { x: item.x - 32, y: item.y - 32, width: 64, height: 64 })) return;
        item.collected = true;
        collectedCount += 1;
        if (item.type >= 3) premiumCollected += 1;
        score += item.secret ? 250 : 100;
        burst(item.x, item.y, TOKEN_GLOWS[item.type], item.type >= 3 ? 20 : 13, item.type >= 3 ? 6 : 5);
        impact(item.x, item.y - 28, item.type >= 3 ? "¡PREMIO!" : item.secret ? "¡RARO!" : "+100", TOKEN_GLOWS[item.type], now);
        if (item.secret || item.type >= 3) showCrowdCelebration("¡LO TIENES!", now);
        playTone(430 + item.type * 70, 0.07, "sine");
        updateHud(now);
      });

      powerUps.forEach((item) => {
        if (item.collected || !overlaps(playerRect, { x: item.x - 38, y: item.y - 38, width: 76, height: 76 })) return;
        item.collected = true;
        poweredUntil = now + 10000;
        invulnerableUntil = now + 1300;
        score += 300;
        burst(item.x, item.y, "#ff8b2b", 24, 6);
        impact(item.x, item.y - 35, "¡PODER!", "#ffb249", now);
        showCrowdCelebration("¡PODER!", now);
        playTone(245, 0.12, "sawtooth");
        later(() => playTone(490, 0.13, "sine"), 90);
        updateHud(now);
      });

      lifeUps.forEach((item) => {
        if (item.collected || lives >= MAX_LIVES || !overlaps(playerRect, { x: item.x - 42, y: item.y - 42, width: 84, height: 84 })) return;
        item.collected = true;
        lives += 1;
        score += 500;
        burst(item.x, item.y, "#ff5178", 30, 7);
        impact(item.x - 38, item.y - 42, "¡VIDA EXTRA!", "#ff7091", now);
        showCrowdCelebration("¡VIDA EXTRA!", now);
        playTone(520, 0.1, "sine");
        later(() => playTone(760, 0.16, "sine"), 85);
        updateHud(now);
      });

      hazards.forEach((hazard) => {
        const hazardRect = hazardRectAt(hazard, now);
        if (hazard.kind === "wind") {
          if (overlaps(playerRect, hazardRect)) {
            player.vx += (hazard.strength ?? 220) * dt;
            player.vy -= 85 * dt;
          }
          return;
        }
        if (hazard.kind === "spring") {
          const onPad = player.vy >= 0 && player.y + player.height >= hazard.y && player.y + player.height <= hazard.y + hazard.height + 28 && player.x + player.width > hazard.x && player.x < hazard.x + hazard.width;
          if (onPad && now >= hazard.triggeredUntil) {
            hazard.triggeredUntil = now + 420;
            player.y = hazard.y - player.height;
            player.vy = -(hazard.strength ?? 980);
            player.onGround = false;
            stompPoseUntil = now + 420;
            burst(player.x + player.width / 2, hazard.y, "#64f3ff", 20, 6);
            impact(player.x, player.y, "¡BOING!", "#73f7ff", now);
            playTone(560, 0.11, "sine");
          }
          return;
        }
        if (hazardIsActive(hazard, now) && overlaps(playerRect, hazardRect)) damagePlayer(now, hazard.x + hazard.width / 2);
      });

      (level.gates ?? []).forEach((gate, gateIndex) => {
        if (completedGates.has(gateIndex)) return;
        const stillGuarded = enemies.some((enemy) => enemy.state === "bottle" && enemy.kind !== "boss" && enemy.x + enemy.width >= gate.enemyStart && enemy.x <= gate.enemyEnd);
        if (!stillGuarded) {
          completedGates.add(gateIndex);
          score += 500;
          burst(gate.x, GROUND_Y - 135, "#6df7ff", 30, 7);
          impact(gate.x - 100, GROUND_Y - 185, "¡PASO ABIERTO!", "#83fbff", now);
          playTone(610, 0.14, "sine");
          updateHud(now);
        } else if (player.x + player.width > gate.x) {
          player.x = gate.x - player.width;
          player.vx = Math.min(0, player.vx);
          if (!impactTexts.some((label) => label.text === gate.label)) impact(gate.x - 125, GROUND_Y - 175, gate.label, "#ffcf58", now);
        }
      });

      enemies.forEach((enemy) => {
        if (enemy.state === "gone") return;
        if (enemy.state === "defeated") {
          if (now >= enemy.defeatedUntil) enemy.state = "gone";
          return;
        }
        if (enemy.state === "bottle") {
          const directionToPlayer: -1 | 1 = player.x + player.width / 2 < enemy.x + enemy.width / 2 ? -1 : 1;
          const distanceToPlayer = Math.abs(player.x - enemy.x);
          if (enemy.kind === "boss" || enemy.kind === "miniboss") {
            enemy.facing = directionToPlayer;
            const style = enemy.bossStyle ?? "spray";
            if (enemy.y >= enemy.baseY && now >= enemy.nextAttackAt && distanceToPlayer < 860) {
              enemy.attackUntil = now + 720;
              enemy.nextAttackAt = now + (difficulty === "easy" ? 2850 : 2250) + Math.random() * 500;
              const waterBottleAttack = enemy.kind === "boss" && enemy.attackCount % 2 === 0;
              enemy.attackCount += 1;
              if (waterBottleAttack) {
                const bottleCount = difficulty === "easy" ? 3 : 4;
                for (let bottleIndex = 0; bottleIndex < bottleCount; bottleIndex += 1) {
                  monsterShots.push({
                    x: enemy.x + enemy.width / 2 + directionToPlayer * 66,
                    y: enemy.y + 72 - bottleIndex * 8,
                    vx: directionToPlayer * (265 + bottleIndex * 42),
                    vy: -155 + bottleIndex * 62,
                    life: 2.35,
                    size: 54,
                    color: "#75dcff",
                    kind: "waterBottle",
                  });
                }
                burst(enemy.x + enemy.width / 2 + directionToPlayer * 72, enemy.y + 72, "#74ddff", 22, 6);
                impact(enemy.x - 42, enemy.y - 8, "¡LLUVIA DE AGUA!", "#8ee8ff", now);
                playTone(112, 0.2, "sawtooth");
              } else {
                const shotCount = style === "turret" ? 7 : style === "aerial" ? 3 : 5;
                for (let sprayIndex = 0; sprayIndex < shotCount; sprayIndex += 1) {
                  monsterShots.push({
                    x: enemy.x + enemy.width / 2 + directionToPlayer * 62,
                    y: enemy.y + 72 + (sprayIndex - 2) * 12,
                    vx: directionToPlayer * (style === "turret" ? 280 + sprayIndex * 32 : 315 + sprayIndex * 38),
                    vy: (sprayIndex - (shotCount - 1) / 2) * (style === "aerial" ? 65 : 18) - 28,
                    life: 1.55,
                    size: 28 + sprayIndex * 3,
                    color: "#b7f5ff",
                    kind: "spray",
                  });
                }
                burst(enemy.x + enemy.width / 2 + directionToPlayer * 70, enemy.y + 72, "#b7f5ff", 18, 5);
                impact(enemy.x - 10, enemy.y - 8, "¡RÁFAGA!", "#b7f5ff", now);
                playTone(148, 0.2, "sawtooth");
              }
            }
            if (style === "charge" && distanceToPlayer < 430) enemy.vx = directionToPlayer * (difficulty === "easy" ? 150 : 205);
            if (style === "aerial") enemy.y = enemy.baseY + Math.sin(now / 340) * 38;
          }
          if (enemy.kind === "shooter") {
            enemy.facing = directionToPlayer;
            if (now >= enemy.nextAttackAt && distanceToPlayer < 760) {
              enemy.attackUntil = now + 520;
              enemy.nextAttackAt = now + (difficulty === "easy" ? 2600 : 2050) + Math.random() * 420;
              const shotY = enemy.y + enemy.height * 0.42;
              [-65, 45].forEach((spread) => monsterShots.push({
                x: enemy.x + enemy.width / 2 + directionToPlayer * 35,
                y: shotY,
                vx: directionToPlayer * 330,
                vy: clamp((player.y + player.height * 0.45 - shotY) * 0.72 + spread, -185, 185),
                life: 2.25,
                size: 22,
                color: "#7bf7ff",
                kind: "pulse",
              }));
              burst(enemy.x + enemy.width / 2 + directionToPlayer * 35, shotY, "#7bf7ff", 12, 4);
              playTone(305, 0.09, "square");
            }
          }
          if (enemy.kind === "flyer") {
            enemy.facing = directionToPlayer;
            enemy.y = enemy.baseY + Math.sin(now / 330 + enemy.minX * 0.01) * 28;
            if (now >= enemy.nextAttackAt && distanceToPlayer < 620) {
              enemy.attackUntil = now + 340;
              enemy.nextAttackAt = now + (difficulty === "easy" ? 2500 : 1900) + Math.random() * 500;
              monsterShots.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                vx: clamp((player.x - enemy.x) * 0.34, -145, 145),
                vy: 125,
                life: 2.6,
                size: 25,
                color: "#ff68cd",
                kind: "drop",
              });
              impact(enemy.x - 22, enemy.y - 10, "¡CUIDADO!", "#ff7bd5", now);
            }
          }
          if (enemy.kind === "charger") {
            if (distanceToPlayer < 390) {
              enemy.facing = directionToPlayer;
              enemy.vx = directionToPlayer * (difficulty === "easy" ? 185 : 235);
              enemy.attackUntil = now + 160;
            } else if (Math.abs(enemy.vx) > 150) enemy.vx = Math.sign(enemy.vx) * 105;
          }
          if (enemy.kind === "hopper" || (enemy.kind === "boss" && enemy.bossStyle !== "turret") || (enemy.kind === "miniboss" && enemy.bossStyle === "charge")) {
            if (enemy.y >= enemy.baseY && now >= enemy.nextJumpAt && now >= enemy.attackUntil) {
              enemy.vy = enemy.kind === "boss" ? -350 : -500;
              enemy.nextJumpAt = now + (enemy.kind === "boss" ? 2200 : 1450) + Math.random() * 650;
            }
            enemy.vy += 1500 * dt;
            enemy.y = Math.min(enemy.baseY, enemy.y + enemy.vy * dt);
            if (enemy.y >= enemy.baseY) enemy.vy = 0;
          }
          if (now >= enemy.attackUntil || enemy.kind === "charger" || enemy.kind === "flyer") enemy.x += enemy.vx * dt;
          if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
            enemy.vx *= -1;
            enemy.x = clamp(enemy.x, enemy.minX, enemy.maxX - enemy.width);
          }
        } else if (Math.abs(enemy.vx) > 1) {
          enemy.x += enemy.vx * dt;
          enemy.vx *= Math.pow(0.998, dt * 60);
          if (enemy.x <= 0 || enemy.x + enemy.width >= level.worldWidth) {
            enemy.vx *= -1;
            enemy.x = clamp(enemy.x, 0, level.worldWidth - enemy.width);
          }
        }

        if (!overlaps(playerRect, enemy as Rect)) return;
        const stomped = player.vy > 115 && previousBottom <= enemy.y + Math.min(34, enemy.height * 0.4);
        if (enemy.state === "bottle" && (stomped || now < poweredUntil)) {
          if (enemy.kind === "boss" || enemy.kind === "miniboss") {
            enemy.hp -= now < poweredUntil ? 2 : 1;
            enemy.hitUntil = now + 420;
            player.vy = -560;
            stompPoseUntil = now + 360;
            score += 200;
            burst(enemy.x + enemy.width / 2, enemy.y + 28, "#ff7656", 22, 7);
            if (enemy.hp <= 0) defeatEnemy(enemy, now, player.facing);
            else impact(enemy.x, enemy.y, `¡JEFE ×${enemy.hp}!`, "#fff09b", now);
            playTone(82, 0.16, "sawtooth");
            updateHud(now);
          } else
          if (enemy.hp > 1 && now >= poweredUntil) {
            enemy.hp -= 1;
            enemy.hitUntil = now + 420;
            enemy.height = 92;
            enemy.y = GROUND_Y - enemy.height;
            enemy.baseY = enemy.y;
            player.vy = -470;
            stompPoseUntil = now + 300;
            score += 150;
            burst(enemy.x + enemy.width / 2, enemy.y, "#8de7ff", 14, 5);
            impact(enemy.x + enemy.width / 2, enemy.y, "¡OTRA!", "#8de7ff", now);
            playTone(125, 0.09, "square");
            updateHud(now);
          } else {
            defeatEnemy(enemy, now);
            player.vy = -520;
            stompPoseUntil = now + 340;
          }
        } else if (enemy.state === "cap") {
          if (stomped && Math.abs(enemy.vx) > 80) {
            enemy.vx = 0;
            player.vy = -440;
            stompPoseUntil = now + 280;
          } else if (Math.abs(enemy.vx) < 80) {
            enemy.vx = player.facing * 560;
            enemy.x += player.facing * 12;
            score += 50;
            impact(enemy.x, enemy.y, "¡FUERA!", "#5bddff", now);
            playTone(205, 0.08, "square");
            updateHud(now);
          } else {
            damagePlayer(now, enemy.x);
          }
        } else {
          damagePlayer(now, enemy.x);
        }
      });

      projectiles.forEach((projectile) => {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
      projectile.vy += (projectile.kind === "bottle" || projectile.kind === "jager" ? 180 : projectile.kind === "mushroom" ? 420 : projectile.kind === "artichokes" ? 260 : 35) * dt;
        projectile.rotation += dt * 9 * Math.sign(projectile.vx);
        const projectileRect = { x: projectile.x - projectile.size / 2, y: projectile.y - projectile.size / 2, width: projectile.size, height: projectile.size };
        for (const block of blocks) {
          if (block.state === "broken" || !overlaps(projectileRect, block)) continue;
          projectile.x = -9999;
          releaseSecret(block, now);
          break;
        }
        for (const enemy of enemies) {
          if (enemy.state !== "bottle" || !overlaps(projectileRect, enemy as Rect)) continue;
          projectile.x = -9999;
          enemy.hp -= projectile.kind === "mushroom" || projectile.kind === "ear" ? 2 : 1;
          if (enemy.kind === "boss" || enemy.kind === "miniboss" || enemy.clone) enemy.hitUntil = now + 420;
          burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, projectile.kind === "bottle" ? "#ffad48" : "#ff54a5", 16, 5);
          if (enemy.hp <= 0) defeatEnemy(enemy, now, Math.sign(projectile.vx));
          else {
            enemy.vx *= -1;
            impact(enemy.x, enemy.y, "¡CRACK!", "#fff1b1", now);
            score += 100;
            updateHud(now);
          }
          break;
        }
      });
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        if (projectiles[index].x < -200 || projectiles[index].x > level.worldWidth + 200 || projectiles[index].y > WORLD_HEIGHT + 100) projectiles.splice(index, 1);
      }

      monsterShots.forEach((shot) => {
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.vy += (shot.kind === "drop" ? 430 : shot.kind === "waterBottle" ? 475 : shot.kind === "spray" ? 90 : 0) * dt;
        shot.life -= dt;
        if (shot.life <= 0) return;
        const shotRect = { x: shot.x - shot.size / 2, y: shot.y - shot.size / 2, width: shot.size, height: shot.size };
        if (overlaps(shotRect, playerRect)) {
          shot.life = 0;
          burst(shot.x, shot.y, shot.color, 11, 4);
          damagePlayer(now, shot.x);
        }
      });
      for (let index = monsterShots.length - 1; index >= 0; index -= 1) {
        const shot = monsterShots[index];
        if (shot.life <= 0 || shot.x < -200 || shot.x > level.worldWidth + 200 || shot.y > WORLD_HEIGHT + 100) monsterShots.splice(index, 1);
      }

      enemies.forEach((capEnemy) => {
        if (capEnemy.state !== "cap" || Math.abs(capEnemy.vx) < 80) return;
        enemies.forEach((target) => {
          if (target === capEnemy || target.state !== "bottle" || !overlaps(capEnemy as Rect, target as Rect)) return;
          if (target.kind === "boss" || target.kind === "miniboss") {
            target.hp -= 2;
            target.hitUntil = now + 420;
            capEnemy.vx *= -0.8;
            if (target.hp <= 0) defeatEnemy(target, now, Math.sign(capEnemy.vx));
            else impact(target.x, target.y, `¡JEFE ×${target.hp}!`, "#fff09b", now);
          } else {
            target.state = "gone";
            enemiesDefeated += 1;
          }
          score += target.kind === "boss" || target.kind === "miniboss" ? 500 : 350;
          burst(target.x + target.width / 2, target.y + 40, "#62dfff", 20, 6);
          impact(target.x, target.y, "¡DOBLE!", "#62dfff", now);
          playTone(120, 0.09, "square");
          updateHud(now);
        });
      });

      sparks.forEach((spark) => {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += 380 * dt;
        spark.life -= dt;
      });
      for (let index = sparks.length - 1; index >= 0; index -= 1) if (sparks[index].life <= 0) sparks.splice(index, 1);
      impactTexts.forEach((label) => { label.y -= 42 * dt; label.life -= dt; });
      for (let index = impactTexts.length - 1; index >= 0; index -= 1) if (impactTexts[index].life <= 0) impactTexts.splice(index, 1);

      const targetCamera = clamp(player.x - viewportWidth * 0.34, 0, Math.max(0, level.worldWidth - viewportWidth));
      cameraX += (targetCamera - cameraX) * Math.min(1, dt * 7);
      const bossAlive = enemies.some((enemy) => (enemy.kind === "boss" || enemy.kind === "miniboss") && enemy.state === "bottle");
      const bossBlocking = enemies.some((enemy) => (enemy.kind === "boss" || enemy.kind === "miniboss") && enemy.state !== "gone");
      if (player.x > level.finishX - 15 && bossAlive) {
        player.x = Math.min(player.x, level.finishX - 15);
        if (!impactTexts.some((label) => label.text === "¡DERROTA AL GUARDIÁN!")) impact(player.x - 120, player.y, "¡DERROTA AL GUARDIÁN!", "#ffcf58", now);
      }
      if (player.x > level.finishX - 15 && !bossBlocking) finishLevel(now);
    };

    const drawPlatform = (surface: Rect, moving = false) => {
      const visibleX = surface.x - cameraX;
      if (visibleX > viewportWidth + 30 || visibleX + surface.width < -30) return;
      const palette = LEVEL_PALETTES[levelIndex];
      const gradient = context.createLinearGradient(0, surface.y, 0, surface.y + surface.height);
      gradient.addColorStop(0, moving ? "#5bd7ed" : palette.light);
      gradient.addColorStop(0.14, moving ? "#17465a" : palette.dark);
      gradient.addColorStop(1, "#160a12");
      context.fillStyle = gradient;
      context.fillRect(visibleX, surface.y, surface.width, surface.height);
      context.fillStyle = moving ? "rgba(166,244,255,.9)" : "rgba(255,214,120,.86)";
      context.fillRect(visibleX, surface.y, surface.width, 5);
      context.strokeStyle = "rgba(255,255,255,.14)";
      context.lineWidth = 2;
      for (let x = visibleX + 48; x < visibleX + surface.width; x += 48) {
        context.beginPath();
        context.moveTo(x, surface.y + 7);
        context.lineTo(x, Math.min(WORLD_HEIGHT, surface.y + 45));
        context.stroke();
      }
    };

    const drawHazard = (hazard: Hazard, now: number) => {
      const visibleX = hazard.x - cameraX;
      if (visibleX > viewportWidth + 180 || visibleX + hazard.width < -180) return;
      context.save();
      if (hazard.kind === "spikes") {
        context.shadowColor = "#ff493d";
        context.shadowBlur = 18;
        const teeth = Math.max(2, Math.round(hazard.width / 24));
        context.fillStyle = "#e7eef2";
        for (let tooth = 0; tooth < teeth; tooth += 1) {
          const left = visibleX + tooth * hazard.width / teeth;
          context.beginPath();
          context.moveTo(left, hazard.y + hazard.height);
          context.lineTo(left + hazard.width / teeth / 2, hazard.y);
          context.lineTo(left + hazard.width / teeth, hazard.y + hazard.height);
          context.closePath();
          context.fill();
        }
      } else if (hazard.kind === "spring") {
        const pressed = now < hazard.triggeredUntil;
        context.shadowColor = "#56f1ff";
        context.shadowBlur = 20;
        context.fillStyle = "#102a38";
        context.fillRect(visibleX, hazard.y + (pressed ? 10 : 4), hazard.width, hazard.height - (pressed ? 10 : 4));
        context.fillStyle = "#65f5ff";
        context.fillRect(visibleX - 4, hazard.y + (pressed ? 8 : 0), hazard.width + 8, 9);
      } else if (hazard.kind === "laser") {
        const active = hazardIsActive(hazard, now);
        context.fillStyle = "#17212a";
        context.fillRect(visibleX - 12, hazard.y - 10, hazard.width + 24, 24);
        context.fillRect(visibleX - 12, hazard.y + hazard.height - 14, hazard.width + 24, 24);
        if (active) {
          context.shadowColor = levelIndex === 3 ? "#ff4be1" : "#ff3f36";
          context.shadowBlur = 26;
          context.fillStyle = levelIndex === 3 ? "rgba(255,56,222,.88)" : "rgba(255,50,42,.9)";
          context.fillRect(visibleX + hazard.width * 0.28, hazard.y, hazard.width * 0.44, hazard.height);
          context.fillStyle = "white";
          context.fillRect(visibleX + hazard.width * 0.43, hazard.y, Math.max(2, hazard.width * 0.14), hazard.height);
        } else {
          context.fillStyle = "#6dff9a";
          context.beginPath();
          context.arc(visibleX + hazard.width / 2, hazard.y + 2, 7, 0, Math.PI * 2);
          context.fill();
        }
      } else if (hazard.kind === "crusher") {
        const rect = hazardRectAt(hazard, now);
        const bottom = rect.y + rect.height;
        context.shadowColor = "#ff5a35";
        context.shadowBlur = 16;
        const metal = context.createLinearGradient(visibleX, 0, visibleX + rect.width, 0);
        metal.addColorStop(0, "#202a31"); metal.addColorStop(.5, "#81919b"); metal.addColorStop(1, "#151c22");
        context.fillStyle = metal;
        context.fillRect(visibleX, rect.y, rect.width, rect.height);
        context.fillStyle = "#ffb127";
        for (let stripe = 0; stripe < rect.width; stripe += 30) context.fillRect(visibleX + stripe, bottom - 23, 15, 23);
        context.fillStyle = "#1a1412";
        for (let stripe = 15; stripe < rect.width; stripe += 30) context.fillRect(visibleX + stripe, bottom - 23, 15, 23);
      } else if (hazard.kind === "wind") {
        context.fillStyle = "rgba(98,241,255,.035)";
        context.fillRect(visibleX, hazard.y, hazard.width, hazard.height);
        context.strokeStyle = "rgba(125,245,255,.42)";
        context.lineWidth = 3;
        const direction = Math.sign(hazard.strength ?? 1);
        for (let line = 0; line < 6; line += 1) {
          const offset = ((now * 0.13 * direction + line * 79) % (hazard.width + 120)) - 60;
          const x = direction > 0 ? visibleX + offset : visibleX + hazard.width - offset;
          const y = hazard.y + 45 + line * hazard.height / 7;
          context.beginPath(); context.moveTo(x, y); context.lineTo(x + direction * 62, y); context.stroke();
        }
      }
      if (hazard.label && hazard.kind !== "wind") {
        context.fillStyle = "rgba(3,6,10,.78)";
        context.font = "900 11px Arial";
        context.textAlign = "center";
        context.fillText(hazard.label, visibleX + hazard.width / 2, Math.max(190, hazard.y - 12));
      }
      context.restore();
    };

    const drawBattleGate = (gate: BattleGate, gateIndex: number, now: number) => {
      if (completedGates.has(gateIndex)) return;
      const x = gate.x - cameraX;
      if (x < -100 || x > viewportWidth + 100) return;
      context.save();
      context.shadowColor = "#5ff7ff";
      context.shadowBlur = 24;
      context.fillStyle = `rgba(64,227,255,${0.26 + Math.sin(now / 95) * 0.08})`;
      context.fillRect(x - 9, 235, 18, GROUND_Y - 235);
      context.fillStyle = "#e9ffff";
      context.fillRect(x - 2, 235, 4, GROUND_Y - 235);
      context.shadowBlur = 0;
      context.fillStyle = "rgba(3,8,13,.9)";
      context.fillRect(x - 92, 250, 184, 34);
      context.fillStyle = "#7df8ff";
      context.textAlign = "center";
      context.font = "900 14px Impact";
      context.fillText(gate.label, x, 273);
      context.restore();
    };

    const drawFlag = (worldX: number, active: boolean, label: string) => {
      const x = worldX - cameraX;
      context.strokeStyle = active ? "#ffe283" : "rgba(255,255,255,.52)";
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(x, GROUND_Y);
      context.lineTo(x, GROUND_Y - 142);
      context.stroke();
      context.fillStyle = active ? "#ff8b2b" : "rgba(28,34,44,.78)";
      context.beginPath();
      context.moveTo(x + 3, GROUND_Y - 140);
      context.lineTo(x + 84, GROUND_Y - 114);
      context.lineTo(x + 3, GROUND_Y - 86);
      context.closePath();
      context.fill();
      context.fillStyle = "white";
      context.font = "900 15px Arial";
      context.fillText(label, x + 12, GROUND_Y - 108);
    };

    const drawHeroPose = (pose: HeroPose, alpha: number, now: number, playerX: number, powered: boolean, flashAlpha: number) => {
      const visualScale = powered ? 1.13 : 1;
      const isWidePose = pose === "kick" || pose === "crouch" || pose === "fire" || pose === "heavyFire";
      const poseWidth = (isWidePose ? 194 : 145) * visualScale;
      const poseHeight = (pose === "crouch" ? 145 : 170) * visualScale;
      const jumpTilt = player.onGround || pose === "hit" ? 0 : clamp(player.vy / 1800, -0.2, 0.2);
      context.save();
      context.shadowColor = fighter === "maletilla" ? "rgba(45,225,255,.78)" : "rgba(255,66,156,.78)";
      context.shadowBlur = 13;
      context.translate(playerX + player.width / 2, player.y + player.height);
      if (currentStatus === "won") {
        context.translate(Math.sin(now / 115) * 12, -Math.abs(Math.sin(now / 180)) * 22);
        context.rotate(Math.sin(now / 130) * 0.09);
      } else if (currentStatus === "lost") context.rotate(-0.7);
      context.rotate(jumpTilt);
      if (Math.abs(player.vx) > 35 && player.onGround) {
        const speedRatio = clamp(Math.abs(player.vx) / 345, 0, 1);
        context.translate(0, Math.sin(now / (92 - speedRatio * 24)) * (1.5 + speedRatio * 2.2));
        context.rotate(clamp(player.vx / 4200, -.065, .065));
      }
      const fireElapsed = now - poseChangedAt;
      const poseImage = pose === "fire"
        ? fireElapsed < 110
          ? images["hero-fire-windup"]
          : fireElapsed < 235
            ? images["hero-fire-aim"]
            : fireElapsed < 470
              ? images["hero-fire"]
              : images["hero-fire-recoil"]
        : images[`hero-${pose}`];
      // Only these attack drawings face left; every other frame faces right.
      const usesLegacyFire = pose === "fire" && (poseImage === images["hero-fire"] || poseImage === images["hero-fire-aim"]);
      const nativeFacesRight = usesLegacyFire ? fighter !== "cristian" && fighter !== "bacora" : true;
      const flipPose = nativeFacesRight ? player.facing < 0 : player.facing > 0;
      const atlasCell = fighter === "elchica" || fighter === "ogalla"
        ? pose === "walkA" || pose === "walkE" ? { column: 1, row: 0 }
          : pose === "walkC" ? { column: 2, row: 0 }
            : pose === "crouch" || pose === "hit" ? { column: 2, row: 2 }
              : pose === "rise" ? { column: 2, row: 1 }
                : pose === "fire" ? { column: 0, row: 2 }
                  : pose === "heavyFire" ? { column: 1, row: 2 }
                    : pose === "kick" ? { column: 1, row: 1 }
                      : { column: 0, row: 0 }
        : undefined;
      drawImageContained(poseImage, -poseWidth / 2, -poseHeight, poseWidth, poseHeight, flipPose, alpha * flashAlpha, atlasCell);
      if (fighter === "rafeta" && images["weapon-masia"]?.complete) {
        const logoWidth = poseWidth * 0.103;
        const logoHeight = poseHeight * 0.215;
        const logoX = -poseWidth / 2 + poseWidth * 0.295;
        context.save();
        if (flipPose) context.scale(-1, 1);
        context.drawImage(images["weapon-masia"], logoX, -poseHeight + poseHeight * 0.551, logoWidth, logoHeight);
        context.restore();
      }
      context.restore();
    };

    const draw = (now: number) => {
      context.clearRect(0, viewportTop, viewportWidth, viewportHeight);
      context.save();
      if (now < shakeUntil) context.translate((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 7);

      const palette = LEVEL_PALETTES[levelIndex];
      const horizon = context.createLinearGradient(0, 210, 0, WORLD_HEIGHT);
      horizon.addColorStop(0, palette.sky);
      horizon.addColorStop(1, palette.fog);
      context.fillStyle = horizon;
      context.fillRect(0, 0, viewportWidth, WORLD_HEIGHT);

      context.fillStyle = palette.city;
      for (let index = -1; index < Math.ceil(viewportWidth / 210) + 2; index += 1) {
        const x = index * 210 - (cameraX * 0.18) % 210;
        const buildingHeight = 70 + ((index + 7) % 3) * 24;
        context.fillRect(x, GROUND_Y - buildingHeight - 28, 155, buildingHeight);
        context.fillStyle = palette.window;
        for (let windowIndex = 0; windowIndex < 4; windowIndex += 1) context.fillRect(x + 18 + windowIndex * 30, GROUND_Y - buildingHeight, 10, 18);
        context.fillStyle = palette.city;
      }

      if (levelIndex === 1) {
        context.strokeStyle = "rgba(101,236,245,.18)"; context.lineWidth = 18;
        for (let pipe = -1; pipe < Math.ceil(viewportWidth / 320) + 1; pipe += 1) {
          const x = pipe * 320 - (cameraX * .12) % 320;
          context.beginPath(); context.moveTo(x, 260); context.lineTo(x, 470); context.lineTo(x + 92, 470); context.stroke();
        }
      } else if (levelIndex === 2) {
        context.fillStyle = "rgba(255,178,39,.13)";
        for (let barrier = -1; barrier < Math.ceil(viewportWidth / 280) + 1; barrier += 1) {
          const x = barrier * 280 - (cameraX * .15) % 280;
          context.fillRect(x, 535, 155, 22);
        }
      } else if (levelIndex === 3) {
        for (let sign = -1; sign < Math.ceil(viewportWidth / 240) + 1; sign += 1) {
          const x = sign * 240 - (cameraX * .2) % 240;
          context.shadowColor = sign % 2 ? "#ff4fd8" : "#67edff"; context.shadowBlur = 20;
          context.fillStyle = sign % 2 ? "rgba(255,55,211,.23)" : "rgba(73,231,255,.2)";
          context.fillRect(x, 315, 24, 190);
        }
        context.shadowBlur = 0;
      } else if (levelIndex === 4) {
        context.fillStyle = "rgba(255,63,45,.12)";
        for (let tower = -1; tower < Math.ceil(viewportWidth / 360) + 1; tower += 1) {
          const x = tower * 360 - (cameraX * .1) % 360;
          context.fillRect(x, 250, 95, 300);
          context.fillStyle = "rgba(255,188,53,.19)"; context.fillRect(x + 18, 285, 58, 18); context.fillStyle = "rgba(255,63,45,.12)";
        }
      }

      surfaces.forEach((surface) => drawPlatform(surface));
      movingPlatforms.forEach((surface) => drawPlatform(surface, true));
      hazards.forEach((hazard) => drawHazard(hazard, now));
      (level.gates ?? []).forEach((gate, gateIndex) => drawBattleGate(gate, gateIndex, now));

      blocks.forEach((block) => {
        if (block.state === "broken") return;
        const x = block.x - cameraX;
        const gradient = context.createLinearGradient(0, block.y, 0, block.y + block.height);
        gradient.addColorStop(0, block.crate ? "#ad642f" : "#ffd15b");
        gradient.addColorStop(1, block.crate ? "#4e2416" : "#b8491d");
        context.fillStyle = gradient;
        context.fillRect(x, block.y, block.width, block.height);
        context.strokeStyle = "#fff0a2";
        context.lineWidth = 3;
        context.strokeRect(x + 3, block.y + 3, block.width - 6, block.height - 6);
        context.fillStyle = block.crate ? "#f3bf79" : "#541b13";
        context.font = "900 38px Impact";
        context.fillText(block.crate ? "×" : "?", x + (block.crate ? 17 : 22), block.y + 43);
      });

      level.checkpoints.forEach((checkpoint, index) => drawFlag(checkpoint, index <= activeCheckpoint, `C${index + 1}`));
      drawFlag(level.finishX, false, "META");

      collectibles.forEach((item, index) => {
        if (item.collected) return;
        const x = item.x - cameraX;
        if (x < -60 || x > viewportWidth + 60) return;
        const bob = Math.sin(now / 220 + index) * 8;
        context.save();
        const premium = item.type >= 3;
        const tokenSize = premium ? 92 : 74;
        context.shadowColor = TOKEN_GLOWS[item.type];
        context.shadowBlur = premium ? 28 : item.secret ? 30 : 18;
        drawImageContained(images[`token-${item.type}`], x - tokenSize / 2, item.y - tokenSize / 2 + bob, tokenSize, tokenSize);
        context.restore();
      });

      powerUps.forEach((item, index) => {
        if (item.collected) return;
        const x = item.x - cameraX;
        if (x < -75 || x > viewportWidth + 75) return;
        const bob = Math.sin(now / 190 + index * 1.7) * 7;
        context.save();
        context.shadowColor = "#ff8b2b";
        context.shadowBlur = 24;
        drawImageContained(images.mushroom, x - 46, item.y - 46 + bob, 92, 92);
        context.restore();
      });

      lifeUps.forEach((item, index) => {
        if (item.collected) return;
        const x = item.x - cameraX;
        if (x < -75 || x > viewportWidth + 75) return;
        const bob = Math.sin(now / 170 + index * 1.9) * 8;
        const pulse = 1 + Math.sin(now / 125 + index) * 0.08;
        context.save();
        context.translate(x, item.y + bob);
        context.scale(pulse, pulse);
        context.shadowColor = "#ff426f";
        context.shadowBlur = 30;
        context.fillStyle = "#ff426f";
        context.beginPath();
        context.moveTo(0, 29);
        context.bezierCurveTo(-42, 5, -38, -29, -15, -29);
        context.bezierCurveTo(-3, -29, 0, -17, 0, -12);
        context.bezierCurveTo(0, -17, 3, -29, 15, -29);
        context.bezierCurveTo(38, -29, 42, 5, 0, 29);
        context.fill();
        context.strokeStyle = "#fff4c9";
        context.lineWidth = 4;
        context.stroke();
        context.shadowBlur = 0;
        context.fillStyle = "white";
        context.textAlign = "center";
        context.font = "900 13px Impact";
        context.fillText("+1", 0, 3);
        context.fillStyle = "rgba(5,3,7,.84)";
        context.fillRect(-43, 36, 86, 20);
        context.fillStyle = "#ff9ab0";
        context.font = "900 10px Arial";
        context.fillText("VIDA EXTRA", 0, 50);
        context.restore();
      });

      enemies.forEach((enemy, index) => {
        if (enemy.state === "gone") return;
        const x = enemy.x - cameraX;
        if (x < -180 || x > viewportWidth + 180) return;
        context.save();
        context.shadowColor = enemy.state === "cap" ? "#50c9ff" : enemy.kind === "heavy" ? "#ff8846" : "rgba(0,0,0,.72)";
        context.shadowBlur = enemy.state === "cap" ? 20 : enemy.kind === "heavy" ? 18 : 8;
        if (enemy.kind === "boss" || enemy.kind === "miniboss") {
          const bossPose = enemy.state === "defeated"
            ? "defeated-v2"
            : now < enemy.hitUntil
              ? "hit-v2"
              : now < enemy.attackUntil
                ? (Math.floor(now / 120) % 2 ? "fire" : "aim")
                : (["ready-a", "ready-b", "ready-a", "ready-c"] as const)[Math.floor(now / 520) % 4];
          const defeated = bossPose === "defeated-v2";
          const miniScale = enemy.kind === "miniboss" ? .82 : 1;
          const bossWidth = (defeated ? 265 : 224) * miniScale;
          const bossHeight = (defeated ? 210 : 245) * miniScale;
          const bossBottom = enemy.y + enemy.height + (defeated ? 7 : 0);
          const bossTop = bossBottom - bossHeight;
          context.shadowColor = defeated ? "#ffd35a" : enemy.bossStyle === "aerial" ? "#ff55dc" : enemy.bossStyle === "turret" ? "#65efff" : enemy.bossStyle === "charge" ? "#ff733c" : now < enemy.attackUntil ? "#8ef5ff" : "#ff8a35";
          context.shadowBlur = defeated ? 12 : 22;
          drawImageContained(images[`boss-${bossPose}`], x + enemy.width / 2 - bossWidth / 2, bossTop, bossWidth, bossHeight, enemy.facing > 0);
          if (!defeated) {
            const maxBossHp = enemy.kind === "boss" ? (difficulty === "easy" ? 7 : 11) : (difficulty === "easy" ? 4 : 6);
            const bossName = enemy.kind === "miniboss" ? (enemy.bossStyle === "aerial" ? "FANTASMA DE NEÓN" : "GUARDIÁN CENTRAL") : enemy.bossStyle === "turret" ? "VIGILANTE DE LA FÁBRICA" : enemy.bossStyle === "charge" ? "BESTIA DEL ASALTO" : "MAESTRO DEL ESPRAY";
            const bossHudWidth = enemy.kind === "boss" ? 220 : 188;
            const bossHudX = x + enemy.width / 2 - bossHudWidth / 2;
            const bossHudY = bossTop - 64;

            context.shadowColor = "rgba(0,0,0,.9)";
            context.shadowBlur = 12;
            context.fillStyle = "rgba(12,5,8,.94)";
            context.fillRect(bossHudX, bossHudY, bossHudWidth, 42);
            context.strokeStyle = enemy.kind === "boss" ? "#ff7c2a" : "#ffd35a";
            context.lineWidth = 2;
            context.strokeRect(bossHudX + 1, bossHudY + 1, bossHudWidth - 2, 40);
            context.shadowBlur = 0;
            context.fillStyle = "#fff0b0";
            context.font = "900 13px Impact";
            context.textAlign = "center";
            context.fillText(bossName, x + enemy.width / 2, bossHudY + 15);
            context.fillStyle = "rgba(255,255,255,.16)";
            context.fillRect(bossHudX + 9, bossHudY + 24, bossHudWidth - 18, 10);
            context.fillStyle = "#ff513c";
            context.fillRect(bossHudX + 9, bossHudY + 24, (bossHudWidth - 18) * Math.max(0, enemy.hp) / maxBossHp, 10);
            context.textAlign = "left";
          }
        } else if (enemy.clone) {
          const defeated = enemy.state === "defeated";
          const pose = defeated || now < enemy.hitUntil ? "hit" : now < enemy.attackUntil ? "fire" : Math.floor(now / 170 + index) % 2 ? "walkA" : "idle";
          const image = images[`clone-${enemy.clone}-${pose}`] ?? images[`clone-${enemy.clone}-idle`];
          const drawHeight = enemy.height * 1.55;
          const drawWidth = drawHeight * .72;
          const facesRight = enemy.kind === "shooter" || enemy.kind === "charger" ? enemy.facing > 0 : enemy.vx > 0;
          const fade = defeated ? Math.max(0, (enemy.defeatedUntil - now) / 900) : 1;
          context.globalAlpha = fade;
          context.shadowColor = enemy.kind === "shooter" ? "#59e8ff" : enemy.kind === "charger" ? "#ff4238" : "#ff8846";
          context.shadowBlur = 22;
          context.filter = enemy.kind === "shooter"
            ? "grayscale(.5) brightness(.66) sepia(.4) hue-rotate(160deg) saturate(2)"
            : "grayscale(.45) brightness(.62) contrast(1.2) sepia(.35) hue-rotate(-28deg) saturate(2.2)";
          if (defeated) {
            context.translate(x + enemy.width / 2, enemy.y + enemy.height);
            context.rotate((1 - fade) * 1.35 * (facesRight ? -1 : 1));
            context.translate(-(x + enemy.width / 2), -(enemy.y + enemy.height));
          }
          if (image && !drawImageContained(image, x + enemy.width / 2 - drawWidth / 2, enemy.y + enemy.height - drawHeight, drawWidth, drawHeight, !facesRight)) {
            drawImageContained(images.bottle, x - 17, enemy.y - 19, enemy.width + 34, enemy.height + 29, facesRight);
          }
          context.filter = "none";
          context.globalAlpha = 1;
          if (!defeated && enemy.hp > 1) {
            context.shadowBlur = 0;
            context.fillStyle = "rgba(10,4,8,.85)";
            context.fillRect(x + enemy.width / 2 - 22, enemy.y + enemy.height - drawHeight - 10, 44, 6);
            context.fillStyle = "#ff5644";
            context.fillRect(x + enemy.width / 2 - 22, enemy.y + enemy.height - drawHeight - 10, 44 * Math.min(1, enemy.hp / 2), 6);
          }
        } else if (enemy.state === "bottle") {
          const walkBob = enemy.kind === "hopper" && enemy.y < enemy.baseY ? 0 : Math.sin(now / (enemy.kind === "runner" ? 75 : 115) + index) * 3;
          if (enemy.kind === "shooter") {
            context.shadowColor = "#62f4ff";
            context.shadowBlur = 24;
            context.strokeStyle = "rgba(117,248,255,.9)";
            context.lineWidth = 4;
            context.beginPath(); context.arc(x + enemy.width / 2, enemy.y + enemy.height * .42, 24 + Math.sin(now / 130) * 3, 0, Math.PI * 2); context.stroke();
          } else if (enemy.kind === "flyer") {
            context.shadowColor = "#ff62d6";
            context.shadowBlur = 25;
            context.fillStyle = "rgba(255,102,220,.68)";
            context.beginPath();
            context.ellipse(x - 3, enemy.y + 36, 27, 12, -0.35, 0, Math.PI * 2);
            context.ellipse(x + enemy.width + 3, enemy.y + 36, 27, 12, 0.35, 0, Math.PI * 2);
            context.fill();
          } else if (enemy.kind === "charger") {
            context.shadowColor = "#ff4238";
            context.shadowBlur = 28;
            context.strokeStyle = "rgba(255,76,55,.85)";
            context.lineWidth = 6;
            context.beginPath(); context.moveTo(x - enemy.facing * 34, enemy.y + enemy.height * .7); context.lineTo(x - enemy.facing * 5, enemy.y + enemy.height * .7); context.stroke();
          }
          const facesRight = enemy.kind === "shooter" || enemy.kind === "flyer" || enemy.kind === "charger" ? enemy.facing > 0 : enemy.vx > 0;
          drawImageContained(images.bottle, x - 17, enemy.y - 19 + walkBob, enemy.width + 34, enemy.height + 29, facesRight);
          if ((enemy.kind === "heavy" || enemy.kind === "shooter" || enemy.kind === "charger") && enemy.hp > 1) {
            context.fillStyle = enemy.kind === "shooter" ? "#70f6ff" : enemy.kind === "charger" ? "#ff5644" : "#ff6d34";
            context.font = "900 16px Impact";
            context.fillText("×2", x + enemy.width - 8, enemy.y + 18);
          }
        } else {
          context.translate(x + enemy.width / 2, enemy.y + enemy.height / 2);
          context.rotate((now / 120) * Math.sign(enemy.vx || 1));
          context.translate(-enemy.width / 2, -enemy.height / 2);
          drawImageContained(images.cap, -9, -20, enemy.width + 18, enemy.height + 34);
        }
        context.restore();
      });

      projectiles.forEach((projectile) => {
        const x = projectile.x - cameraX;
        context.save();
        context.translate(x, projectile.y);
        context.rotate(projectile.rotation);
        context.shadowColor = projectile.kind === "bottle" || projectile.kind === "mushroom" ? "#ff9b35" : "#ff4f9b";
        context.shadowBlur = 16;
        drawImageContained(images[`weapon-${projectile.kind}`], -projectile.size / 2, -projectile.size / 2, projectile.size, projectile.size);
        context.restore();
      });

      monsterShots.forEach((shot, index) => {
        const x = shot.x - cameraX;
        const alpha = clamp(shot.life * 1.4, 0, 0.95);
        context.save();
        context.globalAlpha = alpha;
        context.translate(x, shot.y);
        context.rotate(index * 0.9 + now / 150);
        if (shot.kind === "waterBottle") {
          context.shadowColor = "#6de4ff";
          context.shadowBlur = 22;
          drawImageContained(images.bottle, -shot.size * .38, -shot.size * .7, shot.size * .76, shot.size * 1.4);
          context.restore();
          return;
        }
        const mist = context.createRadialGradient(0, 0, 2, 0, 0, shot.size);
        mist.addColorStop(0, "rgba(255,255,255,.98)");
        mist.addColorStop(0.42, shot.color);
        mist.addColorStop(1, "rgba(20,20,35,0)");
        context.fillStyle = mist;
        context.beginPath();
        if (shot.kind === "drop") context.moveTo(0, -shot.size * 1.25);
        context.ellipse(0, 0, shot.size * (shot.kind === "spray" ? 1.35 : 1), shot.size * (shot.kind === "pulse" ? 1 : 0.72), 0, 0, Math.PI * 2);
        context.fill();
        if (shot.kind === "pulse") {
          context.strokeStyle = "rgba(255,255,255,.85)";
          context.lineWidth = 3;
          context.stroke();
        }
        context.restore();
      });

      sparks.forEach((spark) => {
        context.globalAlpha = clamp(spark.life * 2.2, 0, 1);
        context.fillStyle = spark.color;
        context.beginPath();
        context.arc(spark.x - cameraX, spark.y, spark.size, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;

      const playerX = player.x - cameraX;
      const moving = Math.abs(player.vx) > 35 && player.onGround;
      let nextPose: HeroPose = "idle";
      if (now < hurtPoseUntil) nextPose = "hit";
      else if (now < stompPoseUntil) nextPose = "kick";
      else if (now < attackPoseUntil) nextPose = attackPoseKind;
      else if (jumpQueued || now < landingPoseUntil) nextPose = "crouch";
      else if (!player.onGround) nextPose = fighter === "cesaret" || fighter === "borja" || fighter === "bacora" || fighter === "bonviure" || player.vy < 120 ? "rise" : "kick";
      else if (moving) {
        const speedRatio = clamp(Math.abs(player.vx) / 375, 0, 1);
        const frameTime = 112 - speedRatio * 40;
        const cycle = ["walkD", "walkB", "walkE", "walkA", "walkC", "walkA"] as HeroPose[];
        nextPose = cycle[Math.floor(now / frameTime) % cycle.length];
      }
      if (nextPose !== activePose) {
        activePose = nextPose;
        poseChangedAt = now;
      }
      const powered = now < poweredUntil;
      const flashAlpha = now < invulnerableUntil && Math.floor(now / 90) % 2 === 0 ? 0.7 : 1;
      if (powered) {
        context.save();
        context.translate(playerX + player.width / 2, player.y + player.height * 0.48);
        context.shadowColor = "#ff9c35";
        context.shadowBlur = 30;
        context.strokeStyle = "rgba(255,211,95,.78)";
        context.lineWidth = 5;
        context.beginPath();
        context.ellipse(0, 0, 51, 67, 0, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
      // Never crossfade whole bodies: two poses produce doubled feet and hands.
      drawHeroPose(activePose, 1, now, playerX, powered, flashAlpha);

      impactTexts.forEach((label) => {
        context.save();
        context.globalAlpha = clamp(label.life * 2, 0, 1);
        context.fillStyle = label.color;
        context.strokeStyle = "#2c0d0a";
        context.lineWidth = 5;
        context.font = "italic 900 25px Impact";
        context.strokeText(label.text, label.x - cameraX, label.y);
        context.fillText(label.text, label.x - cameraX, label.y);
        context.restore();
      });

      if (now < levelCallUntil) {
        const remaining = levelCallUntil - now;
        const alpha = clamp(Math.min((1900 - remaining) / 250, remaining / 420), 0, 1);
        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = "rgba(5,3,5,.72)";
        context.fillRect(0, 250, viewportWidth, 180);
        context.textAlign = "center";
        context.fillStyle = LEVEL_PALETTES[levelIndex].light;
        context.font = "italic 900 58px Impact";
        context.fillText(`NIVEL ${levelIndex + 1}`, viewportWidth / 2, 330);
        context.fillStyle = "white";
        context.font = "900 25px Impact";
        context.fillText(level.name, viewportWidth / 2, 372);
        context.fillStyle = "rgba(255,255,255,.66)";
        context.font = "900 12px Arial";
        context.fillText(level.detail, viewportWidth / 2, 399);
        context.restore();
      }

      context.restore();
    };

    const frame = (now: number) => {
      if (document.hidden) {
        previousTime = now;
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(0.032, (now - previousTime) / 1000);
      previousTime = now;
      update(dt, now);
      updateCrowdCue(now);
      draw(now);
      animationFrame = window.requestAnimationFrame(frame);
    };

    loadLevel(campaign ? 0 : startLevel, performance.now(), false);
    setStatus("playing");
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    const releaseInput = () => {
      input.left = false;
      input.right = false;
      input.jump = false;
      jumpQueued = false;
      queuedAttackLevel = 0;
      queuedAttackUntil = 0;
      player.vx = 0;
    };
    const releaseWhenHidden = () => { if (document.hidden) releaseInput(); };
    window.addEventListener("blur", releaseInput);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    animationFrame = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releaseInput);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      releaseInput();
    };
  }, [campaign, difficulty, fighter, round, startLevel, status]);

  const releaseJump = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    inputRef.current.jump = false;
  };

  const launchLevel = (levelIndex: number) => {
    if (levelIndex > unlockedLevel) return;
    setStartLevel(levelIndex);
    setLevelResult(null);
    setStatus("playing");
    setRound((value) => value + 1);
  };

  const returnToMap = () => {
    setLevelResult(null);
    setStatus("map");
  };

  const retryAdventure = () => {
    setLevelResult(null);
    setStatus("playing");
    setRound((value) => value + 1);
  };

  return (
    <div className={`platform-mode platform-level-${hud.level} platform-status-${status}`}>
      <canvas ref={canvasRef} className="platform-canvas" aria-label={`Aventura Central con ${fighterName}`} />
      {status === "playing" && <ArcadeCrowd mode="platform" seed={hud.level - 1} phase={status} cue={crowdCue} react={Boolean(crowdCue && crowdCue.label.includes("TIENES"))} />}

      {!campaign && status === "map" && (
        <div className="adventure-map" aria-label="Mapa de niveles de Aventura Central">
          <ArcadeCrowd mode="platform" seed={unlockedLevel + 2} phase="map" />
          <small>PROGRESO GUARDADO AUTOMÁTICAMENTE</small>
          <h2>MAPA CENTRAL</h2>
          <p>Elige una pantalla desbloqueada. Consigue tres estrellas superando el objetivo, recogiendo tesoros y jugando con precisión. Total: {levelStars.reduce((total, stars) => total + (stars || 0), 0)}/{LEVELS.length * 3} ★</p>
          <div className="adventure-map-grid">
            {LEVELS.map((mapLevel, index) => {
              const locked = index > unlockedLevel;
              return <button key={mapLevel.name} type="button" disabled={locked} onClick={() => launchLevel(index)} className={`map-level-card level-${index + 1} ${locked ? "locked" : ""}`}>
                <span>{locked ? "🔒" : String(index + 1).padStart(2, "0")}</span>
                <b>{mapLevel.name}</b>
                <small>{locked ? "BLOQUEADO" : mapLevel.objective.label}</small>
                <i>{"★".repeat(levelStars[index] || 0)}{"☆".repeat(3 - (levelStars[index] || 0))}</i>
              </button>;
            })}
          </div>
          <button className="secondary-button" type="button" onClick={onExit}>VOLVER AL MENÚ</button>
        </div>
      )}

      <div className="platform-hud" aria-live="polite">
        <div><small>VIDAS · NIVEL {hud.level}</small><strong>♥ × {hud.lives}</strong><span>{hud.checkpoint ? `CONTROL ${hud.checkpoint}` : "BUSCA CORAZONES +1"}</span></div>
        <div className="platform-title"><small>MODO</small><strong>AVENTURA CENTRAL</strong><span>{LEVELS.length} NIVELES · RETOS · TRAMPAS · MONSTRUOS</span></div>
        <div><small>TESOROS</small><strong>{String(hud.collected).padStart(2, "0")} / {hud.total}</strong><span>{String(hud.score).padStart(6, "0")} PTS · {hud.ready ? "ATAQUE LISTO" : "RECARGANDO"}</span></div>
      </div>

      <div className="platform-objective" aria-live="polite"><b>{hud.objective}</b><span>{hud.objectiveProgress}/{hud.objectiveTarget} · {hud.elapsed}s</span></div>

      <button className="platform-touch-exit" type="button" onClick={onExit}>← MENÚ</button>
      <p className="platform-instructions">A / D MOVER · MANTÉN W O ESPACIO PARA SALTAR MÁS · J ATAQUE · K ESPECIAL · ESC SALIR</p>

      <div className="platform-touch-controls mode-stick-layout" aria-label="Controles táctiles de Aventura Central">
        <TouchStick label="Joystick: mover y saltar" hint="MOVER · ↑ SALTO" onChange={(intent) => {
          inputRef.current.left = intent.left;
          inputRef.current.right = intent.right;
          if (intent.up && !stickJumpRef.current) jumpRef.current();
          if (!intent.up && stickJumpRef.current) inputRef.current.jump = false;
          stickJumpRef.current = intent.up;
        }} />
        <div className="platform-touch-actions">
          <button className="platform-attack-button" type="button" aria-label={fighter === "cesaret" ? "Lanzar peces" : fighter === "borja" ? "Ataque del sapo" : fighter === "maletilla" ? "Lanzar tres envases de cloretilo" : fighter === "vanessa" ? "Lanzar tres micrófonos" : fighter === "josevictor" ? "Lanzar bolsas blancas" : "Lanzar discos de vinilo"} onPointerDown={(event) => { event.preventDefault(); attackRef.current(); }}>{fighter === "cesaret" ? "P" : fighter === "borja" ? "S" : fighter === "maletilla" ? "C" : fighter === "vanessa" ? "M" : fighter === "josevictor" ? "B" : "V"}<small>{fighter === "cesaret" ? "PECES" : fighter === "borja" ? "SAPO" : fighter === "maletilla" ? "CLORETILO" : fighter === "vanessa" ? "3 MICROS" : fighter === "josevictor" ? "BOLSAS" : "VINILOS"}</small></button>
          <button className="platform-special-button" type="button" aria-label={fighter === "cesaret" ? "Lluvia de peces" : fighter === "borja" ? "Veneno del sapo" : fighter === "bacora" ? "Golpe de vara" : fighter === "bonviure" ? "Latigazo de cadena" : fighter === "maletilla" ? "Lanzar tormenta de setas" : fighter === "vanessa" ? "Lanzar orejas" : fighter === "josevictor" ? "Lanzar tubos de billetes" : "Lanzar altavoces KRK 8"} onPointerDown={(event) => { event.preventDefault(); specialRef.current(); }}>★<small>{fighter === "cesaret" ? "PECES" : fighter === "borja" ? "VENENO" : fighter === "bacora" ? "VARA" : fighter === "bonviure" ? "CADENA" : fighter === "maletilla" ? "SETAS" : fighter === "vanessa" ? "OREJAS" : fighter === "josevictor" ? "BILLETES" : "KRK 8"}</small></button>
          <button className="platform-jump-button" type="button" aria-label="Saltar" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); jumpRef.current(); }} onPointerUp={releaseJump} onPointerCancel={releaseJump} onLostPointerCapture={() => { inputRef.current.jump = false; }}>↑<small>SALTO</small></button>
        </div>
      </div>

      {status === "level-complete" && levelResult && (
        <div className="platform-result level-complete" aria-live="assertive">
          <ArcadeCrowd mode="platform" seed={levelResult.level + 6} phase="level-complete" react />
          <span>NIVEL {levelResult.level + 1} COMPLETADO</span>
          <h2>{"★".repeat(levelResult.stars)}{"☆".repeat(3 - levelResult.stars)}</h2>
          <p>{LEVELS[levelResult.level].name}</p>
          <div className="level-result-stats"><b>{levelResult.elapsed}s<small>TIEMPO</small></b><b>{levelResult.treasures}/{levelResult.total}<small>TESOROS</small></b><b>{levelResult.damage}<small>DAÑOS</small></b></div>
          <div>
            {levelResult.level < LEVELS.length - 1 && <button className="fight-button" type="button" onClick={() => launchLevel(Math.min(unlockedLevel, levelResult.level + 1))}>SIGUIENTE NIVEL</button>}
            <button className="secondary-button" type="button" onClick={returnToMap}>MAPA DE NIVELES</button>
          </div>
        </div>
      )}

      {(status === "won" || status === "lost") && (
        <div className={`platform-result ${status}`} aria-live="assertive">
          <ArcadeCrowd mode="platform" seed={hud.level + 7} phase={status} react={status === "won"} />
          {status === "won" && (
            <div className={`result-dancer compact ${fighter}`} aria-label={`${fighterName} bailando`} role="img">
              <span className="dance-floor-ring" /><span className={`result-dancer-art ${fighter}`} />
              <i className="dance-note dance-note-one">♪</i><i className="dance-note dance-note-two">♫</i><i className="dance-note dance-note-three">★</i><i className="dance-note dance-note-four">♥</i><i className="dance-note dance-note-five">✦</i>
            </div>
          )}
          <span>{status === "won" ? `${LEVELS.length} NIVELES COMPLETADOS` : "FIN DE LA RUTA"}</span>
          <h2>{status === "won" ? "¡CAMPEÓN!" : "OTRA VEZ"}</h2>
          <p>{status === "won" ? `¡${fighterName} ha dominado toda la Aventura Central con ${hud.score} puntos!` : "Las botellas han ganado esta ronda."}</p>
          {campaign && status === "won" && <b className="campaign-next">SIGUIENTE: JEFE FINAL…</b>}
          <div className={campaign && status === "won" ? "campaign-hidden-actions" : ""}>
            <button className="fight-button" type="button" onClick={retryAdventure}>VOLVER A JUGAR</button>
            {!campaign && status === "lost" && <button className="secondary-button" type="button" onClick={returnToMap}>MAPA DE NIVELES</button>}
            <button className="secondary-button" type="button" onClick={onExit}>MENÚ DE MODOS</button>
          </div>
        </div>
      )}
    </div>
  );
}
