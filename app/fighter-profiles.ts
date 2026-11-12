// Per-fighter personality: combat stats, archetype, quotes and tournament endings.
// Stats go from 1 to 5 and every fighter adds up to 10, so the roster stays
// balanced while each character plays differently.

export type ProfileFighterId =
  | "maletilla" | "vanessa" | "josevictor" | "cristian" | "cesaret" | "borja" | "bacora"
  | "bonviure" | "elchica" | "ogalla" | "xuso" | "bomba" | "rafeta" | "tonimassama" | "nova" | "estefy" | "mad-dog" | "angerfist" | "dalmau";

export type PassiveId = "none" | "noise" | "rhythmRush" | "investment" | "onBeat" | "angler" | "venom" | "shieldCounter" | "heavyArmor" | "liquidCourage" | "royalFury" | "dogBite" | "berserkArmor" | "banner" | "quickTrigger" | "prismCharge" | "jungleCut";

export type FighterProfile = {
  power: number;
  speed: number;
  defense: number;
  /** Combo/technique rating shown in the lobby (1-5). */
  technique: number;
  motto: string;
  passive: { id: PassiveId; name: string; description: string };
  archetype: string;
  bio: string;
  winQuotes: string[];
  endingTitle: [string, string];
  endingText: string;
};

export const FIGHTER_PROFILES: Record<ProfileFighterId, FighterProfile> = {
  "mad-dog": { power: 3, speed: 3, defense: 3, technique: 3, motto: "Listo para luchar.", passive: { id: "none", name: "COMBATE", description: "Golpes y defensa básicos" }, archetype: "LUCHADOR", bio: "Luchador de Hardcore Fighters.", winQuotes: ["¡Victoria!"], endingTitle: ["¡VICTORIA", "HARDCORE!"], endingText: "MAD DOG gana el combate." },
  "angerfist": { power: 3, speed: 3, defense: 3, technique: 3, motto: "Listo para luchar.", passive: { id: "none", name: "COMBATE", description: "Golpes y defensa básicos" }, archetype: "LUCHADOR", bio: "Luchador de Hardcore Fighters.", winQuotes: ["¡Victoria!"], endingTitle: ["¡VICTORIA", "HARDCORE!"], endingText: "ANGERFIST gana el combate." },
  "dalmau": { power: 3, speed: 3, defense: 3, technique: 3, motto: "Listo para luchar.", passive: { id: "none", name: "COMBATE", description: "Golpes y defensa básicos" }, archetype: "LUCHADOR", bio: "Luchador de Hardcore Fighters.", winQuotes: ["¡Victoria!"], endingTitle: ["¡VICTORIA", "HARDCORE!"], endingText: "DALMAU gana el combate." },
  maletilla: {
    power: 4, speed: 3, defense: 3, technique: 4, motto: "Spray, actitud y combate.", passive: { id: "noise", name: "RUIDO DE PARKING", description: "Cada combo de 3 golpes o más pega +2 de daño extra" }, archetype: "TODOTERRENO",
    bio: "Nadie hace más ruido en el parking. Golpea fuerte y aguanta lo justo.",
    winQuotes: ["¡Esto suena más fuerte que un bafle a las seis de la mañana!", "Vuelve cuando sepas lo que es el ruido de verdad.", "¡La Keta es mía y punto!"],
    endingTitle: ["¡REY DEL", "HARDCORE!"], endingText: "Maletilla conquista la Keta con puro ruido.",
  },
  vanessa: {
    power: 2, speed: 5, defense: 3, technique: 4, motto: "Si parpadeas, ya te ha ganado.", passive: { id: "rhythmRush", name: "RITMO RÁPIDO", description: "Se recupera antes de cada golpe: encadena más rápido que nadie" }, archetype: "VELOCISTA",
    bio: "Rápida como un remix a 200 BPM. Entra, golpea y ya no está.",
    winQuotes: ["¿Ya está? Ni me ha dado tiempo a calentar.", "Demasiado lenta para este ritmo.", "La pista es mía, cariño."],
    endingTitle: ["¡REINA DEL", "NEWSTYLE!"], endingText: "Vanessa hace temblar la pista con su ritmo.",
  },
  josevictor: {
    power: 3, speed: 3, defense: 4, technique: 3, motto: "Todo tiene un precio. Tu derrota también.", passive: { id: "investment", name: "INVERSIÓN", description: "Cada 4 golpes que acierta recupera 4 de vida" }, archetype: "CALCULADOR",
    bio: "Cada golpe es una inversión. Paciente, sólido y siempre con un billete de reserva.",
    winQuotes: ["Esta victoria la pago yo.", "Te he comprado el combate entero.", "El dinero no da la felicidad, pero los puños sí."],
    endingTitle: ["¡REY DEL", "BILLETE!"], endingText: "Josevictor conquista Central a golpe de billete.",
  },
  cristian: {
    power: 3, speed: 4, defense: 3, technique: 5, motto: "El combate es una mezcla y yo pincho.", passive: { id: "onBeat", name: "A RITMO", description: "Los golpes al compás de la música hacen +40% de daño" }, archetype: "TÉCNICO",
    bio: "Mezcla golpes como mezcla discos: sin cortes y siempre al compás.",
    winQuotes: ["Esa mezcla te ha quedado grande.", "Subo el pitch y tú te caes.", "Cuando suena el KRK 8, se acaba la discusión."],
    endingTitle: ["¡DIOS DE LAS", "MEZCLAS!"], endingText: "Cristian conquista Central a golpe de vinilo.",
  },
  cesaret: {
    power: 3, speed: 3, defense: 4, technique: 3, motto: "Paciencia, que ya picará.", passive: { id: "angler", name: "ANZUELO", description: "Sus especiales atraen al rival hacia él" }, archetype: "PACIENTE",
    bio: "Sabe esperar a que piques. Cuando pica, no suelta.",
    winQuotes: ["¡Has picado como un boquerón!", "Al agua contigo.", "Hoy la pesca ha sido buena."],
    endingTitle: ["¡REY DE LA", "PESCA!"], endingText: "Cesaret conquista el torneo con sus peces.",
  },
  borja: {
    power: 3, speed: 2, defense: 5, technique: 3, motto: "Despacio, pero venenoso.", passive: { id: "venom", name: "VENENO DE SAPO", description: "Sus especiales envenenan: el rival pierde vida poco a poco" }, archetype: "MURO",
    bio: "Su sapo y él aguantan lo que les echen. Lentos, venenosos e imposibles de tumbar.",
    winQuotes: ["El sapo dice que has perdido.", "Croac. Eso significa K.O.", "No me muevo, y aun así te gano."],
    endingTitle: ["¡REY DEL", "SAPO!"], endingText: "Borja conquista el torneo junto a su sapo.",
  },
  bacora: {
    power: 3, speed: 2, defense: 5, technique: 4, motto: "La W no se toca.", passive: { id: "shieldCounter", name: "CONTRA DE ESCUDO", description: "Un bloqueo perfecto devuelve el golpe automáticamente" }, archetype: "GUARDIÁN",
    bio: "El escudo de la W no se rompe. Defiende primero y castiga después.",
    winQuotes: ["La W no se toca.", "Contra este escudo no hay nada que hacer.", "Vuelve a la cola, la puerta está cerrada."],
    endingTitle: ["¡GUARDIÁN DE", "LA RIBERA!"], endingText: "Bacora protege el trono del torneo con su escudo.",
  },
  bonviure: {
    power: 5, speed: 2, defense: 3, technique: 2, motto: "Lo que cae, no se levanta.", passive: { id: "heavyArmor", name: "CASCO DE HIERRO", description: "Sus patadas y especiales no se interrumpen aunque le peguen" }, archetype: "DEMOLEDOR",
    bio: "El ancla pesa, pero cuando cae, cae para siempre.",
    winQuotes: ["Al fondo del puerto contigo.", "Un anclazo y a dormir.", "Lento, sí. Pero mira dónde estás tú."],
    endingTitle: ["¡EL ANCLA", "DEL TORNEO!"], endingText: "Bonviure hunde a todos sus rivales en el fondo del puerto.",
  },
  elchica: {
    power: 3, speed: 4, defense: 3, technique: 4, motto: "La noche es joven y yo también.", passive: { id: "liquidCourage", name: "VALOR LÍQUIDO", description: "Cada especial que usa le da +6% de daño (hasta +30%)" }, archetype: "FIESTERO",
    bio: "Siempre con la botella en alto. Imprevisible, rápido y con mucha chispa.",
    winQuotes: ["¡Esta ronda la invito yo!", "Salud, campeón. Bueno, campeón no.", "Un chupito de ámbar y a la lona."],
    endingTitle: ["¡REY DEL", "JÄGER!"], endingText: "El Chica brinda por el torneo desde lo más alto de La Fábrica.",
  },
  ogalla: {
    power: 4, speed: 2, defense: 4, technique: 3, motto: "La corona no se hereda, se gana.", passive: { id: "royalFury", name: "FURIA REAL", description: "Con menos del 30% de vida pega y aguanta un 20% más" }, archetype: "VETERANO",
    bio: "Bastón en mano y corona en la cabeza. La experiencia de mil noches.",
    winQuotes: ["Alcachofa de Benicarló, de la buena.", "Más sabe el rey por viejo que por rey.", "Arrodíllate ante la corona."],
    endingTitle: ["¡REY DE LA", "ALCACHOFA!"], endingText: "Ogalla reina sobre La Ribera con su bastón de alcachofa.",
  },
  xuso: {
    power: 3, speed: 5, defense: 2, technique: 3, motto: "Dos contra uno nunca es justo. Para ti.", passive: { id: "dogBite", name: "PERRO DE PRISON", description: "El perro muerde solo al rival cuando está cerca" }, archetype: "CAZADOR",
    bio: "Dos contra uno: Xuso y su perro no dan respiro. Presión constante.",
    winQuotes: ["¡Guau! Eso ha sido un mordisco de los buenos.", "El perro ya te había olido.", "Prison no perdona."],
    endingTitle: ["¡EL DÚO DE", "PRISON!"], endingText: "Xuso y su perro aúllan victoriosos en la noche de Central.",
  },
  bomba: {
    power: 5, speed: 3, defense: 2, technique: 2, motto: "Todo o nada.", passive: { id: "berserkArmor", name: "BERSERKER", description: "Sus patadas no se interrumpen aunque le peguen" }, archetype: "BERSERKER",
    bio: "El azadón no pregunta. Todo o nada en cada golpe.",
    winQuotes: ["¡Te he cavado la tumba!", "Azadazo y a la huerta.", "¡BOOM! Por algo me llaman El Bomba."],
    endingTitle: ["¡EL BOMBA", "EXPLOTA!"], endingText: "El Bomba arrasa el torneo azada en mano.",
  },
  rafeta: {
    power: 4, speed: 3, defense: 3, technique: 3, motto: "Mientras la bandera ondee, sigo en pie.", passive: { id: "banner", name: "ESTANDARTE", description: "Empieza cada ronda con la barra SUPER al 30%" }, archetype: "ABANDERADO",
    bio: "Lleva el estandarte de La Ribera y lo defiende con todo.",
    winQuotes: ["La bandera sigue en pie.", "Por La Ribera.", "Ondea, ondea."],
    endingTitle: ["¡EL ESTANDARTE", "VENCEDOR!"], endingText: "Rafeta clava su bandera en lo alto del torneo.",
  },
  tonimassama: {
    power: 4, speed: 4, defense: 2, technique: 4, motto: "Brillo, chulería y gatillo fácil.", passive: { id: "quickTrigger", name: "GATILLO RÁPIDO", description: "Sus especiales salen un 25% más rápido" }, archetype: "PISTOLERO",
    bio: "Dorado, chulesco y letal a distancia. Una peineta para cada rival.",
    winQuotes: ["Toma peineta, de las doradas.", "Bang. Se acabó.", "Más brillo que tú, imposible."],
    endingTitle: ["¡REY DE LA", "PEINETA!"], endingText: "Toni Massama dispara oro sobre todo Central.",
  },
  nova: {
    power: 3, speed: 5, defense: 2, technique: 4, motto: "Luz pura de neón.", passive: { id: "prismCharge", name: "CARGA PRISMÁTICA", description: "Llena la barra SUPER un 50% más rápido" }, archetype: "PRISMA",
    bio: "Luz pura de neón. Si parpadeas, ya te ha dado tres veces.",
    winQuotes: ["Brillo demasiado para ti.", "Te he dejado en modo arcoíris.", "Apaga y vámonos."],
    endingTitle: ["¡PRISMA DE", "CENTRAL!"], endingText: "Yoye ilumina el torneo con un láser arcoíris.",
  },
  estefy: {
    power: 4, speed: 4, defense: 2, technique: 4, motto: "Rumbo fijo y machete en mano.", passive: { id: "jungleCut", name: "MACHETE AFILADO", description: "Cada 3 golpes que conecta suma un corte extra de 3 de daño" }, archetype: "CAPITANA",
    bio: "Capitana de su propio barco y dueña de la selva. Abre camino a machetazos.",
    winQuotes: ["Aquí mando yo, marinero.", "Te he cortado el rollo.", "Rumbo a la victoria, como siempre."],
    endingTitle: ["¡CAPITANA DE", "CENTRAL!"], endingText: "Estefy clava el machete en lo más alto y toma el mando del torneo.",
  },
};

/** Damage multiplier for the attacker (power 3 = 1.0). */
export const powerMultiplier = (fighter: ProfileFighterId) => 1 + (FIGHTER_PROFILES[fighter].power - 3) * 0.08;
/** Damage-taken multiplier for the defender (defense 3 = 1.0). */
export const defenseMultiplier = (fighter: ProfileFighterId) => 1 - (FIGHTER_PROFILES[fighter].defense - 3) * 0.07;
/** Walking speed multiplier (speed 3 = 1.0). */
export const speedMultiplier = (fighter: ProfileFighterId) => 1 + (FIGHTER_PROFILES[fighter].speed - 3) * 0.07;

export const pickWinQuote = (fighter: ProfileFighterId, seed: number) => {
  const quotes = FIGHTER_PROFILES[fighter].winQuotes;
  return quotes[Math.abs(Math.floor(seed)) % quotes.length];
};
