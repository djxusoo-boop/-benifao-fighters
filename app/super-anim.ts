// SUPER animations from the "Superespeciales" pack: 8 fighter frames + 8 companion frames per fighter.
// size/bottom keep the super body at the same scale and foot line as the fighter's normal poses
// (fractions of the fighter box height). mirror = companion frames drawn facing left.

export type SuperAnimData = { size: number; bottom: number; mirror: boolean[]; name: string; companion: string; companionSize?: number; companionBottom?: number };

export const SUPER_ANIM: Record<string, SuperAnimData> = {
  bacora: { size: 1.5658, bottom: -0.0018, mirror: [false, false, false, false, false, false, false, false], name: "MURALLA DE LA W", companion: "Escudo y vara" },
  bomba: { size: 1.5601, bottom: -0.0308, mirror: [false, false, false, false, false, false, false, false], name: "SURCO DEL TERREMOTO", companion: "Azada y golpe de tierra" },
  bonviure: { size: 1.661, bottom: -0.0544, mirror: [false, false, false, false, false, false, false, false], name: "MAREA DEL ANCLA NEGRA", companion: "Ancla y cadena" },
  borja: { size: 1.6568, bottom: -0.062, mirror: [false, false, false, false, false, false, false, false], name: "SAPO TITÁN", companion: "Sapo y salpicadura verde" },
  cesaret: { size: 1.4, bottom: -0.04, mirror: [false, false, false, false, false, false, false, false], name: "MAREA SALVAJE", companion: "Pez gigante y remolino de agua" },
  cristian: { size: 1.2815, bottom: -0.049, mirror: [false, false, false, false, false, false, false, false], name: "HARDCORE SÓNICO", companion: "Vinilos y altavoz" },
  elchica: { size: 1.3788, bottom: 0.0369, mirror: [false, false, false, false, false, false, false, false], name: "BRINDIS DEL CAOS", companion: "Botella y salpicadura ámbar" },
  josevictor: { size: 1.26, bottom: -0.0479, mirror: [false, false, false, false, false, false, false, false], name: "BANCA ROTA", companion: "Bolsas y remolino de billetes" },
  maletilla: { size: 1.2728, bottom: -0.0485, mirror: [false, true, true, true, false, false, false, false], name: "APOCALIPSIS DE CLORETILO", companion: "Aerosol y tormenta de setas" },
  nova: { size: 1.516, bottom: -0.0612, mirror: [false, false, false, true, true, false, false, false], name: "SINGULARIDAD PRISMÁTICA", companion: "Prisma y rayo de neón" },
  ogalla: { size: 1.6943, bottom: -0.0508, mirror: [false, false, false, false, false, false, false, false], name: "CORONA DE ALCACHOFAS", companion: "Alcachofas y hojas" },
  rafeta: { size: 1.4, bottom: -0.04, mirror: [false, false, false, false, false, false, false, false], name: "ESTANDARTE INVENCIBLE", companion: "Bandera y onda de impacto" },
  estefy: { size: 1.6, bottom: -0.05, mirror: [false, false, false, false, false, false, false, false], name: "SELVA DE ACERO", companion: "Machete y hojas de la selva" },
  tonimassama: { size: 1.2449, bottom: -0.0584, mirror: [false, false, false, false, false, false, false, false], name: "JUICIO DE ORO", companion: "Pistola dorada y peinetas" },
  vanessa: { size: 1.2771, bottom: -0.0488, mirror: [false, false, false, false, false, false, false, false], name: "REINA DEL ESTRUENDO", companion: "Micrófono y onda sónica" },
  xuso: { size: 1.68, bottom: -0.045, mirror: [false, false, false, false, false, false, false, false], name: "MORDISCO DE PRISON", companion: "Spooky gigante con la boca abierta", companionSize: 2.7, companionBottom: -0.1 },
};

export const superFrame = (fighter: string, frame: number) => `/assets/supers/${fighter}/p${frame}.webp`;
export const companionFrame = (fighter: string, frame: number) => `/assets/supers/${fighter}/c${frame}.webp`;
export const superFramesFor = (fighter: string) => SUPER_ANIM[fighter] ? Array.from({ length: 8 }, (_, i) => [superFrame(fighter, i + 1), companionFrame(fighter, i + 1)]).flat() : [];
