(() => {
  "use strict";

  const apps = {
    files: { title: "Explorateur", icon: "files" },
    editor: { title: "Bloc-notes", icon: "editor" },
    mouse: { title: "Atelier souris", icon: "mouse" },
    trash: { title: "Corbeille", icon: "trash" },
  };
  const layer = document.getElementById("window-layer");
  const taskList = document.getElementById("task-list");
  const desktopIcons = document.getElementById("desktop-icons");
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const toast = document.getElementById("toast");
  const storeKey = "declic-os-files-v1";
  const rootId = "documents";
  const windows = new Map();
  let topLayer = 0;
  let activeApp = null;
  let explorerFolder = rootId;
  let selectedFile = null;
  let selectedTrash = null;
  let clipboard = null;
  let editorFile = null;
  let editorText = "";
  let editorSavedText = "";
  let toastTimer;

  function initialFiles() {
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
    ];
  }

  function loadFiles() {
    try {
      const cached = JSON.parse(localStorage.getItem(storeKey));
      if (Array.isArray(cached)) return cached;
    } catch {
      // The desktop remains usable if this browser restricts local storage.
    }
    return initialFiles();
  }

  let files = loadFiles();

  function saveFiles() {
    try {
      localStorage.setItem(storeKey, JSON.stringify(files));
    } catch {
      // Keep the current session usable even when storage is unavailable.
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
  }

  function setActive(app) {
    activeApp = app;
    for (const [key, state] of windows) {
      const active = key === app;
      state.node.classList.toggle("is-active", active);
      state.task.classList.toggle("is-active", active);
      state.task.setAttribute("aria-pressed", String(active));
      if (active) state.node.style.zIndex = String(++topLayer);
    }
  }

  function makeActiveAvailable() {
    const visible = Array.from(windows.entries())
      .filter(([, state]) => !state.node.hidden)
      .sort((a, b) => Number(b[1].node.style.zIndex) - Number(a[1].node.style.zIndex));
    setActive(visible[0]?.[0] || null);
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
    state.node.hidden = false;
    setActive(app);
    if (focus) state.node.focus({ preventScroll: true });
    if (wasHidden) {
      if (!state.node.classList.contains("is-maximized")) {
        placeWindow(state.node, ...windowPosition(state.node));
      }
      emit("window-restore", { app });
    }
  }

  function minimizeWindow(app) {
    const state = windows.get(app);
    if (!state || state.node.hidden) return;
    state.node.hidden = true;
    if (activeApp === app) makeActiveAvailable();
    state.task.focus({ preventScroll: true });
    emit("window-minimize", { app });
  }

  function closeWindow(app, returnFocus = true) {
    const state = windows.get(app);
    if (!state) return;
    state.node.remove();
    state.task.remove();
    windows.delete(app);
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
    setStart(false);
    if (windows.has(app)) {
      bringToFront(app, true);
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
        <span class="window-title" id="window-title-${app}">${icon(spec.icon)} <span>${spec.title}</span></span>
        <div class="window-controls">
          <button type="button" data-window-action="minimize" title="Réduire" aria-label="Réduire">${icon("minimize", 15)}</button>
          <button type="button" data-window-action="maximize" title="Agrandir" aria-label="Agrandir">${icon("maximize", 15)}</button>
          <button type="button" data-window-action="close" title="Fermer" aria-label="Fermer">${icon("close", 15)}</button>
        </div>
      </header>
      <div class="window-body"></div>`;

    const task = document.createElement("button");
    task.type = "button";
    task.className = "task-button";
    task.setAttribute("aria-controls", node.id);
    task.dataset.task = app;
    task.innerHTML = `${icon(spec.icon, 17)}<span>${spec.title}</span>`;
    task.addEventListener("click", () => {
      if (activeApp === app && !node.hidden) minimizeWindow(app);
      else bringToFront(app, true);
    });

    windows.set(app, { node, task });
    layer.append(node);
    taskList.append(task);
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
      (a.kind === b.kind ? 0 : a.kind === "folder" ? -1 : 1) ||
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
    emit(type, { id: file.id, name: file.name, parentId: file.parentId, ...extra });
  }

  function toolbarButton(action, label, glyph, disabled = false, primary = false) {
    return `<button type="button" class="app-button${primary ? " is-primary" : ""}" data-command="${action}"${disabled ? " disabled" : ""}>${icon(glyph, 16)}<span>${label}</span></button>`;
  }

  function fileRow(file, selected, extra = "") {
    const glyph = file.kind === "folder" ? "folder" : "file";
    return `<button type="button" data-file-id="${escapeHtml(file.id)}" class="file-row${selected ? " is-selected" : ""}" aria-pressed="${selected}">${icon(glyph, 21)}<span>${escapeHtml(file.name)}</span>${extra}</button>`;
  }

  function renderExplorer(body) {
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
          <button type="button" data-command="documents" class="file-location${explorerFolder === rootId ? " is-selected" : ""}">${icon("folder", 17)} Documents</button>
          <button type="button" data-command="open-trash" class="file-location">${icon("trash", 17)} Corbeille</button>
        </nav>
        <section class="file-main" aria-label="Contenu du dossier">
          <div class="file-path">
            <button type="button" class="app-button" data-command="up" aria-label="Dossier parent" title="Dossier parent"${explorerFolder === rootId ? " disabled" : ""}>${icon("up", 16)}</button>
            <span>${escapeHtml(path?.label || "Documents")}</span>
          </div>
          <div class="file-list">
            ${entries.length ? entries.map((file) => fileRow(file, file === current)).join("") : '<p class="empty-state">Ce dossier est vide.</p>'}
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
    const command = event.target.closest("[data-command]")?.dataset.command;
    const context = event.currentTarget.querySelector(".file-context");
    if (context) context.hidden = true;
    if (row) {
      selectExplorer(row.dataset.fileId);
      if (event.detail === 0) openEntry(byId(row.dataset.fileId));
    }
    if (command) explorerCommand(command);
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
    const load = () => {
      if (editorFile !== file.id) {
        assignEditorFile(file);
        render("editor");
      }
      open("editor");
      bodyFor("editor")?.querySelector(".editor-text")?.focus();
      emitFile("file-open", file);
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
    const normalized = name.toLocaleLowerCase("fr");
    return contents(parentId)
      .some((file) => file.id !== excludedId && file.name.toLocaleLowerCase("fr") === normalized);
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
      const name = String(data.get("filename")).trim();
      const error = validateFilename(name);
      if (error) return error;
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
      focusFile("files", changed.id);
      const kind = changed.kind === "folder" ? "folder" : "file";
      emitFile(`${kind}-${creating ? "create" : "rename"}`, changed);
      return "";
    });
  }

  function cutFile(file) {
    clipboard = file.id;
    bodyFor("files").querySelector('.app-toolbar [data-command="paste"]').disabled = false;
    notify(`« ${file.name} » est prêt à être déplacé.`);
    emitFile("file-cut", file);
  }

  function pasteFile(destination) {
    const file = byId(clipboard);
    if (!file || isTrashed(file)) {
      clipboard = null;
      render("files");
      return;
    }
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
    selectedFile = file.id;
    clipboard = null;
    saveFiles();
    render("files");
    renderEditorStatus();
    focusFile("files", file.id);
    notify(`« ${file.name} » a été déplacé.`);
    emitFile("file-move", file, { folderName: folderName(destination), method: "cut" });
  }

  function moveToTrash(file) {
    file.trashed = true;
    selectedFile = null;
    if (clipboard === file.id) clipboard = null;
    saveFiles();
    render("files");
    render("trash");
    renderEditorStatus();
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
    windows.get("trash")?.node.focus();
    notify(`« ${file.name} » a été restauré dans ${folderName(file.parentId)}.`);
    emitFile("file-restore", file, { folderName: folderName(file.parentId) });
  }

  function assignEditorFile(file) {
    editorFile = file?.id || null;
    editorText = file?.text || "";
    editorSavedText = editorText;
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
    textArea.addEventListener("input", () => {
      editorText = textArea.value;
      renderEditorStatus();
      emit("editor-input", { text: editorText });
    });
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
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.toLowerCase().endsWith(".txt") ? file.name : `${file.name}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function newEditorFile() {
    const resetEditor = () => {
      assignEditorFile(null);
      render("editor");
      bodyFor("editor").querySelector(".editor-text").focus();
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
    const folders = folderChoices();
    const targetId = current && !isTrashed(current) ? current.parentId : rootId;
    openForm("editor", "Enregistrer le document", `
      <label>Nom du fichier
        <input type="text" name="filename" maxlength="65" autocomplete="off" value="" required>
      </label>
      <label>Dossier
        <select name="parentId">${folders
          .map(({ id, label }) => `<option value="${escapeHtml(id)}"${id === targetId ? " selected" : ""}>${escapeHtml(label)}</option>`)
          .join("")}</select>
      </label>`, "Enregistrer", (data) => {
      const typedName = String(data.get("filename")).trim();
      const error = validateFilename(typedName);
      if (error) return error;
      const name = typedName.toLowerCase().endsWith(".txt") ? typedName : `${typedName}.txt`;
      const parentId = String(data.get("parentId"));
      if (duplicate(name, parentId)) return "Ce nom est déjà utilisé. Choisis un autre nom de fichier.";
      const file = { id: idForNewFile(), kind: "file", name, parentId, text: "" };
      files.push(file);
      finishEditorSave(file);
      return "";
    });
  }

  function finishEditorSave(file) {
    file.text = editorText;
    editorFile = file.id;
    editorSavedText = editorText;
    saveFiles();
    renderEditorStatus();
    render("files");
    notify(`« ${file.name} » a été enregistré dans ${folderName(file.parentId)}.`);
    emitFile("file-save", file, { text: file.text, folderName: folderName(file.parentId) });
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
    for (const app of Array.from(windows.keys())) closeWindow(app, false);
    files = initialFiles();
    saveFiles();
    clipboard = null;
    selectedFile = null;
    selectedTrash = null;
    explorerFolder = rootId;
    assignEditorFile(null);
    setStart(false);
    if (toast) toast.hidden = true;
  }

  desktopIcons?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-app]");
    if (!item) return;
    desktopIcons.querySelectorAll("[data-app]").forEach((button) => {
      button.classList.toggle("is-selected", button === item);
    });
    if (event.detail === 0 || event.pointerType === "touch") open(item.dataset.app);
  });
  desktopIcons?.addEventListener("dblclick", (event) => {
    const item = event.target.closest("[data-app]");
    if (item) open(item.dataset.app);
  });
  startButton?.addEventListener("click", () => {
    const opening = startMenu.hidden;
    setStart(opening);
    if (opening) startMenu.querySelector("button")?.focus();
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
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && startMenu && !startMenu.hidden) {
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
  window.Declic = { open, reset };
})();
