'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import OnlineCount from './OnlineCount';
import { OnlinePeer, type RoomPacket, type RoomRole } from './online-peer';
import { joystickIntent } from './touch-joystick.mjs';
export type OnlineInput = 'left' | 'right' | 'jump' | 'crouch' | 'block' | 'punch' | 'kick' | 'special1' | 'special2';
export type OnlineMode = 'fight' | 'coop' | 'orbs' | 'platform' | 'slug';
const actions: OnlineInput[] = ['left', 'right', 'jump', 'crouch', 'block', 'punch', 'kick', 'special1', 'special2'];
const keyMap: Record<string, OnlineInput> = { a:'left', arrowleft:'left', d:'right', arrowright:'right', w:'jump', arrowup:'jump', ' ':'jump', c:'crouch', arrowdown:'crouch', s:'block', j:'punch', h:'kick', k:'special1', l:'special2' };
const modeInfo: Record<OnlineMode, { icon: string; title: string; detail: string; note: string }> = {
  fight: { icon: '⚔', title: 'Lucha arcade', detail: 'Duelo directo entre P1 y P2.', note: 'Cada jugador controla a su luchador.' },
  coop: { icon: '∞', title: 'Aventura cooperativa', detail: 'Dos luchadores contra las oleadas.', note: 'El anfitrión es P1 y el invitado P2.' },
  orbs: { icon: '✦', title: 'Rompeobjetos', detail: 'Destruye objetivos y consigue puntos.', note: 'El invitado comparte los controles.' },
  platform: { icon: '▥', title: 'Aventura Central', detail: 'Recorre niveles, secretos y jefes.', note: 'El invitado comparte los controles.' },
  slug: { icon: '♛', title: 'Prison Slug', detail: 'Supervivencia extrema por carretera.', note: 'El anfitrión ejecuta la partida.' },
};
type Props = {
  open: boolean; onClose: () => void; fighters: { id:string; name:string }[]; selected: string;
  onRole: (role: RoomRole | null) => void; onStart: (mode: OnlineMode, hostFighter: string, guestFighter: string) => void;
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
  const [mode, setMode] = useState<OnlineMode>('fight');
  const [copyLabel, setCopyLabel] = useState('COPIAR CÓDIGO');
  const [shareLabel, setShareLabel] = useState('COMPARTIR INVITACIÓN');
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
      if (newRole === 'guest' && packet.type === 'start' && ['fight','coop','orbs','platform','slug'].includes(packet.mode as string)) {
        setStarted(true);
        latest.current.onStart(packet.mode as OnlineMode, packet.hostFighter as string, fighter);
      }
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
    } catch (error) {
      peerRef.current?.close(); peerRef.current = null;
      setRole(null); latest.current.onRole(null); setCode('');
      setStatus(error instanceof Error ? error.message : 'No se pudo abrir la sala.');
    }
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
  const copyCode = useCallback(() => {
    if (!code) return;
    const task = navigator.clipboard?.writeText(code);
    if (!task) { setCopyLabel('CÓPIALO A MANO'); return; }
    void task.then(() => {
      setCopyLabel('CÓDIGO COPIADO');
      window.setTimeout(() => setCopyLabel('COPIAR CÓDIGO'), 1600);
    }).catch(() => setCopyLabel('CÓPIALO A MANO'));
  }, [code]);
  useEffect(() => {
    const match = window.location.hash.match(/^#sala=(\d{4})$/);
    if (!match) return;
    const timer = window.setTimeout(() => { setEntry(match[1]); setStatus('Invitación recibida. Elige tu luchador y pulsa UNIRME A LA SALA.'); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const shareRoom = async () => {
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}#sala=${code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Hardcore Fighters', text: `Únete a mi sala ${code}`, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setShareLabel('ENLACE COPIADO'); }
      else setShareLabel('COMPARTE EL CÓDIGO');
    } catch { setShareLabel('COMPARTE EL CÓDIGO'); }
  };
  if (!props.open && !role) return null;
  if (started && role === 'host') return null;
  const control = (action: OnlineInput, key: string, label: string, className: string) => <button key={action} className={className} type="button" disabled={!connected} aria-label={label} onPointerDown={event => { event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer input still works without capture on older WebViews. */ } input(action, true); }} onPointerUp={() => input(action, false)} onPointerCancel={() => input(action, false)} onLostPointerCapture={() => input(action, false)}><span>{key}</span><small>{label}</small></button>;
  return <section className={`online-room ${started ? 'online-playing' : ''}`} aria-label="Sala online">
    <header className="online-room-header"><div><span className="online-eyebrow">HARDCORE FIGHTERS · ONLINE</span><strong>{code ? `SALA ${code}` : 'JUGAR ONLINE'}</strong></div><div className="online-header-actions"><OnlineCount /><button type="button" onClick={leave}>SALIR</button></div></header>
    <p className={`online-status ${connected ? 'is-connected' : ''}`} role="status"><i />{status}</p>
    {!started && <div className="online-room-card">
      <div className="online-room-intro"><span className="online-room-kicker">SALA PRIVADA · CÓDIGO DE 4 CIFRAS</span><h1>Juega con tu gente.</h1><p>Comparte un código, elige un modo y entra a la partida en segundos.</p></div>
      {!role && <div className="online-entry-grid"><div className="online-entry-card"><span className="online-card-icon">＋</span><h2>Crear sala</h2><p>Serás el anfitrión y elegirás el modo.</p><label>Tu luchador<select value={fighter} onChange={event => setFighter(event.target.value)}>{props.fighters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button className="online-primary" type="button" disabled={busy} onClick={() => void connect('host')}>{busy ? 'CREANDO…' : 'CREAR SALA'}</button></div><div className="online-entry-card"><span className="online-card-icon">↗</span><h2>Unirse</h2><p>Introduce el código que te han pasado.</p><label>Tu luchador<select value={fighter} onChange={event => setFighter(event.target.value)}>{props.fighters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><input className="online-code-input" inputMode="numeric" autoComplete="off" maxLength={4} value={entry} onChange={event => setEntry(event.target.value.replace(/\D/g, '').slice(0,4))} placeholder="0000" aria-label="Código de la sala" /><button className="online-primary" type="button" disabled={busy || entry.length !== 4} onClick={() => void connect('guest')}>{busy ? 'CONECTANDO…' : 'UNIRME A LA SALA'}</button></div></div>}
      {role && <div className="online-lobby"><div className="online-code-panel"><span>CÓDIGO PARA TU AMIGO</span><strong className="online-room-code">{code || '…'}</strong><button type="button" onClick={copyCode}>{copyLabel}</button></div><div className="online-seats"><div className="online-seat ready"><small>P1 · ANFITRIÓN</small><b>{props.fighters.find(f => f.id === fighter)?.name ?? fighter}</b><span>LISTO</span></div><div className={`online-seat ${guestFighter ? 'ready' : ''}`}><small>P2 · INVITADO</small><b>{guestFighter ? props.fighters.find(f => f.id === guestFighter)?.name : 'Esperando jugador…'}</b><span>{guestFighter ? 'CONECTADO' : 'COMPARTE EL CÓDIGO'}</span></div></div>{role === 'host' && <div className="online-mode-picker"><div><span className="online-section-kicker">ELIGE EL MODO</span><h2>¿Qué vais a jugar?</h2></div><div className="online-mode-grid">{(Object.keys(modeInfo) as OnlineMode[]).map(value => <button key={value} type="button" className={mode === value ? 'selected' : ''} disabled={!guestFighter} onClick={() => setMode(value)}><b><i>{modeInfo[value].icon}</i>{modeInfo[value].title}</b><small>{modeInfo[value].detail}</small></button>)}</div><p className="online-mode-note">{modeInfo[mode].note}</p></div>}{role === 'host' && <button className="online-launch" type="button" disabled={!connected || !guestFighter} onClick={() => { setStarted(true); peerRef.current?.send({ type:'start', mode, hostFighter: fighter }); props.onStart(mode, fighter, guestFighter); }}>{guestFighter ? `EMPEZAR · ${modeInfo[mode].title.toUpperCase()}` : 'ESPERANDO AL SEGUNDO JUGADOR'}</button>}{role === 'guest' && connected && <div className="online-waiting"><strong>ESTÁS DENTRO</strong><span>El anfitrión elegirá el modo y empezará la partida.</span></div>}</div>}
      {role === 'host' && code && <button type="button" onClick={() => void shareRoom()}>{shareLabel}</button>}
      <small className="online-footnote">Ambos necesitan internet para entrar en la sala. Si no conecta, probad en la misma Wi‑Fi.</small>
    </div>}
    {role === 'guest' && started && <><div className="online-remote-scene">{props.renderSnapshot(snapshot)}</div><div className="online-controls touch-controls" aria-label="Controles táctiles del jugador dos">
      <div className="touch-joystick-wrap">
        <div className="touch-joystick" role="group" aria-label="Joystick: mover, saltar y agacharse" onPointerDown={event => { event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Older WebViews can still deliver pointer moves. */ } stick(event); }} onPointerMove={event => { if (event.buttons) stick(event); }} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>
          <span className="touch-joystick-arrows" aria-hidden="true"><i className="up">↑</i><i className="left">←</i><i className="right">→</i><i className="down">↓</i></span><span className="touch-joystick-stick" aria-hidden="true" />
        </div><small className="touch-joystick-label">MOVER · ↑ SALTO · ↓ AGACHAR</small>
      </div>
      <div className="touch-actions touch-actions-redesign">
        {control('block','◆','BLOQUEO','touch-block')}{control('punch','J','PUÑO','touch-hit')}{control('kick','H','PATADA','touch-kick')}{control('special1','K','ESPECIAL','touch-special-one')}{control('special2','L','SUPER','touch-special-two')}
      </div>
    </div></>}
  </section>;
}
