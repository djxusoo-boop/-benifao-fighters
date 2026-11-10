import { rankingNameKey } from "../../leaderboard-policy.mjs";
import { getD1 } from "../../../db";

export const dynamic = "force-dynamic";

const MODES = ["fight", "orbs", "adventure", "coop", "tournament", "arcade", "slug"] as const;
const FIGHTERS = new Set(["maletilla", "vanessa", "josevictor", "cristian", "cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "rafeta", "tonimassama", "nova", "estefy"]);
type Mode = typeof MODES[number];

const isMode = (value: unknown): value is Mode => typeof value === "string" && MODES.includes(value as Mode);

export async function GET(request: Request) {
  const requestedMode = new URL(request.url).searchParams.get("mode");
  const mode = isMode(requestedMode) ? requestedMode : "fight";
  try {
    const db = getD1();
    const result = await db.prepare(
      `WITH numbered AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(name_key, lower(trim(player_name))) ORDER BY score DESC, created_at ASC, id ASC) AS name_rank
        FROM leaderboard_scores WHERE mode = ?
      ), top_twenty AS (
        SELECT id FROM numbered WHERE name_rank <= 3 ORDER BY score DESC, created_at ASC, id ASC LIMIT 20
      ), ranked AS (
        SELECT n.*, CASE WHEN t.id IS NOT NULL THEN 0 ELSE 1 END AS deferred
        FROM numbered n LEFT JOIN top_twenty t ON n.id = t.id
      ), positioned AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY deferred ORDER BY score DESC, created_at ASC, id ASC)
          + CASE WHEN deferred = 1 THEN 20 ELSE 0 END AS position FROM ranked
      ) SELECT id, player_name AS playerName, mode, score, fighter, created_at AS createdAt, position
      FROM positioned WHERE position <= 100 ORDER BY position`
    ).bind(mode).all();
    return Response.json({ mode, scores: result.results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ mode, scores: [], offline: true, error: "Ranking online no disponible" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { playerName?: unknown; mode?: unknown; score?: unknown; fighter?: unknown; submissionId?: unknown };
    const playerName = typeof body.playerName === "string" ? body.playerName.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es") : "";
    const score = Math.floor(Number(body.score));
    const fighter = typeof body.fighter === "string" && FIGHTERS.has(body.fighter) ? body.fighter : "maletilla";
    if (playerName.length < 2 || playerName.length > 30) {
      return Response.json({ error: "Escribe un nombre de 2 a 30 caracteres" }, { status: 400 });
    }
    if (!isMode(body.mode) || !Number.isFinite(score) || score < 0 || score > 999999999) {
      return Response.json({ error: "Puntuación no válida" }, { status: 400 });
    }
    const submissionId = typeof body.submissionId === "string" && /^[a-f0-9-]{36}$/.test(body.submissionId) ? body.submissionId : crypto.randomUUID();
    const db = getD1();
    await db.prepare(
      "INSERT INTO leaderboard_scores (player_name, name_key, submission_id, mode, score, fighter) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING"
    ).bind(playerName, rankingNameKey(playerName), submissionId, body.mode, score, fighter).run();
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "No se pudo guardar la puntuación" }, { status: 500 });
  }
}
