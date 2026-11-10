import { getD1 } from '../../../db';
import { roomCommand, RoomError } from '../../room-service.mjs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Origen no permitido' }, { status: 403, headers });
    const raw = await request.text();
    if (raw.length > 40000) return Response.json({ error: 'Petición demasiado grande' }, { status: 413, headers });
    let input;
    try { input = JSON.parse(raw); } catch { return Response.json({ error: 'Petición inválida' }, { status: 400, headers }); }
    return Response.json(await roomCommand(getD1(), input), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof RoomError ? error.message : 'El servicio online no está disponible. Inténtalo de nuevo.' }, { status: error instanceof RoomError ? error.status : 503, headers });
  }
}
