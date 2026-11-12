import { env } from "cloudflare:workers";
import { getD1 } from "../../../db";
import { FIGHTER_PROFILES } from "../../fighter-profiles";

export const dynamic = "force-dynamic";
const key = "fighter_balance_v1";
type Adjustments = Record<string, { speed: number; power: number; defense: number }>;

function validate(value: unknown): Adjustments | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: Adjustments = {};
  for (const [id, input] of Object.entries(value)) {
    if (!Object.hasOwn(FIGHTER_PROFILES, id) || !input || typeof input !== "object" || Array.isArray(input)) return null;
    const stats = input as Record<string, unknown>;
    if (!["speed", "power", "defense"].every(name => typeof stats[name] === "number" && Number.isInteger(stats[name]) && (stats[name] as number) >= 50 && (stats[name] as number) <= 150)) return null;
    result[id] = { speed: stats.speed as number, power: stats.power as number, defense: stats.defense as number };
  }
  return result;
}

export async function GET() {
  try {
    const row = await getD1().prepare("SELECT value FROM site_settings WHERE key = ? LIMIT 1").bind(key).first<{ value: string }>();
    return Response.json({ balance: row ? validate(JSON.parse(row.value)) ?? {} : {} }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ balance: {}, offline: true }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { pin?: unknown; balance?: unknown };
    const pin = typeof env.HARDCORE_ADMIN_PIN === "string" ? env.HARDCORE_ADMIN_PIN : "";
    if (!pin) return Response.json({ error: "El PIN privado aún no está configurado." }, { status: 503 });
    if (body.pin !== pin) return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    const balance = validate(body.balance);
    if (!balance) return Response.json({ error: "Ajustes no válidos" }, { status: 400 });
    await getD1().prepare("INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(key, JSON.stringify(balance), Date.now()).run();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "No se han podido guardar los ajustes" }, { status: 500 }); }
}
