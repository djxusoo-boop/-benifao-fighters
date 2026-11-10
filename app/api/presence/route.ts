import { getD1 } from "../../../db";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  try {
    const { token } = await request.json() as { token?: unknown };
    if (typeof token !== "string" || !/^[a-f0-9-]{36}$/.test(token)) return Response.json({ error: "Sesión inválida" }, { status: 400 });
    const now = Date.now();
    const db = getD1();
    const results = await db.batch([
      db.prepare("DELETE FROM live_sessions WHERE expires_at < ?").bind(now),
      db.prepare("INSERT INTO live_sessions (token, expires_at) VALUES (?, ?) ON CONFLICT(token) DO UPDATE SET expires_at = excluded.expires_at").bind(token, now + 65000),
      db.prepare("SELECT COUNT(*) AS count FROM live_sessions WHERE expires_at >= ?").bind(now),
    ]);
    return Response.json({ online: results[2].results[0]?.count ?? 0 }, { headers });
  } catch {
    return Response.json({ error: "No se pudo consultar la conexión" }, { status: 503, headers });
  }
}
