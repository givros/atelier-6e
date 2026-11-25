(() => {
  if (document.documentElement.dataset.mode === 'eval') return;

  const content = document.getElementById('mission-content');
  const list = document.getElementById('mission-list');
  const count = document.getElementById('mission-count');
  const progress = document.getElementById('mission-progress');
  const status = document.getElementById('mission-status');
  const storageKey = 'declic.missions.v1';
  const documentName = 'Ma première mission.txt';
  const firstFolderName = 'Mes devoirs';
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
      description: 'Prépare un endroit pour ranger tes devoirs.',
      steps: [
        ['createFolder', 'Crée un dossier Brouillon dans Documents.', 'Ouvre l’Explorateur, choisis Documents, puis Nouveau dossier. Saisis Brouillon.'],
        ['renameFolder', () => `Renomme le dossier Brouillon en « ${introFolderName()} ».`, () => `Fais un clic droit sur Brouillon et choisis Renommer. Saisis ${introFolderName()}.`],
      ],
    },
    {
      title: 'Écrire et enregistrer',
      description: 'Tape ou colle la phrase dans le Bloc-notes, puis enregistre ton document.',
      app: 'editor',
      sample: sampleText,
      steps: [
        ['type', 'Saisis la phrase ci-dessus dans le Bloc-notes.', 'Clique sur Copier la phrase, puis sur Coller la phrase dans le Bloc-notes. Tu peux aussi taper la phrase au clavier.'],
        ['save', `Enregistre le texte dans Documents sous « ${documentName} ».`, 'Clique sur Enregistrer et choisis Documents. Si tu l’as déjà enregistré dans un autre dossier, clique sur Enregistrer sous.'],
      ],
    },
    {
      title: 'Ranger un fichier',
      description: 'Déplace le texte que tu as enregistré vers ton dossier de devoirs.',
      steps: [
        ['cut', `Dans Documents, coupe le fichier « ${documentName} ».`, 'Dans l’Explorateur, utilise le clic droit sur ton fichier et choisis Couper.'],
        ['paste', () => `Colle le fichier dans ${introFolderName()}.`, () => `Ouvre ${introFolderName()} dans l’Explorateur. Clique sur Coller ou fais un clic droit dans un espace libre et choisis Coller.`],
      ],
    },
    {
      title: 'Récupérer un fichier',
      description: 'Découvre comment retrouver un document mis à la corbeille.',
      steps: [
        ['trash', () => `Depuis ${introFolderName()}, mets « ${documentName} » à la corbeille.`, () => `Dans l’Explorateur, ouvre ${introFolderName()}. Fais un clic droit sur le fichier et choisis Mettre à la corbeille.`],
        ['recover', 'Ouvre la Corbeille et restaure ton fichier.', () => `Ouvre la Corbeille depuis le bureau, sélectionne le fichier et clique sur Restaurer. Il revient dans ${introFolderName()}.`],
      ],
    },
  ];

  function thirdPartyInput(action) {
    return /^(insertFromPaste|insertFromDrop|insertFromYank)/.test(action.inputType || '');
  }

  function trackTyping(action) {
    const field = action.type === 'mail-input' ? action.field : action.type === 'editor-input' ? 'editor' : null;
    if (!field) return false;
    const wasPasted = pastedFields.has(field);
    const value = action.value ?? action.text ?? '';
    if (thirdPartyInput(action)) {
      pastedFields.add(field);
    } else if (!value || (!action.isComposing && action.inputType === 'insertText' && [...value.normalize('NFC')].length === 1)) {
      pastedFields.delete(field);
    }
    return wasPasted !== pastedFields.has(field);
  }

  function sameText(value, expected) {
    const normalize = (text) => text.normalize('NFC').replace(/[\u00a0\u202f]/g, ' ').trim();
    return typeof value === 'string' && typeof expected === 'string' && normalize(value) === normalize(expected);
  }

  function actionMatches(type, input = {}) {
    return (action) => {
      if (action.type !== type) return false;
      const fields = typeof input === 'function' ? input() : input;
      return Object.entries(fields).every(([key, value]) => {
        if (key === 'text') return sameText(action.text, value);
        if (key === 'name') return sameText(action.name?.toLocaleLowerCase('fr'), value.toLocaleLowerCase('fr'));
        return value != null && action[key] === value;
      });
    };
  }

  function remember(test, key, field = 'id') {
    return (action) => {
      if (!test(action) || action[field] == null) return false;
      state.refs[key] = action[field];
      return true;
    };
  }

  function typed(field, expected) {
    return (action) => {
      if (action.isComposing || pastedFields.has(field)) return false;
      if (field === 'editor') return action.type === 'editor-input' && sameText(action.text, expected);
      return action.type === 'mail-input' && action.field === field && sameText(action.value, expected);
    };
  }

  function sentMail(recipient, subject, body) {
    return (action) => action.type === 'mail-send' &&
      sameText(action.recipient, recipient) &&
      sameText(action.subject, subject) &&
      sameText(action.body, body);
  }

  const schoolReport = 'Le club se réunit jeudi.\nApporte ton carnet.';
  const noteFirst = 'Le club ouvre mardi.';
  const noteFinal = 'Le club ouvre jeudi.';
  const starterAddress = 'atelier.6e@example.org';
  const secondAddress = 'club-musique+6e@example.org';
  const accents = 'âge, fête, île, côte, flûte';
  const clubAddress = 'club-musique@example.org';
  const clubSubject = 'Inscription au club';
  const clubMessage = 'Bonjour,\nJe voudrais participer au club.\nMerci !';
  const correctedAddress = 'classe.6e@example.org';
  const correctedSubject = 'Sortie de classe';
  const wrongMessage = 'Bonjour, la visite du chateau est à 10 h.';
  const correctedMessage = 'Bonjour, la visite du château est à 10 h.';
  const keyboardHint = 'Sur beaucoup de claviers AZERTY, la touche ^ se trouve près de la lettre P. Appuie sur ^, relâche, puis tape la voyelle. L’accent apparaît avec la lettre.';

  const workshops = [
    {
      title: 'Se repérer dans les dossiers',
      description: 'Retrouve le document qui explique le fonctionnement du club.',
      app: 'files',
      steps: [
        ['browseWork', 'Ouvre le dossier Travaux.', 'Dans l’Explorateur, clique sur Travaux à gauche.', actionMatches('folder-open', { id: 'practice-work' })],
        ['readBrief', 'Ouvre « Consignes du club.txt ».', 'Double-clique sur le fichier. Il s’ouvre dans le Bloc-notes.', actionMatches('file-open', { id: 'practice-brief', parentId: 'practice-work' })],
        ['returnDocuments', 'Retourne dans Documents.', 'Clique sur le raccourci Documents dans l’Explorateur.', actionMatches('folder-open', { id: 'documents' })],
      ],
    },
    {
      title: 'Créer un dossier dans un dossier',
      description: 'Prépare un espace où tu pourras ranger les notes du club.',
      app: 'files',
      steps: [
        ['projectFolder', 'Dans Travaux, crée un dossier « Projet du club ».', 'Clique sur Travaux dans l’Explorateur, puis sur Nouveau dossier.', remember(actionMatches('folder-create', { name: 'Projet du club', parentId: 'practice-work' }), 'projectFolder')],
        ['notesFolder', 'Dans Projet du club, crée un dossier « Notes ».', 'Double-clique sur Projet du club avant de choisir Nouveau dossier.', actionMatches('folder-create', () => ({ name: 'Notes', parentId: state.refs.projectFolder }))],
      ],
    },
    {
      title: 'Renommer un fichier',
      description: 'Donne au compte rendu de la sortie un nom qui permettra de le retrouver.',
      app: 'files',
      steps: [
        ['renameTrip', 'Dans Travaux, renomme « Brouillon sortie.txt » en « Compte rendu sortie.txt ».', 'Sélectionne le fichier. Utilise le bouton Renommer ou la touche F2. Garde .txt à la fin.', actionMatches('file-rename', { id: 'practice-draft', parentId: 'practice-work', name: 'Compte rendu sortie.txt' })],
        ['openTrip', 'Ouvre « Compte rendu sortie.txt » pour vérifier le changement.', 'Double-clique sur le fichier qui porte le nouveau nom.', actionMatches('file-open', { id: 'practice-draft', parentId: 'practice-work', name: 'Compte rendu sortie.txt' })],
      ],
    },
    {
      title: 'Déposer dans le bon dossier',
      description: 'Range le plan avec les travaux du club à l’aide de la souris.',
      app: 'files',
      steps: [
        ['dragClubPlan', 'Fais glisser « Plan du club.txt » et dépose-le sur Travaux.', 'Le fichier se trouve au départ dans À classer. S’il a été déplacé, ouvre son nouveau dossier, puis fais-le glisser sur Travaux dans la colonne de gauche.', actionMatches('file-move', { id: 'practice-plan', parentId: 'practice-work', method: 'drag' })],
        ['reopenClubPlan', 'Ouvre le plan depuis Travaux pour vérifier son emplacement.', 'Clique sur Travaux à gauche, puis double-clique sur le plan.', actionMatches('file-open', { id: 'practice-plan', parentId: 'practice-work' })],
      ],
    },
    {
      title: 'Ranger dans un sous-dossier',
      description: 'Le règlement doit être relu. Place-le avec les fichiers à revoir.',
      app: 'files',
      steps: [
        ['cutClubRules', 'Dans À classer, coupe « Règlement du club.txt ».', 'Fais un clic droit sur le fichier et choisis Couper. Tu peux aussi utiliser le bouton Couper.', actionMatches('file-cut', { id: 'practice-rules', parentId: 'practice-inbox' })],
        ['pasteClubRules', 'Colle le règlement dans Travaux › À revoir.', 'Ouvre Travaux, puis À revoir et clique sur Coller. Si Coller est grisé après un déplacement, retrouve le règlement et coupe-le à nouveau.', actionMatches('file-move', { id: 'practice-rules', parentId: 'practice-review', method: 'cut' })],
      ],
    },
    {
      title: 'Mettre un fichier à la corbeille',
      description: 'Enlève un ancien fichier d’essai du dossier À classer.',
      app: 'files',
      steps: [
        ['trashTypingTest', 'Dans À classer, mets « Essai de clavier.txt » à la corbeille.', 'Sélectionne le fichier, puis choisis Mettre à la corbeille.', actionMatches('file-trash', { id: 'practice-test', parentId: 'practice-inbox' })],
        ['viewTypingTrash', 'Dans la Corbeille, sélectionne « Essai de clavier.txt » pour le retrouver.', 'Ouvre la Corbeille, puis clique une fois sur le fichier d’essai.', actionMatches('trash-select', { id: 'practice-test', parentId: 'practice-inbox' }), 'trash'],
      ],
    },
    {
      title: 'Récupérer un document supprimé',
      description: 'La liste du matériel est encore utile. Remets-la à sa place.',
      app: 'trash',
      steps: [
        ['restoreEquipment', 'Dans la Corbeille, restaure « Liste du matériel.txt ».', 'Sélectionne le fichier et clique sur Restaurer. Le dossier d’origine est indiqué à droite de son nom.', actionMatches('file-restore', { id: 'practice-lost', parentId: 'practice-archive' })],
        ['openEquipment', 'Ouvre « Liste du matériel.txt » dans Archives.', 'Ouvre l’Explorateur et clique sur Archives, puis ouvre le fichier.', actionMatches('file-open', { id: 'practice-lost', parentId: 'practice-archive' }), 'files'],
      ],
    },
    {
      title: 'Enregistrer un document texte',
      description: 'Crée un petit compte rendu du club, puis retrouve-le dans l’Explorateur.',
      app: 'editor',
      steps: [
        ['draftReport', 'Dans un nouveau document, tape « Le club se réunit jeudi. » À la ligne, tape « Apporte ton carnet. »', 'Dans le Bloc-notes, clique sur Nouveau. Après le point de la première phrase, appuie une fois sur Entrée.', actionMatches('editor-input', { text: schoolReport })],
        ['saveReport', 'Enregistre ton document dans Travaux sous « Compte rendu du club.txt ».', 'Clique sur Enregistrer et choisis Travaux. Si tu as choisi le mauvais dossier, utilise Enregistrer sous. Si le Bloc-notes est vide, reprends les deux lignes de l’étape précédente.', remember(actionMatches('file-save', { name: 'Compte rendu du club.txt', parentId: 'practice-work', text: schoolReport }), 'schoolReport')],
        ['openReport', 'Vérifie les deux lignes en rouvrant le document depuis Travaux.', 'Passe dans l’Explorateur, clique sur Travaux et double-clique sur le nom du document.', actionMatches('file-open', () => ({ id: state.refs.schoolReport, parentId: 'practice-work', text: schoolReport })), 'files'],
      ],
    },
    {
      title: 'Modifier un document enregistré',
      description: 'Le jour d’ouverture du club a changé. Mets la note à jour dans le même fichier.',
      app: 'editor',
      steps: [
        ['writeClubNote', 'Dans un nouveau document, tape « Le club ouvre mardi. »', 'Ouvre le Bloc-notes et clique sur Nouveau.', actionMatches('editor-input', { text: noteFirst })],
        ['saveClubNote', 'Enregistre ce texte dans Travaux sous « Note du club.txt ».', 'Choisis Travaux au moment de l’enregistrement. Si tu as choisi le mauvais dossier, clique sur Enregistrer sous.', remember(actionMatches('file-save', { name: 'Note du club.txt', parentId: 'practice-work', text: noteFirst }), 'clubNote')],
        ['updateClubNote', 'Remplace mardi par jeudi et enregistre la modification dans le même fichier.', 'Sélectionne seulement mardi, tape jeudi, puis clique sur Enregistrer. Le raccourci Ctrl + S ou ⌘ + S fait la même chose.', actionMatches('file-save', () => ({ id: state.refs.clubNote, parentId: 'practice-work', text: noteFinal }))],
      ],
    },
    {
      title: 'Enregistrer une copie',
      description: 'Garde une copie du programme dans les archives et retrouve l’original.',
      app: 'files',
      steps: [
        ['openClubAgenda', 'Dans Travaux, ouvre « Programme de la semaine.txt ».', 'Ouvre le dossier Travaux dans l’Explorateur, puis double-clique sur le fichier texte.', remember(actionMatches('file-open', { id: 'practice-agenda', parentId: 'practice-work' }), 'agendaText', 'text')],
        ['copyClubAgenda', 'Dans le Bloc-notes, enregistre une copie dans Archives sous « Programme archivé.txt ».', 'Clique sur Enregistrer sous. Si tu as choisi un autre dossier, utilise à nouveau Enregistrer sous et choisis Archives.', actionMatches('file-save', () => ({ originalId: 'practice-agenda', name: 'Programme archivé.txt', parentId: 'practice-archive', text: state.refs.agendaText })), 'editor'],
        ['verifyClubAgenda', 'Rouvre le programme original depuis Travaux.', 'Retourne dans l’Explorateur. Le fichier « Programme de la semaine.txt » est toujours dans Travaux.', actionMatches('file-open', () => ({ id: 'practice-agenda', parentId: 'practice-work', text: state.refs.agendaText }))],
      ],
    },
    {
      title: 'Enregistrer une photo',
      description: 'Ajoute une photo de chat au dossier Images.',
      app: 'images',
      steps: [
        ['saveCat', 'Depuis Photos, enregistre la photo Chat dans Images sous « Le chat.jpg ».', 'Choisis Chat puis Enregistrer l’image. Si une autre photo porte ce nom dans Images, renomme-la dans l’Explorateur avant de réessayer.', remember(actionMatches('file-save', { kind: 'image', sourceId: 'cat', name: 'Le chat.jpg', parentId: 'practice-images' }), 'cat')],
        ['openCat', 'Ouvre « Le chat.jpg » depuis le dossier Images.', 'Dans l’Explorateur, choisis Images. Double-clique sur la photo pour l’afficher.', actionMatches('file-open', () => ({ id: state.refs.cat, parentId: 'practice-images', kind: 'image' })), 'files'],
      ],
    },
    {
      title: 'Renommer une image',
      description: 'Prépare une photo pour l’album des animaux avec un nom précis.',
      app: 'images',
      steps: [
        ['saveDog', 'Enregistre la photo Chien dans Images sous « Le chien.jpg ».', 'Dans Photos, choisis Chien, puis Enregistrer l’image.', remember(actionMatches('file-save', { kind: 'image', sourceId: 'dog', name: 'Le chien.jpg', parentId: 'practice-images' }), 'dog')],
        ['renameDog', 'Dans Images, renomme ce fichier en « Portrait du chien.jpg ».', 'Sélectionne la photo dans l’Explorateur et clique sur Renommer. Garde .jpg à la fin.', actionMatches('file-rename', () => ({ id: state.refs.dog, parentId: 'practice-images', name: 'Portrait du chien.jpg' })), 'files'],
        ['openDog', 'Ouvre « Portrait du chien.jpg ».', 'Vérifie que la photo s’affiche encore avec son nouveau nom.', actionMatches('file-open', () => ({ id: state.refs.dog, parentId: 'practice-images', name: 'Portrait du chien.jpg', kind: 'image' })), 'files'],
      ],
    },
    {
      title: 'Classer une image',
      description: 'Enregistre une photo en attente, puis range-la dans l’album des animaux.',
      app: 'images',
      steps: [
        ['saveRabbit', 'Enregistre la photo Lapin dans À classer sous « Le lapin.jpg ».', 'Dans Photos, choisis Lapin et choisis À classer dans la fenêtre d’enregistrement.', remember(actionMatches('file-save', { kind: 'image', sourceId: 'rabbit', name: 'Le lapin.jpg', parentId: 'practice-inbox' }), 'rabbit')],
        ['dragRabbit', 'Fais glisser « Le lapin.jpg » jusqu’à Images.', 'La photo se trouve au départ dans À classer. Si elle a été déplacée, ouvre son nouveau dossier, puis fais-la glisser sur Images dans la colonne de gauche.', actionMatches('file-move', () => ({ id: state.refs.rabbit, parentId: 'practice-images', method: 'drag' })), 'files'],
        ['openRabbit', 'Vérifie que la photo s’ouvre depuis Images.', 'Clique sur Images, puis double-clique sur « Le lapin.jpg ».', actionMatches('file-open', () => ({ id: state.refs.rabbit, parentId: 'practice-images', kind: 'image' })), 'files'],
      ],
    },
    {
      title: 'Taper une adresse e-mail',
      description: 'Entraîne-toi à saisir l’arobase, les points et les autres signes d’une adresse.',
      app: 'mail',
      keyboard: true,
      steps: [
        ['typeFirstAddress', `Dans le champ À, tape « ${starterAddress} ».`, 'Repère @ sur ton clavier. Sur de nombreux claviers AZERTY de PC, on obtient @ avec Alt Gr + 0. Sur certains claviers Mac français, la touche @ est en haut à gauche.', typed('recipient', starterAddress)],
        ['typeSecondAddress', `Efface cette adresse, puis tape « ${secondAddress} ».`, 'L’adresse contient un trait d’union, un signe +, un chiffre et une arobase. Sélectionne puis efface la première adresse avant de taper la seconde.', typed('recipient', secondAddress)],
      ],
    },
    {
      title: 'Taper les accents circonflexes',
      description: 'Entraîne-toi avec cinq voyelles qui peuvent porter un accent circonflexe.',
      app: 'editor',
      keyboard: true,
      steps: [
        ['typeCircumflex', `Dans un nouveau document du Bloc-notes, tape « ${accents} ».`, keyboardHint, typed('editor', accents)],
      ],
    },
    {
      title: 'Écrire un e-mail complet',
      description: 'Rédige un message pour demander une inscription au club de musique.',
      app: 'mail',
      keyboard: true,
      mailExercise: true,
      steps: [
        ['typeClubAddress', `Dans un nouveau message, tape « ${clubAddress} » dans le champ À.`, 'Le champ À indique le destinataire. Si un ancien message est affiché, clique sur Nouveau message.', typed('recipient', clubAddress)],
        ['typeClubSubject', `Dans Objet, tape « ${clubSubject} ».`, 'L’objet explique en quelques mots le sujet du message.', typed('subject', clubSubject)],
        ['typeClubMessage', 'Tape « Bonjour, », puis « Je voudrais participer au club. », puis « Merci ! » sur trois lignes.', 'Appuie sur Entrée après la virgule, puis après le point. Relis le message en entier.', typed('body', clubMessage)],
        ['sendClubMessage', 'Clique sur Envoyer.', 'Vérifie le destinataire, l’objet et le message avant l’envoi dans l’atelier.', sentMail(clubAddress, clubSubject, clubMessage)],
      ],
    },
    {
      title: 'Corriger avant l’envoi',
      description: 'Prépare le rappel de la sortie de classe, puis corrige un accent oublié.',
      app: 'mail',
      keyboard: true,
      mailExercise: true,
      steps: [
        ['typeClassAddress', `Commence un nouveau message. Dans À, tape « ${correctedAddress} ».`, 'Vérifie le point dans classe.6e et celui avant org.', typed('recipient', correctedAddress)],
        ['typeTripSubject', `Dans Objet, tape « ${correctedSubject} ».`, 'Passe au champ Objet avec la touche Tabulation ou en cliquant dessus.', typed('subject', correctedSubject)],
        ['typeTripDraft', `Tape « ${wrongMessage} » dans le message.`, 'Tape d’abord chateau sans accent. Tu le corrigeras à l’étape suivante.', typed('body', wrongMessage)],
        ['fixCircumflex', 'Corrige chateau en château et laisse le reste du message en place.', `Sélectionne le premier a de chateau avec la souris. ${keyboardHint}`, typed('body', correctedMessage)],
        ['sendTripMessage', 'Envoie le message corrigé.', 'Vérifie le mot château et clique sur Envoyer.', sentMail(correctedAddress, correctedSubject, correctedMessage)],
      ],
    },
  ];

  missions.push(...workshops);
  const practiceCount = missions.length;
  missions.push(...window.DeclicChallenges.map((mission) => ({ ...mission, challenge: true })));

  const groups = [
    { title: 'Premiers pas', start: 0, end: 6 },
    { title: 'Fichiers et dossiers', start: 6, end: 13 },
    { title: 'Documents texte', start: 13, end: 16 },
    { title: 'Photos et images', start: 16, end: 19 },
    { title: 'Clavier et e-mails', start: 19, end: practiceCount },
    { title: 'Défis progressifs', start: practiceCount, end: missions.length },
  ];

  const appLabels = {
    mouse: 'Ouvrir l’atelier',
    editor: 'Ouvrir le Bloc-notes',
    files: 'Ouvrir l’Explorateur',
    trash: 'Ouvrir la Corbeille',
    images: 'Ouvrir Photos',
    mail: 'Ouvrir Courriel',
  };

  const pastedFields = new Set();

  function introFolderName() {
    return state.introFolderName || (state.done.renameFolder ? 'Technologie' : firstFolderName);
  }

  function initialState() {
    return { active: 0, done: {}, refs: {}, draftFolderId: null, folderId: null, fileId: null, introFolderName: null };
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
  if (Array.isArray(state.pastedFields)) state.pastedFields.forEach((field) => pastedFields.add(field));
  let hintOpen = false;
  let challengeChecked = false;

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, pastedFields: [...pastedFields] }));
    } catch {
      // Progress is still available while the page stays open.
    }
  }

  function isComplete(mission) {
    return mission.steps.every(([id]) => state.done[id]);
  }

  function isAvailable(index) {
    return index >= groups[0].end || missions.slice(0, index).every(isComplete);
  }

  function stepText(value) {
    return typeof value === 'function' ? value() : value;
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (character) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
    ));
  }

  function challengeChecks(mission) {
    const files = window.Declic.inspectFiles();
    return new Set(mission.steps.filter(([, , , check]) => check(files)).map(([id]) => id));
  }

  function render() {
    const completed = missions.filter(isComplete).length;
    const current = missions[state.active];
    const passed = isComplete(current);
    const checks = current.challenge && challengeChecked && !passed ? challengeChecks(current) : null;
    const stepDone = (id) => Boolean(state.done[id] || checks?.has(id));
    const pending = current.steps.find(([id]) => !stepDone(id));
    const app = pending && (pending[4] || current.app);
    const openButton = app
      ? `<button class="mission-open" type="button" data-mission-app="${app}">${appLabels[app]}</button>`
      : '';
    const sample = !passed && current.sample
      ? `<p class="mission-sample">${escapeHtml(current.sample)}</p>`
      : '';
    const copyButton = sample
      ? '<button class="mission-hint-toggle" type="button" id="mission-copy-phrase">Copier la phrase</button>'
      : '';
    const hint = pending
      ? `<button class="mission-hint-toggle" type="button" aria-controls="mission-hint" aria-expanded="${hintOpen}">${hintOpen ? 'Masquer l’indice' : 'Afficher un indice'}</button>`
      : '';
    let nextAction = '';
    if (passed) {
      nextAction = state.active < missions.length - 1
        ? `<button class="mission-next" type="button" data-mission-select="${state.active + 1}">Mission suivante</button>`
        : '<a class="mission-next" id="mission-evaluation" href="?mode=eval">Passer à l’Éval /20</a>';
    }
    const verifyButton = current.challenge && !passed
      ? '<button class="mission-next" type="button" id="mission-verify">Vérifier le défi</button>'
      : '';
    const completion = passed ? `<p class="mission-completion">${completed === missions.length ? 'Parcours terminé. Toutes les missions sont réussies !' : 'Mission réussie !'}</p>` : '';
    const feedback = checks ? `<p id="mission-verify-feedback" class="mission-verify-feedback">${checks.size} / ${current.steps.length} objectifs prêts.</p>` : '';

    count.textContent = `${completed} / ${missions.length}`;
    progress.max = missions.length;
    progress.value = completed;
    content.innerHTML = `
      <h2 id="mission-active-title" class="mission-card-heading" tabindex="-1">${current.title}</h2>
      <p class="mission-description">${current.description}</p>
      ${sample}
      <ol class="mission-steps">
        ${current.steps.map(([id, description]) => {
          const done = stepDone(id);
          const next = id === pending?.[0];
          const label = escapeHtml(stepText(description));
          return `<li class="mission-step${done ? ' is-done' : ''}${next ? ' is-current' : ''}"${next ? ' aria-current="step"' : ''} aria-label="${done ? 'Étape réussie. ' : ''}${label}"><span class="mission-check" aria-hidden="true">${done ? '✓' : ''}</span><span class="mission-step-text">${label}</span></li>`;
        }).join('')}
      </ol>
      ${completion}
      ${feedback}
      ${openButton || copyButton || hint || nextAction || verifyButton ? `<div class="mission-actions">${openButton}${copyButton}${hint}${verifyButton || nextAction}</div>` : ''}
      ${pending ? `<p id="mission-hint" class="mission-hint"${hintOpen ? '' : ' hidden'}>${escapeHtml(stepText(pending[2]))}</p>` : ''}
      ${current.keyboard && pending ? '<p class="mission-typing-feedback" id="mission-typing-feedback" role="status" hidden></p>' : ''}`;

    const openGroups = new Set(Array.from(list.querySelectorAll('details[open]'), (group) => group.dataset.group));
    list.innerHTML = groups.map(({ title, start, end }) => {
      const items = missions.slice(start, end);
      const groupCompleted = items.filter(isComplete).length;
      const open = openGroups.has(String(start)) || (start <= state.active && state.active < end);
      return `<details class="mission-group" data-group="${start}"${open ? ' open' : ''}>
        <summary class="mission-group-heading">${title}<span class="mission-group-progress">${groupCompleted} / ${items.length}</span></summary>
        <div class="mission-group-items">${items.map((mission, offset) => renderItem(mission, start + offset)).join('')}</div>
      </details>`;
    }).join('');
  }

  function renderItem(mission, index) {
    const active = index === state.active;
    const done = isComplete(mission);
    const available = isAvailable(index);
    const title = escapeHtml(mission.title);
    return `<button class="mission-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}" type="button" data-mission-select="${index}"${active ? ' aria-current="step"' : ''}${available ? '' : ' disabled'} aria-label="Mission ${index + 1}. ${title}${done ? '. Réussie' : available ? '' : '. Termine les missions précédentes pour y accéder'}"><span class="mission-item-number" aria-hidden="true">${index + 1}</span><span class="mission-item-label">${title}</span><span class="mission-item-status" aria-hidden="true">${done ? '✓' : ''}</span></button>`;
  }

  function select(index) {
    if (!missions[index] || !isAvailable(index)) return;
    if (index !== state.active) window.Declic.copyEditorText('');
    state.active = index;
    hintOpen = false;
    challengeChecked = false;
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
        if (parentId !== 'documents' || id !== state.draftFolderId || state.done.renameFolder) return false;
        const folderName = normalizeName(name);
        if (folderName !== normalizeName(firstFolderName) && folderName !== 'technologie') return false;
        state.folderId = id;
        state.introFolderName = name;
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
      case 'file-trash': return id === state.fileId && parentId === state.folderId && state.done.paste && mark('trash');
      case 'file-restore': return id === state.fileId && state.done.trash && (!parentId || parentId === state.folderId) && mark('recover');
      default: return false;
    }
  }

  function onAction(event) {
    const action = event.detail;
    if (!action) return;
    const typingChanged = trackTyping(action);
    const current = missions[state.active];
    const previousStep = current.steps.findIndex(([id]) => !state.done[id]);
    let changed = checkAction(action);
    const isFileAction = /^(file|folder)-/.test(action.type);
    for (const workshop of workshops) {
      if (workshop !== current && !isFileAction) continue;
      const pending = workshop.steps.find(([id]) => !state.done[id]);
      if (pending?.[3](action)) changed = mark(pending[0]) || changed;
    }
    if (!changed) {
      if (typingChanged) persist();
      if (current.challenge && challengeChecked && isFileAction && !isComplete(current)) render();
      const feedback = document.getElementById('mission-typing-feedback');
      if (feedback && ['editor-input', 'mail-input'].includes(action.type)) {
        const field = action.type === 'editor-input' ? 'editor' : action.field;
        feedback.hidden = !pastedFields.has(field);
        feedback.textContent = feedback.hidden ? '' : 'Efface le texte collé, puis saisis-le au clavier.';
      }
      return;
    }
    const nextStep = current.steps.findIndex(([id]) => !state.done[id]);
    if (nextStep !== previousStep) hintOpen = false;
    persist();
    render();
    if (nextStep !== previousStep) {
      status.textContent = nextStep === -1 ? `Mission réussie. ${current.title}.` : `Étape réussie. ${stepText(current.steps[nextStep][1])}`;
    }
  }

  function verifyChallenge() {
    const current = missions[state.active];
    if (!current.challenge || isComplete(current)) return;
    const checks = challengeChecks(current);
    challengeChecked = true;
    hintOpen = false;
    if (checks.size === current.steps.length) {
      checks.forEach(mark);
      persist();
      status.textContent = `Défi réussi. ${current.title}.`;
    } else {
      status.textContent = `${checks.size} objectifs prêts sur ${current.steps.length}.`;
    }
    render();
    (document.getElementById('mission-verify') || document.getElementById('mission-active-title')).focus({ preventScroll: true });
  }

  function onPanelClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'mission-verify') {
      verifyChallenge();
    } else if (button.id === 'mission-copy-phrase') {
      const text = missions[state.active].sample;
      window.Declic.copyEditorText(text);
      navigator.clipboard?.writeText?.(text)?.catch(() => {});
      window.Declic.open('editor');
      status.textContent = 'Phrase copiée. Clique sur Coller la phrase dans le Bloc-notes.';
    } else if (button.hasAttribute('data-mission-select')) {
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

  function mailSendIssue(message) {
    const current = missions[state.active];
    if (!current.mailExercise) return '';
    const pending = current.steps.find(([id]) => !state.done[id]);
    if (!pending) return '';
    if (pending !== current.steps.at(-1)) return 'Termine l’étape indiquée dans la mission avant d’envoyer.';
    if (!pending[3]({ type: 'mail-send', ...message })) {
      return 'Relis le destinataire, l’objet et le message en suivant la consigne.';
    }
    return '';
  }

  content.addEventListener('click', onPanelClick);
  list.addEventListener('click', onPanelClick);
  window.addEventListener('declic:action', onAction);
  document.addEventListener('declic:action', onAction);
  window.DeclicMissions = {
    select,
    mailSendIssue,
    reset() {
      state = initialState();
      hintOpen = false;
      challengeChecked = false;
      pastedFields.clear();
      persist();
      render();
      status.textContent = 'Le parcours a été réinitialisé.';
    },
  };

  if (!isAvailable(state.active)) state.active = 0;
  render();
})();
