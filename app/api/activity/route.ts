import { env } from "cloudflare:workers";
import { getD1 } from "../../../db";

export const dynamic = "force-dynamic";

const EVENT_TYPES = new Set(["visit", "mode_start", "match_start", "match_end"]);
const MODES = new Set(["arcade", "fight", "training", "orbs", "central", "coop", "slug", "tournament"]);
const FIGHTERS = new Set(["maletilla", "vanessa", "josevictor", "cristian", "cesaret", "borja", "bacora", "bonviure", "elchica", "ogalla", "xuso", "bomba", "rafeta", "tonimassama", "nova", "estefy"]);
const OUTCOMES = new Set(["victory", "defeat", "draw"]);

type ActivityEvent = "visit" | "mode_start" | "match_start" | "match_end";

const clean = (value: unknown, allowed: Set<string>) => typeof value === "string" && allowed.has(value) ? value : "";

function configuredPin() {
  return typeof env.HARDCORE_ADMIN_PIN === "string" ? env.HARDCORE_ADMIN_PIN : "";
}

function canView(body: { pin?: unknown }) {
  const pin = configuredPin();
  return Boolean(pin) && typeof body.pin === "string" && body.pin === pin;
}

function utcBucket() {
  const now = new Date();
  return { day: now.toISOString().slice(0, 10), hour: now.getUTCHours(), updatedAt: Date.now() };
}

async function summary() {
  const db = getD1();
  const since = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
  const [overview, byDay, byMode, byFighter] = await db.batch([
    db.prepare(`SELECT event_type AS eventType, outcome, SUM(count) AS count
      FROM game_activity_hourly WHERE day_utc >= ? GROUP BY event_type, outcome`).bind(since),
    db.prepare(`SELECT day_utc AS day, event_type AS eventType, SUM(count) AS count
      FROM game_activity_hourly WHERE day_utc >= ? GROUP BY day_utc, event_type ORDER BY day_utc ASC, event_type ASC`).bind(since),
    db.prepare(`SELECT mode, SUM(count) AS count FROM game_activity_hourly
      WHERE day_utc >= ? AND event_type IN ('mode_start', 'match_start') AND mode <> ''
      GROUP BY mode ORDER BY count DESC LIMIT 12`).bind(since),
    db.prepare(`SELECT fighter, SUM(count) AS count FROM game_activity_hourly
      WHERE day_utc >= ? AND event_type = 'match_start' AND fighter <> ''
      GROUP BY fighter ORDER BY count DESC LIMIT 12`).bind(since),
  ]);
  return { since, overview: overview.results, byDay: byDay.results, byMode: byMode.results, byFighter: byFighter.results };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown; eventType?: unknown; mode?: unknown; fighter?: unknown; outcome?: unknown; pin?: unknown };
    if (body.action === "summary") {
      if (!configuredPin()) return Response.json({ error: "El panel privado aún no está configurado." }, { status: 503 });
      if (!canView(body)) return Response.json({ error: "PIN incorrecto" }, { status: 401 });
      return Response.json(await summary());
    }

    const eventType = typeof body.eventType === "string" && EVENT_TYPES.has(body.eventType) ? body.eventType as ActivityEvent : null;
    if (!eventType) return Response.json({ error: "Evento no válido" }, { status: 400 });
    const mode = clean(body.mode, MODES);
    const fighter = clean(body.fighter, FIGHTERS);
    const outcome = clean(body.outcome, OUTCOMES);
    const { day, hour, updatedAt } = utcBucket();
    const db = getD1();
    await db.prepare(`INSERT INTO game_activity_hourly (day_utc, hour_utc, event_type, mode, fighter, outcome, count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(day_utc, hour_utc, event_type, mode, fighter, outcome)
      DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`)
      .bind(day, hour, eventType, mode, fighter, outcome, updatedAt).run();
    return Response.json({ ok: true }, { status: 202 });
  } catch {
    // The game must continue normally if activity storage is offline.
    return Response.json({ ok: false, offline: true }, { status: 202 });
  }
}
