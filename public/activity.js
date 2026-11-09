(() => {
  const $ = (id) => document.getElementById(id);
  let pin = "";
  const names = { arcade: "Modo arcade", fight: "Modo lucha", training: "Entrenamiento", orbs: "Rompeobjetos", central: "Aventura central", coop: "Cooperativa", slug: "Prison Slug", tournament: "Torneo" };
  const fighterNames = { maletilla: "Maletilla", vanessa: "Vanessa", josevictor: "Josevictor", cristian: "Cristian", borja: "Borja", bacora: "Bacora", bonviure: "Bonviure", elchica: "El Chica", ogalla: "Ogalla", xuso: "Xuso", bomba: "El Bomba", tonimassama: "Toni Massama", nova: "Yoye", estefy: "Estefy" };
  const number = (value) => Number(value) || 0;
  const overview = (rows, eventType, outcome = null) => rows.reduce((total, row) => total + (row.eventType === eventType && (outcome === null || row.outcome === outcome) ? number(row.count) : 0), 0);
  function list(target, rows, labels) {
    const node = $(target); node.replaceChildren();
    if (!rows.length) { const item = document.createElement("li"); item.textContent = "Todavía no hay datos"; node.append(item); return; }
    rows.forEach((row) => { const item = document.createElement("li"); const label = document.createElement("b"); label.textContent = labels[row.mode || row.fighter] || row.mode || row.fighter; const count = document.createElement("span"); count.textContent = String(number(row.count)); item.append(label, count); node.append(item); });
  }
  function render(data) {
    $("range").textContent = `Desde ${data.since} · actualización al pulsar el botón`;
    const visits = overview(data.overview, "visit"), starts = overview(data.overview, "match_start"), endings = overview(data.overview, "match_end"), victories = overview(data.overview, "match_end", "victory");
    $("metrics").innerHTML = [[visits,"ACCESOS"],[starts,"PARTIDAS"],[endings,"TERMINADAS"],[victories,"VICTORIAS P1"]].map(([value,label]) => `<div class="metric"><b>${value}</b><span>${label}</span></div>`).join("");
    const map = new Map();
    data.byDay.forEach((row) => { const item = map.get(row.day) || { visit:0, match_start:0, match_end:0 }; item[row.eventType] = number(row.count); map.set(row.day, item); });
    const max = Math.max(1, ...[...map.values()].flatMap((item) => [item.visit,item.match_start,item.match_end]));
    const days = $("days"); days.replaceChildren();
    [...map.entries()].forEach(([day,item]) => { const card = document.createElement("div"); card.className="day"; card.innerHTML = `<div class="bars"><i class="bar" title="Accesos: ${item.visit}" style="height:${Math.max(3,item.visit/max*82)}px"></i><i class="bar match" title="Partidas: ${item.match_start}" style="height:${Math.max(3,item.match_start/max*82)}px"></i><i class="bar finish" title="Terminadas: ${item.match_end}" style="height:${Math.max(3,item.match_end/max*82)}px"></i></div><small>${day.slice(5)}</small>`; days.append(card); });
    list("modes", data.byMode, names); list("fighters", data.byFighter, fighterNames);
  }
  async function load() {
    const response = await fetch("/api/activity", { method:"POST", headers:{"Content-Type":"application/json"}, cache:"no-store", body: JSON.stringify({ action:"summary", pin }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se ha podido cargar la actividad.");
    render(data);
  }
  $("pin-form").addEventListener("submit", async (event) => { event.preventDefault(); pin = $("pin").value; $("error").hidden = true; try { await load(); $("pin").value=""; $("gate").hidden=true; $("dashboard").hidden=false; } catch (error) { $("error").textContent=error.message; $("error").hidden=false; } });
  $("refresh").addEventListener("click", async () => { try { await load(); } catch (error) { window.alert(error.message); } });
  $("leave").addEventListener("click", () => { pin=""; $("dashboard").hidden=true; $("gate").hidden=false; $("pin").focus(); });
})();
