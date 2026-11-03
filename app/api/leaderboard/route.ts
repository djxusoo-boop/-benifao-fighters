import { getD1 } from "../../../db";

const MODES = ["fight", "orbs", "adventure", "coop", "tournament"] as const;
const FIGHTERS = new Set(["maletilla", "vanessa", "josevictor", "cristian", "cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "rafeta", "tonimassama", "nova"]);
type Mode = typeof MODES[number];

const isMode = (value: unknown): value is Mode => typeof value === "string" && MODES.includes(value as Mode);

async function ensureSchema() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS leaderboard_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      score INTEGER NOT NULL,
      fighter TEXT NOT NULL DEFAULT 'maletilla',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS leaderboard_mode_score_idx ON leaderboard_scores(mode, score DESC)"),
  ]);
  return db;
}

export async function GET(request: Request) {
  const requestedMode = new URL(request.url).searchParams.get("mode");
  const mode = isMode(requestedMode) ? requestedMode : "fight";
  try {
    const db = await ensureSchema();
    const result = await db.prepare(
      "SELECT id, player_name AS playerName, mode, score, fighter, created_at AS createdAt FROM leaderboard_scores WHERE mode = ? ORDER BY score DESC, created_at ASC LIMIT 20"
    ).bind(mode).all();
    return Response.json({ mode, scores: result.results });
  } catch {
    return Response.json({ mode, scores: [], offline: true, error: "Ranking online no disponible" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { playerName?: unknown; mode?: unknown; score?: unknown; fighter?: unknown };
    const playerName = typeof body.playerName === "string" ? body.playerName.trim().replace(/\s+/g, " ") : "";
    const score = Math.floor(Number(body.score));
    const fighter = typeof body.fighter === "string" && FIGHTERS.has(body.fighter) ? body.fighter : "maletilla";
    if (playerName.length < 2 || playerName.length > 30) {
      return Response.json({ error: "Escribe un nombre de 2 a 30 caracteres" }, { status: 400 });
    }
    if (!isMode(body.mode) || !Number.isFinite(score) || score < 0 || score > 999999999) {
      return Response.json({ error: "Puntuación no válida" }, { status: 400 });
    }
    const db = await ensureSchema();
    await db.prepare(
      "INSERT INTO leaderboard_scores (player_name, mode, score, fighter) VALUES (?, ?, ?, ?)"
    ).bind(playerName, body.mode, score, fighter).run();
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar la puntuación" }, { status: 500 });
  }
}
