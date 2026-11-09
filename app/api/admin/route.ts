import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { pin?: unknown };
    const pin = typeof env.HARDCORE_ADMIN_PIN === "string" ? env.HARDCORE_ADMIN_PIN : "";
    if (!pin) return Response.json({ error: "El PIN privado aún no está configurado." }, { status: 503 });
    if (typeof body.pin !== "string" || body.pin !== pin) return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    // The submitted PIN is checked only for this request and is never stored.
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se ha podido comprobar el PIN" }, { status: 400 });
  }
}
