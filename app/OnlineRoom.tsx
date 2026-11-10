'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import OnlineCount from './OnlineCount';
import { OnlinePeer, type RoomPacket, type RoomRole } from './online-peer';
import { joystickIntent } from './touch-joystick.mjs';
export type OnlineInput = 'left' | 'right' | 'jump' | 'crouch' | 'block' | 'punch' | 'kick' | 'special1' | 'special2';
const actions: OnlineInput[] = ['left', 'right', 'jump', 'crouch', 'block', 'punch', 'kick', 'special1', 'special2'];
const keyMap: Record<string, OnlineInput> = { a:'left', arrowleft:'left', d:'right', arrowright:'right', w:'jump', arrowup:'jump', ' ':'jump', c:'crouch', arrowdown:'crouch', s:'block', j:'punch', h:'kick', k:'special1', l:'special2' };
type Props = {
  open: boolean; onClose: () => void; fighters: { id:string; name:string }[]; selected: string;
  onRole: (role: RoomRole | null) => void; onStart: (hostFighter: string, guestFighter: string) => void;
  onInput: (action: OnlineInput, down: boolean) => void; onDisconnect: () => void;
  getSnapshot: () => unknown; renderSnapshot: (snapshot: unknown) => ReactNode;
};
export default function OnlineRoom(props: Props) {
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });
  useEffect(() => { if (props.open) window.dispatchEvent(new Event('hf-presence-refresh')); }, [props.open]);
  const peerRef = useRef<OnlinePeer | null>(null);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [code, setCode] = useState('');
  const [entry, setEntry] = useState('');
  const [status, setStatus] = useState('Crea una sala o introduce el código de tu amigo.');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [fighter, setFighter] = useState(props.selected);
  const [guestFighter, setGuestFighter] = useState('');
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const held = useRef(new Set<OnlineInput>());
  const lastSeen = useRef(0);
  const lastSequence = useRef(-1);
  const sequence = useRef(0);
  const connectedRef = useRef(false);
  const input = useCallback((action: OnlineInput, down: boolean) => {
    if (down === held.current.has(action)) return;
    if (down) held.current.add(action); else held.current.delete(action);
    peerRef.current?.send({ type:'input', action, down });
  }, []);
  const release = useCallback(() => { for (const action of [...held.current]) input(action, false); }, [input]);
  const leave = useCallback(() => {
    release(); peerRef.current?.close(); peerRef.current = null;
    connectedRef.current = false; setConnected(false); setRole(null); setStarted(false); setSnapshot(null); setCode(''); setBusy(false); setGuestFighter('');
    latest.current.onDisconnect(); latest.current.onClose(); latest.current.onRole(null);
  }, [release]);
  useEffect(() => () => { peerRef.current?.close(); }, []);
  const makePeer = (newRole: RoomRole) => {
    peerRef.current?.close(); lastSequence.current = -1; sequence.current = 0;
    const peer = new OnlinePeer((packet: RoomPacket) => {
      if (peerRef.current !== peer) return;
      lastSeen.current = Date.now();
      if (packet.type === 'ping') { peer.send({ type:'pong' }); return; }
      if (newRole === 'host' && packet.type === 'fighter' && props.fighters.some(f => f.id === packet.fighter)) setGuestFighter(packet.fighter as string);
      if (newRole === 'host' && packet.type === 'input' && actions.includes(packet.action as OnlineInput) && typeof packet.down === 'boolean') latest.current.onInput(packet.action as OnlineInput, packet.down);
      if (newRole === 'guest' && packet.type === 'state' && typeof packet.seq === 'number' && packet.seq > lastSequence.current) { lastSequence.current = packet.seq; setSnapshot(packet.view); setStarted(true); }
    }, (message, ready) => {
      if (peerRef.current !== peer) return;
      setStatus(message); setConnected(ready); connectedRef.current = ready;
      if (ready) { lastSeen.current = Date.now(); if (newRole === 'guest') peer.send({ type:'fighter', fighter }); }
      else latest.current.onDisconnect();
    });
    peerRef.current = peer; setRole(newRole); latest.current.onRole(newRole);
    return peer;
  };
  const connect = async (newRole: RoomRole) => {
    if (busy) return;
    setBusy(true); setStatus('Preparando conexión…');
    try {
      const peer = makePeer(newRole);
      if (newRole === 'host') { const value = await peer.create(); if (peerRef.current === peer) setCode(value); }
      else { setCode(entry); await peer.join(entry); }
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir la sala.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => {
      const peer = peerRef.current;
      if (!peer) return;
      peer.send({ type:'ping' });
      if (Date.now() - lastSeen.current > 5000) { setStatus('Conexión interrumpida. Vuelve a crear la sala.'); connectedRef.current = false; setConnected(false); latest.current.onDisconnect(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [connected]);
  useEffect(() => {
    if (!connected || role !== 'host' || !started) return;
    const timer = setInterval(() => peerRef.current?.send({ type:'state', seq: ++sequence.current, view: latest.current.getSnapshot() }, true), 40);
    return () => clearInterval(timer);
  }, [connected, role, started]);
  useEffect(() => {
    if (role !== 'guest' || !connected) return;
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input,select,textarea')) return;
      const action = keyMap[event.key.toLowerCase()];
      if (action) { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) input(action, true); }
    };
    const up = (event: KeyboardEvent) => { const action = keyMap[event.key.toLowerCase()]; if (action) { event.preventDefault(); event.stopImmediatePropagation(); input(action, false); } };
    const visibility = () => { if (document.hidden) release(); };
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up, true); window.addEventListener('blur', release); document.addEventListener('visibilitychange', visibility);
    return () => { release(); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', visibility); };
  }, [connected, role, input, release]);
  const stick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const b = event.currentTarget.getBoundingClientRect();
    const intent = joystickIntent(event.clientX - b.left - b.width / 2, event.clientY - b.top - b.height / 2, b.width / 2 - 8);
    input('left', intent.left); input('right', intent.right); input('jump', intent.jump); input('crouch', intent.crouch);
  };
  const releaseStick = () => { for (const action of ['left', 'right', 'jump', 'crouch'] as OnlineInput[]) input(action, false); };
  if (!props.open && !role) return null;
  const control = (action: OnlineInput, label: string) => <button key={action} type="button" disabled={!connected} onPointerDown={event => { event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer input still works without capture on older WebViews. */ } input(action, true); }} onPointerUp={() => input(action, false)} onPointerCancel={() => input(action, false)} onLostPointerCapture={() => input(action, false)}>{label}</button>;
  return <section className={`online-room ${started ? 'online-playing' : ''}`} aria-label="Sala online">
    <header><strong>{code ? `SALA ${code}` : 'JUGAR ONLINE'}</strong><OnlineCount /><button type="button" onClick={leave}>SALIR DE LA SALA</button></header>
    <p role="status">{status}</p>
    {!started && <div className="online-room-card">
      <h2>Un código. Dos jugadores.</h2><p>Modo lucha · El creador juega como P1 y su amigo como P2.</p>
      {!role && <><label>Tu personaje<select value={fighter} onChange={event => setFighter(event.target.value)}>{props.fighters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button type="button" disabled={busy} onClick={() => void connect('host')}>CREAR SALA</button><label>Código de tu amigo<input inputMode="numeric" autoComplete="off" maxLength={4} value={entry} onChange={event => setEntry(event.target.value.replace(/\D/g, '').slice(0,4))} placeholder="0000" /></label><button type="button" disabled={busy || entry.length !== 4} onClick={() => void connect('guest')}>UNIRME</button></>}
      {role && <strong className="online-room-code">{code || '…'}</strong>}
      {role === 'host' && connected && guestFighter && <><p>Tu amigo ha elegido {props.fighters.find(f => f.id === guestFighter)?.name}.</p><button type="button" onClick={() => { setStarted(true); props.onStart(fighter, guestFighter); }}>EMPEZAR COMBATE</button></>}
      {role === 'guest' && connected && <p>Listo. Espera a que tu amigo inicie el combate.</p>}
      <small>Conexión directa en pruebas. Algunas redes móviles necesitan que ambos jugadores estén en la misma Wi-Fi.</small>
    </div>}
    {role === 'guest' && started && <><div className="online-remote-scene">{props.renderSnapshot(snapshot)}</div><div className="online-controls">
      <div className="online-stick" role="application" aria-label="Joystick del jugador dos" onPointerDown={event => { event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Older WebViews can still deliver pointer moves. */ } stick(event); }} onPointerMove={event => { if (event.buttons) stick(event); }} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>✥</div>
      <div>{control('block','◆ BLOQUEO')}{control('punch','J PUÑO')}{control('kick','H PATADA')}{control('special1','K ESPECIAL')}{control('special2','L SUPER')}</div>
    </div></>}
  </section>;
}
