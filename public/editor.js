/* A separate, small editor: the game and its keyboard handlers are not loaded. */
(() => {
  const storageKey = "hardcore-lobby-design-v1";
  const defaults = {
    brandName: "HARDCORE FIGHTERS", brandKicker: "ARCADE DE LA RIBERA",
    heading: "ELIGE TU LUCHADOR", eyebrow: "LUCHADORES DISPONIBLES",
    modesHeading: "MODOS DE JUEGO", modesSubtitle: "ELIGE CÓMO QUIERES JUGAR",
    accent: "#ff9a34", panel: "#0c1520", ink: "#f5f2e9", scale: 100,
    cardHeight: 214, columns: 3, nameSize: 100, logoScale: 100, cardGap: 10, cardRadius: 10, modeGap: 10,
    backgroundImage: "", backgroundDim: 78, fighterNames: {}, fighterTitles: {},
    portraitUrls: {}, modeNames: {}, modeSubtitles: {}, labels: {}, styleOverrides: {}, placements: {}, textStyles: {}, fighterOrder: [], modeOrder: [],
  };
  const fighters = [
    ["mad-dog", "MAD DOG", ""], ["angerfist", "ANGERFIST", ""], ["dalmau", "DALMAU", ""],
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
  const numeric = { scale: [80, 130], cardHeight: [135, 330], columns: [2, 5], nameSize: [70, 150], logoScale: [55, 180], cardGap: [0, 28], cardRadius: [0, 32], modeGap: [0, 28], backgroundDim: [20, 100] };
  const maps = ["fighterNames", "fighterTitles", "portraitUrls", "modeNames", "modeSubtitles", "labels"];
  const $ = (id) => document.getElementById(id);
  const status = (message, error = false) => { $("status").textContent = message; $("status").style.color = error ? "#ff9999" : ""; };
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
  const basePlacement = () => ({ x: 0, y: 0, size: 100, width: 100 });
  function ordered(defaultsList, saved) {
    const valid = Array.isArray(saved) ? saved.filter((id, index) => defaultsList.includes(id) && saved.indexOf(id) === index) : [];
    return [...valid, ...defaultsList.filter((id) => !valid.includes(id))];
  }
  function normalizePlacement(value) {
    return { x: number(value?.x, 0, -300, 300), y: number(value?.y, 0, -2500, 2500), size: number(value?.size, 100, 60, 160), width: number(value?.width, 100, 60, 160) };
  }
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
    result.placements = {};
    if (isObject(value.placements)) Object.entries(value.placements).forEach(([id, item]) => {
      if (/^(field|labels|fighterNames|modeNames|modeSubtitles|section|logo):[\w-]+$/.test(id) && isObject(item)) result.placements[id] = normalizePlacement(item);
    });
    result.textStyles = {};
    if (isObject(value.textStyles)) Object.entries(value.textStyles).forEach(([id, item]) => {
      if (!/^(field|labels|fighterNames|modeNames|modeSubtitles):[\w-]+$/.test(id) || !isObject(item)) return;
      const style = {
        color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "",
        background: /^#[0-9a-f]{6}$/i.test(item.background) ? item.background : "",
        opacity: number(item.opacity, 100, 25, 100),
        fontSize: number(item.fontSize, 100, 60, 180),
        letterSpacing: number(item.letterSpacing, 0, -4, 16),
        align: ["left", "center", "right"].includes(item.align) ? item.align : "left",
        hidden: item.hidden === true,
      };
      if (style.color || style.background || style.opacity !== 100 || style.fontSize !== 100 || style.letterSpacing !== 0 || style.align !== "left" || style.hidden) result.textStyles[id] = style;
    });
    result.fighterOrder = ordered(fighters.map(([id]) => id), value.fighterOrder);
    result.modeOrder = ordered(modes.map(([id]) => id), value.modeOrder);
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
  let arranging = false;
  let selection = null;
  let pointer = null;
  let editorSessionPin = "";
  let fighterBalance = {};
  const balanceFields = ["speed", "power", "defense"];
  fighters.forEach(([id, name]) => { const option = document.createElement("option"); option.value = id; option.textContent = name; $("balance-fighter").append(option); });
  function showBalance() {
    const values = fighterBalance[$("balance-fighter").value] || {};
    balanceFields.forEach((field) => { const value = values[field] ?? 100; $(`balance-${field}`).value = value; $(`balance-${field}-output`).textContent = `${value} %`; });
  }
  $("balance-fighter").addEventListener("change", showBalance);
  balanceFields.forEach((field) => $(`balance-${field}`).addEventListener("input", () => {
    const id = $("balance-fighter").value;
    fighterBalance[id] = fighterBalance[id] || { speed: 100, power: 100, defense: 100 };
    fighterBalance[id][field] = Number($(`balance-${field}`).value);
    $(`balance-${field}-output`).textContent = `${fighterBalance[id][field]} %`;
    $("balance-status").textContent = "Cambios pendientes de guardar.";
  }));
  $("balance-reset").addEventListener("click", () => { delete fighterBalance[$("balance-fighter").value]; showBalance(); $("balance-status").textContent = "Valores originales recuperados. Guarda para aplicarlos."; });
  $("balance-save").addEventListener("click", async () => {
    $("balance-save").disabled = true;
    try {
      const response = await fetch("/api/fighter-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: editorSessionPin, balance: fighterBalance }) });
      if (!response.ok) throw new Error("No se ha podido guardar");
      $("balance-status").textContent = "Ajustes guardados para todos. Recargad el juego antes de jugar.";
    } catch { $("balance-status").textContent = "No se han guardado los cambios. Comprueba la conexión e inténtalo otra vez."; }
    finally { $("balance-save").disabled = false; }
  });
  let history = [];
  let historyIndex = -1;
  function syncHistory() {
    $("undo").disabled = historyIndex <= 0;
    $("redo").disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }
  function resetHistory() {
    history = [JSON.stringify(draft)]; historyIndex = 0; syncHistory();
  }
  function remember() {
    if (pointer) { pointer.changed = true; return; }
    const next = JSON.stringify(draft);
    if (history[historyIndex] === next) return;
    history.splice(historyIndex + 1);
    history.push(next);
    if (history.length > 36) history.shift();
    historyIndex = history.length - 1;
    syncHistory();
  }
  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    try { draft = normalize(JSON.parse(history[index])); historyIndex = index; updatePreview(); refreshSelection(); syncHistory(); status("Cambio recuperado. Guarda cuando estés conforme."); }
    catch { status("No se ha podido recuperar ese cambio.", true); }
  }
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
      const card = document.createElement("div"); card.className = "mode-card"; card.dataset.modeId = id;
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
      if (group === "section" || group === "logo") return;
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
    preview.style.setProperty("--card-radius", `${draft.cardRadius}px`);
    preview.style.setProperty("--mode-gap", `${draft.modeGap}px`);
    document.querySelectorAll("[data-style]").forEach((input) => {
      const key = input.dataset.style; input.value = String(draft[key]);
      const output = document.querySelector(`[data-output="${key}"]`);
      if (output) output.textContent = `${draft[key]}${["cardHeight", "cardGap", "cardRadius", "modeGap"].includes(key) ? " px" : key === "columns" ? "" : "%"}`;
    });
    draft.fighterOrder.forEach((id) => {
      const card = $("fighters").querySelector(`[data-key="${id}"]`);
      if (card) $("fighters").append(card);
    });
    draft.modeOrder.forEach((id) => {
      const card = $("modes").querySelector(`[data-mode-id="${id}"]`);
      if (card) $("modes").append(card);
    });
    document.querySelectorAll(".preview [data-group]").forEach((button) => { applyPlacement(button); applyTextStyle(button); });
  }
  function itemFor(button) {
    if (button.dataset.group === "section") return button.closest("[data-section]");
    if (button.dataset.group === "modeNames") return button.closest(".mode-card");
    if (button.dataset.group === "field" && button.dataset.key === "modesHeading") return button.closest(".preview-mode-title");
    return button;
  }
  function placementId(button) { return `${button.dataset.group}:${button.dataset.key}`; }
  function defaultTextStyle() { return { color: "", background: "", opacity: 100, fontSize: 100, letterSpacing: 0, align: "left", hidden: false }; }
  function textStyleFor(button) { return { ...defaultTextStyle(), ...draft.textStyles[placementId(button)] }; }
  function styleable(button) { return !["section", "logo"].includes(button.dataset.group); }
  function applyTextStyle(button) {
    const item = itemFor(button);
    if (!item || !styleable(button)) return;
    const style = textStyleFor(button);
    const active = style.color || style.background || style.opacity !== 100 || style.fontSize !== 100 || style.letterSpacing !== 0 || style.align !== "left" || style.hidden;
    item.dataset.textStyle = active ? "true" : "";
    item.style.setProperty("--text-color", style.color || "inherit");
    item.style.setProperty("--text-background", style.background || "transparent");
    item.style.setProperty("--text-opacity", String(style.opacity / 100));
    item.style.setProperty("--text-size", String(style.fontSize / 100));
    item.style.setProperty("--text-letter-spacing", String(style.letterSpacing));
    item.style.setProperty("--text-align", style.align);
    item.hidden = style.hidden;
  }
  function applyPlacement(button) {
    const item = itemFor(button);
    if (!item) return;
    const value = draft.placements[placementId(button)];
    if (!value) { item.style.transform = ""; delete item.dataset.layoutApplied; return; }
    const p = normalizePlacement(value);
    item.style.transform = `translate(${p.x}%, ${p.y}%) scale(${p.size * p.width / 10000}, ${p.size / 100})`;
    item.dataset.layoutApplied = "true";
  }
  function selectItem(button) {
    document.querySelectorAll("[data-arrange-selected]").forEach((item) => delete item.dataset.arrangeSelected);
    selection = button;
    $("element-picker").value = placementId(button);
    const item = itemFor(button);
    if (item) item.dataset.arrangeSelected = "true";
    $("selection-label").textContent = button.dataset.label || "Elemento";
    const isCard = ["fighterNames", "modeNames"].includes(button.dataset.group);
    $("selection-hint").textContent = isCard ? "Arrastra la tarjeta sobre otra o usa los botones para cambiar su orden." : "Arrastra el elemento o usa las flechas para colocarlo.";
    $("selection-tools").hidden = false;
    $("nudge-controls").hidden = isCard;
    $("coordinate-controls").hidden = isCard;
    $("order-controls").hidden = !isCard;
    $("text-style-tools").hidden = !styleable(button);
    refreshSelection();
  }
  function refreshSelection() {
    if (!selection) return;
    const p = normalizePlacement(draft.placements[placementId(selection)] || basePlacement());
    $("element-size").value = String(p.size); $("size-output").textContent = `${p.size}%`;
    $("element-width").value = String(p.width); $("width-output").textContent = `${p.width}%`;
    $("element-x").value = String(p.x); $("element-y").value = String(p.y);
    if (styleable(selection)) {
      const style = textStyleFor(selection);
      $("text-color").value = style.color || draft.ink;
      $("text-background").value = style.background || draft.panel;
      $("text-opacity").value = String(style.opacity); $("opacity-output").textContent = `${style.opacity}%`;
      $("text-font-size").value = String(style.fontSize); $("font-size-output").textContent = `${style.fontSize}%`;
      $("text-letter-spacing").value = String(style.letterSpacing); $("letter-spacing-output").textContent = String(style.letterSpacing);
      $("text-align").value = style.align; $("text-hidden").checked = style.hidden;
    }
  }
  function setPlacement(changes) {
    if (!selection) return;
    const id = placementId(selection);
    draft.placements[id] = normalizePlacement({ ...basePlacement(), ...draft.placements[id], ...changes });
    applyPlacement(selection); refreshSelection();
    remember();
    status("Cambio preparado. Pulsa «Guardar cambios» para aplicarlo.");
  }
  function setTextStyle(changes) {
    if (!selection || !styleable(selection)) return;
    const id = placementId(selection);
    const next = { ...defaultTextStyle(), ...draft.textStyles[id], ...changes };
    const defaultStyle = defaultTextStyle();
    if (JSON.stringify(next) === JSON.stringify(defaultStyle)) delete draft.textStyles[id];
    else draft.textStyles[id] = next;
    applyTextStyle(selection); refreshSelection();
    remember();
    status("Estilo preparado. Pulsa «Guardar cambios» para aplicarlo.");
  }
  function moveCard(group, key, target) {
    const orderKey = group === "fighterNames" ? "fighterOrder" : "modeOrder";
    const order = [...draft[orderKey]];
    const from = order.indexOf(key); const to = typeof target === "number" ? clamp(target, 0, order.length - 1) : order.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    order.splice(from, 1); order.splice(to, 0, key); draft[orderKey] = order;
    updatePreview();
    remember();
    status("Orden preparado. Pulsa «Guardar cambios» para aplicarlo.");
  }
  function setArrangeMode(enabled) {
    arranging = enabled; pointer = null;
    document.querySelector(".preview").classList.toggle("arranging", enabled);
    $("text-mode").setAttribute("aria-pressed", String(!enabled));
    $("arrange-mode").setAttribute("aria-pressed", String(enabled));
    $("preview-instruction").textContent = enabled ? "Toca y arrastra para organizar" : "Pulsa ✎ para editar";
    $("arrange-panel").hidden = !enabled;
    if (!enabled) {
      document.querySelectorAll("[data-arrange-selected]").forEach((item) => delete item.dataset.arrangeSelected);
      selection = null; $("selection-tools").hidden = true;
      $("element-picker").value = "";
      $("selection-label").textContent = "Toca un elemento para seleccionarlo";
      $("selection-hint").textContent = "Arrastra títulos y bloques. Arrastra tarjetas para cambiar su orden.";
    }
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
  async function loadPublishedDesign() {
    try {
      const response = await fetch("/api/menu-design", { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json();
      return isObject(data.design) ? normalize(data.design) : null;
    } catch { return null; }
  }
  $("pin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const enteredPin = $("pin").value;
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: enteredPin }) });
      if (!response.ok) throw new Error("PIN incorrecto");
    } catch {
      $("pin-error").hidden = false; $("pin").value = ""; $("pin").focus(); return;
    }
    editorSessionPin = enteredPin;
    try {
      const response = await fetch("/api/fighter-balance", { cache: "no-store" });
      if (!response.ok) throw new Error("Sin conexión");
      const data = await response.json(); fighterBalance = data.balance || {}; showBalance();
    } catch { $("balance-save").disabled = true; $("balance-status").textContent = "No se han podido cargar los ajustes; vuelve a abrir el editor con conexión."; }
    $("pin-error").hidden = true; $("pin").value = "";
    const hasSaved = Boolean(localStorage.getItem(storageKey));
    const saved = readSaved();
    if (hasSaved && saved) draft = saved;
    else {
      const published = await loadPublishedDesign();
      if (published) draft = published;
    }
    resetHistory();
    $("unlock").hidden = true; $("editor").hidden = false; updatePreview();
  });
  document.querySelector(".preview").addEventListener("click", (event) => {
    const button = event.target.closest("[data-group]");
    if (!button) return;
    if (arranging) { event.preventDefault(); selectItem(button); return; }
    if (["section", "logo"].includes(button.dataset.group)) return;
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
    updatePreview(); remember(); closeDialog(); status("Cambio preparado. Pulsa «Guardar cambios» para aplicarlo.");
  });
  $("cancel").addEventListener("click", closeDialog);
  $("text-mode").addEventListener("click", () => setArrangeMode(false));
  $("arrange-mode").addEventListener("click", () => setArrangeMode(true));
  $("close-arrange").addEventListener("click", () => setArrangeMode(false));
  const preview = document.querySelector(".preview");
  preview.addEventListener("pointerdown", (event) => {
    if (!arranging || event.button !== 0) return;
    const button = event.target.closest("[data-group]");
    if (!button) return;
    event.preventDefault(); selectItem(button);
    const item = itemFor(button); const rect = item.getBoundingClientRect();
    const p = normalizePlacement(draft.placements[placementId(button)] || basePlacement());
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, rect, placement: p };
    try { preview.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional on older phones. */ }
  });
  preview.addEventListener("pointermove", (event) => {
    if (!arranging || !selection || !pointer || event.pointerId !== pointer.id) return;
    event.preventDefault();
    const { group, key } = selection.dataset;
    if (group === "fighterNames" || group === "modeNames") {
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const target = group === "fighterNames" ? under?.closest(".fighter-card")?.dataset.key : under?.closest(".mode-card")?.dataset.modeId;
      if (target) moveCard(group, key, target);
      return;
    }
    const sx = pointer.placement.size * pointer.placement.width / 10000;
    const sy = pointer.placement.size / 100;
    setPlacement({ x: Math.round(pointer.placement.x + (event.clientX - pointer.x) * 100 * sx / Math.max(1, pointer.rect.width)), y: Math.round(pointer.placement.y + (event.clientY - pointer.y) * 100 * sy / Math.max(1, pointer.rect.height)) });
  });
  const finishPointer = (event) => {
    if (pointer?.id !== event.pointerId) return;
    const changed = pointer.changed;
    pointer = null;
    if (changed) remember();
  };
  preview.addEventListener("pointerup", finishPointer);
  preview.addEventListener("pointercancel", finishPointer);
  document.querySelectorAll("[data-nudge]").forEach((button) => button.addEventListener("click", () => {
    if (!selection) return;
    const p = normalizePlacement(draft.placements[placementId(selection)] || basePlacement());
    const direction = button.dataset.nudge;
    const step = Number($("nudge-step").value) || 5;
    setPlacement({ x: p.x + (direction === "left" ? -step : direction === "right" ? step : 0), y: p.y + (direction === "up" ? -step : direction === "down" ? step : 0) });
  }));
  ["before", "after"].forEach((direction) => $(`order-${direction}`).addEventListener("click", () => {
    if (!selection) return;
    const { group, key } = selection.dataset;
    const order = group === "fighterNames" ? draft.fighterOrder : draft.modeOrder;
    moveCard(group, key, order.indexOf(key) + (direction === "before" ? -1 : 1));
  }));
  $("element-size").addEventListener("input", (event) => setPlacement({ size: Number(event.target.value) }));
  $("element-width").addEventListener("input", (event) => setPlacement({ width: Number(event.target.value) }));
  $("element-x").addEventListener("input", (event) => setPlacement({ x: Number(event.target.value) }));
  $("element-y").addEventListener("input", (event) => setPlacement({ y: Number(event.target.value) }));
  $("text-color").addEventListener("input", (event) => setTextStyle({ color: event.target.value }));
  $("text-background").addEventListener("input", (event) => setTextStyle({ background: event.target.value }));
  $("text-opacity").addEventListener("input", (event) => setTextStyle({ opacity: Number(event.target.value) }));
  $("text-font-size").addEventListener("input", (event) => setTextStyle({ fontSize: Number(event.target.value) }));
  $("text-letter-spacing").addEventListener("input", (event) => setTextStyle({ letterSpacing: Number(event.target.value) }));
  $("text-align").addEventListener("change", (event) => setTextStyle({ align: event.target.value }));
  $("text-hidden").addEventListener("change", (event) => setTextStyle({ hidden: event.target.checked }));
  $("clear-text-background").addEventListener("click", () => setTextStyle({ background: "" }));
  $("reset-text-style").addEventListener("click", () => {
    if (!selection || !styleable(selection)) return;
    delete draft.textStyles[placementId(selection)]; applyTextStyle(selection); refreshSelection();
    remember();
    status("Estilo restablecido. Pulsa «Guardar cambios» para aplicarlo.");
  });
  $("reset-element").addEventListener("click", () => {
    if (!selection) return;
    delete draft.placements[placementId(selection)]; applyPlacement(selection); refreshSelection();
    remember();
    status("Elemento restablecido. Pulsa «Guardar cambios» para aplicarlo.");
  });
  $("element-picker").addEventListener("change", (event) => {
    const button = [...document.querySelectorAll(".preview [data-group]")].find((item) => placementId(item) === event.target.value);
    if (button) selectItem(button);
  });
  $("reset-layout").addEventListener("click", () => {
    draft.placements = {}; draft.fighterOrder = fighters.map(([id]) => id); draft.modeOrder = modes.map(([id]) => id);
    updatePreview(); refreshSelection(); remember();
    status("Organización restablecida. Pulsa «Guardar cambios» para aplicarla.");
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("dialog").hidden) closeDialog(); });
  document.querySelectorAll("[data-style]").forEach((input) => input.addEventListener("input", () => {
    const key = input.dataset.style; draft[key] = numeric[key] ? Number(input.value) : input.value;
    draft.styleOverrides[key] = true;
    if (input.type !== "url") updatePreview(); remember();
    status("Cambio preparado. Pulsa «Guardar cambios» para aplicarlo.");
  }));
  const themes = {
    arcade: { accent: "#ff9a34", panel: "#0c1520", ink: "#f5f2e9", backgroundDim: 78 },
    prison: { accent: "#72ddff", panel: "#061b2d", ink: "#e9f8ff", backgroundDim: 82 },
    neon: { accent: "#ff5cce", panel: "#170b2a", ink: "#fff0fd", backgroundDim: 74 },
    gold: { accent: "#e9be4f", panel: "#21180c", ink: "#fff5d8", backgroundDim: 80 },
  };
  document.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => {
    Object.assign(draft, themes[button.dataset.theme]);
    Object.keys(themes.arcade).forEach((key) => { draft.styleOverrides[key] = true; });
    updatePreview(); remember(); status("Plantilla preparada. Pulsa «Guardar cambios» para aplicarla.");
  }));
  $("reset-colors").addEventListener("click", () => {
    ["accent", "panel", "ink", "backgroundDim"].forEach((key) => { draft[key] = defaults[key]; delete draft.styleOverrides[key]; });
    updatePreview(); remember(); status("Colores restablecidos. Pulsa «Guardar cambios» para aplicarlos.");
  });
  $("save").addEventListener("click", save);
  $("publish").addEventListener("click", async () => {
    if (!editorSessionPin) { status("Vuelve a entrar con el PIN antes de publicar.", true); return; }
    try {
      const response = await fetch("/api/menu-design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: editorSessionPin, design: draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se ha podido publicar.");
      save(); status("Menú publicado. Los jugadores nuevos ya verán este diseño.");
    } catch (error) { status(error?.message || "No se ha podido publicar el menú.", true); }
  });
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
      draft = normalize(parsed); updatePreview(); resetHistory(); status("Copia cargada. Pulsa «Guardar cambios» para aplicarla.");
    } catch { status("No se ha podido cargar esa copia. Comprueba el archivo.", true); }
    event.target.value = "";
  });
  buildPreview();
  document.querySelectorAll(".preview [data-group]").forEach((button) => {
    const option = document.createElement("option"); option.value = placementId(button); option.textContent = button.dataset.label;
    $("element-picker").append(option);
  });
  const profiles = {
    desktop: { columns: 3, cardHeight: 214, cardGap: 10, modeGap: 10, nameSize: 100 },
    tablet: { columns: 3, cardHeight: 190, cardGap: 8, modeGap: 8, nameSize: 96 },
    phone: { columns: 2, cardHeight: 180, cardGap: 7, modeGap: 7, nameSize: 94 },
  };
  document.querySelectorAll("[data-profile]").forEach((button) => button.addEventListener("click", () => {
    Object.assign(draft, profiles[button.dataset.profile]); Object.keys(profiles[button.dataset.profile]).forEach((key) => { draft.styleOverrides[key] = true; });
    updatePreview(); remember(); status("Perfil preparado. Ajusta lo que quieras y guarda.");
  }));
  document.querySelectorAll("[data-viewport]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-viewport]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector(".preview").dataset.viewport = button.dataset.viewport;
  }));
  $("undo").addEventListener("click", () => restoreHistory(historyIndex - 1));
  $("redo").addEventListener("click", () => restoreHistory(historyIndex + 1));
  document.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || document.activeElement?.matches("input,textarea,select")) return;
    if (event.key.toLowerCase() === "z") { event.preventDefault(); restoreHistory(event.shiftKey ? historyIndex + 1 : historyIndex - 1); }
    if (event.key.toLowerCase() === "y") { event.preventDefault(); restoreHistory(historyIndex + 1); }
  });
})();
