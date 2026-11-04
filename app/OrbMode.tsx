"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ArcadeCrowd from "./ArcadeCrowd";
import FighterWalkLayers from "./FighterWalkLayers";
import TouchStick from "./TouchStick";

type FighterId = "maletilla" | "vanessa" | "josevictor" | "cristian" | "cesaret" | "borja" | "bacora" | "bonviure" | "elchica" | "ogalla" | "xuso" | "bomba" | "rafeta" | "tonimassama" | "nova" | "estefy";
type OrbStatus = "playing" | "won" | "lost";
type Difficulty = "easy" | "normal";
type OrbObjectKind = 0 | 1 | 2 | 3 | 4 | 5;

type OrbBall = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tier: 0 | 1 | 2;
  hue: number;
  kind: OrbObjectKind;
  angle: number;
  spin: number;
};

type OrbShot = {
  id: number;
  x: number;
  y: number;
};

type OrbParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

type OrbPowerKind = "rapid" | "shield" | "freeze" | "life";
type OrbPower = { id: number; x: number; y: number; vy: number; kind: OrbPowerKind; expires: number };
const POWER_STYLE: Record<OrbPowerKind, { color: string; icon: string; label: string }> = {
  rapid: { color: "#ff9a2e", icon: "»", label: "¡RÁFAGA!" },
  shield: { color: "#59e8ff", icon: "◆", label: "¡ESCUDO!" },
  freeze: { color: "#bfe9ff", icon: "❄", label: "¡CONGELADO!" },
  life: { color: "#ff4f6d", icon: "♥", label: "¡VIDA EXTRA!" },
};

type OrbModeProps = {
  fighter: FighterId;
  fighterName: string;
  soundOn: boolean;
  difficulty: Difficulty;
  campaign?: boolean;
  onComplete: (score?: number) => void;
  onExit: () => void;
};

