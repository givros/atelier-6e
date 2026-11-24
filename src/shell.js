(() => {
  const symbols = {
    logo: '<rect x="3" y="4" width="18" height="13" rx="3"/><path d="M8 21h8m-4-4v4m-2-12 3 2-3 2"/>',
    laptop: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20m-14 0h8"/>',
    files: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    editor: '<rect x="6" y="3" width="14" height="18" rx="2"/><path d="M9 8h7m-7 4h7m-7 4h5M4 7h3m-3 5h3m-3 5h3"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m4 17 4-4 3 3 4.5-5 4.5 5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
    mouse: '<rect x="6" y="2.5" width="12" height="19" rx="6"/><path d="M12 6v4"/>',
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01m3 0h.01m4 0h.01m3 0h.01M8 14h8"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2.4-2.5 4m0 3h.01"/>',
    search: '<circle cx="10.7" cy="10.7" r="5.7"/><path d="m15 15 4.2 4.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    flag: '<path d="M5 21V4m0 1c5-4 7 4 14 0v9c-7 4-9-4-14 0"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    minimize: '<path d="M5 12h14"/>',
    maximize: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
    restore: '<rect x="5" y="9" width="10" height="10" rx="1"/><path d="M9 9V5h10v10h-4"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 7m-1-7V5m0 5h5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    up: '<path d="m5 12 7-7 7 7m-7-7v14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.2 8.2 12 12m-12-4.4 12-12"/>',
    paste: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2m-6 8h6m-6 4h6"/>',
    save: '<path d="M4 4h13l3 3v13H4zM8 4v5h8V4m-8 16v-6h8v6"/>',
    move: '<path d="M12 2v20M2 12h20m-7-7-3-3-3 3m6 14-3 3-3-3m-4-4-3-3 3-3m14 6 3-3-3-3"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    expand: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
    shrink: '<path d="M9 4v5H4m16 0h-5V4m0 16v-5h5M4 15h5v5"/>',
    pointer: '<path d="m5 3 14 10-7 1-3 6z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>'
  };

  window.icon = (name, size = 20) => {
    const path = symbols[name] || symbols.file;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${path}</svg>`;
  };
  const appSymbols = {
    files: '<path fill="#bf7d22" d="M3 7a2 2 0 0 1 2-2h8l3 3h11a2 2 0 0 1 2 2v15H3z"/><path fill="#fff1b4" d="M5 10h22v10H5z"/><path fill="#ffd369" d="M4 13h24a2 2 0 0 1 2 2.2l-1.5 10.2a2 2 0 0 1-2 1.6h-21a2 2 0 0 1-2-1.8L2 15.3A2 2 0 0 1 4 13z"/><path fill="#eea63e" d="M4 24h25l-.5 1.8a2 2 0 0 1-2 1.2h-21A2 2 0 0 1 4 24z"/>',
    editor: '<rect x="9" y="5" width="19" height="25" rx="3" fill="#497fc8"/><rect x="5" y="3" width="20" height="24" rx="2.5" fill="#e8f7ff"/><path fill="#79c4f5" d="M5 7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v2H5z"/><path d="M10 13h10m-10 4h10m-10 4h7" fill="none" stroke="#375f9a" stroke-width="1.5" stroke-linecap="round"/>',
    image: '<rect x="6" y="10" width="22" height="17" rx="2.5" transform="rotate(11 17 18)" fill="#7f94ed"/><rect x="3" y="4" width="23" height="19" rx="2.5" fill="#e5fbff"/><rect x="5" y="6" width="19" height="15" rx="1.5" fill="#85c9f2"/><circle cx="10" cy="10" r="2" fill="#fff0aa"/><path d="m5 19 5-4 3 2 4-6 7 8v2H5z" fill="#248071"/>',
    mail: '<rect x="2" y="6" width="28" height="21" rx="4" fill="#5476cb"/><path d="m4 24 8-8m16 8-8-8" stroke="#93b5fa" fill="none" stroke-width="1.4"/><path d="M3 9a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l-12 9a2 2 0 0 1-2 0z" fill="#c4e5ff"/>',
    mouse: '<path d="M6 13a10 10 0 0 1 20 0v6a10 10 0 0 1-20 0z" fill="#cddbea"/><path d="M7 13a9 9 0 0 1 18 0v2H7z" fill="#f8fdff"/><path d="M16 4v11M7 15h18" stroke="#698099" fill="none" stroke-width="1.1"/><rect x="14.8" y="8" width="2.4" height="5" rx="1.2" fill="#426283"/>',
    trash: '<path d="M6 10h20l-2.8 17a2 2 0 0 1-2 1.7H11a2 2 0 0 1-2-1.7z" fill="#bcd7e8"/><path d="M5 9a1 1 0 0 1 1-1h6V5h8v3h6a1 1 0 0 1 1 1v2H5z" fill="#edf9ff"/><path d="m13 15 1.5 9m4.5-9-1.5 9" stroke="#5f8198" fill="none" stroke-width="1.5" stroke-linecap="round"/>',
  };

  window.appIcon = (name, size = 32) => appSymbols[name]
    ? `<svg width="${size}" height="${size}" viewBox="0 0 32 32" focusable="false" aria-hidden="true">${appSymbols[name]}</svg>`
    : window.icon(name, size);

  document.querySelectorAll('[data-icon]').forEach(element => {
    const name = element.dataset.icon;
    if (element.classList.contains('app-tile')) {
      element.innerHTML = window.appIcon(name, element.closest('.desktop-icon') ? 39 : 37);
    } else {
      element.innerHTML = window.icon(name, element.matches('.brand-icon') ? 22 : 18);
    }
  });

  const clock = document.getElementById('clock');
  const date = document.getElementById('date');
  const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  function updateClock() {
    const now = new Date();
    const value = timeFormat.format(now);
    clock.textContent = value;
    clock.dateTime = value;
    date.textContent = dateFormat.format(now);
    date.dateTime = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map(part => String(part).padStart(2, '0')).join('-');
  }
  updateClock();
  window.setInterval(updateClock, 15000);

  const helpDialog = document.getElementById('help-dialog');
  const resetDialog = document.getElementById('reset-dialog');
  const helpButton = document.getElementById('help-button');
  helpButton.addEventListener('click', () => helpDialog.showModal());
  document.getElementById('reset-button').addEventListener('click', () => {
    helpDialog.close();
    resetDialog.showModal();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.getElementById('confirm-reset').addEventListener('click', () => {
    window.Declic.reset();
    window.DeclicMissions.reset();
    resetDialog.close();
    helpButton.focus();
  });

  const screenButton = document.getElementById('screen-button');
  screenButton.addEventListener('click', () => {
    const expanded = document.body.classList.toggle('desktop-expanded');
    const label = expanded ? 'Réafficher les missions' : 'Agrandir le bureau';
    screenButton.setAttribute('aria-label', label);
    screenButton.setAttribute('aria-expanded', String(!expanded));
    screenButton.title = label;
    screenButton.querySelector('[data-screen-icon]').innerHTML = window.icon(expanded ? 'shrink' : 'expand', 18);
    screenButton.querySelector('[data-screen-label]').textContent = expanded ? 'Voir les missions' : 'Bureau seul';
  });
})();
