// Every fighter's SUPER HARDCORE: its own name, animation pattern and an extra
// power that changes the fight after the hit lands.

import type { ProfileFighterId } from "./fighter-profiles";

/** How the super looks on screen. */
export type SuperPattern = "rain" | "beam" | "summon" | "wave" | "barrage" | "quake";
/** What the super does on top of the damage. */
export type SuperBonus = "multi" | "drain" | "heal" | "poison" | "armor" | "stun" | "push" | "crush";

export type SuperMove = {
  name: string;
  pattern: SuperPattern;
  bonus: SuperBonus;
  /** Short text shown when the bonus triggers. */
  bonusCall: string;
  /** One-line description for the moves guide and the lobby dossier. */
  description: string;
  assets: string[];
  /** Extra hits for "multi". */
  hits?: number;
};

const A = {
  cloretilo: "/assets/mobile/cloretilo-projectile-v1.webp",
  mushroom: "/assets/mushroom-attack-mobile.webp",
  mic: "/assets/microphone-attack-mobile.webp",
  ear: "/assets/ear-attack-mobile.webp",
  bag: "/assets/josevictor/white-bag.webp",
  money: "/assets/josevictor/money-tube.webp",
  vinyl: "/assets/cristian/vinyl.webp",
  speaker: "/assets/cristian/speaker-krk8.webp",
  fish: "/assets/new-fighters/fish.svg",
  venom: "/assets/new-fighters/venom.svg",
  toad: "/assets/new-fighters/super-toad.svg",
  shield: "/assets/new-fighters/shield.svg",
  anchor: "/assets/new-fighters/anchor.svg",
  chain: "/assets/new-fighters/chain.svg",
  jager: "/assets/new-fighters/jager.svg",
  amber: "/assets/new-fighters/amber.svg",
  scepter: "/assets/new-fighters/scepter.svg",
  artichoke: "/assets/new-fighters/artichokes.svg",
  dog: "/assets/new-fighters/xuso-v3/perro-mordisco-05.webp",
  hoe: "/assets/new-fighters/hoe.svg",
  flag: "/assets/new-fighters/rafeta-flag.svg",
  bullet: "/assets/new-fighters/tonimassama-bullet.svg",
  peineta: "/assets/new-fighters/tonimassama-peineta-logo.webp",
};

export const SUPER_MOVES: Record<ProfileFighterId, SuperMove> = {
  "mad-dog": { name: "SIN ESPECIAL", pattern: "wave", bonus: "push", bonusCall: "", description: "Aún sin especial", assets: [] },
  angerfist: { name: "SIN ESPECIAL", pattern: "wave", bonus: "push", bonusCall: "", description: "Aún sin especial", assets: [] },
  dalmau: { name: "SIN ESPECIAL", pattern: "wave", bonus: "push", bonusCall: "", description: "Aún sin especial", assets: [] },
  maletilla: { name: "APOCALIPSIS DE CLORETILO", pattern: "rain", bonus: "multi", hits: 3, bonusCall: "¡TRIPLE IMPACTO!", description: "Lluvia de setas y cloretilo: 3 impactos seguidos", assets: [A.mushroom, A.cloretilo] },
  vanessa: { name: "REINA DEL ESTRUENDO", pattern: "beam", bonus: "push", bonusCall: "¡CONTRA LA PARED!", description: "Onda de sonido que lanza al rival hasta la pared", assets: [A.mic, A.ear] },
  josevictor: { name: "BANCA ROTA", pattern: "rain", bonus: "drain", bonusCall: "¡TE COMPRO LA BARRA!", description: "Billetes del cielo: vacía la barra SUPER del rival", assets: [A.money, A.bag] },
  cristian: { name: "HARDCORE SÓNICO", pattern: "beam", bonus: "stun", bonusCall: "¡MAREADO!", description: "El drop más bestia: deja al rival mareado sin poder atacar", assets: [A.speaker, A.vinyl] },
  cesaret: { name: "MAREA SALVAJE", pattern: "wave", bonus: "push", bonusCall: "¡ARRASTRADO!", description: "Una ola de peces arrastra al rival hasta la pared", assets: [A.fish] },
  borja: { name: "SAPO TITÁN", pattern: "summon", bonus: "poison", bonusCall: "¡ENVENENADO!", description: "Invoca un sapo gigante: el veneno sigue haciendo daño", assets: [A.toad] },
  bacora: { name: "MURALLA DE LA W", pattern: "wave", bonus: "armor", bonusCall: "¡ESCUDO TOTAL!", description: "Muro de escudos: Bacora queda inmune unos segundos", assets: [A.shield] },
  bonviure: { name: "MAREA DEL ANCLA NEGRA", pattern: "summon", bonus: "crush", bonusCall: "¡APLASTADO!", description: "Un ancla gigante cae del cielo: el golpe más fuerte", assets: [A.anchor, A.chain] },
  elchica: { name: "BRINDIS DEL CAOS", pattern: "barrage", bonus: "heal", bonusCall: "¡SALUD! +15", description: "Ráfaga de botellas: El Chica recupera vida", assets: [A.jager, A.amber] },
  ogalla: { name: "CORONA DE ALCACHOFAS", pattern: "rain", bonus: "multi", hits: 3, bonusCall: "¡COSECHA TRIPLE!", description: "Cae una cosecha de alcachofas: 3 impactos", assets: [A.artichoke, A.scepter] },
  xuso: { name: "MORDISCO DE PRISON", pattern: "barrage", bonus: "multi", hits: 4, bonusCall: "¡SPOOKY NO SUELTA!", description: "Spooky se hace gigante, abre la boca y muerde: 4 mordiscos", assets: ["/assets/new-fighters/xuso-v3/perro-mordisco-05.webp"] },
  bomba: { name: "SURCO DEL TERREMOTO", pattern: "quake", bonus: "crush", bonusCall: "¡TERREMOTO!", description: "Golpea el suelo y hace temblar todo Central", assets: [A.hoe] },
  rafeta: { name: "ESTANDARTE INVENCIBLE", pattern: "wave", bonus: "armor", bonusCall: "¡LA BANDERA PROTEGE!", description: "Ola de banderas: Rafeta queda inmune unos segundos", assets: [A.flag] },
  tonimassama: { name: "JUICIO DE ORO", pattern: "barrage", bonus: "multi", hits: 4, bonusCall: "¡CARGADOR VACÍO!", description: "Ráfaga de balas y peinetas doradas: 4 impactos", assets: [A.bullet, A.peineta] },
  estefy: { name: "SELVA DE ACERO", pattern: "wave", bonus: "multi", hits: 3, bonusCall: "¡TRES MACHETAZOS!", description: "Ola de machetazos y hojas: 3 cortes seguidos", assets: ["/assets/new-fighters/estefy/machete-arco.webp", "/assets/new-fighters/estefy/machete-hojas.webp"] },
  nova: { name: "SINGULARIDAD PRISMÁTICA", pattern: "beam", bonus: "drain", bonusCall: "¡ENERGÍA ABSORBIDA!", description: "Láser arcoíris que absorbe la barra SUPER del rival", assets: [A.bullet] },
};
