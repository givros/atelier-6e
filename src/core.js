(() => {
  "use strict";

  const apps = {
    files: { title: "Explorateur", icon: "files" },
    editor: { title: "Bloc-notes", icon: "editor" },
    mouse: { title: "Atelier souris", icon: "mouse" },
    trash: { title: "Corbeille", icon: "trash" },
    images: { title: "Photos", icon: "image" },
    mail: { title: "Courriel", icon: "mail" },
  };
  const gallery = {
    cat: { label: "Chat", description: "Photo d’un chat" },
    dog: { label: "Chien", description: "Photo d’un chien" },
    rabbit: { label: "Lapin", description: "Photo d’un lapin" },
  };
  const layer = document.getElementById("window-layer");
  const desktop = document.getElementById("desktop");
  const taskList = document.getElementById("task-list");
  const showDesktopButton = document.getElementById("show-desktop-button");
  const desktopIcons = document.getElementById("desktop-icons");
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const startSearch = document.getElementById("start-search");
  const startEmpty = document.getElementById("start-empty");
  const toast = document.getElementById("toast");
  const evaluation = document.documentElement.dataset.mode === "eval";
  const storeKey = evaluation ? "declic-os-eval-files-v1" : "declic-os-files-v1";
  const workspaceKey = evaluation ? "declic-os-eval-workspace-v1" : "declic-os-workspace-v1";
  const rootId = "documents";
  const practiceRoot = "practice-home";
  const practiceLocations = ["practice-inbox", "practice-work", "practice-images", "practice-archive", "practice-mail"];
  const pinnedApps = ["files", "editor", "images"];
  const windows = new Map();
  const taskButtons = new Map();
  let topLayer = 0;
  let activeApp = null;
  let desktopPeek = null;
  let explorerFolder = rootId;
  let selectedFile = null;
  let selectedTrash = null;
  let clipboard = null;
  let draggedFile = null;
  let imageSource = "cat";
  let imageFile = null;
  let editorFile = null;
  let editorText = "";
  let editorSavedText = "";
  let toastTimer;

  function initialFiles() {
    if (evaluation) return practiceFiles();
    return [
      { id: "example-folder", name: "Mes exemples", kind: "folder", parentId: rootId },
      {
        id: "welcome",
        name: "Bienvenue.txt",
        kind: "file",
        parentId: rootId,
        text: "Bienvenue sur ton bureau d’exercice !\n\nIci, chaque fichier est enregistré dans le simulateur. Tu peux ouvrir, ranger, renommer ou déplacer les documents.",
      },
      {
        id: "example-note",
        name: "Notes.txt",
        kind: "file",
        parentId: "example-folder",
        text: "Un dossier peut contenir des fichiers et d’autres dossiers.",
      },
      ...practiceFiles(),
    ];
  }

  function practiceFiles() {
    const folders = [
      { id: practiceRoot, name: "Ateliers 6e", kind: "folder", parentId: rootId },
      { id: "practice-inbox", name: "À classer", kind: "folder", parentId: practiceRoot },
      { id: "practice-work", name: "Travaux", kind: "folder", parentId: practiceRoot },
      { id: "practice-images", name: "Images", kind: "folder", parentId: practiceRoot },
      { id: "practice-archive", name: "Archives", kind: "folder", parentId: practiceRoot },
      { id: "practice-mail", name: "Courriels", kind: "folder", parentId: practiceRoot },
      { id: "practice-review", name: "À revoir", kind: "folder", parentId: "practice-work" },
    ];
    if (evaluation) return folders.concat(window.DeclicAssessment.fixtures());
    return [
      ...folders,
      { id: "practice-brief", name: "Consignes du club.txt", kind: "file", parentId: "practice-work", text: "Apporte un cahier et un crayon pour la prochaine rencontre du club." },
      { id: "practice-draft", name: "Brouillon sortie.txt", kind: "file", parentId: "practice-work", text: "Nous avons pris des photos et noté les animaux que nous avons vus pendant la sortie." },
      { id: "practice-plan", name: "Plan du club.txt", kind: "file", parentId: "practice-inbox", text: "Retrouvons-nous à la bibliothèque, à côté des fenêtres." },
      { id: "practice-rules", name: "Règlement du club.txt", kind: "file", parentId: "practice-inbox", text: "On écoute les autres et on range la salle avant de partir." },
      { id: "practice-test", name: "Essai de clavier.txt", kind: "file", parentId: "practice-inbox", text: "Ceci est un essai de saisie." },
      { id: "practice-lost", name: "Liste du matériel.txt", kind: "file", parentId: "practice-archive", text: "Un cahier, un crayon et une gomme.", trashed: true },
      { id: "practice-agenda", name: "Programme de la semaine.txt", kind: "file", parentId: "practice-work", text: "Lundi : préparer la sortie. Jeudi : ranger les photos." },
      { id: "challenge-cdi", name: "Programme CDI.txt", kind: "file", parentId: "practice-inbox", text: "Mardi : découverte du CDI. Jeudi : choix d’un livre." },
      { id: "challenge-reading", name: "Liste lecture brouillon.txt", kind: "file", parentId: "practice-archive", text: "Pour le club : un roman d’aventure, une bande dessinée et un album.", trashed: true },
      { id: "challenge-obsolete", name: "Ancienne liste du club.txt", kind: "file", parentId: "practice-inbox", text: "Ancienne liste du club de lecture." },
      { id: "challenge-trip", name: "Brouillon sortie CDI.txt", kind: "file", parentId: "practice-inbox", text: "Rendez-vous au CDI à 10 h. Pense à prendre ton carnet.", trashed: true },
    ];
  }

  function loadFiles() {
    try {
      const cached = JSON.parse(localStorage.getItem(storeKey));
      if (Array.isArray(cached)) {
        const known = new Set(cached.map((file) => file.id));
        return cached.concat(practiceFiles().filter((file) => !known.has(file.id)));
      }
    } catch {
      // The desktop remains usable if this browser restricts local storage.
    }
    return initialFiles();
  }

  let files = loadFiles();
  restoreWorkspace();

  function saveFiles() {
    try {
      localStorage.setItem(storeKey, JSON.stringify(files));
    } catch {
      // Keep the current session usable even when storage is unavailable.
    }
  }

  function restoreWorkspace() {
    try {
      const saved = JSON.parse(localStorage.getItem(workspaceKey));
      const file = byId(saved?.editor?.fileId);
      if (file?.kind === "file" && !isTrashed(file)) {
        editorFile = file.id;
        editorSavedText = file.text;
      }
      editorText = typeof saved?.editor?.text === "string" ? saved.editor.text : editorSavedText;
      const cut = byId(saved?.clipboard);
      if (cut && !isTrashed(cut)) clipboard = cut.id;
    } catch {
      // Files and the mission remain available in this session.
    }
  }

  function saveWorkspace() {
    try {
      if (!editorFile && !editorText && !clipboard) {
        localStorage.removeItem(workspaceKey);
      } else {
        const editor = { fileId: editorFile };
        if (editorText !== editorSavedText) editor.text = editorText;
        localStorage.setItem(workspaceKey, JSON.stringify({ editor, clipboard }));
      }
    } catch {
      // The open editor and clipboard still work for this session.
    }
  }

  function icon(name, size = 18) {
    return window.icon?.(name, size) || "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent("declic:action", { detail: { type, ...detail } }));
  }

  function notify(message) {
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3400);
  }

  function setStart(open) {
    if (!startMenu || !startButton) return;
    startMenu.hidden = !open;
    startButton.setAttribute("aria-expanded", String(open));
    if (!open && startSearch) {
      startSearch.value = "";
      filterStartApps();
    }
  }

  function searchableText(value) {
    return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function filterStartApps() {
    const terms = searchableText(startSearch?.value || "").split(" ").filter(Boolean);
    const entries = startMenu?.querySelectorAll("[data-app]") || [];
    let firstResult = null;
    for (const entry of entries) {
      const title = searchableText(apps[entry.dataset.app]?.title || entry.textContent);
      entry.hidden = !terms.every((term) => title.includes(term));
      if (!entry.hidden && !firstResult) firstResult = entry;
    }
    if (startEmpty) startEmpty.hidden = Boolean(firstResult);
    return firstResult;
  }

  function taskFor(app) {
    const existing = taskButtons.get(app);
    if (existing) return existing;
    const { title, icon: appIcon } = apps[app];
    const task = document.createElement("button");
    task.type = "button";
    task.className = "task-button";
    task.classList.toggle("is-pinned", pinnedApps.includes(app));
    task.dataset.task = app;
    task.setAttribute("aria-label", title);
    task.title = title;
    task.innerHTML = `<span class="task-app-icon app-tile tile-${app}" aria-hidden="true">${window.appIcon(appIcon, 24)}</span><span class="task-label">${title}</span>`;
    task.addEventListener("click", () => {
      const state = windows.get(app);
      if (!state) {
        open(app);
        return;
      }
      exitDesktopPeek();
      setStart(false);
      if (activeApp === app && !state.node.hidden) minimizeWindow(app);
      else bringToFront(app, true);
    });
    taskButtons.set(app, task);
    taskList.append(task);
    return task;
  }

  function updateTask(app) {
    const task = taskButtons.get(app);
    const state = windows.get(app);
    const active = Boolean(state && app === activeApp);
    const minimized = Boolean(state?.node.hidden);
    task.classList.toggle("is-running", Boolean(state));
    task.classList.toggle("is-active", active);
    task.classList.toggle("is-minimized", minimized);
    if (state) {
      task.setAttribute("aria-controls", state.node.id);
      task.setAttribute("aria-pressed", String(active));
    } else {
      task.removeAttribute("aria-controls");
      task.removeAttribute("aria-pressed");
    }
    task.title = minimized ? `${apps[app].title} (réduit)` : apps[app].title;
  }

  function setActive(app) {
    activeApp = app;
    for (const [key, state] of windows) {
      const active = key === app;
      state.node.classList.toggle("is-active", active);
      if (active) state.node.style.zIndex = String(++topLayer);
    }
    taskButtons.forEach((_, key) => updateTask(key));
  }

  function makeActiveAvailable() {
    const visible = Array.from(windows.entries())
      .filter(([, state]) => !state.node.hidden)
      .sort((a, b) => Number(b[1].node.style.zIndex) - Number(a[1].node.style.zIndex));
    setActive(visible[0]?.[0] || null);
  }

  function syncDesktopPeekButton() {
    if (!showDesktopButton) return;
    showDesktopButton.setAttribute("aria-pressed", String(Boolean(desktopPeek)));
    showDesktopButton.title = desktopPeek ? "Rétablir les fenêtres" : "Afficher le bureau";
  }

  function exitDesktopPeek() {
    if (!desktopPeek) return;
    desktopPeek = null;
    syncDesktopPeekButton();
  }

  function toggleDesktopPeek() {
    setStart(false);
    if (desktopPeek) {
      const { visibleApps, foreground } = desktopPeek;
      exitDesktopPeek();
      for (const app of visibleApps) {
        const node = windows.get(app)?.node;
        if (!node) continue;
        node.hidden = false;
        if (!node.classList.contains("is-maximized")) placeWindow(node, ...windowPosition(node));
      }
      if (windows.has(foreground)) setActive(foreground);
      else makeActiveAvailable();
      return;
    }
    const visibleApps = Array.from(windows.keys()).filter((app) => !windows.get(app).node.hidden);
    if (!visibleApps.length) return;
    desktopPeek = { visibleApps, foreground: activeApp };
    for (const app of visibleApps) windows.get(app).node.hidden = true;
    setActive(null);
    syncDesktopPeekButton();
  }

  function placeWindow(node, x, y) {
    const maxX = Math.max(0, layer.clientWidth - node.offsetWidth - 8);
    const maxY = Math.max(0, layer.clientHeight - node.offsetHeight - 8);
    node.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    node.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
  }

  function toggleMaximize(app) {
    const state = windows.get(app);
    if (!state) return;
    const wasMaximized = state.node.classList.toggle("is-maximized");
    const button = state.node.querySelector('[data-window-action="maximize"]');
    const label = wasMaximized ? "Rétablir la taille" : "Agrandir";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon(wasMaximized ? "restore" : "maximize", 15);
    if (!wasMaximized) placeWindow(state.node, ...windowPosition(state.node));
    emit(wasMaximized ? "window-maximize" : "window-unmaximize", { app });
  }

  function windowPosition(node) {
    return [Number.parseFloat(node.style.left) || 0, Number.parseFloat(node.style.top) || 0];
  }

  function bringToFront(app, focus = false) {
    const state = windows.get(app);
    if (!state) return;
    const wasHidden = state.node.hidden;
    const wasMinimized = state.minimized;
    state.minimized = false;
    state.node.hidden = false;
    setActive(app);
    if (focus) state.node.focus({ preventScroll: true });
    if (wasHidden && !state.node.classList.contains("is-maximized")) {
      placeWindow(state.node, ...windowPosition(state.node));
    }
    if (wasMinimized) emit("window-restore", { app });
  }

  function minimizeWindow(app) {
    const state = windows.get(app);
    if (!state || state.node.hidden) return;
    state.minimized = true;
    state.node.hidden = true;
    if (activeApp === app) makeActiveAvailable();
    else updateTask(app);
    state.task.focus({ preventScroll: true });
    emit("window-minimize", { app });
  }

  function closeWindow(app, returnFocus = true) {
    const state = windows.get(app);
    if (!state) return;
    state.node.remove();
    windows.delete(app);
    if (pinnedApps.includes(app)) updateTask(app);
    else {
      state.task.remove();
      taskButtons.delete(app);
    }
    if (activeApp === app) makeActiveAvailable();
    if (returnFocus) {
      const shortcut = desktopIcons?.querySelector(`[data-app="${app}"]`);
      (shortcut || startButton)?.focus({ preventScroll: true });
    }
    emit("window-close", { app });
  }

  function startWindowDrag(app, event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    const state = windows.get(app);
    if (state.node.classList.contains("is-maximized")) return;
    const titlebar = event.currentTarget;
    const [x, y] = windowPosition(state.node);
    const startX = event.clientX;
    const startY = event.clientY;
    titlebar.setPointerCapture(event.pointerId);
    titlebar.onpointermove = (move) => {
      placeWindow(state.node, x + move.clientX - startX, y + move.clientY - startY);
    };
    const finish = () => {
      titlebar.onpointermove = null;
      titlebar.onpointerup = null;
      titlebar.onpointercancel = null;
      const [finalX, finalY] = windowPosition(state.node);
      if (x !== finalX || y !== finalY) emit("window-move", { app });
    };
    titlebar.onpointerup = finish;
    titlebar.onpointercancel = finish;
  }

  function open(app) {
    const spec = apps[app];
    if (!spec || !layer || !taskList) return;
    exitDesktopPeek();
    setStart(false);
    if (windows.has(app)) {
      bringToFront(app, true);
      emit("window-open", { app });
      return;
    }

    const node = document.createElement("section");
    node.id = `app-window-${app}`;
    node.className = "app-window";
    node.dataset.window = app;
    node.tabIndex = -1;
    node.setAttribute("aria-labelledby", `window-title-${app}`);
    node.innerHTML = `
      <header class="window-titlebar">
        <span class="window-title" id="window-title-${app}">${window.appIcon(spec.icon, 19)} <span>${spec.title}</span></span>
        <div class="window-controls">
          <button type="button" data-window-action="minimize" title="Réduire" aria-label="Réduire">${icon("minimize", 15)}</button>
          <button type="button" data-window-action="maximize" title="Agrandir" aria-label="Agrandir">${icon("maximize", 15)}</button>
          <button type="button" data-window-action="close" title="Fermer" aria-label="Fermer">${icon("close", 15)}</button>
        </div>
      </header>
      <div class="window-body"></div>`;

    const task = taskFor(app);
    windows.set(app, { node, task, minimized: false });
    layer.append(node);
    const offset = 22 * (windows.size - 1);
    const titlebar = node.querySelector(".window-titlebar");
    node.addEventListener("pointerdown", () => setActive(app));
    node.addEventListener("focusin", () => {
      if (activeApp !== app) setActive(app);
    });
    titlebar.addEventListener("pointerdown", (event) => startWindowDrag(app, event));
    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest("button")) toggleMaximize(app);
    });
    titlebar.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.windowAction;
      if (action === "minimize") minimizeWindow(app);
      if (action === "maximize") toggleMaximize(app);
      if (action === "close") closeWindow(app);
    });
    render(app);
    placeWindow(node, 126 + offset, 32 + offset);
    bringToFront(app, true);
    emit("window-open", { app });
  }

  function bodyFor(app) {
    return windows.get(app)?.node.querySelector(".window-body");
  }

  function render(app) {
    const body = bodyFor(app);
    if (!body) return;
    if (app === "files") renderExplorer(body);
    if (app === "editor") renderEditor(body);
    if (app === "trash") renderTrash(body);
    if (app === "mouse") renderMouse(body);
    if (app === "images") renderImages(body);
    if (app === "mail") window.DeclicMail.render(body, emit);
  }

  function byId(id) {
    return files.find((file) => file.id === id);
  }

  function folderName(id) {
    return id === rootId ? "Documents" : byId(id)?.name || "Documents";
  }

  function isTrashed(file) {
    for (let node = file; node; node = byId(node.parentId)) {
      if (node.trashed) return true;
    }
    return false;
  }

  function inside(folderId, candidateId) {
    for (let node = byId(folderId); node; node = byId(node.parentId)) {
      if (node.id === candidateId) return true;
    }
    return false;
  }

  function sorted(items) {
    return items.sort((a, b) =>
      Number(b.kind === "folder") - Number(a.kind === "folder") ||
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
    );
  }

  function contents(parentId) {
    return sorted(files.filter((file) => file.parentId === parentId && !file.trashed));
  }

  function folderChoices() {
    const choices = [{ id: rootId, label: "Documents" }];
    const addChildren = (parentId, label) => {
      for (const child of contents(parentId)) {
        if (child.kind !== "folder") continue;
        const path = `${label} / ${child.name}`;
        choices.push({ id: child.id, label: path });
        addChildren(child.id, path);
      }
    };
    addChildren(rootId, "Documents");
    return choices;
  }

  function idForNewFile() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function emitFile(type, file, extra = {}) {
    emit(type, { id: file.id, name: file.name, parentId: file.parentId, kind: file.kind, sourceId: file.sourceId, ...extra });
  }

  function toolbarButton(action, label, glyph, disabled = false, primary = false) {
    return `<button type="button" class="app-button${primary ? " is-primary" : ""}" data-command="${action}"${disabled ? " disabled" : ""}>${icon(glyph, 16)}<span>${label}</span></button>`;
  }

  function fileRow(file, selected, extra = "", movable = false) {
    const appGlyph = { folder: "files", image: "image" }[file.kind];
    const glyph = appGlyph ? window.appIcon(appGlyph, 21) : icon("file", 21);
    const id = escapeHtml(file.id);
    const dragTarget = file.kind === "folder" ? ` data-drop-folder="${id}"` : "";
    const drag = movable ? ` draggable="true"${dragTarget}` : "";
    return `<button type="button" data-file-id="${id}"${drag} class="file-row${selected ? " is-selected" : ""}" aria-pressed="${selected}">${glyph}<span>${escapeHtml(file.name)}</span>${extra}</button>`;
  }

  function fileLocation(id) {
    const active = id === explorerFolder;
    return `<button type="button" data-command="${id === rootId ? "documents" : "location"}" data-drop-folder="${id}" class="file-location${active ? " is-selected" : ""}"${active ? ' aria-current="location"' : ""}>${icon("folder", 17)}<span>${escapeHtml(folderName(id))}</span></button>`;
  }

  function renderExplorer(body) {
    clearFileDrag(body);
    if (explorerFolder !== rootId && (!byId(explorerFolder) || isTrashed(byId(explorerFolder)))) {
      explorerFolder = rootId;
      selectedFile = null;
    }
    const entries = contents(explorerFolder);
    const current = entries.find((file) => file.id === selectedFile);
    const path = folderChoices().find((entry) => entry.id === explorerFolder);
    body.innerHTML = `
      <div class="app-toolbar">
        ${toolbarButton("new-folder", "Nouveau dossier", "plus", false, true)}
        ${toolbarButton("open", "Ouvrir", "folder", !current)}
        ${toolbarButton("rename", "Renommer", "editor", !current)}
        ${toolbarButton("cut", "Couper", "cut", !current)}
        ${toolbarButton("paste", "Coller", "paste", !clipboard)}
        ${toolbarButton("trash", "Mettre à la corbeille", "trash", !current)}
      </div>
      <div class="file-layout">
        <nav class="file-sidebar" aria-label="Emplacements">
          ${fileLocation(rootId)}
          ${practiceLocations.filter((id) => byId(id) && !isTrashed(byId(id))).map(fileLocation).join("")}
          <button type="button" data-command="open-trash" class="file-location">${icon("trash", 17)} Corbeille</button>
        </nav>
        <section class="file-main" aria-label="Contenu du dossier">
          <div class="file-path">
            <button type="button" class="app-button" data-command="up" aria-label="Dossier parent" title="Dossier parent"${explorerFolder === rootId ? " disabled" : ""}>${icon("up", 16)}</button>
            <span class="file-breadcrumb">${(path?.label || "Documents").split(" / ")
              .map((name) => `<span>${escapeHtml(name)}</span>`).join(icon("chevron", 13))}</span>
          </div>
          <div class="file-list">
            ${entries.length ? entries.map((file) => fileRow(file, file === current, "", true)).join("") : '<p class="empty-state">Ce dossier est vide.</p>'}
          </div>
          <div class="app-status">${entries.length} élément${entries.length === 1 ? "" : "s"}${current ? ` · ${escapeHtml(current.name)}` : ""}</div>
        </section>
      </div>
      <div class="file-context" hidden></div>`;
    body.onclick = explorerClick;
    body.ondblclick = (event) => {
      const row = event.target.closest("[data-file-id]");
      if (row) openEntry(byId(row.dataset.fileId));
    };
    body.oncontextmenu = explorerContextMenu;
    body.onkeydown = explorerKeys;
    body.ondragstart = startFileDrag;
    body.ondragover = hoverFileDrop;
    body.ondragleave = leaveFileDrop;
    body.ondrop = dropFile;
    body.ondragend = () => clearFileDrag(body);
  }

  function selectExplorer(id) {
    selectedFile = id;
    const body = bodyFor("files");
    const file = byId(id);
    const row = Array.from(body.querySelectorAll("[data-file-id]"))
      .find((item) => item.dataset.fileId === id);
    const rows = body.querySelectorAll("[data-file-id]");
    rows.forEach((item) => {
      const selected = item === row;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    for (const command of ["open", "rename", "cut", "trash"]) {
      body.querySelector(`.app-toolbar [data-command="${command}"]`).disabled = !row;
    }
    const count = rows.length;
    body.querySelector(".app-status").textContent =
      `${count} élément${count === 1 ? "" : "s"}${file ? ` · ${file.name}` : ""}`;
  }

  function explorerClick(event) {
    const row = event.target.closest("[data-file-id]");
    const control = event.target.closest("[data-command]");
    const context = event.currentTarget.querySelector(".file-context");
    if (context) context.hidden = true;
    if (row) {
      selectExplorer(row.dataset.fileId);
      if (event.detail === 0) openEntry(byId(row.dataset.fileId));
    }
    if (control?.dataset.command === "location") navigate(control.dataset.dropFolder);
    else if (control) explorerCommand(control.dataset.command);
  }

  function explorerContextMenu(event) {
    if (!event.target.closest(".file-list") || event.target.closest(".file-dialog")) return;
    event.preventDefault();
    const row = event.target.closest("[data-file-id]");
    selectExplorer(row?.dataset.fileId || null);
    const body = event.currentTarget;
    const menu = body.querySelector(".file-context");
    menu.innerHTML = row
      ? toolbarButton("open", "Ouvrir", "folder") +
        toolbarButton("rename", "Renommer", "editor") +
        toolbarButton("cut", "Couper", "cut") +
        toolbarButton("trash", "Mettre à la corbeille", "trash")
      : toolbarButton("new-folder", "Nouveau dossier", "plus") +
        toolbarButton("paste", "Coller", "paste", !clipboard);
    const rowBounds = row?.getBoundingClientRect();
    placeContext(menu, body, event.clientX || rowBounds?.left || 0, event.clientY || rowBounds?.bottom || 0);
    menu.querySelector("button")?.focus();
  }

  function placeContext(menu, body, x, y) {
    menu.hidden = false;
    const bounds = body.getBoundingClientRect();
    menu.style.left = `${Math.max(2, Math.min(x - bounds.left, bounds.width - menu.offsetWidth - 4))}px`;
    menu.style.top = `${Math.max(2, Math.min(y - bounds.top, bounds.height - menu.offsetHeight - 4))}px`;
  }

  function explorerKeys(event) {
    if (event.target.closest("input, select, textarea, .file-dialog")) return;
    const context = event.currentTarget.querySelector(".file-context");
    if (event.key === "Escape" && !context.hidden) {
      context.hidden = true;
      focusFile("files", selectedFile);
      return;
    }
    let command;
    if (event.key === "F2") command = "rename";
    if (event.key === "Delete") command = "trash";
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === "x") command = "cut";
      if (key === "v") command = "paste";
    }
    if (command) {
      event.preventDefault();
      explorerCommand(command);
    }
  }

  function startFileDrag(event) {
    const row = event.target.closest('[data-file-id][draggable="true"]');
    if (!row || !event.dataTransfer) return;
    draggedFile = row.dataset.fileId;
    selectExplorer(draggedFile);
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", byId(draggedFile).name);
  }

  function hoverFileDrop(event) {
    const target = event.target.closest("[data-drop-folder]");
    if (!draggedFile || !target || target.dataset.dropFolder === draggedFile) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    event.currentTarget.querySelector(".is-drop-target")?.classList.remove("is-drop-target");
    target.classList.add("is-drop-target");
  }

  function leaveFileDrop(event) {
    const target = event.target.closest("[data-drop-folder]");
    if (!event.relatedTarget || !target?.contains(event.relatedTarget)) {
      target?.classList.remove("is-drop-target");
    }
  }

  function clearFileDrag(body) {
    draggedFile = null;
    body.querySelector(".is-dragging")?.classList.remove("is-dragging");
    body.querySelector(".is-drop-target")?.classList.remove("is-drop-target");
  }

  function dropFile(event) {
    const destination = event.target.closest("[data-drop-folder]")?.dataset.dropFolder;
    const file = byId(draggedFile);
    if (!file || !destination) return;
    event.preventDefault();
    clearFileDrag(event.currentTarget);
    moveFile(file, destination, "drag");
  }

  function navigate(folderId) {
    explorerFolder = folderId;
    selectedFile = null;
    render("files");
    bodyFor("files")?.querySelector(".file-path button:not(:disabled), .file-list button, .app-toolbar button")?.focus();
    emit("folder-open", { id: folderId, name: folderName(folderId) });
  }

  function openEntry(file) {
    if (!file || isTrashed(file)) return;
    if (file.kind === "folder") {
      navigate(file.id);
      return;
    }
    if (file.kind === "image") {
      imageSource = file.sourceId;
      imageFile = file.id;
      render("images");
      open("images");
      emitFile("file-open", file);
      return;
    }
    const load = () => {
      if (editorFile !== file.id) {
        assignEditorFile(file);
        render("editor");
      }
      open("editor");
      bodyFor("editor")?.querySelector(".editor-text")?.focus();
      emitFile("file-open", file, { text: file.text });
    };
    if (editorFile !== file.id && editorText !== editorSavedText) {
      open("editor");
      openForm("editor", "Ouvrir un autre document ?", "<p>Le texte en cours contient des modifications à enregistrer.</p>", "Ouvrir le fichier", () => {
        load();
        return "";
      });
      return;
    }
    load();
  }

  function explorerCommand(command) {
    const current = byId(selectedFile);
    if (command === "documents") navigate(rootId);
    if (command === "up") navigate(byId(explorerFolder)?.parentId || rootId);
    if (command === "open-trash") open("trash");
    if (command === "open") openEntry(current);
    if (command === "new-folder") editFolderName();
    if (command === "rename" && current) editFolderName(current);
    if (command === "cut" && current) cutFile(current);
    if (command === "paste" && clipboard) pasteFile(explorerFolder);
    if (command === "trash" && current) moveToTrash(current);
  }

  function validateFilename(name) {
    if (!name || name === "." || name === ".." || /[/\\:*?"<>|]/.test(name)) {
      return "Choisis un nom sans caractère interdit.";
    }
    return "";
  }

  function duplicate(name, parentId, excludedId) {
    const normalized = name.normalize("NFC").toLocaleLowerCase("fr");
    return contents(parentId)
      .some((file) => file.id !== excludedId && file.name.normalize("NFC").toLocaleLowerCase("fr") === normalized);
  }

  function openForm(app, title, fields, submitLabel, submit) {
    const body = bodyFor(app);
    body.querySelector(".file-dialog")?.remove();
    const form = document.createElement("form");
    form.className = "file-dialog";
    form.setAttribute("role", "dialog");
    form.setAttribute("aria-labelledby", `file-dialog-title-${app}`);
    form.innerHTML = `
      <div class="file-dialog-card">
        <h3 id="file-dialog-title-${app}">${title}</h3>
        ${fields}
        <p class="file-error" role="alert" hidden></p>
        <div class="file-dialog-actions">
          ${toolbarButton("dismiss", "Annuler", "close")}
          <button type="submit" class="app-button is-primary">${submitLabel}</button>
        </div>
      </div>`;
    const previous = document.activeElement;
    function dismiss() {
      form.remove();
      if (previous?.isConnected) previous.focus();
    }
    form.addEventListener("click", (event) => {
      event.stopPropagation();
      if (event.target === form || event.target.closest('[data-command="dismiss"]')) dismiss();
    });
    form.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismiss();
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const error = submit(new FormData(form));
      if (error) {
        const status = form.querySelector(".file-error");
        status.textContent = error;
        status.hidden = false;
        return;
      }
      dismiss();
    });
    body.append(form);
    const input = form.querySelector("input");
    (input || form.querySelector("button"))?.focus();
    input?.select();
  }

  function editFolderName(file) {
    const creating = !file;
    const title = creating ? "Nouveau dossier" : "Renommer";
    const parentId = creating ? explorerFolder : file.parentId;
    openForm("files", title, `
      <label>Nom ${!file || file.kind === "folder" ? "du dossier" : "du fichier"}
        <input type="text" name="filename" maxlength="65" autocomplete="off" value="${escapeHtml(file?.name || "")}" required>
      </label>`, creating ? "Créer" : "Renommer", (data) => {
      const typedName = String(data.get("filename")).trim().normalize("NFC");
      const error = validateFilename(typedName);
      if (error) return error;
      const name = file?.kind === "image" ? withPhotoExtension(typedName) : typedName;
      if (!name) return "Garde l’extension .jpg ou .jpeg pour cette photo.";
      if (duplicate(name, parentId, file?.id)) return "Ce nom est déjà utilisé dans ce dossier.";
      let changed = file;
      if (creating) {
        changed = { id: idForNewFile(), name, kind: "folder", parentId };
        files.push(changed);
      } else {
        file.name = name;
      }
      selectedFile = changed.id;
      saveFiles();
      render("files");
      renderEditorStatus();
      renderImageStatus();
      focusFile("files", changed.id);
      const kind = changed.kind === "folder" ? "folder" : "file";
      emitFile(`${kind}-${creating ? "create" : "rename"}`, changed);
      return "";
    });
  }

  function cutFile(file) {
    clipboard = file.id;
    saveWorkspace();
    bodyFor("files").querySelector('.app-toolbar [data-command="paste"]').disabled = false;
    notify(`« ${file.name} » est prêt à être déplacé.`);
    emitFile("file-cut", file);
  }

  function pasteFile(destination) {
    const file = byId(clipboard);
    if (!file || isTrashed(file)) {
      clipboard = null;
      saveWorkspace();
      render("files");
      return;
    }
    moveFile(file, destination, "cut");
  }

  function moveFile(file, destination, method) {
    const folder = byId(destination);
    if (isTrashed(file) || (destination !== rootId && (folder?.kind !== "folder" || isTrashed(folder)))) return;
    if (file.parentId === destination) {
      notify("Choisis un autre dossier pour déplacer cet élément.");
      return;
    }
    if (inside(destination, file.id)) {
      notify("Un dossier ne peut pas être déplacé à l’intérieur de lui-même.");
      return;
    }
    if (duplicate(file.name, destination)) {
      notify("Ce dossier contient déjà un élément avec ce nom.");
      return;
    }
    file.parentId = destination;
    selectedFile = destination === explorerFolder ? file.id : null;
    if (clipboard === file.id) {
      clipboard = null;
      saveWorkspace();
    }
    saveFiles();
    render("files");
    renderEditorStatus();
    renderImageStatus();
    if (selectedFile) focusFile("files", file.id);
    notify(`« ${file.name} » a été déplacé.`);
    emitFile("file-move", file, { folderName: folderName(destination), method });
  }

  function moveToTrash(file) {
    file.trashed = true;
    selectedFile = null;
    if (clipboard && isTrashed(byId(clipboard))) {
      clipboard = null;
      saveWorkspace();
    }
    saveFiles();
    render("files");
    render("trash");
    renderEditorStatus();
    renderImageStatus();
    bodyFor("files")?.querySelector(".app-toolbar button")?.focus();
    notify(`« ${file.name} » a été mis à la corbeille.`);
    emitFile("file-trash", file);
  }

  function focusFile(app, id) {
    const rows = bodyFor(app)?.querySelectorAll("[data-file-id]") || [];
    Array.from(rows).find((row) => row.dataset.fileId === id)?.focus();
  }

  function renderTrash(body) {
    const trashed = sorted(files.filter((file) => file.trashed));
    const current = trashed.find((file) => file.id === selectedTrash);
    body.innerHTML = `
      <div class="app-toolbar">${toolbarButton("restore-file", "Restaurer", "restore", !current, true)}</div>
      <div class="file-main">
        <div class="file-path">Éléments supprimés</div>
        <div class="file-list">
          ${trashed.length
            ? trashed.map((file) => fileRow(file, file === current, `<small>${escapeHtml(folderName(file.parentId))}</small>`)).join("")
            : '<p class="empty-state">La corbeille est vide.</p>'}
        </div>
        <div class="app-status">Restaurer un élément le remet dans son dossier d’origine.</div>
      </div>`;
    body.onclick = (event) => {
      const row = event.target.closest("[data-file-id]");
      if (row) {
        selectedTrash = row.dataset.fileId;
        body.querySelectorAll("[data-file-id]").forEach((item) => {
          const selected = item === row;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        body.querySelector('[data-command="restore-file"]').disabled = false;
        emitFile("trash-select", byId(selectedTrash));
      }
      if (event.target.closest('[data-command="restore-file"]')) restoreFile(byId(selectedTrash));
    };
  }

  function restoreFile(file) {
    if (!file?.trashed) return;
    if (file.parentId !== rootId && isTrashed(byId(file.parentId))) {
      notify("Restaure d’abord le dossier qui contenait cet élément.");
      return;
    }
    if (duplicate(file.name, file.parentId)) {
      notify("Un élément porte déjà ce nom dans le dossier d’origine.");
      return;
    }
    delete file.trashed;
    selectedTrash = null;
    saveFiles();
    render("trash");
    render("files");
    renderEditorStatus();
    renderImageStatus();
    windows.get("trash")?.node.focus();
    notify(`« ${file.name} » a été restauré dans ${folderName(file.parentId)}.`);
    emitFile("file-restore", file, { folderName: folderName(file.parentId) });
  }

  function assignEditorFile(file) {
    editorFile = file?.id || null;
    editorText = file?.text || "";
    editorSavedText = editorText;
    saveWorkspace();
  }

  function renderEditor(body) {
    body.innerHTML = `
      <div class="app-toolbar">
        ${toolbarButton("new-file", "Nouveau", "plus")}
        ${toolbarButton("save-file", "Enregistrer", "save", false, true)}
        ${toolbarButton("save-as", "Enregistrer sous", "file")}
        ${toolbarButton("download-file", "Télécharger", "download", true)}
      </div>
      <div class="editor-layout">
        <textarea class="editor-text" aria-label="Contenu du document" placeholder="Écris ton texte ici…" spellcheck="false"></textarea>
        <div class="app-status"></div>
      </div>`;
    const textArea = body.querySelector(".editor-text");
    textArea.value = editorText;
    function readEditorInput(inputType, isComposing) {
      editorText = textArea.value;
      if (!isComposing) saveWorkspace();
      renderEditorStatus();
      emit("editor-input", { text: editorText, inputType, isComposing });
    }
    textArea.addEventListener("input", (event) => readEditorInput(event.inputType, event.isComposing));
    textArea.addEventListener("compositionend", () => readEditorInput("insertCompositionText", false));
    body.onclick = (event) => {
      const command = event.target.closest("[data-command]")?.dataset.command;
      if (command === "new-file") newEditorFile();
      if (command === "save-file") saveEditor(false);
      if (command === "save-as") saveEditor(true);
      if (command === "download-file") downloadEditorFile();
    };
    body.onkeydown = (event) => {
      if (event.target.closest(".file-dialog")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveEditor(event.shiftKey);
      }
    };
    renderEditorStatus();
  }

  function renderEditorStatus() {
    const body = bodyFor("editor");
    if (!body) return;
    const file = byId(editorFile);
    const location = file ? `${folderName(file.parentId)} / ${file.name}` : "Nouveau document";
    const state = editorText === editorSavedText ? "" : " · Modifications à enregistrer";
    body.querySelector(".app-status").textContent = `${location}${state}`;
    body.querySelector('[data-command="download-file"]').disabled = !file || isTrashed(file) || Boolean(state);
  }

  function downloadEditorFile() {
    const file = byId(editorFile);
    if (!file || isTrashed(file) || editorText !== editorSavedText) return;
    const url = URL.createObjectURL(new Blob([file.text], { type: "text/plain;charset=utf-8" }));
    download(url, file.name.toLowerCase().endsWith(".txt") ? file.name : `${file.name}.txt`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function download(url, name) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
  }

  function newEditorFile() {
    const resetEditor = () => {
      assignEditorFile(null);
      render("editor");
      bodyFor("editor").querySelector(".editor-text").focus();
      emit("editor-input", { text: "" });
    };
    if (editorText === editorSavedText) {
      resetEditor();
      return;
    }
    openForm("editor", "Commencer un autre document ?", "<p>Le texte en cours contient des modifications à enregistrer.</p>", "Créer un document vide", () => {
      resetEditor();
      return "";
    });
  }

  function saveEditor(saveAs) {
    const current = byId(editorFile);
    if (!saveAs && current && !isTrashed(current)) {
      finishEditorSave(current);
      return;
    }
    const targetId = current && !isTrashed(current) ? current.parentId : rootId;
    openForm("editor", "Enregistrer le document", saveFields(targetId), "Enregistrer", (data) => {
      const typedName = String(data.get("filename")).trim().normalize("NFC");
      const error = validateFilename(typedName);
      if (error) return error;
      const name = typedName.toLowerCase().endsWith(".txt") ? typedName : `${typedName}.txt`;
      const parentId = String(data.get("parentId"));
      if (!availableFolder(parentId)) return "Choisis un dossier disponible.";
      if (duplicate(name, parentId)) return "Ce nom est déjà utilisé. Choisis un autre nom de fichier.";
      const originalId = saveAs ? current?.originalId ?? current?.id : undefined;
      const file = { id: idForNewFile(), kind: "file", name, parentId, text: "", originalId };
      files.push(file);
      finishEditorSave(file, originalId);
      return "";
    });
  }

  function availableFolder(id) {
    const folder = byId(id);
    return id === rootId || (folder?.kind === "folder" && !isTrashed(folder));
  }

  function saveFields(targetId) {
    return `
      <label>Nom du fichier
        <input type="text" name="filename" maxlength="65" autocomplete="off" required>
      </label>
      <label>Dossier
        <select name="parentId">${folderChoices()
          .map(({ id, label }) => `<option value="${escapeHtml(id)}"${id === targetId ? " selected" : ""}>${escapeHtml(label)}</option>`)
          .join("")}</select>
      </label>`;
  }

  function finishEditorSave(file, originalId) {
    file.text = editorText;
    editorFile = file.id;
    editorSavedText = editorText;
    saveFiles();
    saveWorkspace();
    renderEditorStatus();
    render("files");
    notify(`« ${file.name} » a été enregistré dans ${folderName(file.parentId)}.`);
    emitFile("file-save", file, { text: file.text, folderName: folderName(file.parentId), originalId });
  }

  function withPhotoExtension(name) {
    if (/\.jpe?g$/i.test(name)) return name;
    if (/\.(png|webp|gif|bmp|tiff?|svg|avif|heic|heif|ico|pdf|txt)$/i.test(name)) return "";
    return `${name}.jpg`;
  }

  function photoUrl(id) {
    return `data:image/jpeg;base64,${window.DeclicPhotos[id]}`;
  }

  function renderImages(body) {
    const photo = gallery[imageSource];
    body.innerHTML = `
      <div class="app-toolbar">
        ${toolbarButton("save-image", "Enregistrer l’image sous…", "save", false, true)}
        ${toolbarButton("download-image", "Télécharger", "download", true)}
      </div>
      <div class="photo-layout">
        <div class="photo-library" role="group" aria-label="Photos disponibles">
          ${Object.entries(gallery).map(([id, item]) => `
            <button class="photo-choice" type="button" data-image-id="${id}" aria-pressed="${id === imageSource}">
              <img src="${photoUrl(id)}" alt=""><span>${item.label}</span>
            </button>`).join("")}
        </div>
        <div class="photo-preview"><img src="${photoUrl(imageSource)}" alt="${photo.description}"></div>
      </div>
      <div class="app-status" aria-live="polite"></div>
      <div class="file-context photo-context" hidden>${toolbarButton("save-image", "Enregistrer l’image sous…", "save")}</div>`;
    const menu = body.querySelector(".photo-context");
    const preview = body.querySelector(".photo-preview img");
    body.onclick = (event) => {
      const choice = event.target.closest("[data-image-id]");
      const command = event.target.closest("[data-command]")?.dataset.command;
      menu.hidden = true;
      if (choice) {
        imageSource = choice.dataset.imageId;
        imageFile = null;
        preview.src = photoUrl(imageSource);
        preview.alt = gallery[imageSource].description;
        body.querySelectorAll("[data-image-id]").forEach((button) => {
          button.setAttribute("aria-pressed", String(button === choice));
        });
        renderImageStatus();
        emit("image-select", { sourceId: imageSource });
      }
      if (command === "save-image") saveImage();
      if (command === "download-image") {
        const file = byId(imageFile);
        if (file && !isTrashed(file)) download(photoUrl(file.sourceId), file.name);
      }
    };
    body.oncontextmenu = (event) => {
      if (event.target !== preview) return;
      event.preventDefault();
      placeContext(menu, body, event.clientX, event.clientY);
      menu.querySelector("button").focus();
    };
    body.onkeydown = (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        body.querySelector('.app-toolbar [data-command="save-image"]').focus();
      }
    };
    renderImageStatus();
  }

  function renderImageStatus() {
    const body = bodyFor("images");
    if (!body) return;
    const file = byId(imageFile);
    const available = file && !isTrashed(file);
    const location = available ? `${folderName(file.parentId)} / ${file.name}` : gallery[imageSource].label;
    body.querySelector(".app-status").textContent = location;
    body.querySelector('[data-command="download-image"]').disabled = !available;
  }

  function saveImage() {
    const sourceId = imageSource;
    const current = byId(imageFile);
    const targetId = current && !isTrashed(current) ? current.parentId : rootId;
    openForm("images", "Enregistrer l’image sous", saveFields(targetId), "Enregistrer", (data) => {
      const typedName = String(data.get("filename")).trim().normalize("NFC");
      const error = validateFilename(typedName);
      if (error) return error;
      const name = withPhotoExtension(typedName);
      if (!name) return "Garde l’extension .jpg ou .jpeg pour cette photo.";
      const parentId = String(data.get("parentId"));
      if (!availableFolder(parentId)) return "Choisis un dossier disponible.";
      if (duplicate(name, parentId)) return "Ce nom est déjà utilisé dans ce dossier. Vérifie le fichier qui le porte dans l’Explorateur.";
      const file = { id: idForNewFile(), kind: "image", name, parentId, sourceId };
      files.push(file);
      imageFile = file.id;
      saveFiles();
      render("files");
      renderImageStatus();
      notify(`« ${name} » a été enregistré dans ${folderName(parentId)}.`);
      emitFile("file-save", file, { folderName: folderName(parentId) });
      return "";
    });
  }

  function renderMouse(body) {
    body.innerHTML = `
      <div class="practice-intro">Teste les quatre gestes sur les zones de l’atelier.</div>
      <div class="mouse-grid">
        <button type="button" class="mouse-tile" data-gesture="click">
          ${icon("pointer", 24)}<strong>Cliquer</strong><span>Appuie une fois avec le bouton gauche.</span>
        </button>
        <button type="button" class="mouse-tile" data-gesture="double">
          ${icon("pointer", 24)}<strong>Double-cliquer</strong><span>Appuie deux fois rapidement avec le bouton gauche.</span>
        </button>
        <button type="button" class="mouse-tile" data-gesture="right">
          ${icon("menu", 24)}<strong>Faire un clic droit</strong><span>Appuie avec le bouton droit.</span>
        </button>
      </div>
      <div class="mouse-drag-area">
        <div><strong>Glisser-déposer</strong><p>Maintiens le clic sur l’étoile et relâche-la dans la cible.</p></div>
        <button type="button" class="mouse-token" aria-label="Étoile à déplacer"><span aria-hidden="true">★</span></button>
        <button type="button" class="mouse-drop" aria-label="Cible de dépôt">Dépose ici</button>
      </div>
      <div class="app-status" aria-live="polite">Les gestes réussis s’affichent ici.</div>
      <div class="file-context mouse-practice-context" hidden>
        ${toolbarButton("close-gesture", "Fermer le menu", "close")}
      </div>`;

    function succeed(gesture, target, message) {
      target.classList.add("is-done");
      body.querySelector(".app-status").textContent = message;
      emit(`mouse-${gesture}`);
    }

    const click = body.querySelector('[data-gesture="click"]');
    click.addEventListener("click", () => {
      succeed("click", click, "Clic réussi.");
    });
    const doubleClick = body.querySelector('[data-gesture="double"]');
    doubleClick.addEventListener("dblclick", () => {
      succeed("double", doubleClick, "Double-clic réussi.");
    });
    const right = body.querySelector('[data-gesture="right"]');
    const menu = body.querySelector(".mouse-practice-context");
    function closePracticeMenu() {
      menu.hidden = true;
      right.focus();
    }
    right.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const bounds = right.getBoundingClientRect();
      placeContext(menu, body, event.clientX || bounds.left, event.clientY || bounds.bottom);
      menu.querySelector("button").focus();
      succeed("right", right, "Clic droit réussi. Tu as ouvert le menu de la cible.");
    });
    menu.addEventListener("click", closePracticeMenu);
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePracticeMenu();
    });
    const token = body.querySelector(".mouse-token");
    const drop = body.querySelector(".mouse-drop");
    token.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const startX = event.clientX;
      const startY = event.clientY;
      token.setPointerCapture(event.pointerId);
      token.classList.add("is-dragging");
      token.onpointermove = (move) => {
        token.style.transform = `translate(${move.clientX - startX}px, ${move.clientY - startY}px)`;
      };
      const clear = () => {
        token.style.transform = "";
        token.classList.remove("is-dragging");
        token.onpointermove = null;
        token.onpointerup = null;
        token.onpointercancel = null;
      };
      token.onpointercancel = clear;
      token.onpointerup = (end) => {
        clear();
        const target = drop.getBoundingClientRect();
        if (end.clientX >= target.left && end.clientX <= target.right &&
            end.clientY >= target.top && end.clientY <= target.bottom) {
          succeed("drag", drop, "Glisser-déposer réussi.");
        }
      };
    });
  }

  function reset() {
    exitDesktopPeek();
    for (const app of Array.from(windows.keys())) closeWindow(app, false);
    files = initialFiles();
    saveFiles();
    clipboard = null;
    draggedFile = null;
    imageSource = "cat";
    imageFile = null;
    selectedFile = null;
    selectedTrash = null;
    explorerFolder = rootId;
    assignEditorFile(null);
    window.DeclicMail.reset();
    selectDesktopShortcut(null);
    setStart(false);
    if (toast) toast.hidden = true;
  }

  function selectDesktopShortcut(item) {
    desktopIcons?.querySelectorAll("[data-app]").forEach((button) => {
      button.classList.toggle("is-selected", button === item);
    });
  }

  desktopIcons?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-app]");
    if (!item) return;
    selectDesktopShortcut(item);
    if (event.detail === 0 || event.pointerType === "touch") open(item.dataset.app);
  });
  desktopIcons?.addEventListener("dblclick", (event) => {
    const item = event.target.closest("[data-app]");
    if (item) open(item.dataset.app);
  });
  desktop?.addEventListener("click", (event) => {
    if (event.target === desktop || event.target === desktopIcons || event.target.closest(".wallpaper")) {
      selectDesktopShortcut(null);
    }
  });
  showDesktopButton?.addEventListener("click", toggleDesktopPeek);
  startButton?.addEventListener("click", () => {
    if (!startMenu) return;
    const opening = startMenu.hidden;
    setStart(opening);
    if (opening) (startSearch || startMenu.querySelector("button"))?.focus();
  });
  startSearch?.addEventListener("input", filterStartApps);
  startSearch?.addEventListener("keydown", (event) => {
    if (event.isComposing || !["Enter", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const result = filterStartApps();
    if (!result) return;
    if (event.key === "Enter") open(result.dataset.app);
    else result.focus();
  });
  startMenu?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-app]");
    if (item) open(item.dataset.app);
  });
  document.addEventListener("pointerdown", (event) => {
    if (startMenu && !startMenu.hidden && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
      setStart(false);
    }
    if (!event.target.closest(".file-context")) {
      const menu = bodyFor("files")?.querySelector(".file-context");
      if (menu) menu.hidden = true;
      const practiceMenu = bodyFor("mouse")?.querySelector(".mouse-practice-context");
      if (practiceMenu) practiceMenu.hidden = true;
      const photoContext = bodyFor("images")?.querySelector(".photo-context");
      if (photoContext) photoContext.hidden = true;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && startMenu && !startMenu.hidden) {
      event.preventDefault();
      setStart(false);
      startButton?.focus();
    }
  });
  if (typeof ResizeObserver === "function" && layer) {
    new ResizeObserver(() => {
      for (const { node } of windows.values()) {
        if (!node.hidden && !node.classList.contains("is-maximized")) {
          placeWindow(node, ...windowPosition(node));
        }
      }
    }).observe(layer);
  }
  if (taskList) pinnedApps.forEach(taskFor);
  syncDesktopPeekButton();
  window.Declic = {
    open,
    reset,
    inspectFiles: () => files.map((file) => ({ ...file, trashed: isTrashed(file) })),
  };
})();