const MAX_LIVES = 8;
const MAX_ORB_WAVES = 6;
const ORB_WEAPONS: Record<FighterId, string> = {
  maletilla: "/assets/mobile/cloretilo-projectile-v1.webp",
  vanessa: "/assets/microphone-attack-mobile.webp",
  josevictor: "/assets/josevictor/money-tube.webp",
  cristian: "/assets/cristian/vinyl.webp",
  cesaret: "/assets/new-fighters/fish.svg",
  borja: "/assets/new-fighters/venom.svg",
  bacora: "/assets/new-fighters/bacora-shield.webp",
  bonviure: "/assets/new-fighters/bonviure-anchor-v21849.webp",
  elchica: "/assets/new-fighters/jager.svg",
  ogalla: "/assets/new-fighters/artichokes.svg",
  xuso: "/assets/new-fighters/xuso-v3/perro-correr-02.webp",
  bomba: "/assets/new-fighters/hoe.svg",
  rafeta: "/assets/new-fighters/rafeta-flag.svg",
  tonimassama: "/assets/new-fighters/tonimassama-bullet.svg",
  nova: "/assets/new-fighters/tonimassama-bullet.svg",
  estefy: "/assets/new-fighters/estefy/machete-arma.webp",
};
const ORB_OBJECTS = [
  "/assets/platform-card-token.webp",
  "/assets/platform-owl-token.webp",
  "/assets/platform-flame-token.webp",
  "/assets/mobile/arcade-pickup-wrap-v1.webp",
  "/assets/mobile/arcade-pickup-powder-v1.webp",
  "/assets/mobile/arcade-pickup-rush-v1.webp",
] as const;
const OBJECT_GLOWS = ["#ffc832", "#ff9f87", "#ff3fae", "#efffff", "#7feaff", "#ffbd24"] as const;
const OBJECT_HUES = [42, 12, 324, 185, 198, 42] as const;

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export default function OrbMode({ fighter, fighterName, soundOn, difficulty, campaign = false, onComplete, onExit }: OrbModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroArtRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<() => void>(() => undefined);
  const inputRef = useRef({ left: false, right: false });
  const stickUpRef = useRef(false);
  const onExitRef = useRef(onExit);
  const onCompleteRef = useRef(onComplete);
  const soundOnRef = useRef(soundOn);
  const audioRef = useRef<AudioContext | null>(null);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<OrbStatus>("playing");
  const [hud, setHud] = useState({ score: 0, lives: MAX_LIVES, remaining: 2, wave: 1, rapid: false, chain: 0, perfect: false, shield: false, frozen: false, power: "" });

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    let animationFrame = 0;
    let completionTimer = 0;
    let victoryToneTimer = 0;
    let previousTime = performance.now();
    let nextId = 1;
    let heroX = 0;
    let heroVelocity = 0;
    let heroDirection = 1;
    let lastShotAt = -Infinity;
    let queuedShotUntil = 0;
    let firingTimer = 0;
    let invulnerableUntil = 0;
    let currentStatus: OrbStatus = "playing";
    let wave = 1;
    let rapidUntil = 0;
    let waveCallUntil = performance.now() + 1250;
    let score = 0;
    let lives = difficulty === "easy" ? MAX_LIVES + 2 : MAX_LIVES;
    let chain = 0;
    let chainUntil = 0;
    let waveLivesStart = lives;
    let hudFrozen = false;
    let perfectFlashUntil = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const balls: OrbBall[] = [];
    const shots: OrbShot[] = [];
    const particles: OrbParticle[] = [];
    const powers: OrbPower[] = [];
    let shieldCharges = 0;
    let frozenUntil = 0;
    let powerCall = "";
    let powerCallUntil = 0;
    const resolveAsset = (source: string) => {
      const resolver = (globalThis as typeof globalThis & { __asset?: (src: string) => string }).__asset;
      return typeof resolver === "function" ? resolver(source) : source;
    };
    const projectileImage = new Image();
    projectileImage.src = resolveAsset(ORB_WEAPONS[fighter]);
    const objectImages = ORB_OBJECTS.map((source) => {
      const image = new Image();
      image.src = resolveAsset(source);
      return image;
    });

    const playTone = (frequency: number, duration = 0.06, type: OscillatorType = "square") => {
      if (!soundOnRef.current) return;
      try {
        const AudioContextClass = window.AudioContext;
        const audio = audioRef.current ?? new AudioContextClass();
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
        // The game remains playable when Safari blocks audio.
      }
    };

    const syncHud = () => {
      const now = performance.now();
      setHud({ score, lives, remaining: balls.length, wave, rapid: now < rapidUntil, chain, perfect: now < perfectFlashUntil, shield: shieldCharges > 0, frozen: now < frozenUntil, power: now < powerCallUntil ? powerCall : "" });
      heroRef.current?.classList.toggle("orb-shielded", shieldCharges > 0);
    };

    const resize = () => {
      const previousWidth = width;
      const previousHeight = height;
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(320, bounds.width);
      height = Math.max(360, bounds.height);
      const cores = navigator.hardwareConcurrency || 8;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      const isRaspberryPi = /linux arm|aarch64/i.test(navigator.userAgent);
      const ratioCap = isRaspberryPi ? 1.3 : cores <= 4 && memory < 6 ? 1.35 : 1.75;
      pixelRatio = Math.min(ratioCap, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (previousWidth > 0 && previousHeight > 0) {
        const scaleX = width / previousWidth;
        const scaleY = height / previousHeight;
        heroX *= scaleX;
        balls.forEach((ball) => {
          ball.x *= scaleX;
          ball.y *= scaleY;
        });
        shots.forEach((shot) => {
          shot.x *= scaleX;
          shot.y *= scaleY;
        });
      }
    };

    resize();
    heroX = width / 2;
    const largeRadius = clamp(width * 0.08, 64, 92);
    const spawnWave = (nextWave: number) => {
      wave = nextWave;
      waveLivesStart = lives;
      waveCallUntil = performance.now() + 1250;
      const count = Math.min(5, nextWave + 1);
      for (let index = 0; index < count; index += 1) {
        const direction = index % 2 === 0 ? 1 : -1;
        const kind = ((nextWave - 1 + index) % ORB_OBJECTS.length) as OrbObjectKind;
        balls.push({ id: nextId++, x: width * (0.2 + index * 0.6 / Math.max(1, count - 1)), y: height * (0.18 + (index % 2) * 0.09), vx: direction * (138 + nextWave * 22 + index * 10), vy: -60 + index * 25, radius: largeRadius, tier: 2, hue: OBJECT_HUES[kind], kind, angle: (index - 1) * 0.11, spin: direction * (0.5 + index * 0.08) });
      }
      syncHud();
    };
    spawnWave(1);
    setStatus("playing");
    syncHud();

    const setHeroDirection = (direction: number) => {
      if (!heroArtRef.current || direction === heroDirection) return;
      heroDirection = direction;
      heroArtRef.current.className = `fighter-art ${fighter} orb-held ${direction > 0 ? "face-right" : "face-left"}`;
      if (heroRef.current) heroRef.current.dataset.direction = direction > 0 ? "right" : "left";
    };

    const fire = (fromBuffer = false) => {
      const now = performance.now();
      const rapid = now < rapidUntil;
      if (currentStatus !== "playing") return;
      if (now - lastShotAt < (rapid ? 105 : 260) || shots.length >= (rapid ? 5 : 2)) {
        if (!fromBuffer) queuedShotUntil = now + 180;
        return;
      }
      queuedShotUntil = 0;
      lastShotAt = now;
      const floorY = height * 0.965;
      const heroVisualWidth = clamp(width * 0.105, 105, 155);
      const heroVisualHeight = clamp(height * 0.34, 170, 245);
      const weaponSide = fighter === "maletilla" ? -heroDirection : heroDirection;
      const handOffset = heroVisualWidth * 0.25 * weaponSide;
      shots.push({ id: nextId++, x: heroX + handOffset, y: floorY - heroVisualHeight * 0.9 });
      const hero = heroRef.current;
      if (hero) {
        window.clearTimeout(firingTimer);
        hero.classList.add("orb-firing");
        firingTimer = window.setTimeout(() => hero.classList.remove("orb-firing"), rapid ? 100 : 240);
      }
      hero?.animate(
        [
          { transform: "translateX(-50%) translateY(0) scale(1)" },
          { transform: "translateX(-50%) translateY(2px) scale(1)" },
          { transform: "translateX(-50%) translateY(0) scale(1)" },
        ],
        { duration: rapid ? 100 : 180, easing: "ease-out" },
      );
      playTone(fighter === "vanessa" ? 330 : 210, 0.07, fighter === "vanessa" ? "sine" : "square");
    };
    fireRef.current = () => fire();

    const burst = (ball: OrbBall) => {
      const color = `hsl(${ball.hue} 95% 62%)`;
      for (let index = 0; index < 16; index += 1) {
        const angle = (Math.PI * 2 * index) / 16;
        const speed = 85 + Math.random() * 170;
        particles.push({
          x: ball.x,
          y: ball.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.48 + Math.random() * 0.25,
          color,
        });
      }
    };

    const splitBall = (ball: OrbBall) => {
      if (ball.tier === 0) return;
      const nextTier = (ball.tier - 1) as 0 | 1;
      const nextRadius = ball.radius * 0.66;
      const launchSpeed = nextTier === 1 ? 205 : 245;
      const riseSpeed = nextTier === 1 ? -355 : -305;
      balls.push(
        { id: nextId++, x: ball.x - 4, y: ball.y, vx: -launchSpeed, vy: riseSpeed, radius: nextRadius, tier: nextTier, hue: ball.hue, kind: ball.kind, angle: ball.angle - 0.12, spin: -Math.abs(ball.spin) * 1.2 },
        { id: nextId++, x: ball.x + 4, y: ball.y, vx: launchSpeed, vy: riseSpeed, radius: nextRadius, tier: nextTier, hue: ball.hue, kind: ball.kind, angle: ball.angle + 0.12, spin: Math.abs(ball.spin) * 1.2 },
      );
    };

    const finish = (nextStatus: Exclude<OrbStatus, "playing">) => {
      if (currentStatus !== "playing") return;
      currentStatus = nextStatus;
      setStatus(nextStatus);
      if (nextStatus === "won") {
        playTone(440, 0.12, "sine");
        victoryToneTimer = window.setTimeout(() => playTone(660, 0.18, "sine"), 110);
        if (campaign) completionTimer = window.setTimeout(() => onCompleteRef.current(score), 1750);
        else onCompleteRef.current(score);
      } else {
        playTone(72, 0.28, "sawtooth");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", "h", "j", "k", "l", " "].includes(key)) event.preventDefault();
      if (key === "arrowleft" || key === "a") inputRef.current.left = true;
      if (key === "arrowright" || key === "d") inputRef.current.right = true;
      if (key === "arrowup" || key === "w" || key === "1" || key === "2" || key === "3" || key === "4") {
        if (!event.repeat) fire();
      }
      if ((key === "h" || key === "j" || key === "k" || key === "l" || key === " ") && !event.repeat) fire();
      if (key === "escape") onExitRef.current();
      if (key === "enter" && !event.repeat) fire();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") inputRef.current.left = false;
      if (key === "arrowright" || key === "d") inputRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", resize);
    const releaseInput = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
      heroVelocity = 0;
      queuedShotUntil = 0;
      heroRef.current?.classList.remove("orb-moving", "orb-walk-start", "orb-walk-fast");
    };
    const releaseWhenHidden = () => { if (document.hidden) releaseInput(); };
    window.addEventListener("blur", releaseInput);
    document.addEventListener("visibilitychange", releaseWhenHidden);

    const drawBall = (ball: OrbBall) => {
      const objectImage = objectImages[ball.kind];
      const visualSize = ball.radius * 2.08;
      context.save();
      context.translate(ball.x, ball.y);
      context.rotate(ball.angle);
      context.shadowColor = OBJECT_GLOWS[ball.kind];
      context.shadowBlur = ball.tier === 2 ? 27 : ball.tier === 1 ? 20 : 14;
      context.beginPath();
      context.arc(0, 0, ball.radius * 0.94, 0, Math.PI * 2);
      context.fillStyle = "rgba(10, 6, 5, 0.3)";
      context.fill();
      context.lineWidth = Math.max(2, ball.radius * 0.055);
      context.strokeStyle = OBJECT_GLOWS[ball.kind];
      context.stroke();
      if (objectImage.complete && objectImage.naturalWidth > 0) {
        const imageScale = Math.min(visualSize / objectImage.naturalWidth, visualSize / objectImage.naturalHeight);
        const imageWidth = objectImage.naturalWidth * imageScale;
        const imageHeight = objectImage.naturalHeight * imageScale;
        context.drawImage(objectImage, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      } else {
        context.fillStyle = OBJECT_GLOWS[ball.kind];
        context.fillRect(-ball.radius * 0.65, -ball.radius * 0.65, ball.radius * 1.3, ball.radius * 1.3);
      }
      if (ball.tier > 0) {
        context.rotate(-ball.angle);
        context.fillStyle = "rgba(7, 4, 3, 0.82)";
        context.beginPath();
        context.arc(ball.radius * 0.62, -ball.radius * 0.62, Math.max(10, ball.radius * 0.19), 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fff4d2";
        context.font = `900 ${Math.max(10, ball.radius * 0.2)}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(ball.tier === 2 ? "3" : "2", ball.radius * 0.62, -ball.radius * 0.62 + 1);
      }
      context.restore();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const floorY = height * 0.965;
      const floorGradient = context.createLinearGradient(0, floorY - 35, 0, floorY + 4);
      floorGradient.addColorStop(0, "rgba(255, 120, 35, 0)");
      floorGradient.addColorStop(1, "rgba(255, 120, 35, 0.42)");
      context.fillStyle = floorGradient;
      context.fillRect(0, floorY - 35, width, 39);
      context.strokeStyle = "rgba(255, 183, 85, 0.72)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, floorY);
      context.lineTo(width, floorY);
      context.stroke();

      balls.forEach(drawBall);
      if (performance.now() < frozenUntil) {
        context.save();
        context.fillStyle = "rgba(150, 220, 255, 0.12)";
        context.fillRect(0, 0, width, floorY);
        balls.forEach((ball) => {
          context.beginPath();
          context.arc(ball.x, ball.y, ball.radius * 1.02, 0, Math.PI * 2);
          context.strokeStyle = "rgba(210, 245, 255, 0.9)";
          context.lineWidth = 4;
          context.stroke();
        });
        context.restore();
      }
      powers.forEach((power) => {
        const style = POWER_STYLE[power.kind];
        const remaining = power.expires - performance.now();
        if (remaining < 1800 && Math.floor(remaining / 120) % 2 === 0) return;
        const bob = Math.sin(performance.now() / 160) * 3;
        context.save();
        context.translate(power.x, power.y + bob);
        context.shadowColor = style.color;
        context.shadowBlur = 22;
        context.beginPath();
        context.arc(0, 0, 20, 0, Math.PI * 2);
        context.fillStyle = "rgba(8, 6, 14, 0.85)";
        context.fill();
        context.lineWidth = 4;
        context.strokeStyle = style.color;
        context.stroke();
        context.shadowBlur = 0;
        context.fillStyle = style.color;
        context.font = "900 22px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(style.icon, 0, 1);
        context.restore();
      });

      shots.forEach((shot) => {
        const isMaletilla = fighter === "maletilla";
        const weaponWidth = isMaletilla ? 38 : 46;
        const weaponHeight = isMaletilla ? 62 : 68;
        const beamTop = Math.min(floorY, shot.y + weaponHeight * 0.28);
        const shotGradient = context.createLinearGradient(shot.x, floorY, shot.x, beamTop);
        shotGradient.addColorStop(0, fighter === "vanessa" ? "rgba(255, 79, 149, 0.28)" : "rgba(255, 139, 43, 0.28)");
        shotGradient.addColorStop(0.3, fighter === "vanessa" ? "#ff4f95" : "#ff8b2b");
        shotGradient.addColorStop(1, "#fff5bd");
        context.save();
        context.shadowColor = fighter === "vanessa" ? "#ff4f95" : "#ff8b2b";
        context.shadowBlur = 22;
        context.fillStyle = shotGradient;
        context.fillRect(shot.x - 4, beamTop, 8, Math.max(4, floorY - beamTop));
        context.beginPath();
        context.arc(shot.x, shot.y, isMaletilla ? 24 : 28, 0, Math.PI * 2);
        context.fillStyle = fighter === "vanessa" ? "rgba(255, 57, 149, 0.24)" : "rgba(255, 150, 48, 0.24)";
        context.fill();
        if (projectileImage.complete && projectileImage.naturalWidth > 0) {
          context.translate(shot.x, shot.y);
          const uprightRotation = isMaletilla ? -0.08 : -0.48;
          context.rotate(uprightRotation + Math.sin((height - shot.y) * 0.025) * 0.06);
          context.drawImage(projectileImage, -weaponWidth / 2, -weaponHeight / 2, weaponWidth, weaponHeight);
        } else {
          context.fillStyle = "#fff";
          context.fillRect(shot.x - 5, shot.y - 28, 10, 56);
        }
        context.restore();
      });

      particles.forEach((particle) => {
        context.globalAlpha = clamp(particle.life * 1.8, 0, 1);
        context.fillStyle = particle.color;
        context.fillRect(particle.x - 2, particle.y - 2, 4, 4);
      });
      context.globalAlpha = 1;

      const now = performance.now();
      if (now < waveCallUntil) {
        const progress = clamp((waveCallUntil - now) / 1250, 0, 1);
        context.save();
        context.globalAlpha = Math.min(1, progress * 2.4);
        context.fillStyle = "rgba(7,3,8,.62)";
        context.fillRect(0, height * .38, width, height * .22);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#ffb13f";
        context.font = `italic 900 ${clamp(width * .06, 34, 76)}px Impact, sans-serif`;
        context.fillText(`FASE ${wave} / ${MAX_ORB_WAVES}`, width / 2, height * .48);
        context.fillStyle = "#fff3cc";
        context.font = `900 ${clamp(width * .017, 11, 22)}px Arial, sans-serif`;
        context.fillText(wave === MAX_ORB_WAVES ? "¡PANTALLA FINAL!" : "PREPÁRATE", width / 2, height * .55);
        context.restore();
      }
    };

    const update = (time: number) => {
      if (document.hidden) {
        previousTime = time;
        animationFrame = window.requestAnimationFrame(update);
        return;
      }
      const delta = Math.min(0.034, Math.max(0.001, (time - previousTime) / 1000));
      previousTime = time;
      const floorY = height * 0.965;

      if (currentStatus === "playing") {
        if (queuedShotUntil > 0) {
          if (time <= queuedShotUntil) fire(true);
          else queuedShotUntil = 0;
        }
        const movement = Number(inputRef.current.right) - Number(inputRef.current.left);
        if (movement !== 0) {
          heroVelocity += movement * 1400 * delta;
          setHeroDirection(movement);
        } else {
          heroVelocity *= Math.pow(0.64, delta * 60);
        }
        heroVelocity = clamp(heroVelocity, -430, 430);
        heroX = clamp(heroX + heroVelocity * delta, 34, width - 34);
        if (heroX <= 34 || heroX >= width - 34) heroVelocity *= .35;

        if (chain > 0 && time > chainUntil) {
          chain = 0;
          syncHud();
        }

        if (heroRef.current) {
          const speed = Math.abs(heroVelocity);
          heroRef.current.style.left = `${heroX}px`;
          heroRef.current.style.opacity = invulnerableUntil > time && Math.floor(time / 85) % 2 === 0 ? "0.72" : "1";
          heroRef.current.classList.toggle("orb-moving", speed > 24);
          heroRef.current.classList.toggle("orb-walk-start", speed > 24 && speed < 170);
          heroRef.current.classList.toggle("orb-walk-fast", speed >= 170);
        }

        shots.forEach((shot) => {
          shot.y -= 620 * delta;
        });
        for (let shotIndex = shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
          if (shots[shotIndex].y < -35) shots.splice(shotIndex, 1);
        }

        const frozen = time < frozenUntil;
        balls.forEach((ball) => {
          if (frozen) return;
          ball.vy += 720 * delta;
          ball.x += ball.vx * delta;
          ball.y += ball.vy * delta;
          ball.angle += ball.spin * delta;
          if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx);
          } else if (ball.x + ball.radius > width) {
            ball.x = width - ball.radius;
            ball.vx = -Math.abs(ball.vx);
          }
          if (ball.y + ball.radius > floorY) {
            ball.y = floorY - ball.radius;
            ball.vy = -(285 + ball.tier * 72);
          }
        });

        let orbCountChanged = false;
        for (let shotIndex = shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
          const shot = shots[shotIndex];
          for (let ballIndex = balls.length - 1; ballIndex >= 0; ballIndex -= 1) {
            const ball = balls[ballIndex];
            const horizontalHit = Math.abs(shot.x - ball.x) <= ball.radius + 11;
            const verticalHit = ball.y + ball.radius >= shot.y && ball.y - ball.radius <= floorY;
            if (horizontalHit && verticalHit) {
              shots.splice(shotIndex, 1);
              balls.splice(ballIndex, 1);
              burst(ball);
              splitBall(ball);
              // Broken objects sometimes drop a power-up; small ones more often.
              const dropChance = ball.tier === 0 ? .16 : ball.tier === 1 ? .1 : .06;
              if (Math.random() < dropChance && powers.length < 3) {
                const roll = Math.random();
                const kind: OrbPowerKind = roll < .38 ? "rapid" : roll < .66 ? "shield" : roll < .9 ? "freeze" : "life";
                powers.push({ id: nextId++, x: ball.x, y: ball.y, vy: -120, kind, expires: time + 7000 });
              }
              chain = time <= chainUntil ? chain + 1 : 1;
              chainUntil = time + 1150;
              const multiplier = Math.min(4, 1 + Math.floor((chain - 1) / 3));
              score += (ball.tier === 2 ? 150 : ball.tier === 1 ? 250 : 400) * multiplier;
              orbCountChanged = true;
              playTone(ball.tier === 0 ? 510 : 390, 0.055, "triangle");
              break;
            }
          }
        }

        if (orbCountChanged) {
          syncHud();
          if (balls.length === 0) {
            if (wave < MAX_ORB_WAVES) {
              if (lives === waveLivesStart) {
                lives = Math.min(MAX_LIVES + 4, lives + 1);
                score += 1200 * wave;
                perfectFlashUntil = time + 1450;
                playTone(720, 0.13, "sine");
              }
              rapidUntil = time + 7000;
              score += 750 * wave;
              spawnWave(wave + 1);
              playTone(560, 0.11, "sine");
            } else finish("won");
          }
        }

        for (let index = powers.length - 1; index >= 0; index -= 1) {
          const power = powers[index];
          power.vy = Math.min(420, power.vy + 640 * delta);
          power.y = Math.min(floorY - 20, power.y + power.vy * delta);
          if (time > power.expires) { powers.splice(index, 1); continue; }
          const reach = clamp(width * 0.04, 34, 56);
          if (Math.abs(power.x - heroX) < reach && power.y > floorY - clamp(height * 0.26, 100, 170)) {
            powers.splice(index, 1);
            if (power.kind === "rapid") rapidUntil = time + 6500;
            if (power.kind === "shield") shieldCharges = 1;
            if (power.kind === "freeze") frozenUntil = time + 3200;
            if (power.kind === "life") lives = Math.min(MAX_LIVES + 4, lives + 1);
            score += 300;
            powerCall = POWER_STYLE[power.kind].label;
            powerCallUntil = time + 1300;
            playTone(power.kind === "freeze" ? 980 : 760, 0.12, "sine");
            window.setTimeout(() => playTone(1180, 0.1, "sine"), 90);
            syncHud();
            window.setTimeout(syncHud, 1350);
          }
        }
        if (frozen !== hudFrozen) { hudFrozen = frozen; syncHud(); }

        if (invulnerableUntil <= time) {
          const heroWidth = clamp(width * 0.055, 42, 68);
          const heroHeight = clamp(height * 0.24, 92, 155);
          const heroLeft = heroX - heroWidth / 2;
          const heroRight = heroX + heroWidth / 2;
          const heroTop = floorY - heroHeight;
          for (const ball of balls) {
            const closestX = clamp(ball.x, heroLeft, heroRight);
            const closestY = clamp(ball.y, heroTop, floorY);
            const deltaX = ball.x - closestX;
            const deltaY = ball.y - closestY;
            if (deltaX * deltaX + deltaY * deltaY < ball.radius * ball.radius) {
              if (shieldCharges > 0) {
                // The shield takes the hit instead of a life.
                shieldCharges = 0;
                invulnerableUntil = time + 1200;
                ball.vx = ball.x < heroX ? -Math.abs(ball.vx) : Math.abs(ball.vx);
                ball.vy = -380;
                burst(ball);
                playTone(300, 0.14, "triangle");
                syncHud();
                break;
              }
              lives -= 1;
              chain = 0;
              invulnerableUntil = time + (difficulty === "easy" ? 2600 : 1900);
              ball.vx = ball.x < heroX ? -Math.abs(ball.vx) : Math.abs(ball.vx);
              ball.vy = -340;
              syncHud();
              heroRef.current?.animate(
                [
                  { transform: "translateX(-50%) rotate(0deg)" },
                  { transform: "translateX(-50%) rotate(-9deg) translateY(-12px)" },
                  { transform: "translateX(-50%) rotate(7deg) translateY(3px)" },
                  { transform: "translateX(-50%) rotate(0deg)" },
                ],
                { duration: 480, easing: "ease-out" },
              );
              playTone(82, 0.18, "sawtooth");
              if (lives <= 0) finish("lost");
              break;
            }
          }
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= delta;
        particle.vy += 420 * delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.life <= 0) particles.splice(index, 1);
      }

      draw();
      animationFrame = window.requestAnimationFrame(update);
    };

    animationFrame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(firingTimer);
      window.clearTimeout(completionTimer);
      window.clearTimeout(victoryToneTimer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", releaseInput);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      releaseInput();
      fireRef.current = () => undefined;
    };
  }, [campaign, difficulty, fighter, round]);

  useEffect(() => () => {
    if (audioRef.current) void audioRef.current.close();
  }, []);

  const holdMovement = (direction: "left" | "right", active: boolean) => {
    inputRef.current[direction] = active;
  };

  const beginTouch = (event: ReactPointerEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    action();
  };

  return (
    <div className="orb-mode" aria-label="Modo Rompeobjetos">
      <canvas ref={canvasRef} className="orb-canvas" aria-hidden="true" />
      {status === "playing" && <ArcadeCrowd
        mode="orbs"
        seed={hud.wave - 1}
        phase={status}
        cue={hud.remaining > 0 ? { direction: "center", label: hud.perfect ? "¡VIDA EXTRA!" : "¡OBJETOS!" } : null}
      />}

      <div className="orb-hud" aria-live="polite">
        <div><small>VIDAS{hud.shield ? " · ESCUDO" : ""}</small><strong>♥ × {hud.lives}{hud.shield ? " ◆" : ""}</strong></div>
        <div className="orb-title"><small>MODO · FASE {hud.wave}/{MAX_ORB_WAVES}</small><strong>ROMPEOBJETOS</strong><span>{hud.remaining} EN PANTALLA · {hud.power ? hud.power : hud.frozen ? "¡TIEMPO CONGELADO!" : hud.chain >= 2 ? `CADENA ×${hud.chain}` : hud.perfect ? "¡FASE PERFECTA · +1 VIDA!" : hud.rapid ? "RÁFAGA ACTIVA" : "GRANDE → MEDIANO → PEQUEÑO"}</span></div>
        <div><small>PUNTOS</small><strong>{String(hud.score).padStart(6, "0")}</strong></div>
      </div>

      <div ref={heroRef} className={`orb-hero ${fighter} ${status === "won" ? "orb-victory-dance" : status === "lost" ? "orb-defeated" : ""}`} data-direction="right" style={{ left: "50%" }} aria-label={`${fighterName}, jugador`} role="img">
        <div ref={heroArtRef} className={`fighter-art ${fighter} orb-held face-right`}>{fighter !== "elchica" && fighter !== "ogalla" && <FighterWalkLayers />}</div>
      </div>

      <div className="orb-instructions">A / D PARA MOVER · ESPACIO, J O K PARA DISPARAR · ESC PARA SALIR</div>

      {status === "playing" && (
        <div className="orb-touch-controls mode-stick-layout" aria-label="Controles de Rompeobjetos">
          <TouchStick label="Joystick: mover a izquierda o derecha, arriba para disparar" hint="MOVER · ↑ DISPARA" onChange={(intent) => {
            holdMovement("left", intent.left);
            holdMovement("right", intent.right);
            if (intent.up && !stickUpRef.current) fireRef.current();
            stickUpRef.current = intent.up;
          }} />
          <button type="button" className="orb-fire-button" onPointerDown={(event) => beginTouch(event, () => fireRef.current())} aria-label="Disparar">●<small>DISPARAR</small></button>
        </div>
      )}
      {status === "playing" && <button type="button" className="orb-touch-exit" onPointerDown={(event) => beginTouch(event, onExit)} aria-label="Salir al menú">← MENÚ</button>}

      {status !== "playing" && (
        <div className={`orb-result ${status}`} aria-live="assertive">
          <ArcadeCrowd mode="orbs" seed={hud.wave + 3} phase={status} react={status === "won"} />
          {status === "won" && (
            <div className={`result-dancer compact ${fighter}`} aria-label={`${fighterName} bailando`} role="img">
              <span className="dance-floor-ring" /><span className={`result-dancer-art ${fighter}`} />
              <i className="dance-note dance-note-one">♪</i><i className="dance-note dance-note-two">♫</i><i className="dance-note dance-note-three">★</i><i className="dance-note dance-note-four">♥</i><i className="dance-note dance-note-five">✦</i>
            </div>
          )}
          <span>{status === "won" ? "ESCENARIO LIMPIO" : "FIN DE LA PARTIDA"}</span>
          <h2>{status === "won" ? "¡TODO ROTO!" : "TE HAN ATRAPADO"}</h2>
          <p>{status === "won" ? `${fighterName} suma ${hud.score} puntos.` : `Has conseguido ${hud.score} puntos.`}</p>
          {campaign && status === "won" && <b className="campaign-next">SIGUIENTE: AVENTURA CENTRAL…</b>}
          <div className={campaign && status === "won" ? "campaign-hidden-actions" : ""}>
            <button type="button" className="fight-button" onClick={() => setRound((value) => value + 1)}>OTRA PARTIDA</button>
            <button type="button" className="secondary-button" onClick={onExit}>VOLVER AL MENÚ</button>
          </div>
        </div>
      )}
    </div>
  );
}
