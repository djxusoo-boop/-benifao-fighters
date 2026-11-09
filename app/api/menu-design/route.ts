import { env } from "cloudflare:workers";
import { getD1 } from "../../../db";

export const dynamic = "force-dynamic";

const SETTING_KEY = "published_lobby_design_v1";
const MAX_DESIGN_BYTES = 48_000;

function configuredPin() {
  return typeof env.HARDCORE_ADMIN_PIN === "string" ? env.HARDCORE_ADMIN_PIN : "";
}

export async function GET() {
  try {
    const row = await getD1().prepare("SELECT value, updated_at AS updatedAt FROM site_settings WHERE key = ? LIMIT 1").bind(SETTING_KEY).first<{ value: string; updatedAt: number }>();
    if (!row) return Response.json({ design: null });
    return Response.json({ design: JSON.parse(row.value), updatedAt: row.updatedAt });
  } catch {
    return Response.json({ design: null, offline: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { pin?: unknown; design?: unknown };
    const pin = configuredPin();
    if (!pin) return Response.json({ error: "La publicación del menú aún no está configurada." }, { status: 503 });
    if (typeof body.pin !== "string" || body.pin !== pin) return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    if (!body.design || typeof body.design !== "object" || Array.isArray(body.design)) return Response.json({ error: "Diseño no válido" }, { status: 400 });
    const value = JSON.stringify(body.design);
    if (value.length > MAX_DESIGN_BYTES) return Response.json({ error: "El diseño es demasiado grande" }, { status: 413 });
    const updatedAt = Date.now();
    await getD1().prepare(`INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(SETTING_KEY, value, updatedAt).run();
    return Response.json({ ok: true, updatedAt });
  } catch {
    return Response.json({ error: "No se ha podido publicar el menú" }, { status: 500 });
  }
}
