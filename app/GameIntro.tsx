'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const INTRO_VIDEO_SRC = '/hardcore-presentacion.mp4?intro=20261110-no-native-controls';
export default function GameIntro() {
  const [open, setOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
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
      video.controls = false;
      video.setAttribute('webkit-playsinline', 'true');
      void video.play().catch(() => undefined);
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
  if (!open) return null;
  return <div className="game-intro" role="dialog" aria-label="Presentación de Hardcore Fighters">
    <Image className={`game-intro-logo ${videoReady ? 'is-hidden' : ''}`} src="/assets/new-fighters/prison-logo-clean.webp" width={1689} height={374} alt="PRISON" priority unoptimized />
    <div className={`game-intro-loader ${videoReady ? 'is-hidden' : ''}`} aria-live="polite"><i />CARGANDO PRESENTACIÓN</div>
    <video
      ref={videoRef}
      className={videoReady ? 'is-playing' : ''}
      autoPlay
      muted
      playsInline
      controls={false}
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      preload="auto"
      onLoadedData={(event) => { event.currentTarget.controls = false; event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }}
      onLoadedMetadata={(event) => { event.currentTarget.controls = false; event.currentTarget.muted = true; void event.currentTarget.play().catch(() => undefined); }}
      onCanPlay={(event) => { event.currentTarget.controls = false; void event.currentTarget.play().catch(() => undefined); }}
      onPause={(event) => { if (!event.currentTarget.ended) void event.currentTarget.play().catch(() => undefined); }}
      onPlay={() => setVideoReady(true)}
      onEnded={close}
      onError={() => setVideoReady(false)}
    >
      <source src={INTRO_VIDEO_SRC} type="video/mp4" />
    </video>
    <button type="button" onClick={close}>SALTAR PRESENTACIÓN →</button>
  </div>;
}
