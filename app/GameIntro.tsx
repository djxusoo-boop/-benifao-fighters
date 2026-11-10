'use client';
import { useEffect, useState } from 'react';
export default function GameIntro() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { if (!sessionStorage.getItem('hf-intro-seen')) setOpen(true); } catch { setOpen(true); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const close = () => { try { sessionStorage.setItem('hf-intro-seen', '1'); } catch { /* Private browsing */ } setOpen(false); };
  if (!open) return null;
  return <div className="game-intro" role="dialog" aria-label="Presentación de Hardcore Fighters">
    <video autoPlay muted playsInline controls onEnded={close} onError={close} src="/hardcore-presentacion.mp4" />
    <button type="button" onClick={close}>SALTAR PRESENTACIÓN →</button>
  </div>;
}
