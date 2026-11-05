/* A separate, small editor: the game and its keyboard handlers are not loaded. */
(() => {
  const storageKey = "hardcore-lobby-design-v1";
  const defaults = {
    brandName: "HARDCORE FIGHTERS", brandKicker: "ARCADE DE LA RIBERA",
    heading: "ELIGE TU LUCHADOR", eyebrow: "LUCHADORES DISPONIBLES",
    modesHeading: "MODOS DE JUEGO", modesSubtitle: "ELIGE CÓMO QUIERES JUGAR",
    accent: "#ff9a34", panel: "#0c1520", ink: "#f5f2e9", scale: 100,
    cardHeight: 214, columns: 3, nameSize: 100, logoScale: 100, cardGap: 10,
    backgroundImage: "", backgroundDim: 78, fighterNames: {}, fighterTitles: {},
    portraitUrls: {}, modeNames: {}, modeSubtitles: {}, labels: {}, styleOverrides: {},
  };
  const fighters = [
    ["maletilla", "MALETILLA", "EL AMO DEL RUIDO"], ["vanessa", "VANESSA", "HARDCORE GIRL"],
    ["josevictor", "JOSEVICTOR", "EL REY DEL BILLETE"], ["cristian", "CRISTIAN", "EL DIOS DE LAS MEZCLAS"],
    ["borja", "BORJA", "EL DOMADOR DEL SAPO"], ["bacora", "BACORA", "EL GUARDIÁN DE LA W"],
    ["bonviure", "BONVIURE", "EL ANCLA NEGRA"], ["elchica", "EL CHICA", "EL REY DEL JÄGER"],
    ["ogalla", "OGALLA", "EL REY DE LA ALCACHOFA"], ["xuso", "XUSO", "EL DÚO DEL PERRO"],
    ["bomba", "EL BOMBA", "EL AZADÓN"], ["tonimassama", "TONI MASSAMA", "EL REY DE LA PEINETA"],
    ["nova", "YOYE", "PRISMA DE NEÓN"], ["estefy", "ESTEFY", "LA CAPITANA DEL MACHETE"],
  ];
  const modes = [
    ["arcade", "MODO ARCADE", "6 RIVALES SEGUIDOS · TU FINAL"],
    ["fight", "MODO LUCHA", "PARTIDAS RÁPIDAS CONTRA LA IA O UN AMIGO"],
    ["coop", "AVENTURA COOPERATIVA", "HASTA 2 JUGADORES"],
    ["orbs", "MODO ROMPEOBJETOS", "DESTRUYE Y CONSIGUE PUNTOS"],
    ["central", "AVENTURA CENTRAL", "HISTORIA PRINCIPAL"],
    ["slug", "PRISON SLUG", "SUPERVIVENCIA EXTREMA"],
    ["tournament", "TORNEO DE LA RIBERA", "COMPITE Y DEMUESTRA TU VALOR"],
    ["training", "ENTRENAMIENTO", "PRACTICA TUS MOVIMIENTOS"],
    ["ranking", "RANKING MUNDIAL", "ESCALA POSICIONES EN LÍNEA"],
    ["moves", "MOVIMIENTOS", "LISTA COMPLETA DE COMBOS"],
    ["profile", "PERFIL Y PREMIOS", "LOGROS Y RECOMPENSAS"],
  ];
  const settings = [
    ["controlSize", "TAMAÑO DE BOTONES"], ["onePlayer", "1 JUGADOR + IA"],
    ["twoPlayers", "2 JUGADORES"], ["difficulty", "DIFICULTAD"],
    ["easy", "FÁCIL"], ["normal", "NORMAL"], ["hard", "DIFÍCIL"],
    ["cpu-balanced", "EQUILIBRADA"], ["cpu-aggressive", "AGRESIVA"],
    ["cpu-defensive", "DEFENSIVA"],
    ["playerHelp", "Los dos jugadores eligen en las imágenes: P1 naranja · P2 azul."],
    ["controlHelp", "Cruceta: mover · ✕: elegir y saltar a los modos · ✕ otra vez: jugar · ○: volver"],
  ];
  const numeric = { scale: [80, 130], cardHeight: [135, 330], columns: [2, 5], nameSize: [70, 150], logoScale: [55, 180], cardGap: [0, 28], backgroundDim: [20, 100] };
  const maps = ["fighterNames", "fighterTitles", "portraitUrls", "modeNames", "modeSubtitles", "labels"];
  const $ = (id) => document.getElementById(id);
  const status = (message, error = false) => { $("status").textContent = message; $("status").style.color = error ? "#ff9999" : ""; };
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  function normalize(value) {
    if (!isObject(value)) throw new Error("Configuración no válida");
    const result = { ...defaults, ...value };
    maps.forEach((key) => {
      result[key] = {};
      if (isObject(value[key])) Object.entries(value[key]).forEach(([id, item]) => {
        if (typeof item === "string" && id !== "__proto__" && id !== "constructor" && id !== "prototype") result[key][id] = item;
      });
    });
    result.styleOverrides = isObject(value.styleOverrides) ? { ...value.styleOverrides } : {};
    Object.keys(defaults).forEach((key) => {
      if (typeof defaults[key] === "string" && typeof result[key] !== "string") result[key] = defaults[key];
    });
    Object.entries(numeric).forEach(([key, bounds]) => {
      const n = Number(result[key]);
      result[key] = Number.isFinite(n) ? Math.max(bounds[0], Math.min(bounds[1], n)) : defaults[key];
    });
    ["accent", "panel", "ink"].forEach((key) => { if (!/^#[0-9a-f]{6}$/i.test(result[key])) result[key] = defaults[key]; });
    return result;
  }
  let draft = normalize({});
  let editing = null;
  let previousFocus = null;
  function readSaved() {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? normalize(JSON.parse(stored)) : normalize({});
    } catch {
      status("No se ha podido leer la configuración anterior. No se ha borrado nada.", true);
      return null;
    }
  }
  function makeButton(group, key, fallback, label, cls = "edit-text") {
    const button = document.createElement("button");
    button.type = "button"; button.className = cls;
    button.dataset.group = group; button.dataset.key = key;
    button.dataset.default = fallback; button.dataset.label = label;
    return button;
  }
  function buildPreview() {
    const cards = $("fighters");
    fighters.forEach(([id, name, title]) => {
      const button = makeButton("fighterNames", id, name, `Personaje: ${name}`, "fighter-card");
      // Decode small previews here; the full-size game sprites are much heavier on phones.
      button.dataset.title = title; button.dataset.image = `/assets/editor-previews/${id}.png`;
      const img = document.createElement("img");
      img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      const caption = document.createElement("b");
      button.append(img, caption); cards.append(button);
    });
    modes.forEach(([id, name, subtitle]) => {
      const card = document.createElement("div"); card.className = "mode-card";
      card.append(makeButton("modeNames", id, name, `Nombre de ${name}`), makeButton("modeSubtitles", id, subtitle, `Frase de ${name}`, "edit-text tiny"));
      $("modes").append(card);
    });
    settings.forEach(([id, value]) => $("settings-labels").append(makeButton("labels", id, value, value)));
  }
  function current(group, key, fallback) {
    if (group === "field") return draft[key];
    const value = draft[group][key];
    return typeof value === "string" && value.trim() ? value : fallback;
  }
  function updatePreview() {
    document.querySelectorAll("[data-group]").forEach((button) => {
      const { group, key, label, image } = button.dataset;
      const value = current(group, key, button.dataset.default || "");
      button.setAttribute("aria-label", `Editar ${label}: ${value}`);
      if (group === "fighterNames") {
        button.querySelector("b").textContent = value;
        const url = draft.portraitUrls[key];
        button.querySelector("img").src = /^(https?:\/\/|\/)/i.test(url || "") ? url : image;
      } else button.textContent = value;
    });
    const preview = document.querySelector(".preview");
    preview.style.setProperty("--accent", draft.accent);
    preview.style.setProperty("--panel", draft.panel);
    preview.style.setProperty("--ink", draft.ink);
    preview.style.setProperty("--columns", String(draft.columns));
    preview.style.setProperty("--name-size", String(draft.nameSize / 100));
    preview.style.setProperty("--title-size", String(draft.scale / 100));
    preview.style.setProperty("--logo-size", String(draft.logoScale / 100));
    preview.style.setProperty("--card-height", `${Math.round(draft.cardHeight * 0.4)}px`);
    preview.style.setProperty("--card-gap", `${draft.cardGap}px`);
    document.querySelectorAll("[data-style]").forEach((input) => {
      const key = input.dataset.style; input.value = String(draft[key]);
      const output = document.querySelector(`[data-output="${key}"]`);
      if (output) output.textContent = `${draft[key]}${key === "cardHeight" || key === "cardGap" ? " px" : key === "columns" ? "" : "%"}`;
    });
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      status("Cambios guardados. Ya puedes volver al juego.");
      return true;
    } catch {
      status("No se han podido guardar los cambios en este navegador. Prueba a descargar una copia.", true);
      return false;
    }
  }
  function closeDialog() {
    $("dialog").hidden = true; editing = null;
    if (previousFocus) previousFocus.focus();
  }
  $("pin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("pin").value !== "9030") { $("pin-error").hidden = false; $("pin").value = ""; $("pin").focus(); return; }
    $("pin-error").hidden = true; $("pin").value = "";
    const saved = readSaved();
    if (saved) draft = saved;
    $("unlock").hidden = true; $("editor").hidden = false; updatePreview();
  });
  document.querySelector(".preview").addEventListener("click", (event) => {
    const button = event.target.closest("[data-group]");
    if (!button) return;
    previousFocus = button;
    editing = { group: button.dataset.group, key: button.dataset.key, fallback: button.dataset.default || "" };
    $("edit-title").textContent = button.dataset.label;
    $("edit-input").value = current(editing.group, editing.key, editing.fallback);
    $("fighter-options").hidden = editing.group !== "fighterNames";
    if (editing.group === "fighterNames") {
      $("title-input").value = current("fighterTitles", editing.key, button.dataset.title);
      $("portrait-input").value = draft.portraitUrls[editing.key] || "";
    }
    $("dialog").hidden = false;
    $("edit-input").focus();
  });
  $("edit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!editing) return;
    const value = $("edit-input").value;
    if (editing.group === "field") draft[editing.key] = value;
    else draft[editing.group][editing.key] = value;
    if (editing.group === "fighterNames") {
      draft.fighterTitles[editing.key] = $("title-input").value;
      draft.portraitUrls[editing.key] = $("portrait-input").value;
    }
    updatePreview(); closeDialog(); status("Cambio preparado. Pulsa «Guardar cambios» para aplicarlo.");
  });
  $("cancel").addEventListener("click", closeDialog);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("dialog").hidden) closeDialog(); });
  document.querySelectorAll("[data-style]").forEach((input) => input.addEventListener("input", () => {
    const key = input.dataset.style; draft[key] = numeric[key] ? Number(input.value) : input.value;
    draft.styleOverrides[key] = true;
    if (input.type !== "url") updatePreview();
    status("Cambio preparado. Pulsa «Guardar cambios» para aplicarlo.");
  }));
  $("save").addEventListener("click", save);
  $("save-return").addEventListener("click", () => { if (save()) window.location.assign("/"); });
  $("export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "hardcore-fighters-menu.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("import").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Archivo demasiado grande");
      const parsed = JSON.parse(await file.text());
      if (!isObject(parsed) || !("heading" in parsed || "fighterNames" in parsed || "modeNames" in parsed)) throw new Error("Archivo incorrecto");
      draft = normalize(parsed); updatePreview(); status("Copia cargada. Pulsa «Guardar cambios» para aplicarla.");
    } catch { status("No se ha podido cargar esa copia. Comprueba el archivo.", true); }
    event.target.value = "";
  });
  buildPreview();
})();
