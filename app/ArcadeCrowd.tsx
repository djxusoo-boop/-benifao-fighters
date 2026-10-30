import { useEffect, useMemo, useState } from "react";
import { DOLL_CROWD_ASSETS, GUEST_ANIMATORS, getGuestPair } from "./crowd-guests";

type CrowdMode = "fight" | "orbs" | "platform" | "coop";

export type CrowdCue = {
  direction: "left" | "right" | "center";
  label: string;
};

type ArcadeCrowdProps = {
  mode: CrowdMode;
  seed?: number;
  phase?: string;
  react?: boolean;
  cue?: CrowdCue | null;
};

const PEOPLE = [
  "doll",
  "shot",
  "poncho",
  "lizard",
  "redhair",
  "chocolat",
  "waistbag",
  "couple",
  "flagfan",
  "polkadot",
  "hardcorefan",
  "blackcouple",
  "rainbow",
  "lacewoman",
  "blackdress",
  "motocross",
  "baldpuma",
  "hoodiepuma",
  "dancecouple",
  "backpacker",
  ...GUEST_ANIMATORS,
] as const;

type CrowdPerson = (typeof PEOPLE)[number];

const THREE_POSE_PEOPLE: readonly CrowdPerson[] = [
  "hardcorefan",
  "blackcouple",
  "rainbow",
  "lacewoman",
  "blackdress",
  "motocross",
  "baldpuma",
  "hoodiepuma",
  "dancecouple",
  "backpacker",
  ...GUEST_ANIMATORS,
];

const GUEST_PEOPLE = new Set<CrowdPerson>(GUEST_ANIMATORS);
const GUEST_POSES = ["idle", "point", "cheer"] as const;

const COMPACT_THREE_FRAME_PEOPLE: readonly CrowdPerson[] = [
  "redhair",
  "chocolat",
  "couple",
  "flagfan",
  "polkadot",
];

const STANDARD_THREE_FRAME_PEOPLE: readonly CrowdPerson[] = [
  "shot",
  "poncho",
  "waistbag",
];

const CELEBRATION_PHASES = new Set(["ko", "won", "level-complete"]);
const WIDE_PEOPLE = new Set<CrowdPerson>(["couple", "polkadot", "blackcouple", "dancecouple"]);
const TALL_PEOPLE = new Set<CrowdPerson>(["poncho", "lizard", "backpacker", "motocross"]);

const MODE_GROUP_OFFSETS: Record<CrowdMode, number> = {
  fight: 0,
  orbs: 3,
  platform: 6,
  coop: 9,
};

const CUE_GUIDES: Record<CrowdCue["direction"], CrowdPerson[]> = {
  left: ["backpacker", "baldpuma", "dancecouple", "lacewoman", "motocross", "hoodiepuma", "blackdress", "redhair", "polkadot", "hardcorefan", "blackcouple", "rainbow", "couple", "flagfan"],
  right: ["dancecouple", "hoodiepuma", "backpacker", "blackdress", "baldpuma", "lacewoman", "motocross", "rainbow", "blackcouple", "hardcorefan", "polkadot", "couple", "flagfan", "redhair"],
  center: ["motocross", "backpacker", "baldpuma", "dancecouple", "blackdress", "hoodiepuma", "lacewoman", "hardcorefan", "rainbow", "blackcouple", "flagfan", "polkadot", "couple", "chocolat"],
};

function balanceClass(person: CrowdPerson) {
  return [
    WIDE_PEOPLE.has(person) ? "crowd-is-wide" : "",
    TALL_PEOPLE.has(person) ? "crowd-is-tall" : "",
  ].filter(Boolean).join(" ");
}

export default function ArcadeCrowd({ mode, seed = 0, phase = "playing", react = false, cue = null }: ArcadeCrowdProps) {
  const [rotation, setRotation] = useState(0);
  const [poseTick, setPoseTick] = useState(0);

  useEffect(() => {
    if (phase === "fight") return;
    const interval = window.setInterval(() => setPoseTick((value) => (value + 1) % 12), 1400);
    return () => window.clearInterval(interval);
  }, [mode, phase]);

  useEffect(() => {
    if (phase === "fight") return;
    const interval = window.setInterval(() => setRotation((value) => value + 1), 6200);
    return () => window.clearInterval(interval);
  }, [mode, phase]);

  const modeOffset = MODE_GROUP_OFFSETS[mode];
  // Keep the full trio present in every phase. Two figures looked sparse on
  // projected iPad play and made a late-decoding image feel like no crowd.
  const count = Math.min(3, PEOPLE.length);

  const visible = useMemo(() => {
    const guests = getGuestPair(rotation, modeOffset);

    if (cue) {
      const guides = CUE_GUIDES[cue.direction];
      const guide = guides[((seed + rotation) % guides.length + guides.length) % guides.length];
      return [guide, ...guests];
    }

    // The supplied doll is always present so the new four-frame animator is
    // visible from the first match instead of depending on crowd rotation.
    return ["doll" as const, ...guests];
  }, [cue, modeOffset, rotation, seed]);

  const cueClass = cue ? `crowd-has-cue crowd-cue-${cue.direction}` : "";
  const arrow = cue?.direction === "left" ? "←" : cue?.direction === "right" ? "→" : "↓";

  return (
    <div className={`arcade-crowd crowd-${mode} crowd-phase-${phase} crowd-rotation-${rotation % 2} crowd-count-${count} ${react ? "crowd-react" : ""} ${cueClass}`} aria-label={cue ? `El público señala: ${cue.label}` : "Público rotatorio animando la partida"} role="img">
      {visible.map((person, index) => {
        const hasSeparatePoses = THREE_POSE_PEOPLE.includes(person);
        const activePose = cue && index === 0
          ? "point"
          : GUEST_PEOPLE.has(person)
            ? GUEST_POSES[(poseTick + index + (react ? 1 : 0)) % GUEST_POSES.length]
            : react || CELEBRATION_PHASES.has(phase)
              ? "cheer"
              : "idle";
        const spriteClass = person === "doll"
          ? "crowd-four-pose"
          : hasSeparatePoses
          ? "crowd-three-pose"
          : person === "lizard"
            ? "crowd-sprite crowd-sprite-four crowd-frame-medium"
            : COMPACT_THREE_FRAME_PEOPLE.includes(person)
              ? "crowd-sprite crowd-sprite-three crowd-frame-compact"
              : STANDARD_THREE_FRAME_PEOPLE.includes(person)
                ? "crowd-sprite crowd-sprite-three crowd-frame-standard"
                : "crowd-sprite crowd-sprite-three crowd-frame-standard";

        return (
          <span className={`arcade-crowd-person crowd-person-${person} crowd-slot-${index + 1} ${spriteClass} ${GUEST_PEOPLE.has(person) ? "crowd-guest-animator" : ""} ${balanceClass(person)}`} key={`${mode}-${person}-${rotation}-${index}`}>
            <span className="arcade-crowd-visual">
              {person === "doll" ? (
                <i className="arcade-crowd-alt is-active" style={{ backgroundImage: `url(${DOLL_CROWD_ASSETS[poseTick % DOLL_CROWD_ASSETS.length]})` }} />
              ) : hasSeparatePoses ? (
                <i className={`arcade-crowd-art crowd-pose-${activePose} is-active`} />
              ) : <i className="arcade-crowd-art" />}
            </span>
            {cue && index === 0 && <b className="arcade-crowd-callout"><em>{arrow}</em>{cue.label}</b>}
          </span>
        );
      })}
    </div>
  );
}
