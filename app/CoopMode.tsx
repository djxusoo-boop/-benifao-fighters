"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import ArcadeCrowd from "./ArcadeCrowd";
import FighterWalkLayers from "./FighterWalkLayers";
import TouchStick, { type StickIntent } from "./TouchStick";
import { preloadCoopFrames } from "./coop-preload";

type FighterId = "maletilla" | "vanessa" | "josevictor" | "cristian" | "cesaret" | "borja" | "bacora" | "bonviure" | "elchica" | "ogalla" | "xuso" | "bomba" | "rafeta" | "tonimassama" | "nova" | "estefy";
type PlayerSlot = "p1" | "p2";
type PlayerAction = "idle" | "walk" | "jump" | "fire" | "special" | "dodge" | "hit" | "down" | "revive";
type CoopStatus = "intro" | "intermission" | "playing" | "won" | "lost";
type EnemyRole = "walker" | "runner" | "tank" | "shooter" | "boss";

type CoopPlayer = {
  id: PlayerSlot;
  fighter: FighterId;
  x: number;
  health: number;
  action: PlayerAction;
  airborne: boolean;
  revive: number;
  moveDirection: -1 | 0 | 1;
  invulnerable?: boolean;
};

type Enemy = {
  id: number;
  x: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  boss: boolean;
  role: EnemyRole;
  nextHit: number;
  nextShot: number;
  pose: "move" | "attack" | "hurt";
  fighter?: FighterId;
  name?: string;
  enraged?: boolean;
};

type Pickup = { id: number; x: number; kind: "health" | "sync"; expires: number };

type Projectile = {
  id: number;
  owner: PlayerSlot;
  kind: "bottle" | "microphone" | "mushroom" | "ear" | "bag" | "money" | "vinyl" | "speaker" | "fish" | "venom" | "shield" | "staff" | "anchor" | "chain" | "jager" | "amber" | "scepter" | "artichokes" | "dog" | "hoe" | "flag" | "flagSweep" | "pistol" | "peineta" | "prism" | "machete" | "leaves" | "combo" | "impact" | "burst";
  from: number;
  to: number;
  delay: number;
  high: boolean;
  duration?: number;
  special?: boolean;
  color?: string;
};

type EnemyShot = { id: number; from: number; to: number; high: boolean; duration: number; asset: string };

type Props = {
  playerOne: FighterId;
  playerTwo: FighterId;
  aiPlayerTwo?: boolean;
  soundOn: boolean;
  difficulty: "easy" | "normal";
  onExit: () => void;
  onComplete: (score?: number) => void;
};

const PLAYER_NAMES: Record<FighterId, string> = { maletilla: "MALETILLA", vanessa: "VANESSA", josevictor: "JOSEVICTOR", cristian: "CRISTIAN", cesaret: "CESARET", borja: "BORJA", bacora: "BACORA", bonviure: "BONVIURE", elchica: "EL CHICA", ogalla: "OGALLA", xuso: "XUSO", bomba: "EL BOMBA", rafeta: "RAFETA", tonimassama: "TONI MASSAMA", nova: "YOYE", estefy: "ESTEFY" };
const ATTACK_LABELS: Record<FighterId, [string, string]> = {
  maletilla: ["CLORETILO", "SETAS"],
  vanessa: ["MICROS", "OREJAS"],
  josevictor: ["BOLSAS", "BILLETES"],
  cristian: ["VINILOS", "KRK 8"],
  cesaret: ["PESCADO", "PECES"],
  borja: ["SAPO", "VENENO"],
  bacora: ["ESCUDO", "VARA"],
  bonviure: ["ANCLA", "CADENA"],
  elchica: ["BOTELLA", "ÁMBAR"],
  ogalla: ["BASTÓN", "ALCACHOFAS"],
  xuso: ["MORDISCO", "MEADA"], bomba: ["AZADA", "BARRIDO"], rafeta: ["BANDERA", "GIRO"], tonimassama: ["PISTOLA", "PEINETAS"], nova: ["PRISMA", "LÁSER"], estefy: ["MACHETE", "HOJAS"],
};
const MAX_COOP_WAVES = 7; // the scripted waves; after them the survival is endless
const BEST_WAVE_KEY = "hardcore-coop-best-wave";
type WaveConfig = { health: number; x: number; role?: Exclude<EnemyRole, "boss" | "walker"> | "walker"; boss?: boolean };
// Endless waves after the scripted seven: each one has its own twist.
const SURVIVAL_TWISTS = ["HORDA RÁPIDA", "LLUVIA DE DISPAROS", "MURO BLINDADO", "TODO MEZCLADO", "¡OS RODEAN!"] as const;
const survivalWave = (number: number): { configs: WaveConfig[]; twist: string } => {
  const tier = number - MAX_COOP_WAVES;
  const scale = 1 + tier * .13;
  const hp = (base: number) => Math.round(base * scale);
  if (number % 5 === 0) {
    const escorts: WaveConfig[] = Array.from({ length: Math.min(6, 2 + Math.floor(tier / 3)) }, (_, index) => ({ health: hp(70), x: index % 2 ? 6 + index * 3 : 52 + index * 6, role: (["runner", "shooter", "tank"] as const)[index % 3] }));
    return { twist: tier >= 8 ? "¡JEFE DOBLE!" : "¡JEFE!", configs: [{ health: hp(1600), x: 84, boss: true }, ...(tier >= 8 ? [{ health: hp(1300), x: 10, boss: true }] : []), ...escorts] };
  }
  const twist = SURVIVAL_TWISTS[(tier - 1) % SURVIVAL_TWISTS.length];
  const count = Math.min(10, 5 + Math.floor(tier / 2));
  const roleFor = (index: number): WaveConfig["role"] => twist === "HORDA RÁPIDA" ? "runner"
    : twist === "LLUVIA DE DISPAROS" ? (index % 3 === 2 ? "tank" : "shooter")
    : twist === "MURO BLINDADO" ? (index % 2 ? "tank" : "walker")
    : (["runner", "shooter", "tank", "walker"] as const)[(index + tier) % 4];
  const surround = twist === "¡OS RODEAN!";
  const configs = Array.from({ length: count }, (_, index): WaveConfig => {
    const role = roleFor(index);
    const base = role === "tank" ? 110 : role === "shooter" ? 80 : role === "runner" ? 70 : 76;
    const left = surround && index % 2 === 1;
    return { health: hp(base), role, x: left ? 3 + (index % 4) * 3.5 : 50 + (index * 47 / count) };
  });
  return { twist, configs };
};
const ALL_FIGHTERS = Object.keys(PLAYER_NAMES) as FighterId[];
// Each wave happens somewhere new; the name shows in the banner and tints the floor.
const WAVE_THEMES = ["PATIO DE LA PRISIÓN", "PASILLO DE CELDAS", "COMEDOR", "DUCHAS", "GALERÍA DE SEGURIDAD", "AZOTEA", "DESPACHO DEL ALCAIDE"];
const ROLE_LABELS: Record<EnemyRole, string> = { walker: "BOTELLA", runner: "SOMBRA RÁPIDA", tank: "SOMBRA BLINDADA", shooter: "SOMBRA TIRADORA", boss: "JEFE" };
const PROJECTILE_ASSETS = {
  bottle: "/assets/mobile/cloretilo-projectile-v1.webp",
  microphone: "/assets/microphone-attack-mobile.webp",
  mushroom: "/assets/mushroom-attack-mobile.webp",
  ear: "/assets/ear-attack-mobile.webp",
  bag: "/assets/josevictor/white-bag.webp",
  money: "/assets/josevictor/money-tube.webp",
  vinyl: "/assets/cristian/vinyl.webp",
  speaker: "/assets/cristian/speaker-krk8.webp",
  fish: "/assets/new-fighters/fish.svg",
  venom: "/assets/new-fighters/venom.svg",
  shield: "/assets/new-fighters/shield.svg",
  staff: "/assets/new-fighters/staff.svg",
  anchor: "/assets/new-fighters/anchor.svg",
  chain: "/assets/new-fighters/chain.svg",
  jager: "/assets/new-fighters/jager.svg",
  amber: "/assets/new-fighters/amber.svg",
  scepter: "/assets/new-fighters/scepter.svg",
  artichokes: "/assets/new-fighters/artichokes.svg",
  dog: "/assets/new-fighters/xuso-v3/perro-correr-02.webp",
  hoe: "/assets/new-fighters/hoe.svg",
  flag: "/assets/new-fighters/rafeta-flag.svg",
  flagSweep: "/assets/new-fighters/rafeta-flag.svg",
  pistol: "/assets/new-fighters/tonimassama-bullet.svg",
  peineta: "/assets/new-fighters/tonimassama-peineta-logo.webp",
  prism: "/assets/new-fighters/tonimassama-bullet.svg",
  machete: "/assets/new-fighters/estefy/machete-arco.webp",
  leaves: "/assets/new-fighters/estefy/machete-hojas.webp",
};

