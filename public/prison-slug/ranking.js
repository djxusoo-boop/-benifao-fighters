(() => {
  const form = document.getElementById('slugRankingForm');
  const name = document.getElementById('slugRankingName');
  const status = document.getElementById('slugRankingStatus');
  let result = null, saving = false;
  window.addEventListener('slug-result', event => {
    if (window.parent !== window) return;
    result = { ...event.detail, submissionId: crypto.randomUUID() };
    form.hidden = false;
    form.querySelector('button').disabled = false;
    status.textContent = '';
    try { name.value = localStorage.getItem('benifaio-player-name') || ''; } catch { /* optional */ }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!result || saving || !form.reportValidity()) return;
    saving = true;
    const button = form.querySelector('button'); button.disabled = true;
    status.textContent = 'Guardando…';
    try {
      const response = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...result, mode: 'slug', playerName: name.value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar');
      status.textContent = 'Puntuación guardada en el ranking mundial.';
      result = null;
      try { localStorage.setItem('benifaio-player-name', name.value.trim()); } catch { /* optional */ }
    } catch (error) { status.textContent = `${error.message}. Puedes volver a intentarlo.`; button.disabled = false; }
    finally { saving = false; }
  });
})();
