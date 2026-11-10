// Signalling only: game inputs and snapshots travel directly between browsers.
export const ROOM_TTL = 5 * 60_000;
const validToken = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const validCode = value => typeof value === 'string' && /^\d{4}$/.test(value);
const validDescription = (value, type) => value?.type === type && typeof value.sdp === 'string' && value.sdp.startsWith('v=0') && value.sdp.length <= 32000;
export class RoomError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export async function roomCommand(db, input, now = Date.now(), random = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  if (!input || !validToken(input.token)) throw new RoomError('Sesión inválida. Vuelve a abrir las salas.');
  const { action, token, code } = input;
  if (action === 'create') {
    if (!validDescription(input.offer, 'offer')) throw new RoomError('No se pudo preparar la conexión.');
    await db.prepare('DELETE FROM online_rooms WHERE expires_at < ?').bind(now).run();
    const existing = await db.prepare('SELECT code FROM online_rooms WHERE host_token = ? AND expires_at >= ?').bind(token, now).first();
    if (existing) return { code: existing.code, role: 'host' };
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = String(random() % 10000).padStart(4, '0');
      const result = await db.prepare('INSERT INTO online_rooms (code, host_token, offer, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(candidate, token, JSON.stringify(input.offer), now + ROOM_TTL).run();
      if (result.meta.changes) return { code: candidate, role: 'host' };
    }
    throw new RoomError('Las salas están ocupadas. Prueba de nuevo.', 503);
  }
  if (!validCode(code)) throw new RoomError('Escribe las cuatro cifras de la sala.');
  if (action === 'join') {
    // Compare-and-set means two simultaneous joiners cannot claim player two.
    await db.prepare('UPDATE online_rooms SET guest_token = ? WHERE code = ? AND expires_at >= ? AND host_token != ? AND (guest_token IS NULL OR guest_token = ?)').bind(token, code, now, token, token).run();
    const room = await db.prepare('SELECT offer, guest_token FROM online_rooms WHERE code = ? AND expires_at >= ?').bind(code, now).first();
    if (!room) throw new RoomError('Sala no encontrada o caducada.', 404);
    if (room.guest_token !== token) throw new RoomError('La sala ya tiene dos jugadores.', 409);
    return { code, role: 'guest', offer: JSON.parse(room.offer) };
  }
  const room = await db.prepare('SELECT host_token, guest_token, answer FROM online_rooms WHERE code = ? AND expires_at >= ? AND (host_token = ? OR guest_token = ?)').bind(code, now, token, token).first();
  if (!room) throw new RoomError('Sala cerrada o sesión caducada.', 404);
  const host = room.host_token === token;
  if (action === 'answer') {
    if (host || !validDescription(input.answer, 'answer')) throw new RoomError('Respuesta de conexión inválida.', 403);
    await db.prepare('UPDATE online_rooms SET answer = ? WHERE code = ? AND guest_token = ?').bind(JSON.stringify(input.answer), code, token).run();
    return { ok: true };
  }
  if (action === 'poll') return { joined: Boolean(room.guest_token), answer: host && room.answer ? JSON.parse(room.answer) : null };
  if (action === 'leave') {
    if (host) await db.prepare('DELETE FROM online_rooms WHERE code = ? AND host_token = ?').bind(code, token).run();
    else await db.prepare('UPDATE online_rooms SET guest_token = NULL, answer = NULL WHERE code = ? AND guest_token = ?').bind(code, token).run();
    return { ok: true };
  }
  throw new RoomError('Acción desconocida.');
}