// Each hero's ki colour (energy balls, trails and impacts).
const KI_COLORS: Record<FighterId, string> = {
  maletilla: "#ff8b2b", vanessa: "#ff4f9b", josevictor: "#f2c94c", cristian: "#40f0d0", cesaret: "#4fc9ff", borja: "#9be04a", bacora: "#ffd23a",
  bonviure: "#b6a5ff", elchica: "#ff9a2e", ogalla: "#d7ff5a", xuso: "#7dff38", bomba: "#ff6a2a", rafeta: "#ffd84d", tonimassama: "#ffcc33", nova: "#ff4be9", estefy: "#ffe14a",
};

const BASIC_SHOT: Record<FighterId, keyof typeof PROJECTILE_ASSETS> = {
  maletilla: "bottle", vanessa: "microphone", josevictor: "bag", cristian: "vinyl", cesaret: "fish", borja: "venom", bacora: "shield", bonviure: "anchor",
  elchica: "jager", ogalla: "scepter", xuso: "dog", bomba: "hoe", rafeta: "flag", tonimassama: "pistol", nova: "prism", estefy: "machete",
};

const freshPlayers = (playerOne: FighterId, playerTwo: FighterId): Record<PlayerSlot, CoopPlayer> => ({
  p1: { id: "p1", fighter: playerOne, x: 18, health: 100, action: "idle", airborne: false, revive: 0, moveDirection: 0 },
  p2: { id: "p2", fighter: playerTwo, x: 34, health: 100, action: "idle", airborne: false, revive: 0, moveDirection: 0 },
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function CoopMode({ playerOne, playerTwo, aiPlayerTwo = false, soundOn, difficulty, onExit, onComplete }: Props) {
  const [players, setPlayers] = useState<Record<PlayerSlot, CoopPlayer>>(() => freshPlayers(playerOne, playerTwo));
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [enemyShots, setEnemyShots] = useState<EnemyShot[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const pickupIdRef = useRef(0);
  const [wave, setWave] = useState(1);
  const [bestWave, setBestWave] = useState(() => {
    if (typeof window === "undefined") return 0;
    try { return Number(window.localStorage.getItem(BEST_WAVE_KEY) ?? 0); } catch { return 0; }
  });
  const [score, setScore] = useState(0);
  const [sync, setSync] = useState(38);
  const [status, setStatus] = useState<CoopStatus>("intro");
  const [banner, setBanner] = useState("¡JUNTOS SOMOS MÁS FUERTES!");
  const [comboFlash, setComboFlash] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const playersRef = useRef(players);
  const enemiesRef = useRef(enemies);
  const scoreRef = useRef(score);
  const statusRef = useRef(status);
  const keysRef = useRef(new Set<string>());
  const movementVelocityRef = useRef<Record<PlayerSlot, number>>({ p1: 0, p2: 0 });
  const cooldownRef = useRef<Record<PlayerSlot, number>>({ p1: 0, p2: 0 });
  const queuedAttackRef = useRef<Partial<Record<PlayerSlot, { special: boolean; expires: number }>>>({});
  const hitCooldownRef = useRef<Record<PlayerSlot, number>>({ p1: 0, p2: 0 });
  const dodgeUntilRef = useRef<Record<PlayerSlot, number>>({ p1: 0, p2: 0 });
  const timersRef = useRef<number[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const projectileIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const enemyShotIdRef = useRef(0);
  const transitioningRef = useRef(false);
  const completionRef = useRef(false);
  const restartRef = useRef<() => void>(() => undefined);

  // Load both heroes' frames now, then the shadow clones' in the background.
  useEffect(() => {
    preloadCoopFrames([playerOne, playerTwo]);
    const rest = window.setTimeout(() => preloadCoopFrames(ALL_FIGHTERS.filter((fighter) => fighter !== playerOne && fighter !== playerTwo)), 2500);
    return () => window.clearTimeout(rest);
  }, [playerOne, playerTwo]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const later = useCallback((callback: () => void, milliseconds: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((entry) => entry !== timer);
      callback();
    }, milliseconds);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const beep = useCallback((frequency: number, duration = 0.08, type: OscillatorType = "square") => {
    if (!soundOn) return;
    try {
      const audio = audioRef.current ?? new window.AudioContext();
      audioRef.current = audio;
      if (audio.state === "suspended") void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }, [soundOn]);

  const haptic = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch { /* Optional on supported devices. */ }
  }, []);

  const spawnWave = useCallback((number: number) => {
    const survival = number > MAX_COOP_WAVES ? survivalWave(number) : null;
    const configs: WaveConfig[] = survival ? survival.configs : number === 1
      ? [{ health: 34, x: 64 }, { health: 34, x: 74 }, { health: 34, x: 84, role: "runner" as const }, { health: 38, x: 94 }]
      : number === 2
        ? [{ health: 42, x: 58, role: "runner" as const }, { health: 42, x: 67 }, { health: 46, x: 76, role: "shooter" as const }, { health: 46, x: 86 }, { health: 70, x: 95, role: "tank" as const }]
        : number === 3
          ? [{ health: 750, x: 82, boss: true }, { health: 46, x: 58, role: "runner" as const }, { health: 50, x: 69, role: "shooter" as const }, { health: 50, x: 93 }]
          : number === 4
            ? [{ health: 54, x: 52, role: "runner" as const }, { health: 76, x: 61, role: "tank" as const }, { health: 58, x: 70, role: "shooter" as const }, { health: 58, x: 79 }, { health: 62, x: 88, role: "runner" as const }, { health: 62, x: 96 }]
            : number === 5
              ? [{ health: 1250, x: 81, boss: true }, { health: 62, x: 53, role: "runner" as const }, { health: 88, x: 64, role: "tank" as const }, { health: 68, x: 92, role: "shooter" as const }, { health: 68, x: 97 }]
              : number === 6
                ? [{ health: 68, x: 48, role: "runner" as const }, { health: 96, x: 57, role: "tank" as const }, { health: 72, x: 66, role: "shooter" as const }, { health: 72, x: 75 }, { health: 78, x: 84, role: "runner" as const }, { health: 78, x: 92, role: "shooter" as const }, { health: 84, x: 97 }]
                : [{ health: 2400, x: 82, boss: true }, { health: 76, x: 49, role: "runner" as const }, { health: 108, x: 59, role: "tank" as const }, { health: 82, x: 69, role: "shooter" as const }, { health: 82, x: 92, role: "runner" as const }, { health: 88, x: 97, role: "shooter" as const }];
    // Rivals are shadow clones of the fighters nobody picked; plain walkers stay as bottles.
    const pool = ALL_FIGHTERS.filter((fighter) => fighter !== playerOne && fighter !== playerTwo);
    const shuffled = [...pool].sort((a, b) => ((a.charCodeAt(0) * 31 + number * 17) % 13) - ((b.charCodeAt(0) * 31 + number * 17) % 13));
    let cloneIndex = 0;
    const nextClone = () => shuffled[(cloneIndex++ + number) % shuffled.length];
    const next = configs.map((config, index): Enemy => {
      const role: EnemyRole = config.boss ? "boss" : config.role ?? "walker";
      const fighter = role === "walker" || (role === "boss" && (number === 5 || (number > MAX_COOP_WAVES && config.x < 50))) ? undefined : nextClone();
      const name = role === "boss"
        ? number === 5 ? "MAESTRO DEL ESPRAY" : number >= MAX_COOP_WAVES ? `ALCAIDE ${PLAYER_NAMES[fighter as FighterId]}` : `${PLAYER_NAMES[fighter as FighterId]} GIGANTE`
        : fighter ? `${ROLE_LABELS[role]} · ${PLAYER_NAMES[fighter]}` : undefined;
      return {
      fighter,
      name,
      id: ++enemyIdRef.current,
      x: config.x,
      health: config.health,
      maxHealth: config.health,
      role: config.boss ? "boss" : config.role ?? "walker",
      speed: config.boss ? 0.13 : config.role === "runner" ? Math.min(.52, 0.34 + number * .018) : config.role === "tank" ? .13 : config.role === "shooter" ? .16 : Math.min(.4, 0.18 + number * 0.022 + index * 0.008),
      damage: (config.boss ? (difficulty === "easy" ? 9 : 13) : config.role === "tank" ? (difficulty === "easy" ? 7 : 10) : (difficulty === "easy" ? 4 : 7)) + Math.floor(Math.max(0, number - MAX_COOP_WAVES) / 4),
      boss: Boolean(config.boss),
      nextHit: 0,
      nextShot: Date.now() + 1200 + index * 220,
      pose: "move",
    };
    });
    setEnemies(next);
    enemiesRef.current = next;
    setStatus("playing");
    statusRef.current = "playing";
    setBanner(survival ? `OLEADA ${number} · ${survival.twist}` : number === MAX_COOP_WAVES ? `¡JEFE FINAL! · ${WAVE_THEMES[(number - 1) % WAVE_THEMES.length]}` : number === 3 || number === 5 ? `¡MINIJEFE! · ${WAVE_THEMES[(number - 1) % WAVE_THEMES.length]}` : `OLEADA ${number} · ${WAVE_THEMES[(number - 1) % WAVE_THEMES.length]}`);
    transitioningRef.current = false;
    later(() => setBanner(""), 1500);
    beep(number === MAX_COOP_WAVES || number === 3 || number === 5 ? 72 : 150 + number * 18, 0.18, "sawtooth");
  }, [beep, difficulty, later, playerOne, playerTwo]);

  const restart = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    keysRef.current.clear();
    cooldownRef.current = { p1: 0, p2: 0 };
    queuedAttackRef.current = {};
    hitCooldownRef.current = { p1: 0, p2: 0 };
    dodgeUntilRef.current = { p1: 0, p2: 0 };
    completionRef.current = false;
    transitioningRef.current = false;
    const nextPlayers = freshPlayers(playerOne, playerTwo);
    setPlayers(nextPlayers); playersRef.current = nextPlayers;
    setEnemies([]); enemiesRef.current = [];
    setProjectiles([]);
    setEnemyShots([]);
    setPickups([]); pickupsRef.current = [];
    setWave(1); setScore(0); setSync(38);
    setStatus("intro"); statusRef.current = "intro";
    setBanner("¡JUNTOS SOMOS MÁS FUERTES!");
    setGameKey((value) => value + 1);
    movementVelocityRef.current = { p1: 0, p2: 0 };
    later(() => spawnWave(1), 1250);
  }, [later, playerOne, playerTwo, spawnWave]);

  useEffect(() => { restartRef.current = restart; }, [restart]);
  // Development helper to jump to any wave while testing.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __coopWave?: (n: number) => void }).__coopWave = (n: number) => { setWave(n); spawnWave(n); };
  }, [spawnWave]);

  useEffect(() => {
    const activeKeys = keysRef.current;
    restartRef.current();
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      activeKeys.clear();
      if (audioRef.current) {
        void audioRef.current.close();
        audioRef.current = null;
      }
    };
  }, []);

  const setAction = useCallback((slot: PlayerSlot, action: PlayerAction, duration = 0) => {
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], action } }));
    if (duration) later(() => {
      setPlayers((current) => current[slot].action === action && current[slot].health > 0
        ? { ...current, [slot]: { ...current[slot], action: current[slot].airborne ? "jump" : "idle" } }
        : current);
    }, duration);
  }, [later]);

  const addProjectile = useCallback((projectile: Omit<Projectile, "id">, lifetime = 760) => {
    const entry = { ...projectile, id: ++projectileIdRef.current };
    setProjectiles((current) => [...current, entry]);
    later(() => setProjectiles((current) => current.filter((item) => item.id !== entry.id)), lifetime + projectile.delay);
  }, [later]);

  const damageEnemy = useCallback((enemyId: number, damage: number, owner: PlayerSlot) => {
    const target = enemiesRef.current.find((enemy) => enemy.id === enemyId);
    if (!target) return;
    const health = target.health - damage;
    const next = health <= 0
      ? enemiesRef.current.filter((enemy) => enemy.id !== enemyId)
      : enemiesRef.current.map((enemy) => {
        if (enemy.id !== enemyId) return enemy;
        // Every hit shoves the enemy back a little, bosses barely move.
        const away = Math.sign(enemy.x - playersRef.current[owner].x) || 1;
        const push = enemy.boss ? .35 : enemy.role === "tank" ? .8 : 1.6;
        return { ...enemy, x: clamp(enemy.x + away * push, 4, 96), health, pose: "hurt" as const, enraged: enemy.enraged || (enemy.boss && health < enemy.maxHealth * .5) };
      });
    enemiesRef.current = next;
    setEnemies(next);
    if (target.boss && !target.enraged && health > 0 && health < target.maxHealth * .5) {
      // Phase two: the boss gets angry and calls two fast shadows for help.
      setBanner(`¡${target.name ?? "EL JEFE"} SE ENFURECE!`);
      later(() => setBanner(""), 1300);
      beep(58, .35, "sawtooth");
      later(() => {
        if (statusRef.current !== "playing") return;
        const pool = ALL_FIGHTERS.filter((fighter) => fighter !== playersRef.current.p1.fighter && fighter !== playersRef.current.p2.fighter);
        const helpers: Enemy[] = [4, 96].map((x, index) => {
          const fighter = pool[(enemyIdRef.current + index * 3) % pool.length];
          return { id: ++enemyIdRef.current, x, health: 40, maxHealth: 40, speed: .36, damage: difficulty === "easy" ? 4 : 6, boss: false, role: "runner", nextHit: 0, nextShot: Date.now() + 2000, pose: "move", fighter, name: `REFUERZO · ${PLAYER_NAMES[fighter]}` };
        });
        enemiesRef.current = [...enemiesRef.current, ...helpers];
        setEnemies(enemiesRef.current);
      }, 500);
    }
    if (health > 0) later(() => {
      const recovered = enemiesRef.current.map((enemy) => enemy.id === enemyId && enemy.pose === "hurt" ? { ...enemy, pose: "move" as const } : enemy);
      enemiesRef.current = recovered;
      setEnemies(recovered);
    }, 360);
    const ownerFighter = playersRef.current[owner].fighter;
    setSync((value) => clamp(value + (ownerFighter === "vanessa" ? 6 : 5), 0, 100));
    setScore((value) => value + damage * 8);
    addProjectile({ owner, kind: "impact", from: target.x, to: target.x, delay: 0, high: target.boss, color: KI_COLORS[playersRef.current[owner].fighter] }, 460);
    haptic(18);
    beep(ownerFighter === "maletilla" ? 118 : ownerFighter === "vanessa" ? 205 : 164, 0.055, "square");
    if (health <= 0) {
      const defeated = target;
      setScore((value) => value + (defeated.boss ? 5000 : 650));
      addProjectile({ owner, kind: "burst", from: defeated.x, to: defeated.x, delay: 0, high: defeated.boss }, 560);
      // Tanks and bosses always drop a first-aid kit; others sometimes drop health or team sync.
      const roll = Math.random();
      const drop: Pickup["kind"] | null = defeated.boss || defeated.role === "tank" ? "health" : roll < .16 ? "health" : roll < .3 ? "sync" : null;
      if (drop) {
        const pickup = { id: ++pickupIdRef.current, x: clamp(defeated.x, 6, 94), kind: drop, expires: Date.now() + 9000 };
        pickupsRef.current = [...pickupsRef.current, pickup];
        setPickups(pickupsRef.current);
      }
      haptic(defeated.boss ? [40, 30, 80] : [20, 18, 30]);
    }
  }, [addProjectile, beep, difficulty, haptic, later]);

  const fire = useCallback((slot: PlayerSlot, special = false) => {
    if (statusRef.current !== "playing") return;
    const player = playersRef.current[slot];
    if (!player || player.health <= 0) return;
    const fighter = player.fighter;
    const now = Date.now();
    if (cooldownRef.current[slot] > now) {
      if (cooldownRef.current[slot] - now <= 180) queuedAttackRef.current[slot] = { special, expires: now + 180 };
      return;
    }
    delete queuedAttackRef.current[slot];
    const sorted = [...enemiesRef.current].sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x));
    if (!sorted.length) return;
    cooldownRef.current[slot] = now + (special ? 820 : 540);
    setAction(slot, special ? "special" : "fire", special ? 820 : 540);
    const count = special ? 4 : 3;
    const kind: Projectile["kind"] = special
      ? fighter === "nova" ? "prism" : fighter === "estefy" ? "leaves" : fighter === "cesaret" ? "fish" : fighter === "borja" ? "venom" : fighter === "bacora" ? "staff" : fighter === "bonviure" ? "chain" : fighter === "elchica" ? "amber" : fighter === "ogalla" ? "artichokes" : fighter === "xuso" ? "dog" : fighter === "bomba" ? "hoe" : fighter === "rafeta" ? "flagSweep" : fighter === "tonimassama" ? "peineta" : fighter === "maletilla" ? "mushroom" : fighter === "vanessa" ? "ear" : fighter === "josevictor" ? "money" : "speaker"
      : fighter === "nova" ? "prism" : fighter === "estefy" ? "machete" : fighter === "cesaret" ? "fish" : fighter === "borja" ? "venom" : fighter === "bacora" ? "shield" : fighter === "bonviure" ? "anchor" : fighter === "elchica" ? "jager" : fighter === "ogalla" ? "scepter" : fighter === "xuso" ? "dog" : fighter === "bomba" ? "hoe" : fighter === "rafeta" ? "flag" : fighter === "tonimassama" ? "pistol" : fighter === "maletilla" ? "bottle" : fighter === "vanessa" ? "microphone" : fighter === "josevictor" ? "bag" : "vinyl";
    for (let index = 0; index < count; index += 1) {
      // Spread the volley across the closest enemies. The flight and its hit
      // share one travel time, so shots visibly reach what they damage.
      const target = sorted[index % Math.min(sorted.length, special ? 3 : 2)];
      // The big ki ball charges in the hand first; the small ones follow quickly.
      const delay = special ? (index === 0 ? 380 : 520 + index * 90) : 90 + index * 85;
      // Ki travels fast like a tracer round; the beam reaches almost at once.
      const travel = clamp(Math.abs(target.x - player.x) * (special ? 6 : 7), special ? 220 : 190, special ? 420 : 430);
      addProjectile({ owner: slot, kind, from: player.x, to: target.x, delay, high: player.airborne || index % 2 === 1, duration: travel, special: special && index === 0, color: KI_COLORS[fighter] }, special && index === 0 ? travel + 320 : travel);
      later(() => damageEnemy(target.id, special ? 11 : 9, slot), travel + delay);
    }
    setSync((value) => clamp(value + (special ? 10 : 4), 0, 100));
    beep(special ? (fighter === "maletilla" ? 88 : 260) : fighter === "maletilla" ? 132 : 220, special ? 0.2 : 0.1, special ? "sawtooth" : "square");
  }, [addProjectile, beep, damageEnemy, later, setAction]);

  const jump = useCallback((slot: PlayerSlot) => {
    if (statusRef.current !== "playing") return;
    const player = playersRef.current[slot];
    if (player.health <= 0 || player.airborne) return;
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], airborne: true, action: "jump" } }));
    beep(185, 0.08, "triangle");
    later(() => {
      setPlayers((current) => current[slot].health > 0
        ? { ...current, [slot]: { ...current[slot], airborne: false, action: current[slot].action === "jump" ? "idle" : current[slot].action } }
        : current);
    }, 760);
  }, [beep, later]);

  const dodge = useCallback((slot: PlayerSlot) => {
    if (statusRef.current !== "playing") return;
    const player = playersRef.current[slot];
    const now = Date.now();
    if (!player || player.health <= 0 || player.airborne || player.action === "dodge" || cooldownRef.current[slot] > now) return;
    const closest = [...enemiesRef.current].sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
    const away = closest && closest.x < player.x ? 1 : -1;
    cooldownRef.current[slot] = now + 520;
    dodgeUntilRef.current[slot] = now + 510;
    setPlayers((current) => ({ ...current, [slot]: { ...current[slot], x: clamp(current[slot].x + away * 6.5, 5, 95), action: "dodge" } }));
    haptic(12); beep(245, 0.07, "triangle");
    later(() => setPlayers((current) => current[slot].health > 0 && current[slot].action === "dodge"
      ? { ...current, [slot]: { ...current[slot], action: "idle" } }
      : current), 480);
  }, [beep, haptic, later]);

  const unleashCombo = useCallback(() => {
    if (statusRef.current !== "playing" || sync < 100) return;
    const alive = Object.values(playersRef.current).filter((player) => player.health > 0);
    if (alive.length < 2) return;
    setSync(0);
    setComboFlash((value) => value + 1);
    setBanner("¡REMIX DEFINITIVO!");
    setAction("p1", "special", 1250);
    setAction("p2", "special", 1250);
    enemiesRef.current.forEach((enemy, index) => {
      const owner: PlayerSlot = index % 2 ? "p2" : "p1";
      addProjectile({ owner, kind: "combo", from: playersRef.current[owner].x, to: enemy.x, delay: index * 55, high: index % 2 === 0, duration: 1000 }, 1000);
      later(() => damageEnemy(enemy.id, enemy.boss ? 58 : 90, owner), 1000 + index * 55);
    });
    haptic([45, 25, 45, 25, 90]);
    beep(320, 0.42, "sawtooth");
    later(() => setBanner(""), 1300);
  }, [addProjectile, beep, damageEnemy, haptic, later, setAction, sync]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["a", "d", "w", "c", "h", "j", "k", "l", "f", "arrowleft", "arrowright", "arrowup", "arrowdown", "1", "2", "3", "4", "escape"].includes(key)) event.preventDefault();
      keysRef.current.add(key);
      if (event.repeat) return;
      if (key === "w") jump("p1");
      if (key === "c") dodge("p1");
      if (key === "h" || key === "j") fire("p1", false);
      if (key === "k" || key === "l") fire("p1", true);
      if (!aiPlayerTwo) {
        if (key === "arrowup") jump("p2");
        if (key === "arrowdown") dodge("p2");
        // These match the default pad mapping: 1/2 are regular triggers and
        // 3/4 are specials for the second controller.
        if (key === "1" || key === "2") fire("p2", false);
        if (key === "3" || key === "4") fire("p2", true);
      }
      if (key === "f") unleashCombo();
      if (key === "escape") onExit();
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const release = () => { keysRef.current.clear(); queuedAttackRef.current = {}; movementVelocityRef.current = { p1: 0, p2: 0 }; };
    const releaseWhenHidden = () => { if (document.hidden) release(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
    };
  }, [aiPlayerTwo, dodge, fire, jump, onExit, unleashCombo]);

  useEffect(() => {
    if (!aiPlayerTwo) return;
    const ai = window.setInterval(() => {
      if (document.hidden || statusRef.current !== "playing") return;
      const p2 = playersRef.current.p2;
      if (!p2 || p2.health <= 0) return;
      const now = Date.now();
      const nearestEnemy = [...enemiesRef.current].sort((a, b) => Math.abs(a.x - p2.x) - Math.abs(b.x - p2.x))[0];
      const p1 = playersRef.current.p1;
      if (p1.health <= 0 && Math.abs(p1.x - p2.x) > 10 && now > cooldownRef.current.p2) return;
      if (nearestEnemy) {
        const distance = Math.abs(nearestEnemy.x - p2.x);
        if (distance < 8 && now > dodgeUntilRef.current.p2 + 900 && Math.random() < 0.3) dodge("p2");
        if (distance < 62) fire("p2", nearestEnemy.boss || sync >= 72 || Math.random() < 0.26);
        if (distance > 40 && p2.airborne === false && Math.random() < 0.08) jump("p2");
      }
      if (sync >= 100 && enemiesRef.current.length >= 2) unleashCombo();
    }, 260);
    return () => window.clearInterval(ai);
  }, [aiPlayerTwo, dodge, fire, jump, sync, unleashCombo]);

  useEffect(() => {
    let frameId = 0;
    let lastFrame = performance.now();
    const movement = (frameTime: number) => {
      if (document.hidden || statusRef.current !== "playing") {
        lastFrame = frameTime;
        frameId = window.requestAnimationFrame(movement);
        return;
      }
      if (frameTime - lastFrame < 32) {
        frameId = window.requestAnimationFrame(movement);
        return;
      }
      lastFrame = frameTime - Math.min((frameTime - lastFrame) % 32, 16);
      const inputTime = Date.now();
      for (const slot of ["p1", "p2"] as PlayerSlot[]) {
        const pending = queuedAttackRef.current[slot];
        if (!pending) continue;
        if (inputTime > pending.expires || playersRef.current[slot].health <= 0) delete queuedAttackRef.current[slot];
        else if (inputTime >= cooldownRef.current[slot]) fire(slot, pending.special);
      }
      const keys = keysRef.current;
      const p1Direction = Number(keys.has("d") || keys.has("p1-right")) - Number(keys.has("a") || keys.has("p1-left"));
      const p2ManualDirection = Number(keys.has("arrowright") || keys.has("p2-right")) - Number(keys.has("arrowleft") || keys.has("p2-left"));
      const p2Direction = aiPlayerTwo ? (() => {
        const p2 = playersRef.current.p2;
        const p1 = playersRef.current.p1;
        if (!p2 || p2.health <= 0) return 0;
        if (p1.health <= 0 && Math.abs(p1.x - p2.x) > 9) return Math.sign(p1.x - p2.x);
        const nearestEnemy = [...enemiesRef.current].sort((a, b) => Math.abs(a.x - p2.x) - Math.abs(b.x - p2.x))[0];
        if (!nearestEnemy) return 0;
        const desired = nearestEnemy.boss ? 18 : 12;
        const distance = Math.abs(nearestEnemy.x - p2.x);
        if (distance < desired - 4) return Math.sign(p2.x - nearestEnemy.x);
        if (distance > desired + 5) return Math.sign(nearestEnemy.x - p2.x);
        return 0;
      })() : p2ManualDirection;
      setPlayers((current) => {
        let next = current;
        ([{ id: "p1" as const, direction: p1Direction }, { id: "p2" as const, direction: p2Direction }]).forEach(({ id, direction }) => {
          const player = next[id];
          if (player.health <= 0) return;
          const canStride = player.action === "idle" || player.action === "walk" || player.action === "jump";
          const previousVelocity = movementVelocityRef.current[id];
          const targetVelocity = canStride && direction ? direction * 0.92 : 0;
          const traction = canStride && direction ? 0.28 : player.airborne ? 0.92 : 0.68;
          const velocity = previousVelocity + (targetVelocity - previousVelocity) * traction;
          movementVelocityRef.current[id] = Math.abs(velocity) < 0.025 ? 0 : velocity;
          if (canStride && Math.abs(movementVelocityRef.current[id]) > 0.025) {
            const moved = clamp(player.x + movementVelocityRef.current[id], 5, 95);
            const moveDirection = Math.sign(movementVelocityRef.current[id]) as -1 | 1;
            next = { ...next, [id]: { ...player, x: moved, moveDirection, action: player.airborne ? player.action : player.action === "idle" || player.action === "walk" ? "walk" : player.action } };
          } else if (player.action === "walk") {
            next = { ...next, [id]: { ...player, moveDirection: 0, action: player.airborne ? "jump" : "idle" } };
          } else if (!player.airborne && player.moveDirection !== 0) {
            next = { ...next, [id]: { ...player, moveDirection: 0 } };
          }
        });

        const p1 = next.p1;
        const p2 = next.p2;
        if (p1.health <= 0 && p2.health > 0) {
          const close = Math.abs(p1.x - p2.x) < 12;
          const revive = close ? clamp(p1.revive + 2.2, 0, 100) : Math.max(0, p1.revive - 1.2);
          if (revive >= 100) hitCooldownRef.current.p1 = Date.now() + 1400;
          next = { ...next, p1: revive >= 100 ? { ...p1, health: 48, revive: 0, action: "revive" } : { ...p1, revive }, p2: close && p2.action === "idle" ? { ...p2, action: "revive" } : p2 };
          if (!close && next.p2.action === "revive") next = { ...next, p2: { ...next.p2, action: "idle" } };
        } else if (p2.health <= 0 && p1.health > 0) {
          const close = Math.abs(p1.x - p2.x) < 12;
          const revive = close ? clamp(p2.revive + 2.2, 0, 100) : Math.max(0, p2.revive - 1.2);
          if (revive >= 100) hitCooldownRef.current.p2 = Date.now() + 1400;
          next = { ...next, p2: revive >= 100 ? { ...p2, health: 48, revive: 0, action: "revive" } : { ...p2, revive }, p1: close && p1.action === "idle" ? { ...p1, action: "revive" } : p1 };
          if (!close && next.p1.action === "revive") next = { ...next, p1: { ...next.p1, action: "idle" } };
        } else {
          if (p1.action === "revive") next = { ...next, p1: { ...p1, action: "idle" } };
          if (p2.action === "revive") next = { ...next, p2: { ...p2, action: "idle" } };
        }
        playersRef.current = next;
        return next;
      });

      const now = Date.now();
      if (pickupsRef.current.length) {
        const remaining = pickupsRef.current.filter((pickup) => {
          if (now > pickup.expires) return false;
          const collector = (["p1", "p2"] as PlayerSlot[]).find((slot) => playersRef.current[slot].health > 0 && Math.abs(playersRef.current[slot].x - pickup.x) < 4.5);
          if (!collector) return true;
          if (pickup.kind === "health") {
            setPlayers((current) => {
              const next = { ...current, [collector]: { ...current[collector], health: clamp(current[collector].health + 22, 0, 100) } };
              playersRef.current = next;
              return next;
            });
            setBanner("+22 VIDA");
          } else {
            setSync((value) => clamp(value + 25, 0, 100));
            setBanner("+25 SINCRONÍA");
          }
          setScore((value) => value + 250);
          later(() => setBanner(""), 700);
          beep(pickup.kind === "health" ? 660 : 880, .12, "triangle");
          haptic(14);
          return false;
        });
        if (remaining.length !== pickupsRef.current.length) {
          pickupsRef.current = remaining;
          setPickups(remaining);
        }
      }
      const incoming: Array<{ fighter: PlayerSlot; damage: number }> = [];
      const rangedIncoming: Array<{ fighter: PlayerSlot; damage: number; delay: number }> = [];
      setEnemies((current) => {
        const alivePlayers = Object.values(playersRef.current).filter((player) => player.health > 0);
        if (!alivePlayers.length) return current;
        const next = current.map((enemy) => {
          const target = [...alivePlayers].sort((a, b) => Math.abs(a.x - enemy.x) - Math.abs(b.x - enemy.x))[0];
          const distance = Math.abs(target.x - enemy.x);
          if ((enemy.role === "shooter" || enemy.role === "boss") && distance > 12 && distance < 58 && now >= enemy.nextShot) {
            const travel = clamp(distance * 14, 380, 780);
            const asset = enemy.fighter ? PROJECTILE_ASSETS[BASIC_SHOT[enemy.fighter]] : "/assets/platform-water-bottle-enemy.webp";
            const shot = { id: ++enemyShotIdRef.current, from: enemy.x, to: target.x, high: enemy.role === "boss" && enemy.id % 2 === 0, duration: travel, asset };
            setEnemyShots((shots) => [...shots, shot]);
            later(() => setEnemyShots((shots) => shots.filter((item) => item.id !== shot.id)), travel + 220);
            rangedIncoming.push({ fighter: target.id, damage: enemy.role === "boss" ? enemy.damage : Math.max(3, enemy.damage - 1), delay: travel });
            later(() => setEnemies((active) => active.map((item) => item.id === enemy.id && item.pose === "attack" ? { ...item, pose: "move" } : item)), enemy.boss ? 620 : 360);
            return { ...enemy, nextShot: now + (enemy.role === "boss" ? (enemy.enraged ? 950 : 1450) : 2100), pose: "attack" as const };
          }
          if (distance < (enemy.boss ? 6.5 : 4.3) && now >= enemy.nextHit) {
            incoming.push({ fighter: target.id, damage: enemy.damage });
            later(() => setEnemies((active) => active.map((item) => item.id === enemy.id && item.pose === "attack" ? { ...item, pose: "move" } : item)), enemy.boss ? 520 : 320);
            return { ...enemy, nextHit: now + (enemy.boss ? 1000 : 1250), pose: "attack" as const };
          }
          const direction = Math.sign(target.x - enemy.x);
          return { ...enemy, x: clamp(enemy.x + direction * enemy.speed * (enemy.enraged ? 1.5 : 1) * (32 / 42), 4, 96) };
        });
        // Keep enemies from piling on top of each other so every one is readable.
        const order = [...next].sort((a, b) => a.x - b.x);
        for (let index = 1; index < order.length; index += 1) {
          const gap = (order[index - 1].boss || order[index].boss) ? 7 : 4.2;
          if (order[index].x - order[index - 1].x < gap) order[index] = { ...order[index], x: clamp(order[index - 1].x + gap, 4, 96) };
        }
        const spaced = next.map((enemy) => order.find((item) => item.id === enemy.id) ?? enemy);
        enemiesRef.current = spaced;
        return spaced;
      });
      incoming.forEach(({ fighter, damage }) => {
        const hitAt = Date.now();
        if (hitAt < hitCooldownRef.current[fighter] || hitAt < dodgeUntilRef.current[fighter]) return;
        hitCooldownRef.current[fighter] = hitAt + (difficulty === "easy" ? 620 : 440);
        later(() => setPlayers((current) => current[fighter].invulnerable ? { ...current, [fighter]: { ...current[fighter], invulnerable: false } } : current), difficulty === "easy" ? 620 : 440);
        setPlayers((current) => {
          const target = current[fighter];
          if (target.health <= 0) return current;
          const health = Math.max(0, target.health - damage);
          const next = { ...current, [fighter]: { ...target, health, action: health <= 0 ? "down" as const : "hit" as const, revive: 0, invulnerable: true } };
          playersRef.current = next;
          return next;
        });
        setSync((value) => Math.max(0, value - 7));
        haptic(28); beep(68, 0.1, "sawtooth");
        later(() => setPlayers((current) => current[fighter].health > 0 && current[fighter].action === "hit" ? { ...current, [fighter]: { ...current[fighter], action: "idle" } } : current), 420);
      });
      rangedIncoming.forEach(({ fighter, damage, delay }) => {
        later(() => {
          if (statusRef.current !== "playing") return;
          const hitAt = Date.now();
          if (hitAt < hitCooldownRef.current[fighter] || hitAt < dodgeUntilRef.current[fighter]) return;
          hitCooldownRef.current[fighter] = hitAt + (difficulty === "easy" ? 620 : 440);
          later(() => setPlayers((current) => current[fighter].invulnerable ? { ...current, [fighter]: { ...current[fighter], invulnerable: false } } : current), difficulty === "easy" ? 620 : 440);
          setPlayers((current) => {
            const target = current[fighter];
            if (target.health <= 0 || target.airborne) return current;
            const health = Math.max(0, target.health - damage);
            const next = { ...current, [fighter]: { ...target, health, action: health <= 0 ? "down" as const : "hit" as const, revive: 0, invulnerable: true } };
            playersRef.current = next;
            return next;
          });
          haptic(18); beep(76, .08, "sawtooth");
          later(() => setPlayers((current) => current[fighter].health > 0 && current[fighter].action === "hit" ? { ...current, [fighter]: { ...current[fighter], action: "idle" } } : current), 360);
        }, delay);
      });
      frameId = window.requestAnimationFrame(movement);
    };
    frameId = window.requestAnimationFrame(movement);
    return () => window.cancelAnimationFrame(frameId);
  }, [aiPlayerTwo, beep, difficulty, fire, haptic, later]);

  useEffect(() => {
    if (status !== "playing" || enemies.length > 0 || transitioningRef.current) return;
    transitioningRef.current = true;
    // Survival never ends: after wave 7 the waves keep coming, harder each time.
    const nextWave = wave + 1;
    if (wave === MAX_COOP_WAVES) { haptic([80, 50, 110]); beep(392, 0.4, "sawtooth"); }
    later(() => {
      setStatus("intermission"); statusRef.current = "intermission";
      setBanner(wave === MAX_COOP_WAVES ? "¡CAMPAÑA SUPERADA! · ¡AHORA, SUPERVIVENCIA!" : `OLEADA ${wave} SUPERADA`);
      later(() => {
        setWave(nextWave);
        setPlayers((current) => ({
          p1: { ...current.p1, health: current.p1.health > 0 ? clamp(current.p1.health + (sync >= 70 ? 24 : 16), 0, 100) : (sync >= 70 ? 55 : 42), revive: 0, action: "idle" },
          p2: { ...current.p2, health: current.p2.health > 0 ? clamp(current.p2.health + (sync >= 70 ? 24 : 16), 0, 100) : (sync >= 70 ? 55 : 42), revive: 0, action: "idle" },
        }));
        if (sync >= 70) {
          setScore((value) => value + 1200);
          setBanner("¡BONUS DE EQUIPO · +VIDA!");
        }
        spawnWave(nextWave);
      }, 1850);
    }, 0);
  }, [beep, enemies.length, haptic, later, onComplete, spawnWave, status, sync, wave]);

  useEffect(() => {
    if (status !== "playing") return;
    if (players.p1.health > 0 || players.p2.health > 0) return;
    later(() => {
      setStatus("lost"); statusRef.current = "lost";
      setBanner("EQUIPO DERRIBADO");
      try {
        const previous = Number(window.localStorage.getItem(BEST_WAVE_KEY) ?? 0);
        if (wave > previous) window.localStorage.setItem(BEST_WAVE_KEY, String(wave));
        setBestWave(Math.max(previous, wave));
      } catch { /* Storage is optional. */ }
      if (!completionRef.current) {
        completionRef.current = true;
        const finalScore = scoreRef.current + wave * 500;
        setScore(finalScore);
        later(() => onComplete(finalScore), 900);
      }
      haptic([100, 70, 140]); beep(52, 0.45, "sawtooth");
    }, 0);
  }, [beep, haptic, later, onComplete, players.p1.health, players.p2.health, status, wave]);

  const nearestDirection = useMemo(() => {
    const nearest = (slot: PlayerSlot) => {
      const player = players[slot];
      const target = [...enemies].sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
      return target && target.x < player.x ? "face-left" : "face-right";
    };
    return { p1: nearest("p1"), p2: nearest("p2") };
  }, [enemies, players]);

  const crowdBossCue = useMemo(() => {
    const boss = enemies.find((enemy) => enemy.boss);
    if (!boss || status !== "playing") return null;
    return {
      direction: boss.x < 43 ? "left" as const : boss.x > 57 ? "right" as const : "center" as const,
      label: "¡CUIDADO, JEFE!",
    };
  }, [enemies, status]);

  const nearestPlayerX = (x: number) => {
    const alive = Object.values(players).filter((player) => player.health > 0);
    const list = alive.length ? alive : Object.values(players);
    return [...list].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0].x;
  };

  const stickPrevRef = useRef<Record<PlayerSlot, StickIntent>>({ p1: { left: false, right: false, up: false, down: false }, p2: { left: false, right: false, up: false, down: false } });
  const stickMove = (slot: PlayerSlot, intent: StickIntent) => {
    const previous = stickPrevRef.current[slot];
    if (intent.left) keysRef.current.add(`${slot}-left`); else keysRef.current.delete(`${slot}-left`);
    if (intent.right) keysRef.current.add(`${slot}-right`); else keysRef.current.delete(`${slot}-right`);
    if (intent.up && !previous.up) jump(slot);
    if (intent.down && !previous.down) dodge(slot);
    stickPrevRef.current[slot] = intent;
  };

  const tapAction = (event: ReactPointerEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    action();
  };

  return (
    <div className={`coop-mode coop-stage-${wave} status-${status} combo-${comboFlash % 2} ${aiPlayerTwo ? "coop-ai-partner" : "coop-human-duo"}`} key={gameKey} aria-label={`Aventura cooperativa de ${PLAYER_NAMES[playerOne]} y ${PLAYER_NAMES[playerTwo]}`}>
      {status === "playing" && <ArcadeCrowd mode="coop" seed={wave - 1} phase={status} react={Boolean(comboFlash % 2)} cue={crowdBossCue} />}
      <div className="coop-hud">
        {(["p1", "p2"] as PlayerSlot[]).map((slot, index) => (
          <div className={`coop-health ${slot} ${players[slot].fighter}`} key={slot}>
            <small>{index === 0 ? "P1" : aiPlayerTwo ? "P2 IA" : "P2"} · {PLAYER_NAMES[players[slot].fighter]}</small>
            <div><span style={{ width: `${players[slot].health}%` }} /></div>
            <b>{players[slot].health > 0 ? `${players[slot].health}%` : "CAÍDO"}</b>
          </div>
        ))}
        <div className="coop-wave"><small>{WAVE_THEMES[(wave - 1) % WAVE_THEMES.length]}</small><strong>OLEADA {wave}{wave <= MAX_COOP_WAVES ? `/${MAX_COOP_WAVES}` : ""}</strong><span>{String(score).padStart(6, "0")} PTS{bestWave > 0 ? ` · RÉCORD ${bestWave}` : ""}</span></div>
      </div>

      <div className="coop-sync"><small>SINCRONÍA DE EQUIPO</small><div><span style={{ width: `${sync}%` }} /></div><b>{sync >= 100 ? "¡F · REMIX DEFINITIVO!" : `${Math.round(sync)}%`}</b></div>
      <button className="coop-exit" type="button" onClick={onExit}>← MENÚ</button>

      {enemies.map((enemy) => (
        <div className={`coop-enemy role-${enemy.role} ${enemy.fighter ? `clone clone-${enemy.fighter}` : ""} ${enemy.enraged ? "enraged" : ""} ${enemy.boss ? "boss" : ""} ${enemy.pose === "attack" ? "attacking" : ""} ${enemy.pose === "hurt" || enemy.boss && enemy.health < enemy.maxHealth * .48 ? "hurt" : ""}`} key={enemy.id} style={{ left: `${enemy.x}%` }}>
          <div className="coop-enemy-health"><span style={{ width: `${Math.max(0, enemy.health / enemy.maxHealth * 100)}%` }} /></div>
          {enemy.boss && <b>{enemy.name ?? "MAESTRO DEL ESPRAY"}</b>}
          {enemy.fighter
            ? <span className={`coop-clone-flip ${nearestPlayerX(enemy.x) < enemy.x ? "look-left" : "look-right"}`}>
                <span className={`coop-player coop-clone ${enemy.fighter} ${enemy.pose === "attack" ? "fire" : enemy.pose === "hurt" ? "hit" : "walk"}`}>
                  <span className="coop-player-art" role="img" aria-label={enemy.name ?? PLAYER_NAMES[enemy.fighter]} />
                </span>
              </span>
            : enemy.boss
              ? <span className="coop-boss-art" role="img" aria-label="Jefe Maestro del espray" />
              : <Image src="/assets/platform-water-bottle-enemy.webp" alt="Botella enemiga" width={160} height={300} unoptimized draggable={false} />}
        </div>
      ))}

      {(["p1", "p2"] as PlayerSlot[]).map((slot) => {
        const player = players[slot];
        const fighter = player.fighter;
        const facingRight = nearestDirection[slot] === "face-right";
        const movingForward = player.moveDirection !== 0 && (facingRight ? player.moveDirection > 0 : player.moveDirection < 0);
        const gait = player.action === "walk" ? (movingForward ? "walk-forward" : "walk-retreat") : "";
        return (
          <div className={`coop-player ${slot} ${fighter} ${player.action} ${gait} ${player.airborne ? "airborne" : ""} ${nearestDirection[slot]} ${player.health > 0 && player.invulnerable ? "invulnerable" : ""}`} key={slot} style={{ left: `${player.x}%` }}>
            <span className="coop-player-art" role="img" aria-label={PLAYER_NAMES[fighter]}>{!( ["cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "rafeta", "tonimassama"] as FighterId[]).includes(fighter) && <FighterWalkLayers />}</span>
            <span className="coop-player-shadow" />
            {player.health <= 0 && <div className="revive-meter"><small>ACÉRCATE PARA REANIMAR</small><div><span style={{ width: `${player.revive}%` }} /></div></div>}
            {player.action === "revive" && player.health > 0 && <b className="revive-word">¡TE CUBRO!</b>}
          </div>
        );
      })}

      {projectiles.map((projectile) => {
        const style = { "--from": `${projectile.from}%`, "--to": `${projectile.to}%`, "--delay": `${projectile.delay}ms`, "--duration": `${projectile.duration ?? 650}ms` } as CSSProperties;
        if (projectile.kind === "burst") return <span className={`coop-burst ${projectile.high ? "boss" : ""}`} key={projectile.id} style={{ left: `${projectile.from}%` }}>BOOM!</span>;
        if (projectile.kind === "impact") return <span className={`coop-ki-impact ${projectile.high ? "boss" : ""}`} key={projectile.id} style={{ left: `${projectile.from}%`, "--ki": projectile.color ?? "#ffd84d" } as CSSProperties}><i /><i /><i /></span>;
        if (projectile.kind === "combo") return <span className={`coop-combo-wave ${projectile.high ? "high" : ""}`} key={projectile.id} style={style}>♫★</span>;
        // Ki blasts: a glowing ball with the hero's object inside and a trail behind it.
        const kiStyle = { ...style, "--ki": projectile.color ?? "#ffd84d" } as CSSProperties;
        if (projectile.special) {
          // Big ki: it charges in the hand, then a straight beam reaches the enemy.
          const left = Math.min(projectile.from, projectile.to);
          const width = Math.max(4, Math.abs(projectile.to - projectile.from));
          return (
            <span className={`coop-ki-beam ${projectile.to < projectile.from ? "ki-left" : "ki-right"} ${projectile.high ? "high" : ""}`} key={projectile.id} style={{ ...kiStyle, left: `${left}%`, width: `${width}%` }}>
              <i className="beam-charge" /><i className="beam-glow" /><i className="beam-core" /><i className="beam-edge top" /><i className="beam-edge bottom" /><i className="beam-head" />
            </span>
          );
        }
        return (
          <span className={`coop-ki ${projectile.to < projectile.from ? "ki-left" : "ki-right"} ${projectile.high ? "high" : ""}`} key={projectile.id} style={kiStyle}>
            <i className="ki-trail" /><i className="ki-bolt" /><i className="ki-flash" />
          </span>
        );
      })}
      {enemyShots.map((shot) => (
        <span className={`coop-enemy-shot ${shot.high ? "high" : ""}`} key={shot.id} style={{ "--from": `${shot.from}%`, "--to": `${shot.to}%`, "--duration": `${shot.duration}ms` } as CSSProperties}>
          <Image src={shot.asset} alt="" width={96} height={160} unoptimized />
        </span>
      ))}
      {pickups.map((pickup) => (
        <span className={`coop-pickup ${pickup.kind}`} key={pickup.id} style={{ left: `${pickup.x}%` }} aria-label={pickup.kind === "health" ? "Botiquín" : "Sincronía"}>
          {pickup.kind === "health" ? "✚" : "♫"}
        </span>
      ))}

      {banner && <div className="coop-banner" aria-live="assertive">{banner}</div>}

      {status === "won" && (
        <div className="coop-result won">
          <ArcadeCrowd mode="coop" seed={wave + 4} phase="won" react />
          <div className="coop-dance-pair" aria-label={`${PLAYER_NAMES[playerOne]} y ${PLAYER_NAMES[playerTwo]} celebrando juntos`} role="img">
            <span className="dance-floor-ring" /><span className={`result-dancer-art ${playerOne}`} /><span className={`result-dancer-art ${playerTwo}`} />
            <i className="dance-note dance-note-one">♪</i><i className="dance-note dance-note-two">♫</i><i className="dance-note dance-note-three">★</i><i className="dance-note dance-note-four">♥</i><i className="dance-note dance-note-five">✦</i>
          </div>
          <small>{MAX_COOP_WAVES} OLEADAS SUPERADAS</small><h2>¡EQUIPO<br />CAMPEÓN!</h2><p>{PLAYER_NAMES[playerOne]} y {PLAYER_NAMES[playerTwo]} celebran juntos · {score} puntos</p>
          <div><button type="button" className="fight-button" onClick={restart}>OTRA PARTIDA</button><button type="button" className="secondary-button" onClick={onExit}>VOLVER AL MENÚ</button></div>
        </div>
      )}
      {status === "lost" && (
        <div className="coop-result lost"><ArcadeCrowd mode="coop" seed={wave + 5} phase="lost" /><small>LOS DOS HAN CAÍDO</small><h2>¡LLEGASTEIS A LA<br />OLEADA {wave}!</h2><p>{score} puntos · {wave >= bestWave ? "¡NUEVO RÉCORD!" : `Récord: oleada ${bestWave}`} · Reanima a tu compañero acercándote a él para llegar más lejos.</p><div><button type="button" className="fight-button" onClick={restart}>REPETIR</button><button type="button" className="secondary-button" onClick={onExit}>MENÚ</button></div></div>
      )}

      <div className="coop-keyboard-help">{aiPlayerTwo ? "P1 · A/D + W/C + J/K  |  P2 lo controla la IA  |  F · ATAQUE COMBINADO" : "P1 · A/D + W/C + J/K   |   P2 · ←/→ + ↑/↓ + 1/3   |   F · ATAQUE COMBINADO"}</div>

      <div className="coop-touch coop-touch-p1" aria-label={`Controles táctiles de ${PLAYER_NAMES[playerOne]}`}>
        <small>P1 · {PLAYER_NAMES[playerOne]}</small>
        <TouchStick className="coop-stick" label="Joystick de P1: mover, arriba salta, abajo esquiva" hint="↑ SALTA · ↓ ESQUIVA" onChange={(intent) => stickMove("p1", intent)} />
        <div className="coop-touch-actions"><button type="button" onPointerDown={(event) => tapAction(event, () => fire("p1"))}>J<i>{ATTACK_LABELS[playerOne][0]}</i></button><button type="button" onPointerDown={(event) => tapAction(event, () => fire("p1", true))}>K<i>{ATTACK_LABELS[playerOne][1]}</i></button></div>
      </div>
      <button className={`coop-combo-button ${sync >= 100 ? "ready" : ""}`} type="button" onPointerDown={(event) => tapAction(event, unleashCombo)} disabled={sync < 100}><b>F</b><small>{sync >= 100 ? "¡REMIX!" : `${Math.round(sync)}%`}</small></button>
      {!aiPlayerTwo && <div className="coop-touch coop-touch-p2" aria-label={`Controles táctiles de ${PLAYER_NAMES[playerTwo]}`}>
        <small>P2 · {PLAYER_NAMES[playerTwo]}</small>
        <TouchStick className="coop-stick" label="Joystick de P2: mover, arriba salta, abajo esquiva" hint="↑ SALTA · ↓ ESQUIVA" onChange={(intent) => stickMove("p2", intent)} />
        <div className="coop-touch-actions"><button type="button" onPointerDown={(event) => tapAction(event, () => fire("p2"))}>1<i>{ATTACK_LABELS[playerTwo][0]}</i></button><button type="button" onPointerDown={(event) => tapAction(event, () => fire("p2", true))}>2<i>{ATTACK_LABELS[playerTwo][1]}</i></button></div>
      </div>}
    </div>
  );
}
