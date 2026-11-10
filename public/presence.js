(() => {
  // One active anonymous token per browser, shared across tabs, expired on server.
  let token = crypto.randomUUID(), inFlight = false;
  try {
    const old = JSON.parse(localStorage.getItem('hf-presence') || 'null');
    if (old?.until > Date.now() && /^[a-f0-9-]{36}$/.test(old.token)) token = old.token;
  } catch { /* Private browsing still works with an ephemeral tab token. */ }
  async function flushScores() {
    let pending;
    try { pending = JSON.parse(localStorage.getItem("hf-ranking-outbox") || "[]"); } catch { return; }
    if (!Array.isArray(pending)) return;
    for (const score of pending.slice(0, 10)) {
      try {
        const response = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(score), signal: AbortSignal.timeout(8000) });
        if (!response.ok) break;
        const latest = JSON.parse(localStorage.getItem("hf-ranking-outbox") || "[]");
        localStorage.setItem("hf-ranking-outbox", JSON.stringify(latest.filter(item => item.submissionId !== score.submissionId)));
      } catch { break; }
    }
  }
  async function ping() {
    if (document.hidden || inFlight) return;
    inFlight = true;
    try {
      try { localStorage.setItem('hf-presence', JSON.stringify({ token, until: Date.now() + 65000 })); } catch { /* optional */ }
      const response = await fetch('/api/presence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('offline');
      const data = await response.json();

      window.dispatchEvent(new CustomEvent('hf-presence', { detail: { online: data.online } }));
      document.querySelectorAll('[data-online-count]').forEach(el => {
        el.textContent = `${data.online} ONLINE`;
        el.title = 'Conexiones activas en el último minuto. Las pestañas del mismo navegador se agrupan.';
      });
      void flushScores();
    } catch {
      window.dispatchEvent(new CustomEvent('hf-presence', { detail: { offline: true } }));
      document.querySelectorAll('[data-online-count]').forEach(el => { el.textContent = 'ONLINE · SIN CONEXIÓN'; });
    } finally { inFlight = false; }
  }
  // Embedded Slug is already counted by the parent page.
  if (window.parent !== window) return;
  const start = () => { void ping(); setInterval(ping, 20000); document.addEventListener('visibilitychange', ping); window.addEventListener('hf-presence-refresh', ping); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
