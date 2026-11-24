(() => {
  const content = document.getElementById('mission-content');
  const list = document.getElementById('mission-list');
  const count = document.getElementById('mission-count');
  const progress = document.getElementById('mission-progress');
  const status = document.getElementById('mission-status');
  const storageKey = 'declic.missions.v1';
  const documentName = 'Ma première mission.txt';
  const sampleText = 'Je découvre le clavier !';

  const missions = [
    {
      title: 'Apprivoiser la souris',
      description: 'Chaque geste sert à quelque chose. Entraîne-toi dans l’Atelier souris.',
      app: 'mouse',
      steps: [
        ['click', 'Sélectionne la cible avec un clic.', 'Pose le pointeur sur la cible et appuie une fois sur le bouton gauche de la souris.'],
        ['double', 'Fais un double-clic sur sa cible.', 'Appuie deux fois de suite, rapidement, sur le bouton gauche sans déplacer la souris.'],
        ['right', 'Affiche le menu de la cible avec un clic droit.', 'Utilise le bouton droit. Sur certains pavés tactiles, un clic à deux doigts ouvre aussi le menu.'],
        ['drag', 'Fais glisser l’objet dans la zone d’arrivée.', 'Maintiens le bouton gauche enfoncé sur l’objet, déplace-le jusqu’à la zone et relâche.'],
      ],
    },
    {
      title: 'Maîtriser les fenêtres',
      description: 'Entraîne-toi avec l’Explorateur et repère à quoi servent les boutons en haut d’une fenêtre.',
      steps: [
        ['open', 'Ouvre l’Explorateur.', 'Repère l’icône Explorateur sur le bureau et double-clique dessus.'],
        ['minimize', 'Réduis la fenêtre.', 'Clique sur le premier bouton en haut à droite. La fenêtre se range dans la barre des tâches.'],
        ['restore', 'Affiche de nouveau la fenêtre réduite.', 'Clique sur Explorateur dans la barre des tâches, en bas du bureau.'],
        ['maximize', 'Agrandis la fenêtre.', 'Clique sur le bouton Agrandir, entre les deux autres boutons en haut à droite.'],
        ['close', 'Ferme la fenêtre.', 'Clique sur la croix en haut à droite de la fenêtre de l’Explorateur.'],
      ],
    },
    {
      title: 'Créer un dossier',
      description: 'Prépare un endroit pour ranger ton travail de technologie.',
      steps: [
        ['createFolder', 'Crée un dossier Brouillon dans Documents.', 'Ouvre l’Explorateur, choisis Documents, puis Nouveau dossier. Saisis Brouillon.'],
        ['renameFolder', 'Renomme le dossier Brouillon en Technologie.', 'Fais un clic droit sur le dossier Brouillon et choisis Renommer. Saisis Technologie.'],
      ],
    },
    {
      title: 'Écrire et enregistrer',
      description: 'Utilise le clavier pour rédiger une phrase, puis garde une copie dans tes documents.',
      steps: [
        ['type', `Dans le Bloc-notes, saisis « ${sampleText} »`, 'Tiens la touche Maj enfoncée pendant que tu tapes J. Sur un clavier AZERTY, utilise la touche é pour la lettre accentuée.'],
        ['save', `Enregistre le texte dans Documents sous « ${documentName} ».`, 'Clique sur Enregistrer, choisis Documents et donne un nom à ton fichier. L’extension .txt indique un document texte.'],
      ],
    },
    {
      title: 'Ranger un fichier',
      description: 'Déplace le texte que tu as enregistré vers ton dossier de technologie.',
      steps: [
        ['cut', `Dans Documents, coupe le fichier « ${documentName} ».`, 'Dans l’Explorateur, utilise le clic droit sur ton fichier et choisis Couper.'],
        ['paste', 'Colle le fichier dans Technologie.', 'Ouvre Technologie dans l’Explorateur. Clique sur Coller ou fais un clic droit dans un espace libre et choisis Coller.'],
      ],
    },
    {
      title: 'Récupérer un fichier',
      description: 'Découvre comment retrouver un document mis à la corbeille.',
      steps: [
        ['trash', `Depuis Technologie, mets « ${documentName} » à la corbeille.`, 'Dans l’Explorateur, ouvre Technologie. Fais un clic droit sur le fichier et choisis Mettre à la corbeille.'],
        ['recover', 'Ouvre la Corbeille et restaure ton fichier.', 'Ouvre la Corbeille depuis le bureau, sélectionne le fichier et clique sur Restaurer. Il revient dans Technologie.'],
      ],
    },
  ];

  function initialState() {
    return { active: 0, done: {}, draftFolderId: null, folderId: null, fileId: null };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Number.isInteger(saved.active) && missions[saved.active] && saved.done) {
        return { ...initialState(), ...saved };
      }
    } catch {
      // The training remains usable when the browser blocks storage.
    }
    return initialState();
  }

  let state = load();
  let hintOpen = false;

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Progress is still available while the page stays open.
    }
  }

  function isComplete(mission) {
    return mission.steps.every(([id]) => state.done[id]);
  }

  function isAvailable(index) {
    return missions.slice(0, index).every(isComplete);
  }

  function render() {
    const completed = missions.filter(isComplete).length;
    const current = missions[state.active];
    const pending = current.steps.find(([id]) => !state.done[id]);
    const openButton = current.app && pending
      ? '<button class="mission-open" type="button" data-mission-app="mouse">Ouvrir l’atelier</button>'
      : '';
    const hint = pending
      ? `<button class="mission-hint-toggle" type="button" aria-controls="mission-hint" aria-expanded="${hintOpen}">${hintOpen ? 'Masquer l’indice' : 'Afficher un indice'}</button>`
      : '';
    const nextButton = !pending && state.active < missions.length - 1
      ? `<button class="mission-next" type="button" data-mission-select="${state.active + 1}">Mission suivante</button>`
      : '';
    const completion = pending ? '' : `<p class="mission-completion">${completed === missions.length ? 'Parcours terminé. Les six missions sont réussies !' : 'Mission réussie !'}</p>`;

    count.textContent = `${completed} / ${missions.length}`;
    progress.value = completed;
    content.innerHTML = `
      <h2 id="mission-active-title" class="mission-card-heading" tabindex="-1">${current.title}</h2>
      <p class="mission-description">${current.description}</p>
      <ol class="mission-steps">
        ${current.steps.map(([id, label]) => {
          const done = Boolean(state.done[id]);
          const next = id === pending?.[0];
          return `<li class="mission-step${done ? ' is-done' : ''}${next ? ' is-current' : ''}"${next ? ' aria-current="step"' : ''} aria-label="${done ? 'Étape réussie. ' : ''}${label}"><span class="mission-check" aria-hidden="true">${done ? '✓' : ''}</span><span class="mission-step-text">${label}</span></li>`;
        }).join('')}
      </ol>
      ${completion}
      ${openButton || hint || nextButton ? `<div class="mission-actions">${openButton}${hint}${nextButton}</div>` : ''}
      ${pending ? `<p id="mission-hint" class="mission-hint"${hintOpen ? '' : ' hidden'}>${pending[2]}</p>` : ''}`;

    list.innerHTML = missions.map((mission, index) => {
      const active = index === state.active;
      const done = isComplete(mission);
      const available = isAvailable(index);
      return `<button class="mission-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}" type="button" data-mission-select="${index}"${active ? ' aria-current="step"' : ''}${available ? '' : ' disabled'} aria-label="Mission ${index + 1}. ${mission.title}${done ? '. Réussie' : available ? '' : '. Termine les missions précédentes pour y accéder'}"><span class="mission-item-number" aria-hidden="true">${index + 1}</span><span class="mission-item-label">${mission.title}</span><span class="mission-item-status" aria-hidden="true">${done ? '✓' : ''}</span></button>`;
    }).join('');
  }

  function select(index) {
    if (!missions[index] || !isAvailable(index)) return;
    state.active = index;
    hintOpen = false;
    persist();
    render();
    document.getElementById('mission-active-title').focus({ preventScroll: true });
  }

  function normalizeName(name) {
    return String(name ?? '').trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  function isSampleText(text) {
    const trim = (value) => value.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/ !$/, '!');
    return typeof text === 'string' && trim(text) === trim(sampleText);
  }

  function mark(id) {
    if (state.done[id]) return false;
    state.done[id] = true;
    return true;
  }

  function checkAction(action) {
    const { type, app, name, id, parentId, text } = action;
    switch (type) {
      case 'mouse-click': return mark('click');
      case 'mouse-double': return mark('double');
      case 'mouse-right': return mark('right');
      case 'mouse-drag': return mark('drag');
      case 'window-open': return app === 'files' && mark('open');
      case 'window-minimize': return app === 'files' && mark('minimize');
      case 'window-restore': return app === 'files' && mark('restore');
      case 'window-maximize': return app === 'files' && mark('maximize');
      case 'window-close': return app === 'files' && mark('close');
      case 'folder-create': {
        if (parentId !== 'documents' || normalizeName(name) !== 'brouillon' || state.done.renameFolder) return false;
        if (state.draftFolderId === id) return false;
        state.draftFolderId = id;
        mark('createFolder');
        return true;
      }
      case 'folder-rename': {
        if (parentId !== 'documents' || id !== state.draftFolderId || normalizeName(name) !== 'technologie') return false;
        state.folderId = id;
        return mark('renameFolder');
      }
      case 'editor-input': return isSampleText(text) && mark('type');
      case 'file-save': {
        if (parentId !== 'documents' || normalizeName(name) !== normalizeName(documentName) || !isSampleText(text)) return false;
        mark('type');
        if (state.done.paste || state.fileId === id) return false;
        state.fileId = id;
        mark('save');
        return true;
      }
      case 'file-cut': return id === state.fileId && parentId === 'documents' && mark('cut');
      case 'file-move': {
        if (id !== state.fileId || parentId !== state.folderId || action.method !== 'cut') return false;
        mark('cut');
        return mark('paste');
      }
      case 'file-trash': return id === state.fileId && state.done.paste && mark('trash');
      case 'file-restore': return id === state.fileId && state.done.trash && (!parentId || parentId === state.folderId) && mark('recover');
      default: return false;
    }
  }

  function onAction(event) {
    if (!event.detail) return;
    const current = missions[state.active];
    const previousStep = current.steps.findIndex(([id]) => !state.done[id]);
    if (!checkAction(event.detail)) return;
    const nextStep = current.steps.findIndex(([id]) => !state.done[id]);
    persist();
    render();
    if (nextStep !== previousStep) {
      status.textContent = nextStep === -1 ? `Mission réussie. ${current.title}.` : `Étape réussie. ${current.steps[nextStep][1]}`;
    }
  }

  function onPanelClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-mission-select')) {
      select(Number(button.dataset.missionSelect));
    } else if (button.hasAttribute('data-mission-app')) {
      window.Declic?.open(button.dataset.missionApp);
    } else if (button.classList.contains('mission-hint-toggle')) {
      hintOpen = !hintOpen;
      button.setAttribute('aria-expanded', String(hintOpen));
      button.textContent = hintOpen ? 'Masquer l’indice' : 'Afficher un indice';
      document.getElementById('mission-hint').hidden = !hintOpen;
    }
  }

  content.addEventListener('click', onPanelClick);
  list.addEventListener('click', onPanelClick);
  window.addEventListener('declic:action', onAction);
  document.addEventListener('declic:action', onAction);
  window.DeclicMissions = {
    select,
    reset() {
      state = initialState();
      hintOpen = false;
      persist();
      render();
      status.textContent = 'Le parcours a été réinitialisé.';
    },
  };

  if (!isAvailable(state.active)) state.active = 0;
  render();
})();
