export type RoomRole = 'host' | 'guest';
export type RoomPacket = { type: string; [key: string]: unknown };
export class OnlinePeer {
  readonly token = crypto.randomUUID();
  code = '';
  role: RoomRole = 'host';
  private pc: RTCPeerConnection;
  private control?: RTCDataChannel;
  private snapshots?: RTCDataChannel;
  private stopped = false;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private timeout?: ReturnType<typeof setTimeout>;
  private abort = new AbortController();
  constructor(private onPacket: (packet: RoomPacket) => void, private onStatus: (status: string, connected: boolean) => void) {
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] });
    this.pc.ondatachannel = event => this.bindChannel(event.channel);
    this.pc.onconnectionstatechange = () => {
      if (this.stopped) return;
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected') this.onStatus('Se ha perdido la conexión. Sal de la sala y crea otra para volver a jugar.', false);
    };
  }
  private bindChannel(channel: RTCDataChannel) {
    if (channel.label === 'control') {
      this.control = channel;
      channel.onopen = () => { clearTimeout(this.timeout); this.onStatus('CONECTADOS · 2 JUGADORES', true); };
      channel.onclose = () => { if (!this.stopped) this.onStatus('Tu compañero ha salido de la sala.', false); };
    } else if (channel.label === 'snapshots') this.snapshots = channel;
    else { channel.close(); return; }
    channel.onmessage = event => {
      if (typeof event.data !== 'string' || event.data.length > 64000) return;
      try { const packet = JSON.parse(event.data); if (packet && typeof packet.type === 'string') this.onPacket(packet); } catch { /* Discard malformed packets. */ }
    };
  }
  private async api(action: string, data: Record<string, unknown> = {}) {
    const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token: this.token, code: this.code, ...data }), signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(10000)]) });
    const text = await response.text();
    let result: Record<string, unknown>;
    try { result = JSON.parse(text) as Record<string, unknown>; }
    catch { throw new Error(response.ok ? 'Respuesta inválida del servicio de salas.' : 'El servicio de salas no está disponible ahora.'); }
    if (!response.ok) throw new Error(result.error || 'No se pudo conectar con la sala.');
    return result;
  }
  private async description() {
    if (this.pc.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
      const finish = () => { clearTimeout(timer); this.pc.removeEventListener('icegatheringstatechange', changed); this.abort.signal.removeEventListener('abort', cancelled); resolve(); };
      const changed = () => { if (this.pc.iceGatheringState === 'complete') finish(); };
      const cancelled = () => { finish(); reject(new Error('Conexión cancelada')); };
      const timer = setTimeout(finish, 7000);
      this.pc.addEventListener('icegatheringstatechange', changed);
      this.abort.signal.addEventListener('abort', cancelled, { once: true });
    });
    if (this.stopped || !this.pc.localDescription) throw new Error('Conexión cancelada');
    return this.pc.localDescription.toJSON();
  }
  async create() {
    this.role = 'host';
    this.bindChannel(this.pc.createDataChannel('control'));
    this.bindChannel(this.pc.createDataChannel('snapshots', { ordered: false, maxRetransmits: 0 }));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    const result = await this.api('create', { offer: await this.description() });
    this.code = result.code;
    this.onStatus('Comparte el código. La sala espera a tu compañero durante 5 minutos.', false);
    this.poll();
    return this.code;
  }
  async join(code: string) {
    this.role = 'guest'; this.code = code;
    const room = await this.api('join');
    await this.pc.setRemoteDescription(room.offer);
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await this.api('answer', { answer: await this.description() });
    this.waitForConnection();
  }
  private waitForConnection() {
    this.timeout = setTimeout(() => {
      if (this.control?.readyState !== 'open') this.onStatus('Estas redes no permiten la conexión directa. Prueba con ambos dispositivos en la misma Wi-Fi.', false);
    }, 20000);
  }
  private poll() {
    this.pollTimer = setTimeout(async () => {
      if (this.stopped) return;
      try {
        const result = await this.api('poll');
        if (result.answer) { await this.pc.setRemoteDescription(result.answer); this.waitForConnection(); }
        else this.poll();
      } catch (error) { if (!this.stopped) this.onStatus(error instanceof Error ? error.message : 'Sala no disponible', false); }
    }, 1000);
  }
  send(packet: RoomPacket, snapshot = false) {
    const channel = snapshot ? this.snapshots : this.control;
    if (channel?.readyState !== 'open' || channel.bufferedAmount > 64000) return false;
    channel.send(JSON.stringify(packet)); return true;
  }
  close() {
    this.stopped = true; clearTimeout(this.pollTimer); clearTimeout(this.timeout);
    if (this.code) void fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave', code: this.code, token: this.token }), keepalive: true }).catch(() => {});
    this.abort.abort(); this.pc.close();
  }
}
