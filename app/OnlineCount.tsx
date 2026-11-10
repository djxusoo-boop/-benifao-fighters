'use client';
import { useEffect, useState } from 'react';
export default function OnlineCount({ prominent = false }: { prominent?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ online?: number; offline?: boolean }>).detail;
      if (Number.isFinite(detail.online)) setCount(detail.online!);
      setOffline(Boolean(detail.offline));
    };
    window.addEventListener('hf-presence', update);
    window.dispatchEvent(new Event('hf-presence-refresh'));
    return () => window.removeEventListener('hf-presence', update);
  }, []);
  return <span className={prominent ? "online-count-prominent" : "build-chip"} aria-label="Jugadores conectados" title="Conexiones activas en el último minuto; las pestañas del mismo navegador se agrupan.">{offline ? 'ONLINE · SIN CONEXIÓN' : count === null ? 'ONLINE · CONECTANDO' : prominent ? `${count} ${count === 1 ? "JUGADOR CONECTADO" : "JUGADORES CONECTADOS"}` : `${count} ONLINE`}</span>;
}
