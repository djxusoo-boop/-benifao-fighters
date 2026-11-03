"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import OrbMode from "./OrbMode";
import PlatformMode from "./PlatformMode";
import CoopMode from "./CoopMode";
import PrisonSlugMode from "./PrisonSlugMode";
import ArcadeCrowd from "./ArcadeCrowd";
import GamepadManager from "./GamepadManager";
import ArcadeDeviceManager from "./ArcadeDeviceManager";
import Leaderboard, { type LeaderboardMode } from "./Leaderboard";
import FighterWalkLayers from "./FighterWalkLayers";
import { FIGHTER_FRAMES } from "./fighter-frames";
import { attackFacesTarget, clampFighterStep, combatApproachGap, combatContact, directionToOpponent, fighterAttackRange, visibleFighterBounds } from "./combat-contact.mjs";
import { joystickIntent } from "./touch-joystick.mjs";
import { FIGHTER_PROFILES, defenseMultiplier, pickWinQuote, powerMultiplier, speedMultiplier } from "./fighter-profiles";
import { ArcadeAudio, type HitKind, type MusicTheme } from "./arcade-audio";
import { SUPER_MOVES } from "./super-moves";

type FighterId = "maletilla" | "vanessa" | "josevictor" | "cristian" | "cesaret" | "borja" | "bacora" | "bonviure" | "elchica" | "ogalla" | "xuso" | "bomba" | "rafeta" | "tonimassama" | "nova";
type Phase = "select" | "intro" | "fight" | "ko" | "over" | "orbs" | "platform" | "coop" | "prison-slug" | "campaign-final";
type Action = "idle" | "walk" | "dash" | "dodge" | "crouch" | "punch" | "kick" | "special" | "jump" | "block" | "hit" | "launched" | "knockdown" | "getup";
type Side = "player" | "cpu";
type SpecialMove = "bottles" | "mushrooms" | "microphone" | "ears" | "bags" | "money" | "vinyl" | "speakers" | "fish" | "fishstorm" | "toad" | "venom" | "shield" | "staff" | "anchor" | "chain" | "jager" | "amber" | "scepter" | "artichokes" | "dog" | "howl" | "hoe" | "hoeSweep" | "flag" | "flagSweep" | "goldPistol" | "fingerPeinetas" | "prism" | "prismBurst";
type NormalMove = "punch" | "kick";
type AttackLevel = 0 | 1 | 2;
type WalkIntent = "advance" | "retreat" | "neutral";
type AttackDirection = "toward-left" | "toward-right";
type Difficulty = "easy" | "normal" | "hard";
type BattleMode = "cpu" | "local";
type AiStyle = "balanced" | "aggressive" | "defensive";
type ControlSize = "large" | "xl";
type FighterStyle = "classic" | "neon" | "gold";
type ArcadeTool = "moves" | "profile" | "controls" | null;
type DamagePop = { id: number; side: Side; x: number; amount: number; kind: "normal" | "special" | "super" | "guard" | "counter" };
type SuperFlash = { id: number; side: Side; fighter: FighterId } | null;
type SuperFx = { id: number; side: Side; fighter: FighterId; origin: number; target: number } | null;
type MatchStats = { hits: number; damage: number; specials: number; supers: number; perfectGuards: number; maxCombo: number; perfectRounds: number };
const freshMatchStats = (): MatchStats => ({ hits: 0, damage: 0, specials: 0, supers: 0, perfectGuards: 0, maxCombo: 0, perfectRounds: 0 });
type MovementGear = "still" | "start" | "stride";
type AttackVariant = 0 | 1 | 2 | 3;
type FighterPosePhase = 0 | 1 | 2 | 3 | 4;
type FightCall = { text: string; side: Side; id: number } | null;
type QueuedAttack = { level: AttackLevel; normalMove: NormalMove } | null;
type ArcadeProgress = { fights: number; adventures: number; orbs: number; bestCombo: number; crowns?: number; medals?: number; bestTournament?: number; bestOrb?: number; bestAdventure?: number; losses?: number; trainingSessions?: number; winsByFighter?: Partial<Record<FighterId, number>> };
type CampaignStep = 0 | 1 | 2 | 3 | 4;
type ArcadePickupKind = 0 | 1 | 2;
type FightPickup = { kind: ArcadePickupKind; x: number; expiresAt: number };

type GameState = {
  phase: Phase;
  playerHealth: number;
  cpuHealth: number;
  playerEnergy: number;
  cpuEnergy: number;
  playerX: number;
  cpuX: number;
  playerAction: Action;
  cpuAction: Action;
  playerAirborne: boolean;
  cpuAirborne: boolean;
  playerMove: SpecialMove | null;
  cpuMove: SpecialMove | null;
  playerAttackDirection: AttackDirection;
  cpuAttackDirection: AttackDirection;
  playerAttackVariant: AttackVariant;
  cpuAttackVariant: AttackVariant;
  playerPosePhase: FighterPosePhase;
  cpuPosePhase: FighterPosePhase;
  timer: number;
  winner: Side | "draw" | null;
  impact: number;
  impactLevel: 0 | 1 | 2 | 3;
};

const FIGHTERS: Record<FighterId, { name: string; title: string; specialOne: string; specialTwo: string; color: string }> = {
  maletilla: {
    name: "MALETILLA",
    title: "EL AMO DEL RUIDO",
    specialOne: "RÁFAGA DE CLORETILO",
    specialTwo: "TORMENTA DE SETAS",
    color: "#ff8b2b",
  },
  vanessa: {
    name: "VANESSA",
    title: "HARDCORE GIRL",
    specialOne: "MICRÓFONO GIGANTE",
    specialTwo: "OREJAS AL VUELO",
    color: "#ff3f75",
  },
  josevictor: {
    name: "JOSEVICTOR",
    title: "EL REY DEL BILLETE",
    specialOne: "BOLSAS AL VUELO",
    specialTwo: "RÁFAGA DE BILLETES",
    color: "#f2c94c",
  },
  cristian: {
    name: "CRISTIAN",
    title: "EL DIOS DE LAS MEZCLAS",
    specialOne: "LLUVIA DE VINILOS",
    specialTwo: "IMPACTO KRK 8",
    color: "#63f2d0",
  },
  cesaret: { name: "CESARET", title: "EL REY DE LA PESCA", specialOne: "GOLPE DE PESCADO", specialTwo: "LLUVIA DE PECES", color: "#62c8e7" },
  borja: { name: "BORJA", title: "EL DOMADOR DEL SAPO", specialOne: "ATAQUE DEL SAPO", specialTwo: "VENENO DEL SAPO", color: "#a9e450" },
  bacora: { name: "BACORA", title: "EL GUARDIÁN DE LA W", specialOne: "EMBESTIDA DE ESCUDO", specialTwo: "GOLPE DE VARA", color: "#e6b82e" },
  bonviure: { name: "BONVIURE", title: "EL ANCLA NEGRA", specialOne: "BARRIDO DE ANCLA", specialTwo: "LATIGAZO DE CADENA", color: "#a68c72" },
  elchica: { name: "YOYE", title: "EL REY DEL JÄGER", specialOne: "BOTELLA DE YOYE", specialTwo: "SALPICADURA ÁMBAR", color: "#ec8d27" },
  ogalla: { name: "OGALLA", title: "EL REY DE LA ALCACHOFA", specialOne: "BASTÓN DE ALCACHOFA", specialTwo: "LLUVIA DE ALCACHOFAS", color: "#c89a46" },
  xuso: { name: "XUSO", title: "EL DÚO DEL PERRO", specialOne: "MORDISCO DE XUSO", specialTwo: "AULLIDO DE PRISON", color: "#7dff38" },
  bomba: { name: "EL BOMBA", title: "EL AZADÓN", specialOne: "AZADAZO", specialTwo: "BARRIDO DE AZADA", color: "#ff9a31" },
  rafeta: { name: "RAFETA", title: "PORTAESTANDARTE", specialOne: "EMBESTIDA DE BANDERA", specialTwo: "GIRO DEL ESTANDARTE", color: "#e8c44d" },
  tonimassama: { name: "TONI MASSAMA", title: "EL REY DE LA PEINETA", specialOne: "DISPARO DORADO", specialTwo: "PEINETAS VOLADORAS", color: "#f0bd42" },
  nova: { name: "NOVA", title: "PRISMA DE NEÓN", specialOne: "RÁFAGA PRISMÁTICA", specialTwo: "LÁSER ARCOÍRIS", color: "#ff4be9" },
};

// Rafeta is temporarily unavailable; keep his assets and definition for a later return.
const FIGHTER_ORDER: FighterId[] = ["maletilla", "vanessa", "josevictor", "cristian", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "tonimassama", "nova"];
const SHORT_SPECIALS: Record<FighterId, [string, string]> = {
  maletilla: ["CLORETILO", "SETAS"], vanessa: ["MICRO", "OREJAS"],
  josevictor: ["BOLSAS", "BILLETES"], cristian: ["VINILOS", "KRK 8"],
  cesaret: ["PESCADO", "PECES"], borja: ["SAPO", "VENENO"],
  bacora: ["ESCUDO", "VARA"], bonviure: ["ANCLA", "CADENA"],
  elchica: ["BOTELLA", "ÁMBAR"], ogalla: ["BASTÓN", "ALCACHOFAS"],
  xuso: ["PERRO", "AULLIDO"], bomba: ["AZADA", "BARRIDO"], rafeta: ["BANDERA", "GIRO"], tonimassama: ["PISTOLA", "PEINETAS"], nova: ["PRISMA", "LÁSER"],
};

const STAGES = [
  { id: "central-exterior", eyebrow: "FONDO 01 · CENTRAL", name: "CENTRAL · EXTERIOR", detail: "El aparcamiento despierta", image: "/assets/central-01.jpg" },
  { id: "central-store", eyebrow: "FONDO 02 · CENTRAL", name: "TIENDA CENTRAL", detail: "El estilo de la noche", image: "/assets/central-02.jpg" },
  { id: "central-terrace", eyebrow: "FONDO 03 · CENTRAL", name: "TERRAZA CENTRAL", detail: "La previa del combate", image: "/assets/central-03.jpg" },
  { id: "central-dancefloor", eyebrow: "FONDO 04 · CENTRAL", name: "PISTA CENTRAL", detail: "Luces, humo y presión", image: "/assets/central-04.jpg" },
  { id: "factory-gate", eyebrow: "FONDO 05 · LA FÁBRICA", name: "PORTAL DE LA FÁBRICA", detail: "La entrada legendaria", image: "/assets/central-05.jpg" },
  { id: "factory-club", eyebrow: "FONDO 06 · LA FÁBRICA", name: "FÁBRICA · DISCOTECA", detail: "La multitud entra en juego", image: "/assets/central-06.jpg" },
  { id: "factory-aerial", eyebrow: "FONDO 07 · LA FÁBRICA", name: "VISTA AÉREA", detail: "La fiesta desde el cielo", image: "/assets/central-07.jpg" },
  { id: "factory-parking", eyebrow: "FONDO 08 · LA FÁBRICA", name: "PARKING DE LA FÁBRICA", detail: "Motores antes del combate", image: "/assets/central-08.jpg" },
] as const;

const GAME_TITLE = "HARDCORE FIGHTERS";
const GAME_EDITION = "WEB · ARCADE EDITION";
const GAME_VERSION = "V2.20.0";

const ROUND_SECONDS = 99;
const SUPER_MAX = 100;
// Meter gained per event. Dealing damage fills faster than taking it.
const SUPER_GAIN = { dealt: 11, dealtSpecial: 7, taken: 9, guarded: 4, perfect: 18 } as const;
const CPU_SPECIAL_COOLDOWN: Record<Difficulty, number> = { easy: 3400, normal: 2100, hard: 1300 };
const CPU_DAMAGE_SCALE: Record<Difficulty, number> = { easy: 0.62, normal: 1, hard: 1.12 };
const AI_TICK: Record<Difficulty, number> = { easy: 480, normal: 340, hard: 250 };
const CAMPAIGN_BOSS_MAX_HEALTH = 360;
const ATTACK_DAMAGE = {
  punch: 5,
  kick: 7,
  specialOne: 11,
  specialTwo: 16,
} as const;

const freshGame = (): GameState => ({
  phase: "select",
  playerHealth: 100,
  cpuHealth: 100,
  // A round starts as a proper close-quarters fight. Specials are earned by
  // landing normal punches and kicks instead of taking over from the opening.
  playerEnergy: 100,
  cpuEnergy: 100,
  playerX: 22,
  cpuX: 76,
  playerAction: "idle",
  cpuAction: "idle",
  playerAirborne: false,
  cpuAirborne: false,
  playerMove: null,
  cpuMove: null,
  playerAttackDirection: "toward-right",
  cpuAttackDirection: "toward-left",
  playerAttackVariant: 0,
  cpuAttackVariant: 0,
  playerPosePhase: 0,
  cpuPosePhase: 0,
  timer: ROUND_SECONDS,
  winner: null,
  impact: 0,
  impactLevel: 0,
});

const specialFor = (fighter: FighterId, level: Exclude<AttackLevel, 0>): SpecialMove => {
  if (fighter === "cesaret") return level === 1 ? "fish" : "fishstorm";
  if (fighter === "borja") return level === 1 ? "toad" : "venom";
  if (fighter === "bacora") return level === 1 ? "shield" : "staff";
  if (fighter === "bonviure") return level === 1 ? "anchor" : "chain";
  if (fighter === "elchica") return level === 1 ? "jager" : "amber";
  if (fighter === "ogalla") return level === 1 ? "scepter" : "artichokes";
  if (fighter === "xuso") return level === 1 ? "dog" : "howl";
  if (fighter === "bomba") return level === 1 ? "hoe" : "hoeSweep";
  if (fighter === "rafeta") return level === 1 ? "flag" : "flagSweep";
  if (fighter === "tonimassama") return level === 1 ? "goldPistol" : "fingerPeinetas";
  if (fighter === "nova") return level === 1 ? "prism" : "prismBurst";
  if (fighter === "maletilla") return level === 1 ? "bottles" : "mushrooms";
  if (fighter === "josevictor") return level === 1 ? "bags" : "money";
  if (fighter === "cristian") return level === 1 ? "vinyl" : "speakers";
  return level === 1 ? "microphone" : "ears";
};

const MOVE_LABELS: Record<SpecialMove, string> = {
  bottles: "¡RÁFAGA DE CLORETILO!",
  mushrooms: "¡TORMENTA DE SETAS!",
  microphone: "¡MICRÓFONO GIGANTE!",
  ears: "¡OREJAS AL VUELO!",
  bags: "¡BOLSAS AL VUELO!",
  money: "¡RÁFAGA DE BILLETES!",
  vinyl: "¡LLUVIA DE VINILOS!",
  speakers: "¡IMPACTO KRK 8!",
  fish: "¡GOLPE DE PESCADO!",
  fishstorm: "¡LLUVIA DE PECES!",
  toad: "¡ATAQUE DEL SAPO!",
  venom: "¡VENENO DEL SAPO!",
  shield: "¡EMBESTIDA DE ESCUDO!", staff: "¡GOLPE DE VARA!", anchor: "¡BARRIDO DE ANCLA!", chain: "¡LATIGAZO DE CADENA!",
  jager: "¡BOTELLA DE YOYE!", amber: "¡SALPICADURA ÁMBAR!", scepter: "¡BASTÓN DE ALCACHOFA!", artichokes: "¡LLUVIA DE ALCACHOFAS!",
  dog: "¡MORDISCO DE XUSO!", howl: "¡AULLIDO DE PRISON!", hoe: "¡AZADAZO!", hoeSweep: "¡BARRIDO DE AZADA!", flag: "¡EMBESTIDA DE BANDERA!", flagSweep: "¡GIRO DEL ESTANDARTE!", goldPistol: "¡DISPARO DORADO!", fingerPeinetas: "¡PEINETAS VOLADORAS!", prism: "¡RÁFAGA PRISMÁTICA!", prismBurst: "¡LÁSER ARCOÍRIS!",
};

const MOVE_ASSETS: Record<SpecialMove, string> = {
  bottles: "/assets/mobile/cloretilo-projectile-v1.webp",
  mushrooms: "/assets/mushroom-attack-mobile.webp",
  microphone: "/assets/microphone-attack-mobile.webp",
  ears: "/assets/ear-attack-mobile.webp",
  bags: "/assets/josevictor/white-bag.webp",
  money: "/assets/josevictor/money-tube.webp",
  vinyl: "/assets/cristian/vinyl.webp",
  speakers: "/assets/cristian/speaker-krk8.webp",
  fish: "/assets/new-fighters/fish.svg",
  fishstorm: "/assets/new-fighters/fish.svg",
  toad: "/assets/new-fighters/venom.svg",
  venom: "/assets/new-fighters/venom.svg",
  shield: "/assets/new-fighters/shield.svg", staff: "/assets/new-fighters/bacora-staff-extension.svg",
  anchor: "/assets/new-fighters/anchor.svg", chain: "/assets/new-fighters/chain.svg",
  jager: "/assets/new-fighters/jager.svg", amber: "/assets/new-fighters/amber.svg",
  scepter: "/assets/new-fighters/scepter.svg", artichokes: "/assets/new-fighters/artichokes.svg",
  dog: "/assets/new-fighters/dog.svg", howl: "/assets/new-fighters/dog.svg", hoe: "/assets/new-fighters/hoe.svg", hoeSweep: "/assets/new-fighters/hoe.svg", flag: "/assets/new-fighters/rafeta-flag.svg", flagSweep: "/assets/new-fighters/rafeta-flag.svg", goldPistol: "/assets/new-fighters/tonimassama-bullet.svg", fingerPeinetas: "/assets/new-fighters/tonimassama-peineta.svg", prism: "/assets/new-fighters/tonimassama-bullet.svg", prismBurst: "/assets/new-fighters/tonimassama-bullet.svg",
};

const ARCADE_PICKUPS = [
  { image: "/assets/mobile/arcade-pickup-wrap-v1.webp", label: "ESCUDO BLANCO", duration: 5500 },
  { image: "/assets/mobile/arcade-pickup-powder-v1.webp", label: "POLVO PROTECTOR", duration: 7000 },
  { image: "/assets/mobile/arcade-pickup-rush-v1.webp", label: "RUSH FIRE", duration: 8500 },
] as const;

// Collect every image the stylesheets use for a fighter (poses, strips, rigs,
// pseudo-element layers). The hand-written frame list went out of date, so a
// fighter could turn invisible the first time a pose appeared while its PNG
// was still downloading.
const cssFramesFor = (fighter: string): string[] => {
  if (typeof document === "undefined") return [];
  const found = new Set<string>();
  const matcher = new RegExp(`\\.${fighter}(?![\\w-])`);
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules?.length && !(rule instanceof CSSStyleRule)) {
        visit((rule as CSSGroupingRule).cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule) || !matcher.test(rule.selectorText)) continue;
      if (/\.(portrait|result-dancer-art|orb-|platform-|coop-)/.test(rule.selectorText) && !/\.fighter/.test(rule.selectorText)) continue;
      for (const match of rule.cssText.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (match[1].startsWith("/") || match[1].startsWith(location.origin)) found.add(match[1]);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules); } catch { /* Cross-origin sheets can't be read. */ }
  }
  return [...found];
};

function SuperEffect({ fx }: { fx: NonNullable<SuperFx> }) {
  const move = SUPER_MOVES[fx.fighter];
  const color = FIGHTERS[fx.fighter].color;
  const dir = fx.target >= fx.origin ? 1 : -1;
  const asset = (index: number) => move.assets[index % move.assets.length];
  const clamp = (value: number) => Math.max(3, Math.min(97, value));
  type Unit = { left: number; top: number; delay: number; size: number; to?: number; spin?: number };
  let units: Unit[] = [];
  if (move.pattern === "rain") {
    units = Array.from({ length: 16 }, (_, i) => ({ left: clamp(fx.target + ((i * 37) % 11 - 5) * 3.2), top: 54 + (i % 3) * 5, delay: 0.42 + i * 0.045, size: 1 + (i % 3) * 0.25, spin: i % 2 ? 1 : -1 }));
  } else if (move.pattern === "barrage") {
    units = Array.from({ length: 14 }, (_, i) => ({ left: fx.origin, to: clamp(fx.target + dir * (4 + (i % 4) * 3)), top: 34 + ((i * 29) % 7) * 4.5, delay: 0.42 + i * 0.05, size: 0.9 + (i % 3) * 0.2, spin: dir }));
  } else if (move.pattern === "wave") {
    units = Array.from({ length: 8 }, (_, i) => ({ left: fx.origin, to: clamp(fx.target + dir * 14), top: 58 - (i % 2) * 7, delay: 0.42 + i * 0.07, size: 1.1 + (i % 2) * 0.3, spin: 0 }));
  } else if (move.pattern === "quake") {
    units = Array.from({ length: 9 }, (_, i) => ({ left: clamp(fx.target + (i - 4) * 4.5), top: 66, delay: 0.62 + Math.abs(i - 4) * 0.05, size: 1 + (4 - Math.abs(i - 4)) * 0.18, spin: i % 2 ? 1 : -1 }));
  } else if (move.pattern === "beam") {
    units = Array.from({ length: 6 }, (_, i) => ({ left: clamp(fx.target + ((i % 3) - 1) * 4), top: 36 + (i % 3) * 8, delay: 0.62 + i * 0.06, size: 0.9 + (i % 2) * 0.3, spin: i % 2 ? 1 : -1 }));
  }
  return (
    <div className={`super-fx super-pattern-${move.pattern} super-fx-${fx.side} ${dir > 0 ? "toward-right" : "toward-left"}`} style={{ "--super-color": color, "--target-x": `${fx.target}%` } as CSSProperties} aria-hidden="true">
      <span className="super-fx-flash" />
      {move.pattern === "beam" && (
        <span className="super-beam" style={{ left: `${Math.min(fx.origin, fx.target)}%`, width: `${Math.max(6, Math.abs(fx.target - fx.origin))}%`, transformOrigin: dir > 0 ? "left center" : "right center" }} />
      )}
      {move.pattern === "summon" && (
        <span className="super-summon" style={{ left: `${fx.target}%` }}>
          <Image src={asset(0)} alt="" width={360} height={360} unoptimized />
        </span>
      )}
      {move.pattern === "summon" && move.assets[1] && (
        <span className="super-summon-chain" style={{ left: `${fx.target}%` }}><Image src={move.assets[1]} alt="" width={200} height={200} unoptimized /></span>
      )}
      {(move.pattern === "quake" || move.pattern === "summon") && <span className="super-crack" style={{ left: `${fx.target}%` }} />}
      <span className="super-shock" style={{ left: `${fx.target}%` }} />
      {units.map((unit, index) => (
        <span key={index} className="super-unit"
          style={{ left: `${unit.left}%`, top: `${unit.top}%`, animationDelay: `${unit.delay}s`, "--to": `${unit.to ?? unit.left}%`, "--from": `${unit.left}%`, "--size": unit.size, "--spin": unit.spin ?? 1 } as CSSProperties}>
          <Image src={asset(index)} alt="" width={140} height={140} unoptimized />
        </span>
      ))}
      <b className="super-fx-name" style={{ left: `${Math.max(24, Math.min(76, fx.target))}%` }}>{move.name}</b>
    </div>
  );
}

