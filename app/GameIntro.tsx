'use client';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
export default function GameIntro() {
  const [open, setOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { if (!sessionStorage.getItem('hf-intro-seen')) setOpen(true); } catch { setOpen(true); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const play = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      void video.play().then(() => setVideoError(false)).catch(() => undefined);
    };
    play();
    window.addEventListener('orientationchange', play);
    window.addEventListener('resize', play);
    document.addEventListener('visibilitychange', play);
    return () => {
      window.removeEventListener('orientationchange', play);
      window.removeEventListener('resize', play);
      document.removeEventListener('visibilitychange', play);
    };
  }, [open]);
  const close = () => { try { sessionStorage.setItem('hf-intro-seen', '1'); } catch { /* Private browsing */ } setOpen(false); };
  const retry = (event: SyntheticEvent<HTMLVideoElement>) => {
    setVideoError(false);
    event.currentTarget.load();
    void event.currentTarget.play().catch(() => undefined);
  };
  if (!open) return null;
  return <div className="game-intro" role="dialog" aria-label="Presentación de Hardcore Fighters">
    <video ref={videoRef} autoPlay muted playsInline controls preload="auto" poster="/og.png" webkit-playsinline="true" onLoadedData={(event) => { event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }} onLoadedMetadata={(event) => { event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }} onCanPlay={(event) => { void event.currentTarget.play().catch(() => undefined); }} onEnded={close} onError={() => setVideoError(true)}>
      <source src="/hardcore-presentacion.mp4" type="video/mp4" />
    </video>
    {videoError && <p role="alert">No se ha podido cargar la presentación. <button type="button" onClick={retry}>REINTENTAR</button></p>}
    <button type="button" onClick={close}>SALTAR PRESENTACIÓN →</button>
  </div>;
}
