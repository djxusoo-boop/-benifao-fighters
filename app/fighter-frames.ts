// The fight loads only the two selected fighters, rather than every pose in
// the roster. These are the images used by the fight's CSS animations.
const normalized = (fighter: string, names: string[]) => names.map((name) => `/assets/actions-normalized-v1/${fighter}/${name}.webp`);
const walk = (fighter: string) => [1, 2, 3].map((frame) => `/assets/walk-normalized-v1/${fighter}/frame-${frame}.png`);
const newFighter = (fighter: string) => ["idle", "walk", "walk2-v1", "attack", "punch-v1", "kick-v1", "jump-v1", "crouch-v1", "guard-v1", "dodge-v1", "hit-v1", "knockdown-v1", "getup-v1"].map((name) => `/assets/new-fighters/${fighter}-${name}.webp`);
const rig = (fighter: string, revision = "v21845") => ["idle", "walk", "punch", "kick", "recover"].map((pose) => `/assets/new-fighters/${fighter}-rig-${revision}-${pose}.png`);

import { NEW_FIGHTER_POSES, newFighterFrame } from "./new-fighter-poses";

const draftFrames = (id: keyof typeof NEW_FIGHTER_POSES) => [...new Set(Object.values(NEW_FIGHTER_POSES[id]).flat().map(frame => newFighterFrame(id, frame)))];
export const FIGHTER_FRAMES = {
  "mad-dog": draftFrames("mad-dog"), angerfist: draftFrames("angerfist"), dalmau: draftFrames("dalmau"),
  maletilla: [
    ...normalized("maletilla", ["maletilla-00", "maletilla-01", "maletilla-02", "maletilla-03", "maletilla-06", "maletilla-07-clean-v1", "maletilla-08", "maletilla-09-clean-v1", "maletilla-extra-09-knockdown-v2", "maletilla-extra-10-defeated-v2"]),
    "/assets/safe-frames/maletilla-punch.svg",
  ],
  vanessa: [
    ...walk("vanessa"),
    ...normalized("vanessa", ["vanessa-00", "vanessa-03", "vanessa-05", "vanessa-09-clean-v1", "vanessa-10-clean-v1", "vanessa-motion-05-punch-windup-clean-v1", "vanessa-motion-08-kick-windup-v1", "vanessa-motion-09-kick-contact-v1", "vanessa-motion-10-jump-crouch-v1", "vanessa-motion-11-jump-air-v1"]),
  ],
  josevictor: [
    ...walk("josevictor"),
    ...normalized("josevictor", ["idle-clean-v1", "guard", "punch-clean-v1", "kick-windup", "kick", "jump-takeoff", "jump-air", "crouch", "throw-money-clean-v1", "hit-clean-v1", "getup", "defeated-clean-v1"]),
  ],
  cristian: [
    ...walk("cristian"),
    ...normalized("cristian", ["idle", "block", "punch", "crouch", "kick", "getup", "jump", "throw-vinyl", "hit"]),
  ],
  cesaret: newFighter("cesaret"),
  borja: [...newFighter("borja"), ...["punch", "kick"].map((move) => `/assets/new-fighters/borja-${move}-strip-v21836.png`)],
  bacora: [...rig("bacora", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/bacora-${move}-strip-v21836.png`), "/assets/new-fighters/bacora-crouch.webp", "/assets/new-fighters/bacora-jump-v1.webp", "/assets/new-fighters/bacora-release-shield-v1.webp", "/assets/new-fighters/bacora-staff-v21849.webp"],
  bonviure: [...rig("bonviure", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/bonviure-${move}-strip-v21836.png`), ...["crouch", "jump", "guard", "hit", "down", "anchor"].map((pose) => `/assets/new-fighters/bonviure-${pose}-v21849.png`), "/assets/new-fighters/bonviure-chain-clean.webp"],
  elchica: [...rig("elchica", "v21849"), ...["punch", "kick"].map((move) => `/assets/new-fighters/elchica-${move}-strip-v21836.png`), "/assets/new-fighters/elchica-crouch-v21849.webp", "/assets/new-fighters/elchica-bottle-special-v2.webp", "/assets/new-fighters/elchica-throw-special-v2.webp"],
  ogalla: [...["punch-1", "punch-2", "punch-3", "punch-4", "kick-1", "kick-3"].map((pose) => `/assets/new-fighters/ogalla-${pose}.png`), ...["punch", "kick"].map((move) => `/assets/new-fighters/ogalla-${move}-strip-v21836.png`), ...["idle", "walk", "guard"].map((pose) => `/assets/new-fighters/ogalla-${pose}-v2.png`), "/assets/new-fighters/ogalla-staff-special-v2.webp", "/assets/new-fighters/ogalla-artichoke-attack-v2.webp"],
  xuso: ["/assets/new-fighters/xuso-v3/xuso-reposo-01.webp", "/assets/new-fighters/xuso-v3/xuso-reposo-02.webp", "/assets/new-fighters/xuso-v3/xuso-reposo-03.webp", "/assets/new-fighters/xuso-v3/xuso-reposo-04.webp", "/assets/new-fighters/xuso-v3/xuso-caminar-01.webp", "/assets/new-fighters/xuso-v3/xuso-caminar-02.webp", "/assets/new-fighters/xuso-v3/xuso-caminar-03.webp", "/assets/new-fighters/xuso-v3/xuso-caminar-04.webp", "/assets/new-fighters/xuso-v3/xuso-correr-01.webp", "/assets/new-fighters/xuso-v3/xuso-correr-02.webp", "/assets/new-fighters/xuso-v3/xuso-correr-03.webp", "/assets/new-fighters/xuso-v3/xuso-correr-04.webp", "/assets/new-fighters/xuso-v3/xuso-bloquear.webp", "/assets/new-fighters/xuso-v3/xuso-esquivar.webp", "/assets/new-fighters/xuso-v3/xuso-agacharse.webp", "/assets/new-fighters/xuso-v3/xuso-salto-aire.webp", "/assets/new-fighters/xuso-v3/xuso-recibir-golpe.webp", "/assets/new-fighters/xuso-v3/xuso-derribo-02.webp", "/assets/new-fighters/xuso-v3/xuso-derribo-03.webp", "/assets/new-fighters/xuso-v3/xuso-derrotado.webp", "/assets/new-fighters/xuso-v3/xuso-levantarse-02.webp", "/assets/new-fighters/xuso-v3/xuso-levantarse-03.webp", "/assets/new-fighters/xuso-v3/xuso-levantarse-04.webp", "/assets/new-fighters/xuso-v3/xuso-punio-01.webp", "/assets/new-fighters/xuso-v3/xuso-punio-02.webp", "/assets/new-fighters/xuso-v3/xuso-punio-03.webp", "/assets/new-fighters/xuso-v3/xuso-punio-04.webp", "/assets/new-fighters/xuso-v3/xuso-patada-01.webp", "/assets/new-fighters/xuso-v3/xuso-patada-02.webp", "/assets/new-fighters/xuso-v3/xuso-patada-03.webp", "/assets/new-fighters/xuso-v3/xuso-patada-04.webp", "/assets/new-fighters/xuso-v3/xuso-orden-perro-01.webp", "/assets/new-fighters/xuso-v3/xuso-orden-perro-02.webp", "/assets/new-fighters/xuso-v3/xuso-orden-perro-03.webp", "/assets/new-fighters/xuso-v3/xuso-orden-perro-04.webp", "/assets/new-fighters/xuso-v3/xuso-victoria-01.webp", "/assets/new-fighters/xuso-v3/xuso-victoria-02.webp", "/assets/new-fighters/xuso-v3/xuso-victoria-03.webp", "/assets/new-fighters/xuso-v3/xuso-victoria-04.webp", "/assets/new-fighters/xuso-v3/perro-correr-01.webp", "/assets/new-fighters/xuso-v3/perro-correr-02.webp", "/assets/new-fighters/xuso-v3/perro-correr-03.webp", "/assets/new-fighters/xuso-v3/perro-correr-04.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-03.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-04.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-05.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-06.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-07.webp", "/assets/new-fighters/xuso-v3/perro-mordisco-08.webp", "/assets/new-fighters/xuso-v3/perro-alerta.webp", "/assets/new-fighters/xuso-v3/perro-pata-arriba.webp", "/assets/new-fighters/xuso-v3/meada-1.webp", "/assets/new-fighters/xuso-v3/meada-2.webp", "/assets/new-fighters/xuso-v3/meada-3.webp", "/assets/new-fighters/xuso-v3/diseno.webp"],
  bomba: [...["idle", "walk", "guard"].map((pose) => `/assets/new-fighters/bomba-${pose}-v2.png`), "/assets/new-fighters/hoe.svg", "/assets/new-fighters/bomba-hoe-attack-v2.webp", ...["recover", "punch", "kick"].map((pose) => `/assets/new-fighters/bomba-rig-v21847-${pose}.webp`), "/assets/new-fighters/bomba-walk-cycle-v2357.webp"],
  rafeta: [
    ...["idle", "walk-a", "walk-b", "walk-c", "guard", "jump", "land", "crouch", "crouch-attack", "punch", "kick", "flag-sweep"].map((pose) => `/assets/new-fighters/rafeta-frames/${pose}.webp`),
    "/assets/new-fighters/rafeta-flag.svg", "/assets/new-fighters/masia-logo.webp",
  ],
  tonimassama: [
    "/assets/new-fighters/tonimassama-pistol-complete-v1.webp",
    ...rig("tonimassama", "v21849"),
    "/assets/new-fighters/tonimassama-rig-v21849-punch.webp", "/assets/new-fighters/tonimassama-rig-v21849-kick.webp",
    ...["a", "b", "c"].map((frame) => `/assets/new-fighters/tonimassama-frames/walk-${frame}.webp`),
    "/assets/new-fighters/tonimassama-crouch-v21849.webp",
    "/assets/new-fighters/tonimassama-bullet.svg", "/assets/new-fighters/tonimassama-peineta-logo.webp",
  ],
  estefy: [
    "/assets/new-fighters/estefy/punio-guardia.webp", "/assets/new-fighters/estefy/machete-guardia.webp", "/assets/new-fighters/estefy/caminar-01.webp", "/assets/new-fighters/estefy/caminar-02.webp", "/assets/new-fighters/estefy/caminar-03.webp", "/assets/new-fighters/estefy/caminar-04.webp", "/assets/new-fighters/estefy/correr-01.webp", "/assets/new-fighters/estefy/correr-02.webp", "/assets/new-fighters/estefy/correr-03.webp", "/assets/new-fighters/estefy/correr-04.webp", "/assets/new-fighters/estefy/bloquear.webp", "/assets/new-fighters/estefy/esquivar.webp", "/assets/new-fighters/estefy/agacharse.webp", "/assets/new-fighters/estefy/salto-inicio.webp", "/assets/new-fighters/estefy/salto-aire.webp", "/assets/new-fighters/estefy/salto-caida.webp", "/assets/new-fighters/estefy/recibir-golpe.webp", "/assets/new-fighters/estefy/levantarse.webp", "/assets/new-fighters/estefy/punio-preparacion.webp", "/assets/new-fighters/estefy/punio-contacto.webp", "/assets/new-fighters/estefy/punio-recuperacion.webp", "/assets/new-fighters/estefy/patada-preparacion.webp", "/assets/new-fighters/estefy/patada-elevacion.webp", "/assets/new-fighters/estefy/patada-contacto.webp", "/assets/new-fighters/estefy/patada-recuperacion.webp", "/assets/new-fighters/estefy/machete-carga.webp", "/assets/new-fighters/estefy/machete-corte.webp", "/assets/new-fighters/estefy/machete-continuacion.webp", "/assets/new-fighters/estefy/machete-arco.webp", "/assets/new-fighters/estefy/machete-hojas.webp", "/assets/new-fighters/estefy/diseno.webp",
  ],
  nova: [
    "/assets/new-fighters/nova-frame-0.webp", "/assets/new-fighters/nova-frame-1.webp",
    "/assets/new-fighters/nova-frame-2.webp", "/assets/new-fighters/nova-frame-3.webp",
  ],
} as const;