function SpecialEffect({ move, side, origin, target, arenaWidth, direction, airborne = false, color = "#ff8b2b", heavy = false }: { move: SpecialMove; side: Side; origin: number; target: number; arenaWidth: number; direction: AttackDirection; airborne?: boolean; color?: string; heavy?: boolean }) {
  const count = ["shield", "staff", "anchor", "chain", "dog", "howl", "hoe", "hoeSweep", "flag", "flagSweep", "goldPistol"].includes(move) ? 1 : move === "fingerPeinetas" ? 4 : move === "microphone" || move === "bottles" || move === "speakers" ? 3 : 4;
  const launchPoint = Math.max(8, Math.min(92, origin + (direction === "toward-right" ? 2 : -2)));
  const distancePercent = Math.max(8, Math.abs(target - origin));
  const distancePx = Math.max(32, arenaWidth * distancePercent / 100);
  const travel = `${direction === "toward-right" ? "" : "-"}${distancePx}px`;
  const effectLeft = move === "staff" && direction === "toward-left" ? Math.max(2, launchPoint - distancePercent) : launchPoint;
  return (
    <div className={`special-fx fx-${move} ${side} ${direction} ${airborne ? "airborne" : ""} ${heavy ? "special-heavy" : "special-light"}`} style={{ "--fx-color": color } as CSSProperties} aria-hidden="true">
      <span className="special-cast-ring" style={{ left: `${launchPoint}%`, top: airborne ? "30%" : "44%" }} />
      <span className="special-cast-flare" style={{ left: `${launchPoint}%`, top: airborne ? "30%" : "44%" }} />
      <span className="special-target-ring" style={{ left: `${Math.max(4, Math.min(96, target))}%`, top: airborne ? "34%" : "46%" }} />
      <b className="move-callout">{MOVE_LABELS[move]}</b>
      {Array.from({ length: count }, (_, index) => (
        <span
          className="fx-unit"
          key={`${move}-${index}`}
          style={{ animationDelay: `${index * 0.085}s`, left: `${effectLeft}%`, top: `${(airborne ? 24 : 38) + (index % 3) * 8}%`, "--fx-travel": travel, "--fx-distance": `${distancePx}px` } as CSSProperties}
        >
          <Image src={MOVE_ASSETS[move]} alt="" width={120} height={120} unoptimized />
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [selected, setSelected] = useState<FighterId>("maletilla");
  const [localOpponent, setLocalOpponent] = useState<FighterId>("vanessa");
  const [coopPlayerOne, setCoopPlayerOne] = useState<FighterId>("maletilla");
  const [coopPlayerTwo, setCoopPlayerTwo] = useState<FighterId>("vanessa");
  const [coopHumanPlayers, setCoopHumanPlayers] = useState<1 | 2>(1);
  const [lobbyLocked, setLobbyLocked] = useState<[boolean, boolean]>([false, false]);
  const [touchSlot, setTouchSlot] = useState<0 | 1>(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [game, setGame] = useState<GameState>(freshGame);
  const [soundOn, setSoundOn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [roundCall, setRoundCall] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundWins, setRoundWins] = useState<Record<Side, number>>({ player: 0, cpu: 0 });
  const [combo, setCombo] = useState<Record<Side, number>>({ player: 0, cpu: 0 });
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [battleMode, setBattleMode] = useState<BattleMode>("cpu");
  const [aiStyle, setAiStyle] = useState<AiStyle>("balanced");
  const [trainingMode, setTrainingMode] = useState(false);
  const [arcadeTool, setArcadeTool] = useState<ArcadeTool>(null);
  const [controlSize, setControlSize] = useState<ControlSize>("xl");
  const [fighterStyle, setFighterStyle] = useState<FighterStyle>("classic");
  const [musicOn, setMusicOn] = useState(false);
  const [progress, setProgress] = useState<ArcadeProgress>({ fights: 0, adventures: 0, orbs: 0, bestCombo: 0 });
  const [campaignStep, setCampaignStep] = useState<CampaignStep>(0);
  const [campaignScore, setCampaignScore] = useState(0);
  const [bossHealth, setBossHealth] = useState(CAMPAIGN_BOSS_MAX_HEALTH);
  const [bossAttack, setBossAttack] = useState(0);
  const [bossWarning, setBossWarning] = useState(false);
  const [bossDodging, setBossDodging] = useState(false);
  const [bossDodgeReady, setBossDodgeReady] = useState(true);
  const [bossPlayerHit, setBossPlayerHit] = useState(false);
  const [ultimateCharge, setUltimateCharge] = useState(50);
  const [finalFlash, setFinalFlash] = useState(0);
  const [bossPhase, setBossPhase] = useState(1);
  const [paused, setPaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(0);
  const [gamepadCount, setGamepadCount] = useState(0);
  const [playerWalkIntent, setPlayerWalkIntent] = useState<WalkIntent>("neutral");
  const [cpuWalkIntent, setCpuWalkIntent] = useState<WalkIntent>("neutral");
  const arenaRef = useRef<HTMLElement | null>(null);
  const playerFighterRef = useRef<HTMLDivElement | null>(null);
  const cpuFighterRef = useRef<HTMLDivElement | null>(null);
  const [arenaWidth, setArenaWidth] = useState(0);
  const fighterBoundsRef = useRef({ min: 7, max: 93 });
  const [fighterBounds, setFighterBounds] = useState({ min: 7, max: 93 });
  const [measuredApproachGap, setMeasuredApproachGap] = useState(20);
  const lastMovementRenderRef = useRef(0);
  const [movementGear, setMovementGear] = useState<Record<Side, MovementGear>>({ player: "still", cpu: "still" });
  const [fightCall, setFightCall] = useState<FightCall>(null);
  const [fightersReady, setFightersReady] = useState(false);
  const [readyFramePair, setReadyFramePair] = useState("");
  const [rankingOpen, setRankingOpen] = useState(false);
  const [pendingRanking, setPendingRanking] = useState<{ mode: LeaderboardMode; score: number } | null>(null);
  const [fightPickup, setFightPickup] = useState<FightPickup | null>(null);
  const [immuneUntil, setImmuneUntil] = useState<Record<Side, number>>({ player: 0, cpu: 0 });
  const [immuneClock, setImmuneClock] = useState(0);
  const [superMeter, setSuperMeter] = useState<Record<Side, number>>({ player: 0, cpu: 0 });
  const superMeterRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [superFlash, setSuperFlash] = useState<SuperFlash>(null);
  const [superFx, setSuperFx] = useState<SuperFx>(null);
  const [stunned, setStunned] = useState<Record<Side, boolean>>({ player: false, cpu: false });
  const [matchStats, setMatchStats] = useState<MatchStats>(freshMatchStats);
  const [roundEndKind, setRoundEndKind] = useState<"ko" | "perfect" | "time">("ko");
  const cpuSpecialReadyAtRef = useRef(0);
  // A SUPER can't be interrupted during its startup, and the CPU waits while the cinematic plays.
  const superArmorUntilRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const audioRef = useRef<ArcadeAudio | null>(null);
  const preloadedFramesRef = useRef<HTMLImageElement[]>([]);
  const gameRef = useRef(game);
  const immuneUntilRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const keysRef = useRef(new Set<string>());
  const playerJoystickRef = useRef<HTMLDivElement | null>(null);
  const cpuJoystickRef = useRef<HTMLDivElement | null>(null);
  const joystickPointerRef = useRef<Record<Side, number | null>>({ player: null, cpu: null });
  const joystickDirectionRef = useRef<Record<Side, -1 | 0 | 1>>({ player: 0, cpu: 0 });
  const joystickJumpLatchedRef = useRef<Record<Side, boolean>>({ player: false, cpu: false });
  const joystickCrouchRef = useRef<Record<Side, boolean>>({ player: false, cpu: false });
  const [joystickVector, setJoystickVector] = useState<Record<Side, { x: number; y: number }>>({ player: { x: 0, y: 0 }, cpu: { x: 0, y: 0 } });
  const cooldownRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const jumpLockRef = useRef<Record<Side, boolean>>({ player: false, cpu: false });
  const crouchHeldRef = useRef<Record<Side, boolean>>({ player: false, cpu: false });
  const movementVelocityRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const movementHeldRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const cpuAiMovementDirectionRef = useRef<-1 | 0 | 1>(0);
  const cpuFirstAttackAfterRef = useRef(0);
  const directionTapRef = useRef<Record<Side, { direction: number; at: number }>>({ player: { direction: 0, at: 0 }, cpu: { direction: 0, at: 0 } });
  const dashCooldownRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const evadeUntilRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const queuedAttackRef = useRef<Record<Side, QueuedAttack>>({ player: null, cpu: null });
  // Every attack owns a token. A delayed hit is ignored when its fighter was
  // interrupted, knocked down or has already started another move.
  const attackTokenRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const guardStartedRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const performAttackRef = useRef<(side: Side, level?: AttackLevel, normalMove?: NormalMove) => void>(() => undefined);
  const comboCountRef = useRef<Record<Side, number>>({ player: 0, cpu: 0 });
  const comboTimerRef = useRef<Record<Side, number | null>>({ player: null, cpu: null });
  const fightCallTimerRef = useRef<number | null>(null);
  const handledEndRef = useRef(false);
  const introTimerRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const resumeSequenceRef = useRef(false);
  const transientTimersRef = useRef<Set<number>>(new Set());
  const hitCampaignBossRef = useRef<(ultimate?: boolean) => void>(() => undefined);
  const dodgeCampaignBossRef = useRef<() => void>(() => undefined);
  const resetToSelectRef = useRef<() => void>(() => undefined);
  const bossAttackCooldownRef = useRef(0);
  const bossDodgeUntilRef = useRef(0);
  const bossRewardedRef = useRef(false);
  const rankingCapturedRef = useRef(false);

  // In 1P mode the rival can be chosen too; a mirror match falls back to the next fighter.
  const opponent: FighterId = battleMode === "local" || localOpponent !== selected ? localOpponent : FIGHTER_ORDER[(FIGHTER_ORDER.indexOf(selected) + 1) % FIGHTER_ORDER.length];
  const framePair = `${selected}:${opponent}`;
  const fightReady = fightersReady && readyFramePair === framePair;
  // Scale the new fighters' approach spacing to their actual rendered width.
  const newFighterMatch = ["cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "tonimassama"].includes(selected) || ["cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "tonimassama"].includes(opponent);
  const minimumCombatGap = newFighterMatch ? measuredApproachGap : 7.6;
  const fighterMinX = newFighterMatch ? fighterBounds.min : 7;
  const fighterMaxX = newFighterMatch ? fighterBounds.max : 93;

  useEffect(() => {
    if (!newFighterMatch) {
      fighterBoundsRef.current = { min: 7, max: 93 };
      return;
    }
    const arena = arenaRef.current;
    if (!arena) return;
    const measure = () => {
      const arenaWidth = arena.clientWidth;
      setArenaWidth((current) => current === arenaWidth ? current : arenaWidth);
      const probe = document.createElement("div");
      probe.className = `fighter motion-rig fighter-size-probe ${selected}`;
      Object.assign(probe.style, { position: "absolute", left: "-2000px", visibility: "hidden", pointerEvents: "none" });
      arena.appendChild(probe);
      const playerWidth = probe.getBoundingClientRect().width;
      probe.className = `fighter motion-rig fighter-size-probe ${opponent}`;
      const opponentWidth = probe.getBoundingClientRect().width;
      probe.remove();
      const fighterWidth = Math.max(playerWidth, opponentWidth);
      const launchDrift = Math.max(20, Math.min(55, window.innerWidth * 0.038));
      // Attack art extends beyond the body box; reserve space for weapons at the edges.
      const next = visibleFighterBounds(arenaWidth, fighterWidth * 1.2, 7, 93, 12, launchDrift);
      const nextApproachGap = combatApproachGap(arenaWidth, fighterWidth);
      fighterBoundsRef.current = next;
      setFighterBounds((current) => Math.abs(current.min - next.min) < 0.05 && Math.abs(current.max - next.max) < 0.05 ? current : next);
      setMeasuredApproachGap((current) => Math.abs(current - nextApproachGap) < 0.05 ? current : nextApproachGap);
      setGame((current) => {
        // The portrait arena can be measured once while it is still narrow.
        // Keep the countdown spawns anchored to the latest settled width;
        // otherwise both fighters start almost on top of each other.
        if (current.phase === "intro") {
          return Math.abs(current.playerX - next.min) < 0.05 && Math.abs(current.cpuX - next.max) < 0.05
            ? current
            : { ...current, playerX: next.min, cpuX: next.max };
        }
        const playerOnLeft = current.playerX <= current.cpuX;
        let playerX = Math.max(next.min, Math.min(next.max, current.playerX));
        let cpuX = Math.max(next.min, Math.min(next.max, current.cpuX));
        const gap = Math.min(nextApproachGap, next.max - next.min);
        if (Math.abs(cpuX - playerX) < gap) {
          let low = (playerX + cpuX) / 2 - gap / 2;
          let high = low + gap;
          if (low < next.min) { high += next.min - low; low = next.min; }
          if (high > next.max) { low -= high - next.max; high = next.max; }
          playerX = playerOnLeft ? low : high;
          cpuX = playerOnLeft ? high : low;
        }
        if (Math.abs(current.playerX - playerX) < 0.05 && Math.abs(current.cpuX - cpuX) < 0.05) return current;
        return { ...current, playerX, cpuX };
      });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(arena);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [game.phase, newFighterMatch, opponent, selected]);
  const playerData = FIGHTERS[selected];
  const cpuData = FIGHTERS[opponent];
  const stage = STAGES[stageIndex];
  useEffect(() => {
    const phaseLabel = game.phase === "select"
      ? "Lobby"
      : game.phase === "fight"
        ? `${playerData.name} vs ${cpuData.name}`
        : game.phase === "orbs"
          ? "Rompeobjetos"
          : game.phase === "platform"
            ? "Aventura Central"
            : game.phase === "coop"
              ? "Aventura Cooperativa"
              : game.phase === "prison-slug"
                ? "Prison Slug"
              : game.phase === "campaign-final"
                ? "Jefe Final"
                : "Arcade";
    document.title = `${GAME_TITLE} · ${GAME_VERSION} · ${phaseLabel}`;
  }, [cpuData.name, game.phase, playerData.name]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { immuneUntilRef.current = immuneUntil; }, [immuneUntil]);

  useEffect(() => {
    const markReady = () => setFightersReady(true);
    if (document.documentElement.classList.contains("arcade-assets-ready")) markReady();
    window.addEventListener("arcade:assets-ready", markReady);
    // Mobile Safari can leave an image request pending indefinitely, which used
    // to keep every game-mode button disabled even though the menu was usable.
    const isIpad = /iPad/i.test(navigator.userAgent)
      || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const readyFallback = window.setTimeout(markReady, isIpad ? 6500 : 8000);
    return () => {
      window.clearTimeout(readyFallback);
      window.removeEventListener("arcade:assets-ready", markReady);
    };
  }, []);

  useEffect(() => {
    // CSS swaps whole images during an action. Prepare only the active pair so
    // the first punch or jump doesn't show an empty image while it downloads.
    const sources = [...new Set([...FIGHTER_FRAMES[selected], ...FIGHTER_FRAMES[opponent], ...cssFramesFor(selected), ...cssFramesFor(opponent)])];
    // Keep decoded images referenced so the browser doesn't evict them mid-fight.
    const keep: HTMLImageElement[] = [];
    preloadedFramesRef.current = keep;
    let cancelled = false;
    let index = 0;
    const active = new Set<{ image: HTMLImageElement; finish: () => void }>();
    const load = (source: string) => new Promise<void>((resolve) => {
      const image = new window.Image();
      let finished = false;
      const item = { image, finish: () => {
        if (finished) return;
        finished = true;
        image.onload = null;
        image.onerror = null;
        active.delete(item);
        resolve();
      } };
      active.add(item);
      image.decoding = "async";
      keep.push(image);
      const onLoaded = () => {
        if (typeof image.decode === "function") void image.decode().catch(() => undefined).finally(item.finish);
        else item.finish();
      };
      image.onload = onLoaded;
      image.onerror = item.finish;
      image.src = source;
      if (image.complete && image.naturalWidth) onLoaded();
    });
    const worker = async () => {
      while (!cancelled && index < sources.length) {
        const source = sources[index++];
        await load(source);
      }
    };
    // A failed network request must not prevent anyone from entering a match.
    const fallback = window.setTimeout(() => { if (!cancelled) setReadyFramePair(framePair); }, 10000);
    void Promise.all(Array.from({ length: 4 }, worker)).then(() => {
      if (!cancelled) { window.clearTimeout(fallback); setReadyFramePair(framePair); }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      active.forEach(({ image, finish }) => { image.removeAttribute("src"); finish(); });
    };
  }, [selected, opponent, framePair]);

  useEffect(() => {
    const syncGamepads = (event?: Event) => {
      const reported = (event as CustomEvent<{ count?: number }> | undefined)?.detail?.count;
      setGamepadCount(Math.max(0, Math.min(2, reported ?? Number(document.documentElement.dataset.gamepads || 0))));
      if ((reported ?? Number(document.documentElement.dataset.gamepads || 0)) >= 2) {
        setBattleMode("local");
        setCoopHumanPlayers(2);
      }
    };
    const firstSync = window.requestAnimationFrame(() => syncGamepads());
    window.addEventListener("arcade:gamepads", syncGamepads);
    return () => {
      window.cancelAnimationFrame(firstSync);
      window.removeEventListener("arcade:gamepads", syncGamepads);
    };
  }, []);

  useEffect(() => {
    const handle = (event: Event) => {
      if (gameRef.current.phase !== "select" || arcadeTool || rankingOpen) return;
      const { slot, action, direction } = (event as CustomEvent<{ slot: 0 | 1; action: string; direction: number }>).detail;
      if (slot !== 0 && slot !== 1) return;
      if (action === "confirm" || action === "back") {
        setLobbyLocked(current => current.map((value, index) => index === slot ? action === "confirm" : value) as [boolean, boolean]);
      } else if (action === "move" && !lobbyLocked[slot]) {
        if (slot === 1) setBattleMode("local");
        const cycle = (current: FighterId) => FIGHTER_ORDER[(FIGHTER_ORDER.indexOf(current) + direction + FIGHTER_ORDER.length) % FIGHTER_ORDER.length];
        (slot === 0 ? setSelected : setLocalOpponent)(cycle);
      }
    };
    window.addEventListener("arcade:lobby", handle);
    return () => window.removeEventListener("arcade:lobby", handle);
  }, [arcadeTool, rankingOpen, lobbyLocked]);

  useEffect(() => {
    if (game.phase === "select" && lobbyLocked[0] && (battleMode === "cpu" || lobbyLocked[1])) {
      document.querySelector<HTMLButtonElement>(".mode-start-actions [data-gamepad-default]")?.focus();
    }
  }, [game.phase, lobbyLocked, battleMode]);

  const later = useCallback((callback: () => void, delay: number, runWhilePaused = false) => {
    let timer = 0;
    const run = () => {
      transientTimersRef.current.delete(timer);
      if (pausedRef.current && !runWhilePaused) {
        timer = window.setTimeout(run, 100);
        transientTimersRef.current.add(timer);
        return;
      }
      callback();
    };
    timer = window.setTimeout(run, delay);
    transientTimersRef.current.add(timer);
    return timer;
  }, []);

  const clearTransientTimers = useCallback(() => {
    transientTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transientTimersRef.current.clear();
  }, []);

  const resumeGame = useCallback(() => {
    if (!pausedRef.current || resumeSequenceRef.current) return;
    resumeSequenceRef.current = true;
    keysRef.current.clear();
    setResumeCountdown(3);
    later(() => setResumeCountdown(2), 650, true);
    later(() => setResumeCountdown(1), 1300, true);
    later(() => {
      resumeSequenceRef.current = false;
      setResumeCountdown(0);
      if (!document.hidden) setPaused(false);
    }, 1950, true);
  }, [later]);

  useEffect(() => {
    const latestExpiry = Math.max(immuneUntil.player, immuneUntil.cpu);
    if (!latestExpiry || latestExpiry <= Date.now()) return;
    const firstTick = window.setTimeout(() => setImmuneClock(Date.now()), 0);
    const timer = window.setInterval(() => {
      const now = Date.now();
      setImmuneClock(now);
      if (now >= latestExpiry) window.clearInterval(timer);
    }, 250);
    return () => { window.clearTimeout(firstTick); window.clearInterval(timer); };
  }, [immuneUntil]);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const isRaspberryPi = /linux arm|aarch64/i.test(navigator.userAgent);
    const lightweight = memory < 4 || (cores <= 2 && memory < 6);
    document.documentElement.classList.toggle("arcade-performance-lite", lightweight);
    document.documentElement.classList.toggle("arcade-raspberry", isRaspberryPi && !lightweight);
    return () => {
      document.documentElement.classList.remove("arcade-performance-lite");
      document.documentElement.classList.remove("arcade-raspberry");
    };
  }, []);

  useEffect(() => {
    if (game.phase !== "select") return;
    const rotation = window.setTimeout(() => {
      setStageIndex((current) => (current + 1) % STAGES.length);
    }, 7000);
    return () => window.clearTimeout(rotation);
  }, [game.phase, stageIndex]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden && (gameRef.current.phase === "fight" || gameRef.current.phase === "intro")) {
        resumeSequenceRef.current = false;
        setResumeCountdown(0);
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const saved = Number(window.localStorage.getItem("benifaio-streak") || 0);
        if (Number.isFinite(saved)) setStreak(saved);
        const savedDifficulty = window.localStorage.getItem("benifaio-difficulty");
        if (savedDifficulty === "normal" || savedDifficulty === "easy" || savedDifficulty === "hard") setDifficulty(savedDifficulty);
        const savedProgress = JSON.parse(window.localStorage.getItem("benifaio-progress") || "null") as ArcadeProgress | null;
        if (savedProgress) setProgress(savedProgress);
        const savedAiStyle = window.localStorage.getItem("hardcore-ai-style");
        if (savedAiStyle === "balanced" || savedAiStyle === "aggressive" || savedAiStyle === "defensive") setAiStyle(savedAiStyle);
        const savedControlSize = window.localStorage.getItem("hardcore-control-size");
        if (savedControlSize === "large" || savedControlSize === "xl") setControlSize(savedControlSize);
        const savedFighterStyle = window.localStorage.getItem("hardcore-fighter-style");
        if (savedFighterStyle === "classic" || savedFighterStyle === "neon" || savedFighterStyle === "gold") setFighterStyle(savedFighterStyle);
      } catch { /* A fresh profile is used when storage is blocked or invalid. */ }
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("arcade-controls-xl", controlSize === "xl");
    return () => document.documentElement.classList.remove("arcade-controls-xl");
  }, [controlSize]);

  const awardProgress = useCallback((category: "fights" | "adventures" | "orbs", score = 0) => {
    setProgress((current) => {
      const next: ArcadeProgress = { ...current, [category]: current[category] + 1 };
      if (category === "orbs") next.bestOrb = Math.max(current.bestOrb ?? 0, score);
      if (category === "adventures") next.bestAdventure = Math.max(current.bestAdventure ?? 0, score);
      if (category !== "fights") next.medals = (current.medals ?? 0) + (score >= 15000 ? 3 : score >= 7000 ? 2 : 1);
      window.localStorage.setItem("benifaio-progress", JSON.stringify(next));
      return next;
    });
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new ArcadeAudio();
    return audioRef.current;
  }, []);

  useEffect(() => {
    const themeByPhase: Partial<Record<Phase, MusicTheme>> = {
      intro: "fight", fight: "fight", ko: "fight", over: "victory", orbs: "orbs",
      platform: "adventure", coop: "coop", "campaign-final": "boss",
    };
    const theme = themeByPhase[game.phase];
    const audio = audioRef.current;
    if (!soundOn || !musicOn || !theme) {
      audio?.stopMusic();
      return;
    }
    getAudio().startMusic(theme);
  }, [game.phase, getAudio, musicOn, soundOn]);

  const haptic = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch { /* Optional on supported phones. */ }
  }, []);

  const beep = useCallback(
    (frequency: number, duration = 0.07, type: OscillatorType = "square") => {
      if (!soundOn) return;
      // Audio is an enhancement; gameplay remains available if the browser blocks it.
      getAudio().blip(frequency, duration, type);
    },
    [getAudio, soundOn],
  );

  const sfx = useCallback((kind: HitKind) => { if (soundOn) getAudio().hit(kind); }, [getAudio, soundOn]);
  const swing = useCallback((strength: "light" | "heavy" | "special") => { if (soundOn) getAudio().swing(strength); }, [getAudio, soundOn]);
  const jingle = useCallback((kind: Parameters<ArcadeAudio["jingle"]>[0]) => { if (soundOn) getAudio().jingle(kind); }, [getAudio, soundOn]);

  const addMeter = useCallback((side: Side, amount: number) => {
    const previous = superMeterRef.current[side];
    const next = Math.min(SUPER_MAX, previous + amount * (trainingMode ? 3 : 1));
    if (next === previous) return;
    superMeterRef.current = { ...superMeterRef.current, [side]: next };
    setSuperMeter(superMeterRef.current);
    if (previous < SUPER_MAX && next >= SUPER_MAX && side === "player") jingle("meter");
  }, [jingle, trainingMode]);

  const popDamage = useCallback((pop: Omit<DamagePop, "id">) => {
    const id = Date.now() + Math.random();
    setDamagePops((current) => [...current.slice(-5), { ...pop, id }]);
    window.setTimeout(() => setDamagePops((current) => current.filter((item) => item.id !== id)), 900);
  }, []);

  const endRound = useCallback((winner: Side | "draw") => {
    if (handledEndRef.current) return;
    handledEndRef.current = true;
    if (winner === "player") {
      setStreak((current) => {
        const next = current + 1;
        window.localStorage.setItem("benifaio-streak", String(next));
        return next;
      });
      jingle("win");
      awardProgress("fights");
      setProgress((current) => {
        const winsByFighter = { ...(current.winsByFighter ?? {}), [selected]: (current.winsByFighter?.[selected] ?? 0) + 1 };
        const next = { ...current, winsByFighter };
        window.localStorage.setItem("benifaio-progress", JSON.stringify(next));
        return next;
      });
    } else {
      setStreak(0);
      window.localStorage.setItem("benifaio-streak", "0");
      jingle("lose");
      if (winner === "cpu") {
        setProgress((current) => {
          const next = { ...current, losses: (current.losses ?? 0) + 1 };
          window.localStorage.setItem("benifaio-progress", JSON.stringify(next));
          return next;
        });
      }
    }
  }, [awardProgress, jingle, selected]);

  const showFightCall = useCallback((text: string, side: Side) => {
    setFightCall({ text, side, id: Date.now() });
    if (fightCallTimerRef.current) clearTimeout(fightCallTimerRef.current);
    fightCallTimerRef.current = window.setTimeout(() => {
      setFightCall(null);
      fightCallTimerRef.current = null;
    }, 880);
  }, []);

  const registerCombo = useCallback((side: Side) => {
    const nextValue = comboCountRef.current[side] + 1;
    comboCountRef.current[side] = nextValue;
    setCombo((current) => ({ ...current, [side]: nextValue }));
    if (nextValue === 2) showFightCall("¡DOS GOLPES!", side);
    if (nextValue === 3) showFightCall("¡COMBO LIMPIO!", side);
    if (nextValue >= 4) showFightCall(`¡RÁFAGA ×${nextValue}!`, side);
    if (side === "player") setMatchStats((stats) => nextValue > stats.maxCombo ? { ...stats, maxCombo: nextValue } : stats);
    if (side === "player" && nextValue > progress.bestCombo) {
        setProgress((profile) => {
          const next = { ...profile, bestCombo: nextValue };
          window.localStorage.setItem("benifaio-progress", JSON.stringify(next));
          return next;
        });
    }
    if (comboTimerRef.current[side]) clearTimeout(comboTimerRef.current[side]);
    comboTimerRef.current[side] = window.setTimeout(() => {
      comboCountRef.current[side] = 0;
      setCombo((current) => ({ ...current, [side]: 0 }));
      comboTimerRef.current[side] = null;
    }, 1250);
  }, [progress.bestCombo, showFightCall]);

  // Lands an extra hit (multi-hit supers, poison ticks) with the same KO rules as a normal hit.
  const applyExtraHit = useCallback((attacker: Side, target: Side, amount: number, kind: DamagePop["kind"]) => {
    const live = gameRef.current;
    if (live.phase !== "fight") return;
    setGame((current) => {
      if (current.phase !== "fight") return current;
      const next = { ...current, impact: current.impact + 1, impactLevel: 2 as const };
      if (target === "cpu") next.cpuHealth = trainingMode ? 100 : Math.max(0, current.cpuHealth - amount);
      else next.playerHealth = Math.max(0, current.playerHealth - amount);
      if (next.playerHealth <= 0) { next.phase = "ko"; next.winner = "cpu"; next.playerAction = "launched"; }
      else if (next.cpuHealth <= 0) { next.phase = "ko"; next.winner = "player"; next.cpuAction = "launched"; }
      return next;
    });
    popDamage({ side: target, x: target === "cpu" ? live.cpuX : live.playerX, amount, kind });
    if (attacker === "player") setMatchStats((stats) => ({ ...stats, damage: stats.damage + amount }));
    sfx(kind === "super" ? "special" : "punch");
  }, [popDamage, sfx, trainingMode]);

  const applySuperBonus = useCallback((attacker: Side, target: Side, fighter: FighterId, dealt: number) => {
    const move = SUPER_MOVES[fighter];
    const now = Date.now();
    if (move.bonus === "multi") {
      for (let hit = 1; hit < (move.hits ?? 3); hit += 1) later(() => applyExtraHit(attacker, target, Math.max(2, Math.round(dealt * 0.22)), "super"), 170 * hit);
    } else if (move.bonus === "poison") {
      for (let tick = 1; tick <= 5; tick += 1) later(() => applyExtraHit(attacker, target, 2, "counter"), 650 * tick);
    } else if (move.bonus === "drain") {
      superMeterRef.current = { ...superMeterRef.current, [target]: 0 };
      setSuperMeter(superMeterRef.current);
      addMeter(attacker, 25);
    } else if (move.bonus === "heal") {
      setGame((current) => attacker === "player"
        ? { ...current, playerHealth: Math.min(100, current.playerHealth + 15) }
        : { ...current, cpuHealth: Math.min(100, current.cpuHealth + 15) });
    } else if (move.bonus === "armor") {
      immuneUntilRef.current = { ...immuneUntilRef.current, [attacker]: now + 4500 };
      setImmuneUntil(immuneUntilRef.current);
      setImmuneClock(now);
    } else if (move.bonus === "stun") {
      cooldownRef.current[target] = now + 2600;
      dashCooldownRef.current[target] = now + 2600;
      setStunned((current) => ({ ...current, [target]: true }));
      later(() => setStunned((current) => ({ ...current, [target]: false })), 2600);
    } else if (move.bonus === "push") {
      setGame((current) => {
        if (current.phase !== "fight") return current;
        const bounds = fighterBoundsRef.current;
        if (target === "cpu") return { ...current, cpuX: current.cpuX >= current.playerX ? bounds.max : bounds.min };
        return { ...current, playerX: current.playerX >= current.cpuX ? bounds.max : bounds.min };
      });
    } else if (move.bonus === "crush") {
      document.documentElement.classList.add("arcade-super-quake");
      window.setTimeout(() => document.documentElement.classList.remove("arcade-super-quake"), 700);
    }
  }, [addMeter, applyExtraHit, later]);

  const performAttack = useCallback(
    (side: Side, requestedLevel: AttackLevel = 0, normalMove: NormalMove = "punch") => {
      const snapshot = gameRef.current;
      if (snapshot.phase !== "fight" || pausedRef.current) return;
      // A full meter turns special 2 into the SUPER. The CPU also has to wait
      // between specials so it can't spam them every half second.
      const superReady = requestedLevel === 2 && superMeterRef.current[side] >= SUPER_MAX;
      const cpuSpecialLocked = side === "cpu" && battleMode === "cpu" && requestedLevel > 0 && !superReady && Date.now() < cpuSpecialReadyAtRef.current;
      const level: AttackLevel = cpuSpecialLocked ? 0 : requestedLevel;
      const ownAction = side === "player" ? snapshot.playerAction : snapshot.cpuAction;
      const airborne = side === "player" ? snapshot.playerAirborne : snapshot.cpuAirborne;
      const now = Date.now();
      if (ownAction !== "idle" && ownAction !== "walk" && ownAction !== "dash" && ownAction !== "crouch" && ownAction !== "jump") {
        if (ownAction === "punch" || ownAction === "kick" || ownAction === "special") {
          queuedAttackRef.current[side] = { level, normalMove };
        }
        return;
      }
      if (cooldownRef.current[side] > now) return;

      const attackToken = attackTokenRef.current[side] + 1;
      attackTokenRef.current[side] = attackToken;

      // Lucha specials are always available; only the move recovery remains.
      const fighter = side === "player" ? selected : opponent;
      const targetFighter = side === "player" ? opponent : selected;
      const specialMove = level > 0 ? specialFor(fighter, level as Exclude<AttackLevel, 0>) : null;
      const isSuper = superReady && !cpuSpecialLocked;
      const attackVariant = level === 0 ? ((comboCountRef.current[side] % 3) + 1) as Exclude<AttackVariant, 0> : 0;
      const comboFinisher = level === 0 && attackVariant === 3;
      // Keep close-combat frames on screen long enough for the punch/kick to be
      // unmistakable, including on touch screens that render a little slower.

      const distance = Math.abs(snapshot.playerX - snapshot.cpuX);
      const specialRange = fighterAttackRange(specialMove, normalMove, airborne) + (isSuper ? 18 : 0);
      const baseDamage = level === 2
        ? ATTACK_DAMAGE.specialTwo
        : level === 1
          ? ATTACK_DAMAGE.specialOne
          : normalMove === "kick"
            ? ATTACK_DAMAGE.kick
            : ATTACK_DAMAGE.punch;
      const comboBonus = level === 0 ? Math.min(3, Math.floor(comboCountRef.current[side] / 2)) : 0;
      const crownPower = (progress.crowns ?? 0) >= 3 ? 1 : 0;
      const rawDamage = baseDamage + crownPower + comboBonus + (comboFinisher ? 2 : 0) + (airborne ? (level > 0 ? 2 : 1) : 0);
      const cpuScale = side === "cpu" && battleMode === "cpu" ? CPU_DAMAGE_SCALE[difficulty] : 1;
      const fighterScale = powerMultiplier(fighter) * defenseMultiplier(targetFighter);
      const superMove = SUPER_MOVES[fighter];
      const superScale = isSuper ? (superMove.bonus === "crush" ? 2.3 : superMove.bonus === "multi" ? 1.45 : 1.75) : 1;
      const damage = Math.max(1, Math.round(rawDamage * fighterScale * cpuScale * superScale));
      const attackDirection = side === "player"
        ? directionToOpponent(snapshot.playerX, snapshot.cpuX)
        : directionToOpponent(snapshot.cpuX, snapshot.playerX);
      const extendedNewKick = normalMove === "kick" && ["borja", "bacora", "bonviure", "elchica", "ogalla"].includes(fighter);
      const actionDuration = isSuper ? 1180 : level > 0 ? (level === 2 ? 980 : 820) : normalMove === "kick" ? (extendedNewKick ? 760 : 620) : 480;
      cooldownRef.current[side] = now + actionDuration;
      const impactDelay = Math.round(actionDuration * (isSuper ? .6 : level > 0 ? .38 : extendedNewKick ? .4 : .48));
      const isKnockdownAttack = level === 2 || comboFinisher;
      const knockback = (isSuper ? 24 : level === 2 ? 18 : comboFinisher ? 8.5 : level === 1 ? 4.5 : normalMove === "kick" ? 3.4 : 2.1) + (airborne ? 2.4 : 0);
      swing(level > 0 ? "special" : normalMove === "kick" ? "heavy" : "light");
      if (side === "cpu" && battleMode === "cpu" && level > 0) cpuSpecialReadyAtRef.current = now + CPU_SPECIAL_COOLDOWN[difficulty];
      if (side === "player" && level > 0) setMatchStats((stats) => ({ ...stats, specials: stats.specials + 1, supers: stats.supers + (isSuper ? 1 : 0) }));
      if (isSuper) {
        superMeterRef.current = { ...superMeterRef.current, [side]: 0 };
        setSuperMeter(superMeterRef.current);
        setSuperFlash({ id: now, side, fighter });
        setSuperFx({ id: now, side, fighter, origin: side === "player" ? snapshot.playerX : snapshot.cpuX, target: side === "player" ? snapshot.cpuX : snapshot.playerX });
        later(() => setSuperFx((current) => current?.id === now ? null : current), 2000, true);
        superArmorUntilRef.current = { ...superArmorUntilRef.current, [side]: now + impactDelay + 120 };
        later(() => setSuperFlash((current) => current?.id === now ? null : current), 900, true);
        if (soundOn) getAudio().superRiser();
        haptic([20, 30, 20, 30, 60]);
      }

      setGame((current) => {
        if (current.phase !== "fight") return current;
        const next = { ...current };
        const attackerAction: Action = level > 0 ? "special" : normalMove;

        if (side === "player") {
          next.playerAction = attackerAction;
          next.playerMove = specialMove;
          next.playerAttackDirection = attackDirection;
          next.playerAttackVariant = attackVariant;
          next.playerPosePhase = 0;
          next.playerEnergy = 100;
          if (!airborne && level === 0 && distance <= specialRange + 5) {
            const lunge = normalMove === "kick" ? 2.2 : 1.35;
            const proposedX = current.playerX + Math.sign(current.cpuX - current.playerX) * lunge;
            next.playerX = Math.max(fighterMinX, Math.min(fighterMaxX, clampFighterStep(current.playerX, current.cpuX, proposedX, minimumCombatGap)));
          }
        } else {
          next.cpuAction = attackerAction;
          next.cpuMove = specialMove;
          next.cpuAttackDirection = attackDirection;
          next.cpuAttackVariant = attackVariant;
          next.cpuPosePhase = 0;
          next.cpuEnergy = 100;
          if (!airborne && level === 0 && distance <= specialRange + 5) {
            const lunge = normalMove === "kick" ? 2.2 : 1.35;
            const proposedX = current.cpuX + Math.sign(current.playerX - current.cpuX) * lunge;
            next.cpuX = Math.max(fighterMinX, Math.min(fighterMaxX, clampFighterStep(current.cpuX, current.playerX, proposedX, minimumCombatGap)));
          }
        }
        return next;
      });

      if (airborne) {
        setGame((current) => {
          const ownX = side === "player" ? current.playerX : current.cpuX;
          const rivalX = side === "player" ? current.cpuX : current.playerX;
          const dash = normalMove === "kick" && level === 0 ? 4.8 : level > 0 ? 1.8 : 2.8;
          const proposedX = ownX + Math.sign(rivalX - ownX) * dash;
          const nextX = Math.max(fighterMinX, Math.min(fighterMaxX, clampFighterStep(ownX, rivalX, proposedX, minimumCombatGap)));
          return side === "player" ? { ...current, playerX: nextX } : { ...current, cpuX: nextX };
        });
      }

      // Render the preparation, the active strike and the recovery as actual
      // game state rather than hoping a CSS atlas changes at the right time.
      // This keeps the late-roster poses in sync on Safari/Android too.
      const expectedAction: Action = level > 0 ? "special" : normalMove;
      const setPosePhase = (posePhase: FighterPosePhase) => {
        setGame((current) => {
          if (current.phase !== "fight") return current;
          const liveAction = side === "player" ? current.playerAction : current.cpuAction;
          if (attackTokenRef.current[side] !== attackToken || liveAction !== expectedAction) return current;
          return side === "player"
            ? { ...current, playerPosePhase: posePhase }
            : { ...current, cpuPosePhase: posePhase };
        });
      };
      later(() => setPosePhase(1), Math.max(65, Math.round(actionDuration * 0.14)));
      later(() => setPosePhase(2), Math.max(145, Math.round(actionDuration * 0.34)));
      later(() => setPosePhase(3), Math.max(245, Math.round(actionDuration * 0.58)));
      later(() => setPosePhase(4), Math.max(330, Math.round(actionDuration * 0.82)));

      later(() => {
          const impactSnapshot = gameRef.current;
          if (impactSnapshot.phase !== "fight") return;
          const liveAttackerAction = side === "player" ? impactSnapshot.playerAction : impactSnapshot.cpuAction;
          // Do not allow a move interrupted by a hit, landing or another move
          // to land afterwards as a ghost hit.
          if (attackTokenRef.current[side] !== attackToken || liveAttackerAction !== expectedAction) return;
          const liveDistance = Math.abs(impactSnapshot.playerX - impactSnapshot.cpuX);
          const liveTargetAction = side === "player" ? impactSnapshot.cpuAction : impactSnapshot.playerAction;
          const targetSide: Side = side === "player" ? "cpu" : "player";
          const attackerX = side === "player" ? impactSnapshot.playerX : impactSnapshot.cpuX;
          const targetX = side === "player" ? impactSnapshot.cpuX : impactSnapshot.playerX;
          const impactDirection = directionToOpponent(attackerX, targetX);
          if (impactDirection !== attackDirection) {
            setGame((current) => {
              if (current.phase !== "fight") return current;
              return side === "player"
                ? { ...current, playerAttackDirection: impactDirection }
                : { ...current, cpuAttackDirection: impactDirection };
            });
          }
          const targetIsInFront = attackFacesTarget(impactDirection, attackerX, targetX);
          const contact = combatContact({
            inFront: targetIsInFront,
            distance: liveDistance,
            range: specialRange,
            evading: Date.now() < evadeUntilRef.current[targetSide],
            crouching: liveTargetAction === "crouch",
            normalPunch: level === 0 && normalMove === "punch",
          });
          if (Date.now() < superArmorUntilRef.current[targetSide]) {
            comboCountRef.current[side] = 0;
            setCombo((current) => ({ ...current, [side]: 0 }));
            showFightCall("¡SUPER ARMADURA!", targetSide);
            sfx("block");
            return;
          }
          if (contact === "evaded") {
            comboCountRef.current[side] = 0;
            setCombo((current) => ({ ...current, [side]: 0 }));
            showFightCall("¡ESQUIVA!", targetSide);
            haptic([10, 16, 10]);
            beep(540, 0.08, "triangle");
            return;
          }
          if (contact === "miss") {
            comboCountRef.current[side] = 0;
            setCombo((current) => ({ ...current, [side]: 0 }));
            return;
          }
          const targetGuarded = side === "player" ? gameRef.current.cpuAction === "block" : gameRef.current.playerAction === "block";
          const targetImmune = Date.now() < immuneUntilRef.current[targetSide];
          const perfectGuard = targetGuarded && Date.now() - guardStartedRef.current[targetSide] <= 240;
          const counterHit = liveTargetAction === "punch" || liveTargetAction === "kick" || liveTargetAction === "special" || liveTargetAction === "dash";
          const appliedDamage = damage + (counterHit && !targetGuarded ? 2 : 0);
          setGame((current) => {
            if (current.phase !== "fight") return current;
            const next = { ...current };

            if (side === "player") {
              const guarded = current.cpuAction === "block";
              const away = current.cpuX >= current.playerX ? 1 : -1;
              next.cpuHealth = trainingMode ? 100 : targetImmune || perfectGuard ? current.cpuHealth : Math.max(0, current.cpuHealth - (guarded ? Math.ceil(appliedDamage / (isSuper ? 2 : 3)) : appliedDamage));
              next.cpuEnergy = Math.min(100, current.cpuEnergy + 17);
              next.cpuAction = targetImmune || guarded ? "block" : isKnockdownAttack ? "launched" : "hit";
              next.cpuX = targetImmune ? current.cpuX : Math.max(fighterMinX, Math.min(fighterMaxX, current.cpuX + away * (guarded ? 0.8 : knockback)));
            } else {
              const guarded = current.playerAction === "block";
              const away = current.playerX >= current.cpuX ? 1 : -1;
              next.playerHealth = targetImmune || perfectGuard ? current.playerHealth : Math.max(0, current.playerHealth - (guarded ? Math.ceil(appliedDamage / (isSuper ? 2 : 3)) : appliedDamage));
              next.playerEnergy = Math.min(100, current.playerEnergy + 18);
              next.playerAction = targetImmune || guarded ? "block" : isKnockdownAttack ? "launched" : "hit";
              next.playerX = targetImmune ? current.playerX : Math.max(fighterMinX, Math.min(fighterMaxX, current.playerX + away * (guarded ? 0.8 : knockback)));
            }

            next.impact += 1;
            next.impactLevel = targetGuarded || targetImmune ? 1 : level === 2 || comboFinisher ? 3 : level === 1 || normalMove === "kick" ? 2 : 1;
            if (next.playerHealth <= 0) {
              next.phase = "ko";
              next.winner = "cpu";
              next.playerAction = "launched";
            } else if (next.cpuHealth <= 0) {
              next.phase = "ko";
              next.winner = "player";
              next.cpuAction = "launched";
            }
            return next;
          });
          const dealtDamage = targetImmune || perfectGuard ? 0 : targetGuarded ? Math.ceil(appliedDamage / (isSuper ? 2 : 3)) : appliedDamage;
          if (!targetImmune) {
            if (perfectGuard) addMeter(targetSide, SUPER_GAIN.perfect);
            else if (targetGuarded) { addMeter(targetSide, SUPER_GAIN.guarded); addMeter(side, SUPER_GAIN.guarded); }
            else {
              if (!isSuper) addMeter(side, level > 0 ? SUPER_GAIN.dealtSpecial : SUPER_GAIN.dealt);
              addMeter(targetSide, SUPER_GAIN.taken);
            }
          }
          if (dealtDamage > 0) {
            popDamage({ side: targetSide, x: targetX, amount: dealtDamage, kind: targetGuarded ? "guard" : isSuper ? "super" : counterHit ? "counter" : level > 0 ? "special" : "normal" });
            if (side === "player") setMatchStats((stats) => ({ ...stats, hits: stats.hits + (targetGuarded ? 0 : 1), damage: stats.damage + dealtDamage }));
          }
          if (perfectGuard && targetSide === "player") setMatchStats((stats) => ({ ...stats, perfectGuards: stats.perfectGuards + 1 }));
          if (perfectGuard) {
            comboCountRef.current[side] = 0;
            setCombo((current) => ({ ...current, [side]: 0 }));
            showFightCall("¡BLOQUEO PERFECTO!", targetSide);
            haptic([16, 22, 16]);
            sfx("perfect");
            return;
          }
          if (targetImmune) {
            haptic([12, 18, 12]);
            beep(480, 0.13, "sine");
            later(() => setGame((current) => {
              if (current.phase !== "fight") return current;
              if (targetSide === "player" && current.playerAction === "block") return { ...current, playerAction: current.playerAirborne ? "jump" : "idle" };
              if (targetSide === "cpu" && current.cpuAction === "block") return { ...current, cpuAction: current.cpuAirborne ? "jump" : "idle" };
              return current;
            }), 280);
            return;
          }
          if (!targetGuarded) registerCombo(side);
          else {
            comboCountRef.current[side] = 0;
            setCombo((current) => ({ ...current, [side]: 0 }));
          }
          if (isSuper && !targetGuarded) {
            showFightCall(superMove.bonusCall, side);
            applySuperBonus(side, targetSide, fighter, dealtDamage);
          }
          else if (comboFinisher && !targetGuarded) showFightCall("¡REMATE DE COMBO!", side);
          else if (counterHit && !targetGuarded) showFightCall("¡CONTRAATAQUE!", side);
          haptic(level > 0 ? [24, 35, 38] : normalMove === "kick" ? 28 : 16);
          sfx(targetGuarded ? "block" : isSuper ? "super" : level > 0 ? "special" : normalMove);
          if (!targetGuarded && !targetImmune) {
            document.documentElement.classList.add("arcade-hit-stop");
            window.setTimeout(() => document.documentElement.classList.remove("arcade-hit-stop"), isSuper ? 190 : level > 0 || comboFinisher ? 82 : normalMove === "kick" ? 66 : 48);
          }
          if (isKnockdownAttack && !targetGuarded && !targetImmune) {
            later(() => setGame((current) => {
              if (current.phase !== "fight") return current;
              return targetSide === "player" && current.playerAction === "launched"
                ? { ...current, playerAction: "knockdown", playerAirborne: false }
                : targetSide === "cpu" && current.cpuAction === "launched"
                  ? { ...current, cpuAction: "knockdown", cpuAirborne: false }
                  : current;
            }), 520);
            later(() => setGame((current) => {
              if (current.phase !== "fight") return current;
              return targetSide === "player" && current.playerAction === "knockdown"
                ? { ...current, playerAction: "getup" }
                : targetSide === "cpu" && current.cpuAction === "knockdown"
                  ? { ...current, cpuAction: "getup" }
                  : current;
            }), 1120);
            later(() => setGame((current) => {
              if (current.phase !== "fight") return current;
              return targetSide === "player" && current.playerAction === "getup"
                ? { ...current, playerAction: "idle" }
                : targetSide === "cpu" && current.cpuAction === "getup"
                  ? { ...current, cpuAction: "idle" }
                  : current;
            }), 1570);
          } else {
            later(() => {
              setGame((current) => {
                if (current.phase !== "fight") return current;
                if (side === "player" && current.cpuAction === "hit") return { ...current, cpuAction: current.cpuAirborne ? "jump" : "idle" };
                if (side === "cpu" && current.playerAction === "hit") return { ...current, playerAction: current.playerAirborne ? "jump" : "idle" };
                return current;
              });
            }, 520);
          }
        }, impactDelay);

      later(() => {
        if (attackTokenRef.current[side] !== attackToken) return;
        const currentAction = side === "player" ? gameRef.current.playerAction : gameRef.current.cpuAction;
        const expectedAction: Action = level > 0 ? "special" : normalMove;
        if (currentAction !== expectedAction) {
          queuedAttackRef.current[side] = null;
          setGame((current) => side === "player"
            ? { ...current, playerMove: null, playerAttackVariant: 0, playerPosePhase: 0 }
            : { ...current, cpuMove: null, cpuAttackVariant: 0, cpuPosePhase: 0 });
          return;
        }
        setGame((current) => {
          if (side === "player") {
            const playerAction = current.playerAction === "punch" || current.playerAction === "kick" || current.playerAction === "special"
              ? (current.playerAirborne ? "jump" : "idle") as Action
              : current.playerAction;
            return { ...current, playerAction, playerMove: null, playerAttackVariant: 0, playerPosePhase: 0 };
          }
          const cpuAction = current.cpuAction === "punch" || current.cpuAction === "kick" || current.cpuAction === "special"
            ? (current.cpuAirborne ? "jump" : "idle") as Action
            : current.cpuAction;
          return { ...current, cpuAction, cpuMove: null, cpuAttackVariant: 0, cpuPosePhase: 0 };
        });
        const queued = queuedAttackRef.current[side];
        if (queued && gameRef.current.phase === "fight") {
          queuedAttackRef.current[side] = null;
          cooldownRef.current[side] = Math.min(cooldownRef.current[side], Date.now() + 28);
          later(() => performAttackRef.current(side, queued.level, queued.normalMove), 44);
        }
      }, actionDuration);
    },
    [addMeter, applySuperBonus, battleMode, beep, difficulty, fighterMaxX, fighterMinX, getAudio, haptic, later, minimumCombatGap, opponent, popDamage, progress.crowns, registerCombo, selected, sfx, showFightCall, soundOn, swing, trainingMode],
  );

  useEffect(() => {
    performAttackRef.current = performAttack;
  }, [performAttack]);

  const jump = useCallback((side: Side) => {
    const snapshot = gameRef.current;
    if (snapshot.phase !== "fight" || pausedRef.current || jumpLockRef.current[side]) return;
    const ownAction = side === "player" ? snapshot.playerAction : snapshot.cpuAction;
    if (ownAction !== "idle" && ownAction !== "walk" && ownAction !== "crouch") return;
    jumpLockRef.current[side] = true;
    const keys = keysRef.current;
    const manualDirection = side === "player"
      ? keys.has("a") || keys.has("touch-left") || (battleMode === "cpu" && keys.has("arrowleft"))
        ? -1
        : keys.has("d") || keys.has("touch-right") || (battleMode === "cpu" && keys.has("arrowright"))
          ? 1
          : 0
      : keys.has("touch-cpu-left") || keys.has("arrowleft")
        ? -1
        : keys.has("touch-cpu-right") || keys.has("arrowright")
          ? 1
          : 0;
    const forwardDirection = side === "player"
      ? snapshot.cpuX >= snapshot.playerX ? 1 : -1
      : snapshot.playerX >= snapshot.cpuX ? 1 : -1;
    const direction = manualDirection || forwardDirection;
    const ownStartX = side === "player" ? snapshot.playerX : snapshot.cpuX;
    const rivalStartX = side === "player" ? snapshot.cpuX : snapshot.playerX;
    const startingGap = Math.abs(rivalStartX - ownStartX);
    const jumpingTowardRival = direction === forwardDirection;
    const jumpTravel = jumpingTowardRival && startingGap <= 31
      ? Math.max(0, startingGap - minimumCombatGap)
      : manualDirection
        ? 15.5
        : 10.5;

    setGame((current) => side === "player"
      ? { ...current, playerAction: "crouch", playerAirborne: false }
      : { ...current, cpuAction: "crouch", cpuAirborne: false });
    beep(112, 0.05, "triangle");

    later(() => {
      setGame((current) => side === "player"
        ? { ...current, playerAction: "jump", playerAirborne: true }
        : { ...current, cpuAction: "jump", cpuAirborne: true });
      beep(185, 0.07, "triangle");
    }, 90);

    // Spread horizontal travel across the whole leap. Four large position
    // updates made the new fighters appear to teleport on phones.
    const jumpSteps = 15;
    Array.from({ length: jumpSteps }, (_, index) => index).forEach((index) => {
      const delay = 150 + index * 43;
      later(() => {
        setGame((current) => {
          const airborne = side === "player" ? current.playerAirborne : current.cpuAirborne;
          if (!airborne) return current;
          const ownX = side === "player" ? current.playerX : current.cpuX;
          const currentRivalX = side === "player" ? current.cpuX : current.playerX;
          const nextX = clampFighterStep(ownX, currentRivalX, Math.max(fighterMinX, Math.min(fighterMaxX, ownX + direction * jumpTravel / jumpSteps)), minimumCombatGap);
          return side === "player"
            ? { ...current, playerX: nextX }
            : { ...current, cpuX: nextX };
        });
        if (index === 0) beep(285, 0.06, "triangle");
      }, delay);
    });

    later(() => beep(98, 0.045, "square"), 785);
    later(() => {
      jumpLockRef.current[side] = false;
      setGame((current) => {
        const actionKey = side === "player" ? "playerAction" : "cpuAction";
        const airborneKey = side === "player" ? "playerAirborne" : "cpuAirborne";
        return {
          ...current,
          [airborneKey]: false,
          [actionKey]: current[actionKey] === "jump" ? "crouch" : current[actionKey],
        };
      });
      later(() => {
        setGame((current) => {
          const actionKey = side === "player" ? "playerAction" : "cpuAction";
          return current[actionKey] === "crouch" && !crouchHeldRef.current[side]
            ? { ...current, [actionKey]: "idle" }
            : current;
        });
      }, 115);
    }, 910);
  }, [battleMode, beep, fighterMaxX, fighterMinX, later, minimumCombatGap]);

  const dash = useCallback((side: Side, direction: -1 | 1, evasive = false) => {
    const snapshot = gameRef.current;
    if (snapshot.phase !== "fight" || pausedRef.current) return;
    const ownAction = side === "player" ? snapshot.playerAction : snapshot.cpuAction;
    const airborne = side === "player" ? snapshot.playerAirborne : snapshot.cpuAirborne;
    const now = Date.now();
    if (airborne || dashCooldownRef.current[side] > now) return;
    if (!["idle", "walk", "crouch", "block"].includes(ownAction)) return;

    dashCooldownRef.current[side] = now + (evasive ? 840 : 520);
    evadeUntilRef.current[side] = evasive ? now + 310 : 0;
    movementVelocityRef.current[side] = 0;
    movementHeldRef.current[side] = 0;
    const ownX = side === "player" ? snapshot.playerX : snapshot.cpuX;
    const rivalX = side === "player" ? snapshot.cpuX : snapshot.playerX;
    const towardRival = Math.sign(rivalX - ownX) === direction;
    let targetX = Math.max(fighterMinX, Math.min(fighterMaxX, ownX + direction * (evasive ? 10.5 : towardRival ? 12.5 : 9.5)));
    if (towardRival) {
      const gap = Math.abs(rivalX - ownX);
      targetX = Math.max(fighterMinX, Math.min(fighterMaxX, ownX + direction * (evasive ? -10.5 : Math.min(12.5, Math.max(0, gap - minimumCombatGap)))));
    }

    setGame((current) => side === "player"
      ? { ...current, playerAction: evasive ? "dodge" : "dash", playerAttackDirection: directionToOpponent(current.playerX, current.cpuX) }
      : { ...current, cpuAction: evasive ? "dodge" : "dash", cpuAttackDirection: directionToOpponent(current.cpuX, current.playerX) });
    beep(evasive ? 470 : 155, evasive ? 0.055 : 0.045, "triangle");

    [55, 110, 165, 220].forEach((delay, index) => {
      later(() => setGame((current) => {
        if (current.phase !== "fight") return current;
        const action = side === "player" ? current.playerAction : current.cpuAction;
        if (action !== "dash" && action !== "dodge") return current;
        const currentX = side === "player" ? current.playerX : current.cpuX;
        const opponentX = side === "player" ? current.cpuX : current.playerX;
        const proposedX = currentX + (targetX - currentX) / (4 - index);
        const boundedX = Math.max(fighterMinX, Math.min(fighterMaxX, proposedX));
        const nextX = clampFighterStep(currentX, opponentX, boundedX, minimumCombatGap);
        if (evasive && Math.abs(nextX - opponentX) < 5.8) return current;
        return side === "player" ? { ...current, playerX: nextX } : { ...current, cpuX: nextX };
      }), delay);
    });

    later(() => setGame((current) => {
      if (side === "player" && (current.playerAction === "dash" || current.playerAction === "dodge")) return { ...current, playerAction: "idle" };
      if (side === "cpu" && (current.cpuAction === "dash" || current.cpuAction === "dodge")) return { ...current, cpuAction: "idle" };
      return current;
    }), evasive ? 430 : 330);
  }, [beep, fighterMaxX, fighterMinX, later, minimumCombatGap]);

  const directionalPress = useCallback((side: Side, direction: -1 | 1) => {
    if (gameRef.current.phase !== "fight" || pausedRef.current) return;
    const action = side === "player" ? gameRef.current.playerAction : gameRef.current.cpuAction;
    if (action === "block") {
      directionTapRef.current[side] = { direction: 0, at: 0 };
      dash(side, direction, true);
      return;
    }
    const now = Date.now();
    const previous = directionTapRef.current[side];
    if (previous.direction === direction && now - previous.at <= 280) {
      directionTapRef.current[side] = { direction: 0, at: 0 };
      dash(side, direction);
    } else {
      directionTapRef.current[side] = { direction, at: now };
    }
  }, [dash]);

  const setGuard = useCallback((guarding: boolean) => {
    if (gameRef.current.phase !== "fight") return;
    if (guarding && cooldownRef.current.player > Date.now() + 200 && gameRef.current.playerAction === "idle") return;
    if (guarding) guardStartedRef.current.player = Date.now();
    setGame((current) => {
      if (!guarding) return current.playerAction === "block" ? { ...current, playerAction: "idle" } : current;
      if (current.playerAction !== "idle" && current.playerAction !== "walk" && current.playerAction !== "crouch") return current;
      return { ...current, playerAction: "block" };
    });
  }, []);

  const setCrouch = useCallback((crouching: boolean) => {
    if (gameRef.current.phase !== "fight") return;
    crouchHeldRef.current.player = crouching;
    setGame((current) => {
      if (crouching) {
        if (current.playerAirborne || (current.playerAction !== "idle" && current.playerAction !== "walk")) return current;
        return { ...current, playerAction: "crouch" };
      }
      return current.playerAction === "crouch" ? { ...current, playerAction: "idle" } : current;
    });
  }, []);

  const setCpuGuard = useCallback((guarding: boolean) => {
    if (gameRef.current.phase !== "fight" || battleMode !== "local") return;
    if (guarding && cooldownRef.current.cpu > Date.now() + 200 && gameRef.current.cpuAction === "idle") return;
    if (guarding) guardStartedRef.current.cpu = Date.now();
    setGame((current) => {
      if (!guarding) return current.cpuAction === "block" ? { ...current, cpuAction: "idle" } : current;
      if (current.cpuAction !== "idle" && current.cpuAction !== "walk" && current.cpuAction !== "crouch") return current;
      return { ...current, cpuAction: "block" };
    });
  }, [battleMode]);

  const setCpuCrouch = useCallback((crouching: boolean) => {
    if (gameRef.current.phase !== "fight" || battleMode !== "local") return;
    crouchHeldRef.current.cpu = crouching;
    setGame((current) => {
      if (crouching) {
        if (current.cpuAirborne || (current.cpuAction !== "idle" && current.cpuAction !== "walk")) return current;
        return { ...current, cpuAction: "crouch" };
      }
      return current.cpuAction === "crouch" ? { ...current, cpuAction: "idle" } : current;
    });
  }, [battleMode]);

  const launchFightRound = useCallback((number: number) => {
    if (!fightReady) return;
    clearTransientTimers();
    crouchHeldRef.current = { player: false, cpu: false };
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    cooldownRef.current = { player: 0, cpu: 0 };
    jumpLockRef.current = { player: false, cpu: false };
    movementVelocityRef.current = { player: 0, cpu: 0 };
    movementHeldRef.current = { player: 0, cpu: 0 };
    cpuAiMovementDirectionRef.current = 0;
    cpuFirstAttackAfterRef.current = newFighterMatch ? Date.now() + 4000 : 0;
    directionTapRef.current = { player: { direction: 0, at: 0 }, cpu: { direction: 0, at: 0 } };
    dashCooldownRef.current = { player: 0, cpu: 0 };
    evadeUntilRef.current = { player: 0, cpu: 0 };
    queuedAttackRef.current = { player: null, cpu: null };
    attackTokenRef.current = { player: 0, cpu: 0 };
    comboCountRef.current = { player: 0, cpu: 0 };
    setCombo({ player: 0, cpu: 0 });
    guardStartedRef.current = { player: 0, cpu: 0 };
    handledEndRef.current = false;
    setMovementGear({ player: "still", cpu: "still" });
    setFightCall(null);
    resumeSequenceRef.current = false;
    setResumeCountdown(0);
    setPaused(false);
    setPlayerWalkIntent("neutral");
    setCpuWalkIntent("neutral");
    setFightPickup(null);
    immuneUntilRef.current = { player: 0, cpu: 0 };
    setImmuneUntil({ player: 0, cpu: 0 });
    setImmuneClock(0);
    keysRef.current.clear();
    const startingGame = freshGame();
    const startingBounds = fighterBoundsRef.current;
    setGame({
      ...startingGame,
      phase: "intro",
      ...(newFighterMatch ? { playerX: startingBounds.min, cpuX: startingBounds.max } : {}),
    });
    setRoundCall(number === 3 ? "ROUND 3 · DESEMPATE" : `ROUND ${number}`);
    jingle("round");
    later(() => {
      setRoundCall("FIGHT!");
      jingle("fight");
    }, 650);
    introTimerRef.current = later(() => {
      setRoundCall("");
      setGame((current) => ({ ...current, phase: "fight" }));
    }, 1250);
  }, [clearTransientTimers, fightReady, jingle, later, newFighterMatch]);

  const resetMatchMeters = useCallback(() => {
    superMeterRef.current = { player: 0, cpu: 0 };
    setSuperMeter(superMeterRef.current);
    superArmorUntilRef.current = { player: 0, cpu: 0 };
    cpuSpecialReadyAtRef.current = 0;
    setMatchStats(freshMatchStats());
    setDamagePops([]);
    setSuperFlash(null);
    setSuperFx(null);
    setStunned({ player: false, cpu: false });
  }, []);

  const startRound = useCallback(() => {
    setTrainingMode(false);
    resetMatchMeters();
    rankingCapturedRef.current = false;
    setPendingRanking(null);
    setRoundNumber(1);
    setRoundWins({ player: 0, cpu: 0 });
    launchFightRound(1);
  }, [launchFightRound, resetMatchMeters]);

  const startTraining = useCallback(() => {
    setTrainingMode(true);
    resetMatchMeters();
    setBattleMode("cpu");
    rankingCapturedRef.current = false;
    setPendingRanking(null);
    setRoundNumber(1);
    setRoundWins({ player: 0, cpu: 0 });
    setProgress((current) => {
      const next = { ...current, trainingSessions: (current.trainingSessions ?? 0) + 1 };
      window.localStorage.setItem("benifaio-progress", JSON.stringify(next));
      return next;
    });
    launchFightRound(1);
  }, [launchFightRound, resetMatchMeters]);

  useEffect(() => {
    if (game.phase !== "fight" || fightPickup) return;
    const spawnTimer = window.setTimeout(() => {
      if (gameRef.current.phase !== "fight") return;
      const kind = Math.floor(Math.random() * ARCADE_PICKUPS.length) as ArcadePickupKind;
      setFightPickup({ kind, x: 38 + Math.random() * 24, expiresAt: Date.now() + 9000 });
      beep(610, 0.11, "sine");
    }, 6500 + Math.random() * 8000);
    return () => window.clearTimeout(spawnTimer);
  }, [beep, fightPickup, game.phase]);

  useEffect(() => {
    if (game.phase !== "fight" || !fightPickup) return;
    const pickup = fightPickup;
    const collisionTimer = window.setInterval(() => {
      const current = gameRef.current;
      if (current.phase !== "fight" || Date.now() >= pickup.expiresAt) {
        setFightPickup(null);
        return;
      }
      const playerDistance = Math.abs(current.playerX - pickup.x);
      const cpuDistance = Math.abs(current.cpuX - pickup.x);
      if (Math.min(playerDistance, cpuDistance) > 5.8) return;
      const collector: Side = playerDistance <= cpuDistance ? "player" : "cpu";
      const until = Date.now() + ARCADE_PICKUPS[pickup.kind].duration;
      immuneUntilRef.current = { ...immuneUntilRef.current, [collector]: until };
      setImmuneUntil(immuneUntilRef.current);
      setImmuneClock(Date.now());
      setFightPickup(null);
      haptic([35, 25, 70]);
      beep(720, 0.18, "sine");
    }, 55);
    return () => window.clearInterval(collisionTimer);
  }, [beep, fightPickup, game.phase, haptic]);

  const startCampaign = useCallback(() => {
    if (!fightReady) return;
    setPendingRanking(null);
    setBattleMode("cpu");
    setCampaignScore(0);
    setCampaignStep(1);
    setBossHealth(CAMPAIGN_BOSS_MAX_HEALTH);
    bossRewardedRef.current = false;
    bossAttackCooldownRef.current = 0;
    bossDodgeUntilRef.current = 0;
    setBossPhase(1);
    setBossAttack(0);
    setBossWarning(false);
    setBossDodging(false);
    setBossDodgeReady(true);
    setBossPlayerHit(false);
    setUltimateCharge(50);
    setFinalFlash(0);
    startRound();
  }, [fightReady, startRound]);

  const startOrbMode = useCallback(() => {
    if (!fightersReady) return;
    setPendingRanking(null);
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    cooldownRef.current = { player: 0, cpu: 0 };
    setPlayerWalkIntent("neutral");
    setRoundCall("");
    setGame({ ...freshGame(), phase: "orbs" });
  }, [clearTransientTimers, fightersReady]);

  const startPlatformMode = useCallback(() => {
    if (!fightersReady) return;
    setPendingRanking(null);
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    cooldownRef.current = { player: 0, cpu: 0 };
    setPlayerWalkIntent("neutral");
    setRoundCall("");
    setGame({ ...freshGame(), phase: "platform" });
  }, [clearTransientTimers, fightersReady]);

  const startCoopMode = useCallback(() => {
    if (!fightersReady) return;
    setPendingRanking(null);
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    cooldownRef.current = { player: 0, cpu: 0 };
    setPlayerWalkIntent("neutral");
    setRoundCall("");
    setCampaignStep(0);
    setCoopPlayerOne(selected);
    setCoopPlayerTwo(localOpponent);
    setCoopHumanPlayers(battleMode === "local" ? 2 : 1);
    setGame({ ...freshGame(), phase: "coop" });
  }, [clearTransientTimers, fightersReady, selected, localOpponent, battleMode]);

  const startPrisonSlugMode = useCallback(() => {
    if (!fightersReady) return;
    setPendingRanking(null);
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    cooldownRef.current = { player: 0, cpu: 0 };
    keysRef.current.clear();
    setPlayerWalkIntent("neutral");
    setRoundCall("");
    setCampaignStep(0);
    setGame({ ...freshGame(), phase: "prison-slug" });
  }, [clearTransientTimers, fightersReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (gameRef.current.phase === "orbs" || gameRef.current.phase === "platform" || gameRef.current.phase === "coop" || gameRef.current.phase === "prison-slug") return;
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "c", "d", "w", "s", "h", "j", "k", "l", "i", "o", "1", "2", "3", "4", "enter", "escape", "p"].includes(key)) {
        event.preventDefault();
      }
      keysRef.current.add(key);
      if (event.repeat) return;
      if (gameRef.current.phase === "campaign-final") {
        if (key === "escape") resetToSelectRef.current();
        else if (key === "s" || key === "c" || key === "arrowdown" || key === "w" || key === "arrowup") dodgeCampaignBossRef.current();
        else if (key === "h" || key === "j" || key === "k" || key === "l" || key === " ") hitCampaignBossRef.current(key === "k" || key === "l" || key === " ");
        return;
      }
      if ((key === "p" || key === "escape") && gameRef.current.phase === "fight") {
        keysRef.current.clear();
        if (pausedRef.current) resumeGame();
        else {
          resumeSequenceRef.current = false;
          setResumeCountdown(0);
          setPaused(true);
        }
        return;
      }
      if (key === "enter" && pausedRef.current) {
        resumeGame();
        return;
      }
      if (gameRef.current.phase === "fight") {
        if (key === "a") directionalPress("player", -1);
        if (key === "d") directionalPress("player", 1);
        if (key === "arrowleft") directionalPress(battleMode === "local" ? "cpu" : "player", -1);
        if (key === "arrowright") directionalPress(battleMode === "local" ? "cpu" : "player", 1);
      }
      if (key === "j") performAttack("player", 0, "punch");
      if (key === "h") performAttack("player", 0, "kick");
      if (key === "k") performAttack("player", 1);
      if (key === "l") performAttack("player", 2);
      if (battleMode === "local") {
        if (key === "1") performAttack("cpu", 0, "punch");
        if (key === "2") performAttack("cpu", 0, "kick");
        if (key === "3") performAttack("cpu", 1);
        if (key === "4") performAttack("cpu", 2);
        if (key === "i" || key === "arrowup") jump("cpu");
        if (key === "o") setCpuGuard(true);
        if (key === "arrowdown") setCpuCrouch(true);
      }
      if (key === "w" || (battleMode === "cpu" && key === "arrowup")) jump("player");
      if (key === "s") setGuard(true);
      if (key === "c" || (battleMode === "cpu" && key === "arrowdown")) setCrouch(true);
      if ((key === "enter" || key === " ") && gameRef.current.phase === "select" && !(event.target instanceof HTMLElement && event.target.closest("button, input, select, textarea, a"))) startRound();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.delete(key);
      if (key === "s") setGuard(false);
      if (key === "c" || (battleMode === "cpu" && key === "arrowdown")) setCrouch(false);
      if (key === "o") setCpuGuard(false);
      if (key === "arrowdown") setCpuCrouch(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [battleMode, directionalPress, jump, performAttack, resumeGame, setCpuCrouch, setCpuGuard, setCrouch, setGuard, startRound]);

  useEffect(() => {
    let frame = 0;
    let previousFrame = performance.now();
    const updateMovement = (now: number) => {
      frame = window.requestAnimationFrame(updateMovement);
      const elapsed = now - previousFrame;
      previousFrame = now;
      const frameScale = Math.min(1.25, elapsed / 20);
      const keys = keysRef.current;
      if (gameRef.current.phase !== "fight" || pausedRef.current) return;
      const movingLeft = keys.has("a") || (battleMode === "cpu" && keys.has("arrowleft")) || keys.has("touch-left");
      const movingRight = keys.has("d") || (battleMode === "cpu" && keys.has("arrowright")) || keys.has("touch-right");
      const cpuLeft = battleMode === "local" && (keys.has("touch-cpu-left") || keys.has("arrowleft"));
      const cpuRight = battleMode === "local" && (keys.has("touch-cpu-right") || keys.has("arrowright"));
      // Opposite directions cancel each other. This matters with D-pads and
      // analogue sticks where a brief overlap otherwise caused unwanted drift.
      const direction = movingLeft === movingRight ? 0 : movingLeft ? -1 : 1;
      const snapshot = gameRef.current;
      const movingTowardRival = snapshot.cpuX > snapshot.playerX ? direction > 0 : direction < 0;
      if (direction) setPlayerWalkIntent(movingTowardRival ? "advance" : "retreat");
      const cpuManualDirection = cpuLeft === cpuRight ? 0 : cpuLeft ? -1 : 1;
      const cpuDirection = battleMode === "cpu" ? cpuAiMovementDirectionRef.current : cpuManualDirection;
      const cpuMovingTowardRival = snapshot.playerX > snapshot.cpuX ? cpuDirection > 0 : cpuDirection < 0;
      if (cpuDirection) setCpuWalkIntent(cpuMovingTowardRival ? "advance" : "retreat");

      const accelerate = (side: Side, input: number, airborne: boolean, retreating: boolean) => {
        const previous = movementVelocityRef.current[side];
        if (input) {
          movementHeldRef.current[side] = Math.sign(previous) === input ? movementHeldRef.current[side] + frameScale : frameScale;
          const forwardSpeed = movementHeldRef.current[side] > 9 ? 0.95 : 0.68;
          // A back-step is deliberately shorter than a forward stride. This
          // keeps the feet from looking as if they are skating backwards and
          // gives the retreat animation time to read clearly.
          const groundSpeed = forwardSpeed * (retreating ? 0.82 : 1) * speedMultiplier(side === "player" ? selected : opponent);
          const maxSpeed = airborne ? 0.51 : groundSpeed;
          const acceleration = airborne ? 0.08 : retreating ? 0.125 : 0.15;
          const difference = input * maxSpeed - previous;
          const next = previous + Math.sign(difference) * Math.min(Math.abs(difference), acceleration * frameScale);
          movementVelocityRef.current[side] = Math.max(-maxSpeed, Math.min(maxSpeed, next));
        } else {
          movementHeldRef.current[side] = 0;
          movementVelocityRef.current[side] = Math.abs(previous) < 0.045 ? 0 : previous * Math.pow(airborne ? 0.88 : 0.68, frameScale);
        }
        return movementVelocityRef.current[side];
      };

      const playerMoveAllowed = snapshot.playerAirborne || snapshot.playerAction === "idle" || snapshot.playerAction === "walk";
      const cpuMoveAllowed = snapshot.cpuAirborne || snapshot.cpuAction === "idle" || snapshot.cpuAction === "walk";
      const playerVelocity = accelerate("player", playerMoveAllowed ? direction : 0, snapshot.playerAirborne, Boolean(direction && !movingTowardRival));
      const cpuVelocity = accelerate("cpu", cpuMoveAllowed ? cpuDirection : 0, snapshot.cpuAirborne, Boolean(cpuDirection && !cpuMovingTowardRival));
      const playerGear: MovementGear = Math.abs(playerVelocity) < 0.045 ? "still" : movementHeldRef.current.player > 9 ? "stride" : "start";
      const cpuGear: MovementGear = Math.abs(cpuVelocity) < 0.045 ? "still" : movementHeldRef.current.cpu > 9 ? "stride" : "start";
      setMovementGear((current) => current.player === playerGear && current.cpu === cpuGear ? current : { player: playerGear, cpu: cpuGear });
      // Switch the isolated walk images without a React render. CSS image URL
      // animations are dropped by some mobile browsers; the animation frame
      // already driving movement supplies a stable cadence instead.
      const playerStrideFrame = Math.floor(now / (playerGear === "stride" ? 135 : 170)) % 2;
      const cpuStrideFrame = Math.floor(now / (cpuGear === "stride" ? 135 : 170)) % 2;
      playerFighterRef.current?.classList.toggle("stride-alt", snapshot.playerAction === "walk" && playerStrideFrame === 1);
      cpuFighterRef.current?.classList.toggle("stride-alt", snapshot.cpuAction === "walk" && cpuStrideFrame === 1);

      let next = snapshot;
        if (playerVelocity && playerMoveAllowed) {
          const limitLeft = fighterMinX;
          const limitRight = fighterMaxX;
          const proposedX = Math.max(limitLeft, Math.min(limitRight, next.playerX + playerVelocity * frameScale));
          const nextX = clampFighterStep(next.playerX, next.cpuX, proposedX, minimumCombatGap);
          if (Math.abs(nextX - next.playerX) > 0.0001) {
            next = { ...next, playerX: nextX, playerAction: next.playerAirborne ? next.playerAction : "walk" };
          } else {
            movementVelocityRef.current.player = 0;
            movementHeldRef.current.player = 0;
            setPlayerWalkIntent("neutral");
            if (next.playerAction === "walk") next = { ...next, playerAction: "idle" };
          }
        } else if (!direction && next.playerAction === "walk") {
          next = { ...next, playerAction: "idle" };
        }
        if (cpuVelocity && cpuMoveAllowed) {
          const proposedX = Math.max(fighterMinX, Math.min(fighterMaxX, next.cpuX + cpuVelocity * frameScale));
          const cpuX = clampFighterStep(next.cpuX, next.playerX, proposedX, minimumCombatGap);
          if (Math.abs(cpuX - next.cpuX) > 0.0001) {
            next = { ...next, cpuX, cpuAction: next.cpuAirborne ? next.cpuAction : "walk" };
          } else {
            movementVelocityRef.current.cpu = 0;
            movementHeldRef.current.cpu = 0;
            setCpuWalkIntent("neutral");
            if (next.cpuAction === "walk") next = { ...next, cpuAction: "idle" };
          }
        } else if (!cpuDirection && next.cpuAction === "walk") {
          next = { ...next, cpuAction: "idle" };
        }
      if (next !== snapshot) {
        gameRef.current = next;
        if (playerFighterRef.current) playerFighterRef.current.style.left = `${next.playerX}%`;
        if (cpuFighterRef.current) cpuFighterRef.current.style.left = `${next.cpuX}%`;
        const playerFacingLeft = next.playerAction === "punch" || next.playerAction === "kick" || next.playerAction === "special"
          ? next.playerAttackDirection === "toward-left"
          : next.playerX > next.cpuX;
        const cpuFacingLeft = next.cpuAction === "punch" || next.cpuAction === "kick" || next.cpuAction === "special"
          ? next.cpuAttackDirection === "toward-left"
          : next.cpuX > next.playerX;
        playerFighterRef.current?.classList.toggle("face-left", playerFacingLeft);
        playerFighterRef.current?.classList.toggle("face-right", !playerFacingLeft);
        cpuFighterRef.current?.classList.toggle("face-left", cpuFacingLeft);
        cpuFighterRef.current?.classList.toggle("face-right", !cpuFacingLeft);
        if (now - lastMovementRenderRef.current >= 40) {
          lastMovementRenderRef.current = now;
          // Movement paints between React renders, but an attack or hit may
          // have entered the state queue meanwhile. Preserve that newer action
          // instead of replacing it with an older walk snapshot.
          setGame((current) => {
            if (current.phase !== "fight") return current;
            const playerUnchanged = current.playerAction === snapshot.playerAction && current.playerAirborne === snapshot.playerAirborne;
            const cpuUnchanged = current.cpuAction === snapshot.cpuAction && current.cpuAirborne === snapshot.cpuAirborne;
            return {
              ...current,
              playerX: playerUnchanged ? next.playerX : current.playerX,
              cpuX: cpuUnchanged ? next.cpuX : current.cpuX,
              playerAction: playerUnchanged ? next.playerAction : current.playerAction,
              cpuAction: cpuUnchanged ? next.cpuAction : current.cpuAction,
            };
          });
        }
      }
    };
    frame = window.requestAnimationFrame(updateMovement);
    return () => window.cancelAnimationFrame(frame);
  }, [battleMode, fighterMaxX, fighterMinX, minimumCombatGap, opponent, selected]);

  useEffect(() => {
    const stopWalk = window.setInterval(() => {
      const keys = keysRef.current;
      const playerStopped = !keys.has("a") && !keys.has("d") && !keys.has("touch-left") && !keys.has("touch-right")
        && (battleMode === "local" || (!keys.has("arrowleft") && !keys.has("arrowright")));
      const cpuStopped = battleMode === "local"
        && !keys.has("arrowleft") && !keys.has("arrowright") && !keys.has("touch-cpu-left") && !keys.has("touch-cpu-right");
      if (playerStopped) {
        if (Math.abs(movementVelocityRef.current.player) < 0.09) {
          setPlayerWalkIntent("neutral");
          setGame((current) => current.playerAction === "walk" ? { ...current, playerAction: "idle" } : current);
        }
      }
      if (cpuStopped) {
        if (Math.abs(movementVelocityRef.current.cpu) < 0.09) {
          setCpuWalkIntent("neutral");
          setGame((current) => current.cpuAction === "walk" ? { ...current, cpuAction: "idle" } : current);
        }
      }
    }, 90);
    return () => window.clearInterval(stopWalk);
  }, [battleMode]);

  useEffect(() => {
    const ai = window.setInterval(() => {
      const current = gameRef.current;
      if (current.phase !== "fight" || pausedRef.current || battleMode === "local" || trainingMode) {
        cpuAiMovementDirectionRef.current = 0;
        return;
      }
      cpuAiMovementDirectionRef.current = 0;
      if (Date.now() < superArmorUntilRef.current.player) return;
      // Stunned by a super: the CPU stays dizzy and can't act.
      if (cooldownRef.current.cpu > Date.now() + 200 && current.cpuAction === "idle") return;
      if (!current.cpuAirborne && current.cpuAction !== "idle" && current.cpuAction !== "walk") return;
      const distance = Math.abs(current.playerX - current.cpuX);
      // Give a new-fighter matchup a short, real-time opening so the player can
      // establish forward/back movement before the CPU starts its first combo.
      if (newFighterMatch && Date.now() < cpuFirstAttackAfterRef.current) {
        if (distance > 18) {
          cpuAiMovementDirectionRef.current = current.cpuX > current.playerX ? -1 : 1;
          setGame((value) => value.cpuAction === "idle" ? { ...value, cpuAction: "walk" } : value);
        }
        return;
      }
      const decision = Math.random();
      // On easy the CPU backs off after a short combo instead of juggling the player.
      if (difficulty === "easy" && comboCountRef.current.cpu >= 2 && distance < 30) {
        cpuAiMovementDirectionRef.current = current.cpuX > current.playerX ? 1 : -1;
        setGame((value) => value.cpuAction === "idle" ? { ...value, cpuAction: "walk" } : value);
        return;
      }
      if (superMeterRef.current.cpu >= SUPER_MAX && distance < 42 && decision > (difficulty === "hard" ? .35 : .6)) {
        performAttack("cpu", 2);
        return;
      }
      const playerAttacking = current.playerAction === "punch" || current.playerAction === "kick" || current.playerAction === "special";
      const playerCommitted = current.playerAction === "kick" || current.playerAction === "special";
      const playerFacingCpu = current.playerX <= current.cpuX ? current.playerAttackDirection === "toward-right" : current.playerAttackDirection === "toward-left";

      const hardBias = difficulty === "hard" ? -.12 : 0;
      const guardBias = (aiStyle === "defensive" ? -.16 : aiStyle === "aggressive" ? .12 : 0) + hardBias;
      const attackBias = (aiStyle === "aggressive" ? -.16 : aiStyle === "defensive" ? .14 : 0) + hardBias;

      if (playerAttacking && playerFacingCpu && distance < (current.playerAction === "special" ? 55 : 23) && decision > (difficulty === "easy" ? .72 : .47) + guardBias) {
        if (distance < 27 && decision > (difficulty === "easy" ? .91 : .76)) {
          const escapeDirection = current.cpuX >= current.playerX ? 1 : -1;
          dash("cpu", escapeDirection, true);
          return;
        }
        guardStartedRef.current.cpu = Date.now();
        setGame((value) => ({ ...value, cpuAction: "block" }));
        later(() => {
          setGame((value) => value.cpuAction === "block" ? { ...value, cpuAction: "idle" } : value);
          if (playerCommitted && gameRef.current.phase === "fight" && Math.abs(gameRef.current.playerX - gameRef.current.cpuX) < 21) {
            performAttackRef.current("cpu", 0, Math.random() > .5 ? "punch" : "kick");
          }
        }, difficulty === "easy" ? 390 : 285);
      } else if (distance < 10 && decision < .2) {
        setGame((value) => {
          const away = value.cpuX >= value.playerX ? 1 : -1;
          return { ...value, cpuX: Math.max(fighterMinX, Math.min(fighterMaxX, value.cpuX + away * 4.2)), cpuAction: "walk" };
        });
      } else if (current.playerAirborne && distance < 22 && decision > .5) {
        performAttack("cpu", 0, "punch");
      } else if (distance > 32 && decision > (difficulty === "easy" ? .88 : .76)) {
        dash("cpu", current.cpuX > current.playerX ? -1 : 1);
      } else if (distance > 27 && decision > 0.89) {
        jump("cpu");
        if (Math.random() > 0.42) later(() => performAttack("cpu", Math.random() > 0.58 ? 1 : 0, Math.random() > 0.5 ? "kick" : "punch"), 250);
      } else if (distance < 27 && decision > (difficulty === "easy" ? .72 : .61) + attackBias) {
        performAttack("cpu", Math.random() > 0.48 ? 2 : 1, Math.random() > 0.5 ? "punch" : "kick");
      } else if (distance > 18) {
        cpuAiMovementDirectionRef.current = current.cpuX > current.playerX ? -1 : 1;
        setGame((value) => value.cpuAction === "idle" ? { ...value, cpuAction: "walk" } : value);
      } else if (decision > 0.28 + attackBias) {
        performAttack("cpu", 0, Math.random() > 0.48 ? "kick" : "punch");
      } else if (decision > 0.12) {
        setGame((value) => ({ ...value, cpuAction: "crouch" }));
        later(() => setGame((value) => value.cpuAction === "crouch" ? { ...value, cpuAction: "idle" } : value), 430);
      } else {
        guardStartedRef.current.cpu = Date.now();
        setGame((value) => ({ ...value, cpuAction: "block" }));
        later(() => setGame((value) => value.cpuAction === "block" ? { ...value, cpuAction: "idle" } : value), 520);
      }
    }, AI_TICK[difficulty] + (aiStyle === "aggressive" ? -40 : aiStyle === "defensive" ? 40 : 0));
    return () => window.clearInterval(ai);
  }, [aiStyle, battleMode, dash, difficulty, fighterMaxX, fighterMinX, jump, later, newFighterMatch, performAttack, trainingMode]);

  useEffect(() => {
    if (game.phase !== "fight") return;
    const clock = window.setInterval(() => {
      setGame((current) => {
        if (current.phase !== "fight" || pausedRef.current || trainingMode) return current;
        if (current.timer <= 1) {
          const winner = current.playerHealth === current.cpuHealth ? "draw" : current.playerHealth > current.cpuHealth ? "player" : "cpu";
          return { ...current, timer: 0, phase: "ko", winner };
        }
        return { ...current, timer: current.timer - 1 };
      });
    }, 1000);
    return () => window.clearInterval(clock);
  }, [game.phase, trainingMode]);

  useEffect(() => {
    if (game.phase !== "ko" || !game.winner) return;
    const ending = gameRef.current;
    const winnerHealth = ending.winner === "player" ? ending.playerHealth : ending.winner === "cpu" ? ending.cpuHealth : 0;
    const kind = ending.timer <= 0 ? "time" : winnerHealth >= 100 && !trainingMode ? "perfect" : "ko";
    const impactTimer = setTimeout(() => {
      setRoundEndKind(kind);
      setRoundCall(kind === "time" ? "TIME OVER" : kind === "perfect" ? "PERFECT!" : "K.O.");
      if (kind === "perfect" && ending.winner === "player") setMatchStats((stats) => ({ ...stats, perfectRounds: stats.perfectRounds + 1 }));
      haptic([70, 80, 120]);
      jingle(kind === "perfect" ? "perfect" : "ko");
    }, 0);
    const callTimer = setTimeout(() => setRoundCall("PREPARA EL SIGUIENTE ASALTO"), 1250);
    const resultTimer = setTimeout(() => {
      const roundWinner = gameRef.current.winner;
      if (!roundWinner || gameRef.current.phase !== "ko") return;
      const nextWins = { ...roundWins };
      if (roundWinner === "player" || roundWinner === "cpu") nextWins[roundWinner] += 1;
      setRoundWins(nextWins);

      const matchFinished = roundNumber >= 2 && nextWins.player !== nextWins.cpu;

      if (matchFinished) {
        const matchWinner: Side = nextWins.player > nextWins.cpu ? "player" : "cpu";
        setGame((current) => current.phase === "ko" ? { ...current, phase: "over", winner: matchWinner } : current);
        return;
      }

      const nextRound = roundNumber >= 3 ? 3 : roundNumber + 1;
      setRoundNumber(nextRound);
      launchFightRound(nextRound);
    }, 2300);
    return () => { clearTimeout(impactTimer); clearTimeout(callTimer); clearTimeout(resultTimer); };
  }, [game.phase, game.winner, haptic, jingle, launchFightRound, roundNumber, roundWins, trainingMode]);

  useEffect(() => {
    if (game.phase !== "over" || !game.winner) return;
    const winner = game.winner;
    const timeout = setTimeout(() => endRound(winner), 0);
    return () => clearTimeout(timeout);
  }, [endRound, game.phase, game.winner]);

  useEffect(() => {
    if (campaignStep !== 0 || game.phase !== "over" || game.winner !== "player" || rankingCapturedRef.current) return;
    rankingCapturedRef.current = true;
    const score = Math.round(game.playerHealth * 100 + game.timer * 25 + roundWins.player * 1000 + progress.bestCombo * 150);
    setPendingRanking({ mode: "fight", score });
  }, [campaignStep, game.phase, game.playerHealth, game.timer, game.winner, progress.bestCombo, roundWins.player]);

  useEffect(() => {
    if (campaignStep !== 1 || game.phase !== "over" || game.winner !== "player") return;
    const nextTimer = window.setTimeout(() => {
      clearTransientTimers();
      setCampaignScore((score) => score + 2500 + game.playerHealth * 20 + game.timer * 10);
      setCampaignStep(2);
      setGame({ ...freshGame(), phase: "orbs" });
    }, 3000);
    return () => window.clearTimeout(nextTimer);
  }, [campaignStep, clearTransientTimers, game.phase, game.playerHealth, game.timer, game.winner]);

  const finishCampaignOrbs = useCallback((modeScore = 0) => {
    clearTransientTimers();
    awardProgress("orbs", modeScore);
    setCampaignScore((score) => score + 5000 + modeScore);
    setCampaignStep(3);
    setGame({ ...freshGame(), phase: "platform" });
  }, [awardProgress, clearTransientTimers]);

  const finishCampaignAdventure = useCallback((modeScore = 0) => {
    clearTransientTimers();
    awardProgress("adventures", modeScore);
    setCampaignScore((score) => score + 10000 + modeScore);
    setCampaignStep(4);
    setBossHealth(CAMPAIGN_BOSS_MAX_HEALTH);
    bossRewardedRef.current = false;
    bossAttackCooldownRef.current = 0;
    bossDodgeUntilRef.current = 0;
    setBossPhase(1);
    setBossAttack(0);
    setBossWarning(false);
    setBossDodging(false);
    setBossDodgeReady(true);
    setBossPlayerHit(false);
    setUltimateCharge(50);
    setFinalFlash(0);
    setGame({ ...freshGame(), phase: "campaign-final" });
  }, [awardProgress, clearTransientTimers]);

  const retryCampaignBoss = useCallback(() => {
    clearTransientTimers();
    setBossHealth(CAMPAIGN_BOSS_MAX_HEALTH);
    bossRewardedRef.current = false;
    bossAttackCooldownRef.current = 0;
    bossDodgeUntilRef.current = 0;
    setBossPhase(1);
    setBossAttack(0);
    setBossWarning(false);
    setBossDodging(false);
    setBossDodgeReady(true);
    setBossPlayerHit(false);
    setUltimateCharge(50);
    setFinalFlash(0);
    setGame({ ...freshGame(), phase: "campaign-final" });
  }, [clearTransientTimers]);

  const hitCampaignBoss = useCallback((ultimate = false) => {
    if (campaignStep !== 4 || gameRef.current.phase !== "campaign-final" || bossHealth <= 0 || gameRef.current.playerHealth <= 0) return;
    const now = Date.now();
    if (now < bossAttackCooldownRef.current) return;
    if (ultimate && ultimateCharge < 100) {
      beep(82, 0.08, "triangle");
      return;
    }
    bossAttackCooldownRef.current = now + (ultimate ? 720 : 260);
    const damage = ultimate ? 48 : 10;
    if (ultimate) setUltimateCharge(0);
    else setUltimateCharge((charge) => Math.min(100, charge + 19));
    setFinalFlash((value) => value + 1);
    setBossHealth((health) => {
      const next = Math.max(0, health - damage);
      const ratio = next / CAMPAIGN_BOSS_MAX_HEALTH;
      const nextPhase = ratio <= .3 ? 3 : ratio <= .65 ? 2 : 1;
      setBossPhase((current) => {
        if (nextPhase > current) {
          setRoundCall(nextPhase === 3 ? "¡FASE FINAL · FURIA!" : "¡FASE 2 · MÁS RÁPIDO!");
          later(() => setRoundCall(""), 1200);
          haptic([35, 25, 55]);
        }
        return nextPhase;
      });
      if (next === 0 && !bossRewardedRef.current) {
        bossRewardedRef.current = true;
        setCampaignScore((score) => {
          const finalScore = score + 20000;
          setPendingRanking({ mode: "tournament", score: finalScore });
          setProgress((current) => {
            const nextProgress: ArcadeProgress = {
              ...current,
              fights: current.fights + 1,
              crowns: (current.crowns ?? 0) + 1,
              medals: (current.medals ?? 0) + (gameRef.current.playerHealth >= 60 ? 3 : 2),
              bestTournament: Math.max(current.bestTournament ?? 0, finalScore),
            };
            window.localStorage.setItem("benifaio-progress", JSON.stringify(nextProgress));
            return nextProgress;
          });
          return finalScore;
        });
      }
      return next;
    });
    haptic(ultimate ? [35, 25, 55] : 24);
    beep(ultimate ? 260 : 145, ultimate ? 0.28 : 0.09, ultimate ? "sawtooth" : "square");
  }, [beep, bossHealth, campaignStep, haptic, later, ultimateCharge]);

  const dodgeCampaignBoss = useCallback(() => {
    if (campaignStep !== 4 || gameRef.current.phase !== "campaign-final" || bossHealth <= 0 || gameRef.current.playerHealth <= 0) return;
    if (!bossDodgeReady) {
      beep(92, .05, "triangle");
      return;
    }
    bossDodgeUntilRef.current = Date.now() + 760;
    setBossDodging(true);
    setBossDodgeReady(false);
    haptic(18);
    beep(310, .08, "triangle");
    later(() => setBossDodging(false), 760);
    later(() => setBossDodgeReady(true), 1650);
  }, [beep, bossDodgeReady, bossHealth, campaignStep, haptic, later]);

  useEffect(() => {
    hitCampaignBossRef.current = hitCampaignBoss;
    dodgeCampaignBossRef.current = dodgeCampaignBoss;
  }, [dodgeCampaignBoss, hitCampaignBoss]);

  useEffect(() => {
    if (campaignStep !== 4 || game.phase !== "campaign-final" || bossHealth <= 0) return;
    const timer = window.setInterval(() => {
      if (document.hidden || gameRef.current.playerHealth <= 0) return;
      setBossAttack((value) => value + 1);
      setBossWarning(true);
      beep(118, .1, "sawtooth");
      later(() => {
        setBossWarning(false);
        if (gameRef.current.phase !== "campaign-final" || gameRef.current.playerHealth <= 0 || bossRewardedRef.current) return;
        if (Date.now() < bossDodgeUntilRef.current) {
          setRoundCall("¡ESQUIVA PERFECTA!");
          setUltimateCharge((charge) => Math.min(100, charge + 18));
          later(() => setRoundCall(""), 720);
          haptic([12, 18, 12]);
          beep(620, .12, "sine");
          return;
        }
        const phaseDamage = bossPhase === 3 ? 3 : bossPhase === 2 ? 1 : 0;
        setGame((current) => ({ ...current, playerHealth: Math.max(0, current.playerHealth - (difficulty === "easy" ? 4 + phaseDamage : 7 + phaseDamage)) }));
        setUltimateCharge((charge) => Math.min(100, charge + 5 + bossPhase * 2));
        setBossPlayerHit(true);
        later(() => setBossPlayerHit(false), 480);
        haptic([28, 20, 42]);
        beep(72, 0.16, "sawtooth");
      }, 560);
    }, Math.max(980, (difficulty === "easy" ? 2400 : 1750) - (bossPhase - 1) * 360));
    return () => window.clearInterval(timer);
  }, [beep, bossHealth, bossPhase, campaignStep, difficulty, game.phase, haptic, later]);

  useEffect(() => () => {
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (fightCallTimerRef.current) clearTimeout(fightCallTimerRef.current);
    if (comboTimerRef.current.player) clearTimeout(comboTimerRef.current.player);
    if (comboTimerRef.current.cpu) clearTimeout(comboTimerRef.current.cpu);
    audioRef.current?.close();
    audioRef.current = null;
  }, [clearTransientTimers]);

  useEffect(() => {
    const releaseTouchControls = () => {
      keysRef.current.clear();
      joystickPointerRef.current = { player: null, cpu: null };
      joystickDirectionRef.current = { player: 0, cpu: 0 };
      joystickJumpLatchedRef.current = { player: false, cpu: false };
      joystickCrouchRef.current = { player: false, cpu: false };
      setJoystickVector({ player: { x: 0, y: 0 }, cpu: { x: 0, y: 0 } });
      movementVelocityRef.current = { player: 0, cpu: 0 };
      movementHeldRef.current = { player: 0, cpu: 0 };
      setGuard(false);
      setCrouch(false);
      setCpuGuard(false);
      setCpuCrouch(false);
    };
    const releaseWhenHidden = () => {
      if (document.hidden) releaseTouchControls();
    };
    window.addEventListener("blur", releaseTouchControls);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("blur", releaseTouchControls);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
    };
  }, [setCpuCrouch, setCpuGuard, setCrouch, setGuard]);

  const facing = useMemo(() => {
    const playerAttacking = game.playerAction === "punch" || game.playerAction === "kick" || game.playerAction === "special";
    const cpuAttacking = game.cpuAction === "punch" || game.cpuAction === "kick" || game.cpuAction === "special";
    return {
      // Lock the facing captured at attack start. Otherwise a rival crossing
      // behind the fighter could make the pose flip while the projectile or
      // strike still travels in its original direction.
      player: playerAttacking
        ? (game.playerAttackDirection === "toward-left" ? "face-left" : "face-right")
        : (game.playerX > game.cpuX ? "face-left" : "face-right"),
      cpu: cpuAttacking
        ? (game.cpuAttackDirection === "toward-left" ? "face-left" : "face-right")
        : (game.cpuX > game.playerX ? "face-left" : "face-right"),
    };
  }, [game.cpuAction, game.cpuAttackDirection, game.cpuX, game.playerAction, game.playerAttackDirection, game.playerX]);

  const beginTouch = (event: ReactPointerEvent<HTMLElement>, action: () => void) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Some Android WebViews reject capture; still perform the pressed action.
    }
    action();
  };

  const endTouch = (event: ReactPointerEvent<HTMLElement>, action: () => void) => {
    event.preventDefault();
    action();
  };

  const resetJoystick = useCallback((side: Side) => {
    joystickPointerRef.current[side] = null;
    joystickDirectionRef.current[side] = 0;
    joystickJumpLatchedRef.current[side] = false;
    keysRef.current.delete(side === "player" ? "touch-left" : "touch-cpu-left");
    keysRef.current.delete(side === "player" ? "touch-right" : "touch-cpu-right");
    if (joystickCrouchRef.current[side]) {
      joystickCrouchRef.current[side] = false;
      if (side === "player") setCrouch(false);
      else setCpuCrouch(false);
    }
    setJoystickVector((current) => ({ ...current, [side]: { x: 0, y: 0 } }));
  }, [setCpuCrouch, setCrouch]);

  const updateJoystick = useCallback((side: Side, clientX: number, clientY: number) => {
    const element = side === "player" ? playerJoystickRef.current : cpuJoystickRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.5 - 12);
    const intent = joystickIntent(clientX - (bounds.left + bounds.width * 0.5), clientY - (bounds.top + bounds.height * 0.5), radius);
    const nextDirection: -1 | 0 | 1 = intent.left ? -1 : intent.right ? 1 : 0;
    const leftKey = side === "player" ? "touch-left" : "touch-cpu-left";
    const rightKey = side === "player" ? "touch-right" : "touch-cpu-right";

    keysRef.current.delete(leftKey);
    keysRef.current.delete(rightKey);
    if (nextDirection === -1) keysRef.current.add(leftKey);
    if (nextDirection === 1) keysRef.current.add(rightKey);
    if (nextDirection !== 0 && nextDirection !== joystickDirectionRef.current[side]) directionalPress(side, nextDirection);
    joystickDirectionRef.current[side] = nextDirection;

    if (intent.jump && !joystickJumpLatchedRef.current[side]) {
      joystickJumpLatchedRef.current[side] = true;
      jump(side);
    } else if (!intent.jump && intent.y > -0.28) {
      joystickJumpLatchedRef.current[side] = false;
    }

    if (intent.crouch !== joystickCrouchRef.current[side]) {
      joystickCrouchRef.current[side] = intent.crouch;
      if (side === "player") setCrouch(intent.crouch);
      else setCpuCrouch(intent.crouch);
    }
    setJoystickVector((current) => ({ ...current, [side]: { x: intent.x, y: intent.y } }));
  }, [directionalPress, jump, setCpuCrouch, setCrouch]);

  const beginJoystick = (side: Side, event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (joystickPointerRef.current[side] !== null) return;
    joystickPointerRef.current[side] = event.pointerId;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Android WebViews can reject capture; pointer events still work here.
    }
    updateJoystick(side, event.clientX, event.clientY);
  };

  const moveJoystick = (side: Side, event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current[side] !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(side, event.clientX, event.clientY);
  };

  const endJoystick = (side: Side, event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current[side] !== event.pointerId) return;
    event.preventDefault();
    resetJoystick(side);
  };

  const resetToSelect = useCallback(() => {
    clearTransientTimers();
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (fightCallTimerRef.current) clearTimeout(fightCallTimerRef.current);
    if (comboTimerRef.current.player) clearTimeout(comboTimerRef.current.player);
    if (comboTimerRef.current.cpu) clearTimeout(comboTimerRef.current.cpu);
    keysRef.current.clear();
    movementVelocityRef.current = { player: 0, cpu: 0 };
    movementHeldRef.current = { player: 0, cpu: 0 };
    cpuAiMovementDirectionRef.current = 0;
    directionTapRef.current = { player: { direction: 0, at: 0 }, cpu: { direction: 0, at: 0 } };
    dashCooldownRef.current = { player: 0, cpu: 0 };
    evadeUntilRef.current = { player: 0, cpu: 0 };
    queuedAttackRef.current = { player: null, cpu: null };
    attackTokenRef.current = { player: 0, cpu: 0 };
    comboCountRef.current = { player: 0, cpu: 0 };
    setCombo({ player: 0, cpu: 0 });
    setMovementGear({ player: "still", cpu: "still" });
    setPlayerWalkIntent("neutral");
    setCpuWalkIntent("neutral");
    resumeSequenceRef.current = false;
    setResumeCountdown(0);
    setPaused(false);
    setTrainingMode(false);
    setArcadeTool(null);
    setCampaignStep(0);
    setCampaignScore(0);
    setRoundNumber(1);
    setRoundWins({ player: 0, cpu: 0 });
    setFightPickup(null);
    setBossWarning(false);
    setBossDodging(false);
    setBossDodgeReady(true);
    setBossPlayerHit(false);
    bossDodgeUntilRef.current = 0;
    bossAttackCooldownRef.current = 0;
    immuneUntilRef.current = { player: 0, cpu: 0 };
    setImmuneUntil({ player: 0, cpu: 0 });
    setImmuneClock(0);
    setLobbyLocked([false, false]);
    setGame(freshGame());
    setRoundCall("");
  }, [clearTransientTimers]);
  useEffect(() => { resetToSelectRef.current = resetToSelect; }, [resetToSelect]);

  const modeDifficulty: "easy" | "normal" = difficulty === "hard" ? "normal" : difficulty;
  const winnerName = game.winner === "player" ? playerData.name : game.winner === "cpu" ? cpuData.name : "EMPATE";
  const playerVictory = (game.phase === "ko" || game.phase === "over") && game.winner === "player";
  const cpuVictory = (game.phase === "ko" || game.phase === "over") && game.winner === "cpu";

  const chooseDifficulty = (value: Difficulty) => {
    setDifficulty(value);
    window.localStorage.setItem("benifaio-difficulty", value);
  };

  const chooseAiStyle = (value: AiStyle) => {
    setAiStyle(value);
    window.localStorage.setItem("hardcore-ai-style", value);
  };

  const chooseControlSize = (value: ControlSize) => {
    setControlSize(value);
    window.localStorage.setItem("hardcore-control-size", value);
  };

  const chooseFighterStyle = (value: FighterStyle) => {
    const unlocked = value === "classic" || value === "neon" && progress.fights >= 3 || value === "gold" && (progress.crowns ?? 0) >= 1;
    if (!unlocked) return;
    setFighterStyle(value);
    window.localStorage.setItem("hardcore-fighter-style", value);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#game" aria-label="Hardcore Fighters, ir al juego">
          <span className="brand-kicker">ARCADE DE LA RIBERA</span>
          <span className="brand-name">HARDCORE <i>FIGHTERS</i></span>
          <span className="raspberry-edition-badge">{GAME_EDITION}</span>
        </a>
        <div className="topbar-actions">
          <span className="streak"><b>{streak}</b> victorias</span>
          <span className="profile-level">NIVEL {1 + progress.fights + progress.adventures * 2 + progress.orbs}</span>
          <span className="build-chip" aria-label={`Versión ${GAME_VERSION}`}>{GAME_VERSION}</span>
          <button className="sound-button" type="button" onClick={() => setMusicOn((value) => !value)} aria-pressed={musicOn}>{musicOn ? "MÚSICA ON" : "MÚSICA OFF"}</button>
          <GamepadManager />
          <ArcadeDeviceManager />
          <button className="sound-button" type="button" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>
            {soundOn ? "SONIDO ON" : "SONIDO OFF"}
          </button>
        </div>
      </header>

      <section ref={arenaRef} id="game" className={`arena phase-${game.phase} style-${fighterStyle} impact-level-${game.impactLevel} ${trainingMode ? "training-mode" : ""} ${campaignStep > 0 ? "campaign-active" : ""} ${(progress.crowns ?? 0) >= 2 ? "champion-aura" : ""} ${paused ? "game-paused" : ""} ${superFlash ? `super-active super-${superFlash.side}` : ""} ${game.playerMove || game.cpuMove ? "special-casting" : ""} ${game.phase === "orbs" ? "orb-active" : ""} ${game.phase === "platform" ? "platform-active" : ""} ${game.phase === "coop" ? "coop-active" : ""} ${game.impact ? (game.impact % 2 ? "impact-a" : "impact-b") : ""}`} aria-label={game.phase === "orbs" ? `Rompeobjetos con ${playerData.name}` : game.phase === "platform" ? `Aventura Central con ${playerData.name}` : game.phase === "coop" ? `Aventura cooperativa de ${FIGHTERS[coopPlayerOne].name} y ${FIGHTERS[coopPlayerTwo].name}` : `Combate en ${stage.name}`}>
        <div className="stage-slideshow" aria-hidden="true">
          <div
            className="stage-backdrop active"
            key={stage.id}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 7, 12, 0.01), rgba(12, 5, 3, 0.2)), url("${stage.image}")` }}
          />
        </div>
        <div className="stage-glow" aria-hidden="true" />
        <div className="stage-sign" key={stage.id} aria-hidden="true">
          <small>{stage.eyebrow}</small>
          <strong>{stage.name}</strong>
          <span>{stage.detail}</span>
        </div>

        <div className="hud" aria-label="Marcador del combate">
          <div className={`fighter-hud player-hud ${game.playerAction === "hit" || game.playerAction === "launched" ? "damaged" : ""}`}>
            <div className="hud-name"><span>1P · {Math.ceil(game.playerHealth)}%</span>{playerData.name}</div>
            <div className={`health-track ${game.playerHealth <= 25 ? "critical" : ""}`}><i className="health-trail" style={{ width: `${game.playerHealth}%` }} /><span style={{ width: `${game.playerHealth}%` }} /></div>
            <div className={`super-meter ${superMeter.player >= SUPER_MAX ? "full" : ""}`} aria-label={`Barra de super ${Math.round(superMeter.player)}%`}><span style={{ width: `${superMeter.player}%` }} /><b>{superMeter.player >= SUPER_MAX ? "¡SUPER LISTO! · L" : `SUPER ${Math.round(superMeter.player)}%`}</b></div>
            <div className="round-pips" aria-label={`${roundWins.player} rondas ganadas`}><i className={roundWins.player >= 1 ? "won" : ""} /><i className={roundWins.player >= 2 ? "won" : ""} /></div>
          </div>
          <div className="timer" aria-label={trainingMode ? "Entrenamiento sin límite" : `${game.timer} segundos`}><small>{trainingMode ? "TRAIN" : `R${roundNumber}`}</small><span>{trainingMode ? "∞" : String(game.timer).padStart(2, "0")}</span></div>
          <div className={`fighter-hud cpu-hud ${game.cpuAction === "hit" || game.cpuAction === "launched" ? "damaged" : ""}`}>
            <div className="hud-name">{cpuData.name}<span>{battleMode === "local" ? "2P" : "CPU"} · {Math.ceil(game.cpuHealth)}%</span></div>
            <div className={`health-track ${game.cpuHealth <= 25 ? "critical" : ""}`}><i className="health-trail" style={{ width: `${game.cpuHealth}%` }} /><span style={{ width: `${game.cpuHealth}%` }} /></div>
            <div className={`super-meter ${superMeter.cpu >= SUPER_MAX ? "full" : ""}`} aria-label={`Barra de super rival ${Math.round(superMeter.cpu)}%`}><span style={{ width: `${superMeter.cpu}%` }} /><b>{superMeter.cpu >= SUPER_MAX ? "¡SUPER LISTO!" : `SUPER ${Math.round(superMeter.cpu)}%`}</b></div>
            <div className="round-pips" aria-label={`${roundWins.cpu} rondas ganadas`}><i className={roundWins.cpu >= 1 ? "won" : ""} /><i className={roundWins.cpu >= 2 ? "won" : ""} /></div>
          </div>
        </div>

        <div className="ground-mark ground-mark-one" aria-hidden="true" />
        <div className="ground-mark ground-mark-two" aria-hidden="true" />

        {(game.phase === "intro" || game.phase === "fight" || game.phase === "ko") && (
          <ArcadeCrowd
            mode="fight"
            seed={stageIndex}
            phase={game.phase}
            react={game.phase === "fight" && Boolean(game.impact)}
            cue={fightPickup && game.phase === "fight" ? {
              direction: fightPickup.x < 46 ? "left" : fightPickup.x > 54 ? "right" : "center",
              label: ARCADE_PICKUPS[fightPickup.kind].label,
            } : null}
          />
        )}

        {(game.phase === "intro" || game.phase === "fight" || game.phase === "ko") && (
          <div className={`fight-referee ${game.phase === "intro" ? "start" : game.phase === "fight" ? "watch" : "ko"} ${game.phase === "fight" && game.impact ? (game.impact % 2 ? "react-a" : "react-b") : ""}`} aria-label="Árbitro del combate" role="img">
            <span className="fight-referee-art" />
            <b>{game.phase === "intro" ? "¡PREPARADOS!" : game.phase === "ko" ? "¡COMBATE TERMINADO!" : "ÁRBITRO"}</b>
          </div>
        )}

        {fightPickup && game.phase === "fight" && (
          <div className={`fight-pickup pickup-${fightPickup.kind}`} style={{ left: `${fightPickup.x}%` }} aria-label={`${ARCADE_PICKUPS[fightPickup.kind].label}, objeto de inmunidad`} role="img">
            <Image src={ARCADE_PICKUPS[fightPickup.kind].image} alt="" width={120} height={120} unoptimized />
            <b>¡INMUNIDAD!</b>
          </div>
        )}

        {game.phase !== "select" && <>
          <div ref={playerFighterRef} className={`fighter motion-rig ${selected} ${game.playerAction} ${game.playerMove ?? ""} combo-step-${game.playerAttackVariant} pose-phase-${game.playerPosePhase} ${playerVictory ? "winner-dance" : cpuVictory ? "defeated" : ""} ${game.playerAirborne ? "airborne" : ""} ${game.playerAction === "walk" ? `${playerWalkIntent} gear-${movementGear.player}` : ""} ${facing.player} ${immuneClock < immuneUntil.player ? "immune" : ""} ${stunned.player ? "stunned" : ""}`} style={{ left: `${game.playerX}%` }} aria-label={`${playerData.name}, jugador`} role="img">
            <div className="fighter-pose">
              <div className={`fighter-art ${selected} ${facing.player}`}>{!(["cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "tonimassama"] as FighterId[]).includes(selected) && <FighterWalkLayers />}</div>
              {stunned.player && <b className="stun-word">★ ¡MAREADO! ★</b>}
              {immuneClock < immuneUntil.player && <b className="immune-word">INMUNE · {Math.max(1, Math.ceil((immuneUntil.player - immuneClock) / 1000))}s</b>}
              {game.playerAirborne && (game.playerAction === "punch" || game.playerAction === "kick" || game.playerAction === "special") && <b className="air-attack-word">¡AÉREO!</b>}
              {(game.playerAction === "hit" || game.playerAction === "launched" || game.playerAction === "knockdown") && <b className="hit-word">{game.playerAction === "launched" ? "¡VUELA!" : game.playerAction === "knockdown" ? "¡AL SUELO!" : "CRASH!"}</b>}
            </div>
            <span className="fighter-shadow" />
          </div>
          <div ref={cpuFighterRef} className={`fighter motion-rig ${opponent} cpu ${battleMode === "cpu" ? "cpu-ai" : ""} ${game.cpuAction} ${game.cpuMove ?? ""} combo-step-${game.cpuAttackVariant} pose-phase-${game.cpuPosePhase} ${cpuVictory ? "winner-dance" : playerVictory ? "defeated" : ""} ${game.cpuAirborne ? "airborne" : ""} ${game.cpuAction === "walk" ? `${cpuWalkIntent} gear-${movementGear.cpu}` : ""} ${facing.cpu} ${immuneClock < immuneUntil.cpu ? "immune" : ""} ${stunned.cpu ? "stunned" : ""}`} style={{ left: `${game.cpuX}%` }} aria-label={`${cpuData.name}, rival`} role="img">
            <div className="fighter-pose">
              <div className={`fighter-art ${opponent} ${facing.cpu}`}>{!(["cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "tonimassama"] as FighterId[]).includes(opponent) && <FighterWalkLayers />}</div>
              {stunned.cpu && <b className="stun-word">★ ¡MAREADO! ★</b>}
              {immuneClock < immuneUntil.cpu && <b className="immune-word">INMUNE · {Math.max(1, Math.ceil((immuneUntil.cpu - immuneClock) / 1000))}s</b>}
              {game.cpuAirborne && (game.cpuAction === "punch" || game.cpuAction === "kick" || game.cpuAction === "special") && <b className="air-attack-word">¡AÉREO!</b>}
              {(game.cpuAction === "hit" || game.cpuAction === "launched" || game.cpuAction === "knockdown") && <b className="hit-word">{game.cpuAction === "launched" ? "¡VUELA!" : game.cpuAction === "knockdown" ? "¡AL SUELO!" : "BAM!"}</b>}
            </div>
            <span className="fighter-shadow" />
          </div>
        </>}

        {game.playerMove && (
          <SpecialEffect
            move={game.playerMove}
            side="player"
            origin={game.playerX}
            target={game.cpuX}
            arenaWidth={arenaWidth}
            direction={game.playerAttackDirection}
            airborne={game.playerAirborne}
            color={playerData.color}
            heavy={game.playerMove === specialFor(selected, 2)}
          />
        )}
        {game.cpuMove && (
          <SpecialEffect
            move={game.cpuMove}
            side="cpu"
            origin={game.cpuX}
            target={game.playerX}
            arenaWidth={arenaWidth}
            direction={game.cpuAttackDirection}
            airborne={game.cpuAirborne}
            color={cpuData.color}
            heavy={game.cpuMove === specialFor(opponent, 2)}
          />
        )}

        {combo.player >= 2 && <div className="combo-callout combo-player"><strong>{combo.player} GOLPES</strong><span>COMBO</span></div>}
        {combo.cpu >= 2 && <div className="combo-callout combo-cpu"><strong>{combo.cpu} GOLPES</strong><span>{battleMode === "local" ? "COMBO P2" : "COMBO RIVAL"}</span></div>}
        {(game.phase === "fight" || game.phase === "ko") && damagePops.map((pop) => (
          <b key={pop.id} className={`damage-pop pop-${pop.kind} pop-${pop.side}`} style={{ left: `${pop.x}%` }} aria-hidden="true">{pop.kind === "guard" ? `-${pop.amount} ◆` : `-${pop.amount}`}</b>
        ))}
        {superFx && <SuperEffect key={superFx.id} fx={superFx} />}
        {superFlash && (
          <div key={superFlash.id} className={`super-cinematic super-${superFlash.side}`} aria-live="assertive">
            <span className={`super-cinematic-portrait portrait ${superFlash.fighter}`} />
            <div className="super-cinematic-copy"><small>{FIGHTERS[superFlash.fighter].name}</small><strong>SUPER<br />HARDCORE</strong><em>{SUPER_MOVES[superFlash.fighter].name}</em></div>
          </div>
        )}
        {fightCall && <div key={fightCall.id} className={`fight-technique-call technique-${fightCall.side}`} aria-live="polite">{fightCall.text}</div>}
        {game.phase === "fight" && game.impact > 0 && (
          <div
            key={game.impact}
            className={`impact-burst ${(game.playerAction === "hit" || game.playerAction === "launched" || game.playerAction === "knockdown" || game.playerAction === "block") ? "target-player" : "target-cpu"} ${(game.playerAction === "block" || game.cpuAction === "block") ? "guard-burst" : "hit-burst"}`}
            style={{
              left: `${(game.playerAction === "hit" || game.playerAction === "launched" || game.playerAction === "knockdown" || game.playerAction === "block") ? game.playerX : game.cpuX}%`,
              top: `${(game.playerAirborne || game.cpuAirborne) ? 34 : 42}%`,
            }}
            aria-hidden="true"
          >
            <span />
            <b>{(game.playerAction === "block" || game.cpuAction === "block") ? "CLANG" : "POW"}</b>
          </div>
        )}

        {game.phase === "select" && (
          <div className="modal-layer select-screen lobby-v2168"
            data-p1-locked={lobbyLocked[0]} data-p2-locked={lobbyLocked[1]}
            data-all-ready={lobbyLocked[0] && (battleMode === "cpu" || lobbyLocked[1])}>
            <header className="lobby-heading">
              <div className="lobby-heading-copy">
                <h1>ELIGE TU LUCHADOR</h1>
                <span className="lobby-eyebrow">{FIGHTER_ORDER.length} LUCHADORES DISPONIBLES</span>
              </div>
              <div className="lobby-prison-mark">
                <Image className="prison-logo" src="/assets/new-fighters/prison-logo.jpg" width={220} height={85} alt="PRISON" unoptimized />
                <span>LUCHA · SUPERVIVENCIA · SIN LÍMITES</span>
              </div>
            </header>
            <div className="lobby-roster">
              <div className="roster-heading"><span>SELECCIONA TU PERSONAJE</span><b>P1 / P2 · ELIGE EN LAS TARJETAS</b></div>
              <div className="lobby-slots" aria-label="Jugador que elige con la pantalla">
                <button type="button" aria-pressed={touchSlot === 0} onClick={() => setTouchSlot(0)}>ELEGIR P1 · {FIGHTERS[selected].name} {lobbyLocked[0] ? "✓ LISTO" : "ELIGIENDO"}</button>
                {battleMode === "local"
                  ? <button type="button" aria-pressed={touchSlot === 1} onClick={() => setTouchSlot(1)}>ELEGIR P2 · {FIGHTERS[localOpponent].name} {lobbyLocked[1] ? "✓ LISTO" : "ELIGIENDO"}</button>
                  : <button type="button" aria-pressed={touchSlot === 1} onClick={() => setTouchSlot(1)}>RIVAL CPU · {FIGHTERS[opponent].name}</button>}
                <button type="button" className="random-rival-button" onClick={() => {
                  const pool = FIGHTER_ORDER.filter((fighter) => fighter !== selected);
                  setLocalOpponent(pool[Math.floor(Math.random() * pool.length)]);
                }}>🎲 RIVAL ALEATORIO</button>
              </div>
              <div className="character-cards" role="group" aria-label="Selecciona en las imágenes">
                {FIGHTER_ORDER.map(fighter => (
                  <button type="button" key={fighter} data-fighter={fighter}
                    className={`character-card ${fighter} ${selected === fighter ? "selected-p1" : ""} ${opponent === fighter ? "selected-p2" : ""}`}
                    aria-label={`Elegir ${FIGHTERS[fighter].name} para P${touchSlot + 1}`}
                    aria-pressed={(touchSlot === 0 ? selected : opponent) === fighter}
                    onClick={() => {
                      (touchSlot === 0 ? setSelected : setLocalOpponent)(fighter);
                      setLobbyLocked(current => current.map((value, index) => index === touchSlot ? false : value) as [boolean, boolean]);
                    }}>
                    <span className={`portrait ${fighter}`} />
                    <b>{FIGHTERS[fighter].name}</b>
                    <span className="card-player-tags">
                      {selected === fighter && <em className="tag-p1">P1 {lobbyLocked[0] ? "✓" : ""}</em>}
                      {opponent === fighter && <em className="tag-p2">{battleMode === "local" ? `P2 ${lobbyLocked[1] ? "✓" : ""}` : "CPU"}</em>}
                    </span>
                  </button>
                ))}
              </div>
              {(() => {
                const shown = touchSlot === 1 ? opponent : selected;
                const profile = FIGHTER_PROFILES[shown];
                const stats: [string, number][] = [["POTENCIA", profile.power], ["VELOCIDAD", profile.speed], ["DEFENSA", profile.defense]];
                return (
                  <div className={`fighter-dossier ${shown}`} style={{ "--dossier-color": FIGHTERS[shown].color } as CSSProperties} aria-live="polite">
                    <div className="dossier-head">
                      <small>{touchSlot === 1 ? (battleMode === "local" ? "JUGADOR 2" : "RIVAL CPU") : "JUGADOR 1"} · {profile.archetype}</small>
                      <strong>{FIGHTERS[shown].name}</strong>
                      <em>{FIGHTERS[shown].title}</em>
                      <p>{profile.bio}</p>
                    </div>
                    <div className="dossier-stats">
                      {stats.map(([label, value]) => (
                        <div key={label}><span>{label}</span><i>{Array.from({ length: 5 }, (_, index) => <b key={index} className={index < value ? "on" : ""} />)}</i></div>
                      ))}
                    </div>
                    <div className="dossier-moves">
                      <span><kbd>K</kbd>{FIGHTERS[shown].specialOne}</span>
                      <span><kbd>L</kbd>{FIGHTERS[shown].specialTwo}</span>
                      <span className="dossier-super"><kbd>★</kbd>{SUPER_MOVES[shown].name} · {SUPER_MOVES[shown].description}</span>
                      <span className="dossier-vs">{FIGHTERS[selected].name} <b>VS</b> {FIGHTERS[opponent].name}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="lobby-help" aria-live="polite">
                <strong>{lobbyLocked[0] && (battleMode === "cpu" || lobbyLocked[1]) ? "2 · ELIGE EL MODO DE JUEGO" : "1 · CONFIRMA TU PERSONAJE"}</strong>
                <span>Los dos jugadores eligen en las imágenes: P1 naranja · P2 azul.</span>
                <span>Cruceta: mover · ✕: confirmar · ○: cambiar personaje · SHARE: mapear</span>
                <button type="button" onClick={() => { setLobbyLocked([true, true]); document.querySelector<HTMLButtonElement>(".mode-start-actions [data-gamepad-default]")?.focus(); }}>IR A LOS JUEGOS →</button>
              </div>
            </div>
            <div className="lobby-games">
              <h2>MODOS DE JUEGO <small>ELIGE CÓMO QUIERES JUGAR</small></h2>
              <div className="mode-start-actions">
                <button className="fight-button" type="button" onClick={startRound} disabled={!fightReady} data-gamepad-default="true">MODO LUCHA <span>↗</span></button>
                <button className="fight-button coop-mode-button" type="button" onClick={startCoopMode} disabled={!fightersReady}>AVENTURA COOPERATIVA <span>∞</span></button>
                <button className="fight-button orb-mode-button" type="button" onClick={startOrbMode} disabled={!fightersReady}>MODO ROMPEOBJETOS <span>◆</span></button>
                <button className="fight-button platform-mode-button" type="button" onClick={startPlatformMode} disabled={!fightersReady}>AVENTURA CENTRAL <span>★</span></button>
                <button className="fight-button prison-slug-mode-button" type="button" onClick={startPrisonSlugMode} disabled={!fightersReady}>PRISON SLUG <span>▶</span></button>
                <button className="fight-button campaign-mode-button" type="button" onClick={startCampaign} disabled={!fightReady}>TORNEO DE LA RIBERA <span>♛</span></button>
                <button className="fight-button training-menu-button" type="button" onClick={startTraining} disabled={!fightReady}>ENTRENAMIENTO <span>∞</span></button>
                <button className="fight-button ranking-menu-button" type="button" onClick={() => setRankingOpen(true)}>RANKING MUNDIAL</button>
                <button className="fight-button arcade-tool-button" type="button" onClick={() => setArcadeTool("moves")}>MOVIMIENTOS</button>
                <button className="fight-button arcade-tool-button" type="button" onClick={() => setArcadeTool("profile")}>PERFIL Y PREMIOS</button>
              </div>
              <div className="match-settings-heading"><span>⚙</span><div><b>CONFIGURACIÓN DE PARTIDA</b><small>AJUSTA TU COMBATE</small></div></div>
              <button className="control-size-button" type="button" onClick={() => setArcadeTool("controls")}><span>▣</span>TAMAÑO DE BOTONES</button>
              <div className="battle-mode-picker" aria-label="Tipo de combate">
                <button type="button" className={battleMode === "cpu" ? "active" : ""} onClick={() => { setBattleMode("cpu"); setTouchSlot(0); }}>1 JUGADOR + IA</button>
                <button type="button" className={battleMode === "local" ? "active" : ""} onClick={() => setBattleMode("local")}>2 JUGADORES</button>
              </div>
              <div className="difficulty-picker" aria-label="Dificultad"><span>DIFICULTAD</span>
                <button type="button" className={difficulty === "easy" ? "active" : ""} onClick={() => chooseDifficulty("easy")}>FÁCIL</button>
                <button type="button" className={difficulty === "normal" ? "active" : ""} onClick={() => chooseDifficulty("normal")}>NORMAL</button>
                <button type="button" className={difficulty === "hard" ? "active" : ""} onClick={() => chooseDifficulty("hard")}>DIFÍCIL</button>
              </div>
              <div className="ai-style-picker" aria-label="Estilo CPU"><span>CPU</span>
                {(["balanced", "aggressive", "defensive"] as const).map((style, index) => <button key={style} type="button" className={aiStyle === style ? "active" : ""} onClick={() => chooseAiStyle(style)}>{["EQUILIBRADA", "AGRESIVA", "DEFENSIVA"][index]}</button>)}
              </div>
              <small className="lobby-status">{fightReady ? `${gamepadCount} MANDOS · Lucha y cooperativo: hasta 2 jugadores` : "Preparando imágenes de los luchadores…"}</small>
            </div>
            <div className="lobby-footer-bar" aria-label="Controles del selector">
              <span>✕ CONFIRMAR / SELECCIONAR</span><span>○ ATRÁS</span><span>□ CAMBIAR LUCHADOR</span><span>← → NAVEGAR</span>
              <small>{GAME_TITLE} · {GAME_VERSION} · {GAME_EDITION}</small>
            </div>
          </div>
        )}

        {game.phase === "select" && arcadeTool && (
          <div className="arcade-tools-overlay" role="dialog" aria-modal="true" aria-label={arcadeTool === "moves" ? "Guía de movimientos" : arcadeTool === "profile" ? "Perfil y premios" : "Tamaño de controles"}>
            <div className="arcade-tools-panel">
              {arcadeTool === "moves" && <>
                <small>GUÍA DE {playerData.name}</small>
                <h2>MOVIMIENTOS</h2>
                <div className="move-guide-grid">
                  <b>ANDAR</b><span>Cruceta o joystick</span>
                  <b>SALTAR</b><span>Botón configurado como SALTO</span>
                  <b>PUÑO / PATADA</b><span>Ataques rápidos a corta distancia</span>
                  <b>{playerData.specialOne}</b><span>Sin recarga · ESPECIAL 1</span>
                  <b>{playerData.specialTwo}</b><span>Sin recarga · ESPECIAL 2</span>
                  <b>SUPER · {SUPER_MOVES[selected].name}</b><span>{SUPER_MOVES[selected].description}. Llena la barra SUPER golpeando y recibiendo golpes; con la barra llena, ESPECIAL 2 lo lanza</span>
                  <b>ESQUIVA</b><span>Mantén bloqueo y pulsa una dirección</span>
                  <b>BLOQUEO PERFECTO</b><span>Bloquea justo antes del impacto: no recibes daño y cargas mucha barra</span>
                  <b>CONTRAATAQUE</b><span>Golpea al rival mientras ataca para hacer daño extra</span>
                </div>
              </>}
              {arcadeTool === "profile" && <>
                <small>PERFIL PERSONAL</small>
                <h2>NIVEL {1 + progress.fights + progress.adventures * 2 + progress.orbs}</h2>
                <div className="profile-stats-grid">
                  <span><b>{progress.fights}</b> VICTORIAS</span><span><b>{progress.losses ?? 0}</b> DERROTAS</span><span><b>×{progress.bestCombo}</b> MEJOR COMBO</span><span><b>{progress.trainingSessions ?? 0}</b> ENTRENAMIENTOS</span>
                  {FIGHTER_ORDER.map((fighter) => <span key={fighter}><b>{progress.winsByFighter?.[fighter] ?? 0}</b> {FIGHTERS[fighter].name}</span>)}
                </div>
                <h3>ESTILO DESBLOQUEABLE</h3>
                <div className="style-picker">
                  <button type="button" className={fighterStyle === "classic" ? "active" : ""} onClick={() => chooseFighterStyle("classic")}>CLÁSICO</button>
                  <button type="button" disabled={progress.fights < 3} className={fighterStyle === "neon" ? "active" : ""} onClick={() => chooseFighterStyle("neon")}>NEÓN · {progress.fights >= 3 ? "LISTO" : "3 VICTORIAS"}</button>
                  <button type="button" disabled={(progress.crowns ?? 0) < 1} className={fighterStyle === "gold" ? "active" : ""} onClick={() => chooseFighterStyle("gold")}>ORO · {(progress.crowns ?? 0) >= 1 ? "LISTO" : "1 CORONA"}</button>
                </div>
              </>}
              {arcadeTool === "controls" && <>
                <small>IPAD + PROYECTOR</small>
                <h2>TAMAÑO DE BOTONES</h2>
                <p>Los botones de dirección y ataque mantienen más separación para evitar pulsaciones equivocadas.</p>
                <div className="control-size-picker">
                  <button type="button" className={controlSize === "large" ? "active" : ""} onClick={() => chooseControlSize("large")}>GRANDES</button>
                  <button type="button" className={controlSize === "xl" ? "active" : ""} onClick={() => chooseControlSize("xl")}>EXTRAGRANDES</button>
                </div>
              </>}
              <button className="secondary-button arcade-tools-close" type="button" onClick={() => setArcadeTool(null)} data-gamepad-default="true">VOLVER</button>
            </div>
          </div>
        )}

        {trainingMode && game.phase === "fight" && <div className="training-badge">ENTRENAMIENTO · RIVAL QUIETO · VIDA INFINITA</div>}

        {campaignStep > 0 && (
          <div className="campaign-ribbon" aria-live="polite">
            <b>TORNEO DE LA RIBERA</b>
            <span className={campaignStep >= 1 ? "done" : ""}>1 LUCHA</span><i>›</i>
            <span className={campaignStep >= 2 ? "done" : ""}>2 OBJETOS</span><i>›</i>
            <span className={campaignStep >= 3 ? "done" : ""}>3 AVENTURA</span><i>›</i>
            <span className={campaignStep >= 4 ? "done" : ""}>4 JEFE</span>
            <strong>{String(campaignScore).padStart(6, "0")} PTS</strong>
          </div>
        )}

        {game.phase === "orbs" && (
          <OrbMode fighter={selected} fighterName={playerData.name} soundOn={soundOn} difficulty={modeDifficulty} campaign={campaignStep === 2} onComplete={campaignStep === 2 ? finishCampaignOrbs : (modeScore) => { const score = modeScore ?? 0; awardProgress("orbs", score); setPendingRanking({ mode: "orbs", score }); }} onExit={resetToSelect} />
        )}

        {game.phase === "platform" && (
          <PlatformMode fighter={selected} fighterName={playerData.name} soundOn={soundOn} difficulty={modeDifficulty} campaign={campaignStep === 3} onComplete={campaignStep === 3 ? finishCampaignAdventure : (modeScore) => { const score = modeScore ?? 0; awardProgress("adventures", score); setPendingRanking({ mode: "adventure", score }); }} onExit={resetToSelect} />
        )}

        {game.phase === "coop" && (
          <CoopMode playerOne={coopPlayerOne} playerTwo={coopPlayerTwo} aiPlayerTwo={coopHumanPlayers === 1} soundOn={soundOn} difficulty={modeDifficulty} onComplete={(modeScore) => { const score = modeScore ?? 0; awardProgress("adventures", score); setPendingRanking({ mode: "coop", score }); }} onExit={resetToSelect} />
        )}

        {game.phase === "prison-slug" && <PrisonSlugMode fighter={selected} onExit={resetToSelect} />}

        {game.phase === "campaign-final" && (
          <div className={`campaign-final boss-phase-${bossPhase} ending-${selected} ${bossHealth <= 0 ? "won" : ""} ${bossWarning ? "boss-warning" : ""} flash-${finalFlash % 2}`} aria-label="Jefe final del Torneo de La Ribera">
            <ArcadeCrowd mode="fight" seed={stageIndex + bossPhase} phase={bossHealth <= 0 ? "won" : "playing"} react={bossWarning} />
            <div className="final-player-hud"><small>{playerData.name}</small><div><span style={{ width: `${game.playerHealth}%` }} /></div><b>{game.playerHealth}%</b></div>
            <div className="final-hud"><small>JEFE FINAL · FASE {bossPhase}/3 · LA BESTIA DEL RUIDO</small><div><span style={{ width: `${bossHealth / CAMPAIGN_BOSS_MAX_HEALTH * 100}%` }} /></div><b>{bossHealth > 0 ? `${bossHealth}/${CAMPAIGN_BOSS_MAX_HEALTH}` : "DERROTADO"}</b></div>
            <div className={`final-boss attack-${bossAttack % 3}`}>
              <span className="boss-core">♛</span><i /><i /><i />
              {Array.from({ length: 3 }, (_, index) => <span className={`final-boss-bottle bottle-${index + 1}`} key={index}><Image src="/assets/platform-water-bottle-enemy.webp" alt="" width={72} height={136} unoptimized /></span>)}
            </div>
            <div className={`final-hero ${selected} ${bossDodging ? "dodging" : ""} ${bossPlayerHit ? "damaged" : ""}`}>
              <span className="dance-floor-ring" /><span className={`result-dancer-art ${selected}`} />
              {bossHealth <= 0 && <><i className="dance-note dance-note-one">♪</i><i className="dance-note dance-note-two">♫</i><i className="dance-note dance-note-three">★</i><i className="dance-note dance-note-four">♥</i><i className="dance-note dance-note-five">✦</i></>}
            </div>
            {bossHealth > 0 && game.playerHealth > 0 ? (
              <>
                <div className="final-copy"><small>ÚLTIMA PRUEBA</small><h2>¡ROMPE EL<br />ALTAVOZ!</h2><p>Esquiva las botellas cuando aparezca la alerta y contraataca.</p></div>
                <div className="final-controls"><button type="button" className={`dodge ${bossDodgeReady ? "ready" : "charging"}`} onPointerDown={(event) => beginTouch(event, dodgeCampaignBoss)}>S<small>{bossDodgeReady ? "ESQUIVA" : "RECARGA"}</small></button><button type="button" onPointerDown={(event) => beginTouch(event, () => hitCampaignBoss(false))}>J<small>GOLPE</small></button><button type="button" className={`ultimate ${ultimateCharge < 100 ? "charging" : "ready"}`} onPointerDown={(event) => beginTouch(event, () => hitCampaignBoss(true))}>K<small>{ultimateCharge < 100 ? `CARGA ${ultimateCharge}%` : "¡DEFINITIVO!"}</small></button></div>
              </>
            ) : bossHealth <= 0 ? (
              <div className="campaign-champion" aria-live="assertive"><small>TORNEO DE LA RIBERA COMPLETADO · +1 CORONA</small><h2>{FIGHTER_PROFILES[selected].endingTitle[0]}<br />{FIGHTER_PROFILES[selected].endingTitle[1]}</h2><p>{FIGHTER_PROFILES[selected].endingText}</p><strong>{String(campaignScore).padStart(6, "0")} PUNTOS · {game.playerHealth >= 60 ? "★★★" : "★★"}</strong><button type="button" className="fight-button" onClick={resetToSelect}>VOLVER AL MENÚ</button></div>
            ) : (
              <div className="campaign-champion lost" aria-live="assertive"><small>LA BESTIA SIGUE EN PIE</small><h2>¡INTÉNTALO<br />DE NUEVO!</h2><p>Has llegado hasta el jefe final con {campaignScore} puntos.</p><button type="button" className="fight-button" onClick={retryCampaignBoss}>REPETIR JEFE</button><button type="button" className="secondary-button" onClick={resetToSelect}>VOLVER AL MENÚ</button></div>
            )}
          </div>
        )}

        {((game.phase === "intro" || game.phase === "ko") || (game.phase === "campaign-final" && roundCall)) && <div key={roundCall} className={`round-call ${game.phase === "ko" ? `ko-call end-${roundEndKind}` : ""} ${game.phase === "ko" && roundCall === "PREPARA EL SIGUIENTE ASALTO" ? "waiting-call" : ""} ${game.phase === "campaign-final" ? "boss-phase-call" : ""}`} aria-live="assertive">{roundCall}</div>}

        {paused && <div className={`pause-layer ${resumeCountdown ? "resuming" : ""}`}><ArcadeCrowd mode="fight" seed={stageIndex + roundNumber} phase="paused" /><span>{resumeCountdown || "PAUSA"}</span><small>{resumeCountdown ? "PREPÁRATE · EL COMBATE CONTINÚA" : "PULSA ESC, P O START PARA CONTINUAR"}</small>{!resumeCountdown && <><button type="button" className="fight-button" onClick={resumeGame} data-gamepad-default="true">CONTINUAR</button><button type="button" className="secondary-button" onClick={resetToSelect}>VOLVER AL MENÚ</button></>}</div>}

        {game.phase === "fight" && <button className="pause-button" type="button" onClick={() => { resumeSequenceRef.current = false; setResumeCountdown(0); setPaused(true); }}>Ⅱ <small>PAUSA</small></button>}

        {game.phase === "over" && (
          <div className="modal-layer result-screen" aria-live="assertive">
            <ArcadeCrowd mode="fight" seed={stageIndex + roundNumber} phase="won" react />
            {game.winner !== "draw" && (
              <div className={`result-celebration referee-${game.winner}`}>
                <div className={`result-dancer ${game.winner === "player" ? selected : opponent}`} aria-label={`${winnerName} bailando`} role="img">
                  <span className="dance-floor-ring" /><span className={`result-dancer-art ${game.winner === "player" ? selected : opponent}`} />
                  <i className="dance-note dance-note-one">♪</i><i className="dance-note dance-note-two">♫</i><i className="dance-note dance-note-three">★</i><i className="dance-note dance-note-four">♥</i><i className="dance-note dance-note-five">✦</i>
                </div>
                <div className={`result-dancer compact result-loser ${game.winner === "player" ? opponent : selected}`} aria-label={`${game.winner === "player" ? cpuData.name : playerData.name}, luchador derrotado`} role="img">
                  <span className={`result-dancer-art ${game.winner === "player" ? opponent : selected}`} />
                </div>
                <div className="result-referee-celebration" aria-label={`El árbitro celebrando con ${winnerName}`} role="img">
                  <span className="result-referee-art" />
                  <b>¡CAMPEÓN!</b>
                  <i>★</i><i>♫</i>
                </div>
              </div>
            )}
            <span className="eyebrow">RESULTADO FINAL · {roundWins.player}–{roundWins.cpu}</span>
            <h2>{game.winner === "draw" ? "EMPATE" : `${winnerName} GANA`}</h2>
            <p>{game.winner === "player" ? "¡Central ruge contigo!" : game.winner === "draw" ? "Central pide la revancha." : battleMode === "local" ? "¡El jugador 2 se lleva esta ronda!" : "La máquina se lleva esta ronda."}</p>
            {game.winner !== "draw" && game.winner && <blockquote className="win-quote">«{pickWinQuote(game.winner === "player" ? selected : opponent, roundWins.player * 7 + roundWins.cpu * 3 + matchStats.hits)}»<cite>— {winnerName}</cite></blockquote>}
            <div className="match-stats" aria-label="Estadísticas del combate">
              <span><b>{matchStats.hits}</b>GOLPES</span>
              <span><b>{matchStats.damage}</b>DAÑO</span>
              <span><b>×{matchStats.maxCombo}</b>MEJOR COMBO</span>
              <span><b>{matchStats.specials}</b>ESPECIALES</span>
              <span><b>{matchStats.supers}</b>SUPERS</span>
              <span><b>{matchStats.perfectGuards}</b>BLOQ. PERFECTOS</span>
              {matchStats.perfectRounds > 0 && <span className="perfect-stat"><b>{matchStats.perfectRounds}</b>PERFECT</span>}
            </div>
            <div className="result-actions">
              <button className="fight-button" type="button" onClick={startRound}>REVANCHA</button>
              <button className="secondary-button" type="button" onClick={resetToSelect}>CAMBIAR LUCHADOR</button>
            </div>
          </div>
        )}

        {(rankingOpen || pendingRanking) && (
          <Leaderboard
            initialMode={pendingRanking?.mode ?? "fight"}
            score={pendingRanking?.score}
            fighter={selected}
            onClose={() => { setRankingOpen(false); setPendingRanking(null); }}
          />
        )}

        {(game.phase === "fight" || game.phase === "intro" || game.phase === "ko") && (
          <div className={`touch-controls ${game.phase === "fight" ? "" : "touch-controls-waiting"}`} aria-label={game.phase === "fight" ? "Controles táctiles" : "Controles táctiles · espera al siguiente asalto"} aria-disabled={game.phase !== "fight"}>
            <div className="touch-joystick-wrap">
              <div ref={playerJoystickRef} className="touch-joystick" role="group" aria-label="Joystick: mover, saltar y agacharse" onPointerDown={(event) => beginJoystick("player", event)} onPointerMove={(event) => moveJoystick("player", event)} onPointerUp={(event) => endJoystick("player", event)} onPointerCancel={(event) => endJoystick("player", event)} onLostPointerCapture={() => resetJoystick("player")}>
                <span className="touch-joystick-arrows" aria-hidden="true"><i className="up">↑</i><i className="left">←</i><i className="right">→</i><i className="down">↓</i></span>
                <span className="touch-joystick-stick" style={{ transform: `translate(${joystickVector.player.x * 31}px, ${joystickVector.player.y * 31}px)` }} aria-hidden="true" />
              </div>
              <small className="touch-joystick-label">MOVER · ↑ SALTO · ↓ AGACHAR</small>
            </div>
            <div className="touch-actions touch-actions-redesign">
              <button type="button" className="touch-block" onPointerDown={(event) => beginTouch(event, () => setGuard(true))} onPointerUp={(event) => endTouch(event, () => setGuard(false))} onPointerCancel={(event) => endTouch(event, () => setGuard(false))} onLostPointerCapture={() => setGuard(false)} aria-label="Bloquear">◆<small>BLOQUEO</small></button>
              <button type="button" className="touch-hit" onPointerDown={(event) => beginTouch(event, () => performAttack("player", 0, "punch"))} aria-label="Dar un puñetazo"><span>J</span><small>PUÑO</small></button>
              <button type="button" className="touch-kick" onPointerDown={(event) => beginTouch(event, () => performAttack("player", 0, "kick"))} aria-label="Dar una patada"><span>H</span><small>PATADA</small></button>
              <button type="button" className="touch-special-one" onPointerDown={(event) => beginTouch(event, () => performAttack("player", 1))} aria-label={playerData.specialOne}><span>K</span><small>{SHORT_SPECIALS[selected][0]}</small></button>
              <button type="button" className={`touch-special-two ${superMeter.player >= SUPER_MAX ? "super-ready" : ""}`} onPointerDown={(event) => beginTouch(event, () => performAttack("player", 2))} aria-label={superMeter.player >= SUPER_MAX ? `Super de ${playerData.name}` : playerData.specialTwo}><span>L</span><small>{superMeter.player >= SUPER_MAX ? "¡SUPER!" : SHORT_SPECIALS[selected][1]}</small></button>
            </div>
          </div>
        )}

        {(game.phase === "fight" || game.phase === "intro" || game.phase === "ko") && battleMode === "local" && (
          <div className={`touch-controls touch-controls-p2 ${game.phase === "fight" ? "" : "touch-controls-waiting"}`} aria-label={game.phase === "fight" ? "Controles táctiles del jugador dos" : "Controles táctiles del jugador dos · espera al siguiente asalto"} aria-disabled={game.phase !== "fight"}>
            <div className="touch-joystick-wrap">
              <div ref={cpuJoystickRef} className="touch-joystick" role="group" aria-label="Joystick del jugador dos" onPointerDown={(event) => beginJoystick("cpu", event)} onPointerMove={(event) => moveJoystick("cpu", event)} onPointerUp={(event) => endJoystick("cpu", event)} onPointerCancel={(event) => endJoystick("cpu", event)} onLostPointerCapture={() => resetJoystick("cpu")}>
                <span className="touch-joystick-arrows" aria-hidden="true"><i className="up">↑</i><i className="left">←</i><i className="right">→</i><i className="down">↓</i></span>
                <span className="touch-joystick-stick" style={{ transform: `translate(${joystickVector.cpu.x * 31}px, ${joystickVector.cpu.y * 31}px)` }} aria-hidden="true" />
              </div>
              <small className="touch-joystick-label">P2 · MOVER / SALTAR / AGACHAR</small>
            </div>
            <div className="touch-actions touch-actions-p2 touch-actions-redesign">
              <button type="button" className="touch-block" onPointerDown={(event) => beginTouch(event, () => setCpuGuard(true))} onPointerUp={(event) => endTouch(event, () => setCpuGuard(false))} onPointerCancel={(event) => endTouch(event, () => setCpuGuard(false))} onLostPointerCapture={() => setCpuGuard(false)}>◆<small>BLOQUEO</small></button>
              <button type="button" className="touch-hit" onPointerDown={(event) => beginTouch(event, () => performAttack("cpu", 0, "punch"))}><span>1</span><small>PUÑO</small></button>
              <button type="button" className="touch-kick" onPointerDown={(event) => beginTouch(event, () => performAttack("cpu", 0, "kick"))}><span>2</span><small>PATADA</small></button>
              <button type="button" className="touch-special-one" onPointerDown={(event) => beginTouch(event, () => performAttack("cpu", 1))}><span>3</span><small>{SHORT_SPECIALS[opponent][0]}</small></button>
              <button type="button" className={`touch-special-two ${superMeter.cpu >= SUPER_MAX ? "super-ready" : ""}`} onPointerDown={(event) => beginTouch(event, () => performAttack("cpu", 2))}><span>4</span><small>{superMeter.cpu >= SUPER_MAX ? "¡SUPER!" : SHORT_SPECIALS[opponent][1]}</small></button>
            </div>
          </div>
        )}
      </section>

      <section className="below-arena" aria-label="Escenarios y controles">
        <div className="stage-selector">
          <span className="section-label">FONDOS AUTOMÁTICOS</span>
          <span className="rotation-note">CAMBIO CADA 7 SEGUNDOS</span>
          <div className="scene-dots" role="tablist" aria-label="Fondos de Central y La Fábrica">
            {STAGES.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={stageIndex === index ? "active" : ""}
                onClick={() => setStageIndex(index)}
                role="tab"
                aria-selected={stageIndex === index}
                aria-label={`Mostrar ${item.name}`}
                title={item.name}
              >
                {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="control-guide">
          <span className="section-label">CONTROLES</span>
          {game.phase === "orbs" ? (
            <>
              <div><kbd>A</kbd><kbd>D</kbd><span>MOVER</span></div>
              <div><kbd>ESPACIO</kbd><span>DISPARAR</span></div>
              <div><kbd>J</kbd><kbd>K</kbd><span>DISPARAR</span></div>
              <div><kbd>ESC</kbd><span>SALIR</span></div>
            </>
          ) : game.phase === "platform" ? (
            <>
              <div><kbd>A</kbd><kbd>D</kbd><span>MOVER</span></div>
              <div><kbd>W</kbd><kbd>ESPACIO</kbd><span>SALTAR</span></div>
              <div><kbd>J</kbd><kbd>K</kbd><span>ATACAR</span></div>
              <div><kbd>ESC</kbd><span>SALIR</span></div>
            </>
          ) : game.phase === "coop" ? (
            <>
              <div><kbd>A/D/W</kbd><kbd>J/K</kbd><span>{FIGHTERS[coopPlayerOne].name}</span></div>
              <div><kbd>←/→/↑</kbd><kbd>1/3</kbd><span>{FIGHTERS[coopPlayerTwo].name}</span></div>
              <div><kbd>F</kbd><span>REMIX COMBINADO</span></div>
              <div><kbd>ESC</kbd><span>SALIR</span></div>
            </>
          ) : (
            <>
              <div><kbd>A/D ×2</kbd><span>MOVER · DASH</span></div>
              <div><kbd>W</kbd><span>SALTAR</span></div>
              <div><kbd>C</kbd><span>AGACHAR</span></div>
              <div><kbd>J</kbd><span>PUÑO</span></div>
              <div><kbd>H</kbd><span>PATADA</span></div>
              <div><kbd>K</kbd><span>{SHORT_SPECIALS[selected][0]}</span></div>
              <div><kbd>L</kbd><span>{SHORT_SPECIALS[selected][1]} · SUPER CON BARRA LLENA</span></div>
              <div><kbd>S + A/D</kbd><span>BLOQUEAR · ESQUIVAR</span></div>
            </>
          )}
        </div>
      </section>

      <footer>
        <p>HECHO CON RITMO EN CENTRAL · VALÈNCIA</p>
        <span>EDICIÓN ARCADE 2026</span>
      </footer>
    </main>
  );
}
