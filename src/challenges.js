(() => {
  'use strict';

  const work = 'practice-work';
  const archives = 'practice-archive';
  const gallerySources = new Set(['cat', 'dog', 'rabbit']);

  function entry(files, parentId, name, kind) {
    if (!parentId) return null;
    const candidates = files.filter((file) => !file.trashed && file.parentId === parentId && typeof file.name === 'string' &&
      file.name.normalize('NFC') === name);
    return candidates.length === 1 && candidates[0].kind === kind ? candidates[0] : null;
  }

  function folderId(files, parentId, name) {
    return entry(files, parentId, name, 'folder')?.id;
  }

  function containsFixture(files, parentId, name, fixtureId) {
    return entry(files, parentId, name, 'file')?.id === fixtureId;
  }

  function namedFolder(name, parentId = work) {
    return (files) => folderId(files, parentId, name);
  }

  function withText(file, expected) {
    return typeof file?.text === 'string' &&
      file.text.normalize('NFC').replace(/\r\n/g, '\n') === expected;
  }

  function isTrashedFixture(files, id) {
    const file = files.find((candidate) => candidate.id === id && candidate.kind === 'file');
    return Boolean(file?.trashed && (file.parentId === 'documents' ||
      files.some((parent) => parent.id === file.parentId && parent.kind === 'folder' && !parent.trashed)));
  }

  const cdi = namedFolder('Projet CDI');
  const reading = namedFolder('Club lecture', archives);
  const album = namedFolder('Album du collège');
  const trip = namedFolder('Sortie au CDI');
  const albumNoteName = 'Note du collège.txt';
  const albumCopyName = 'Note du collège - copie.txt';
  const albumLines = [
    'À la fête du collège, le club a présenté ses photos.',
    'Le chien a couru près de la clôture.',
    'Cette photo ouvre notre album.',
  ];
  const albumText = albumLines.join('\n');
  const tripLines = [
    'Nous avons préparé la visite du CDI.',
    'Chaque élève a choisi un livre pour la fête du collège.',
  ];
  const tripText = tripLines.join('\n');

  function albumNote(files) {
    const note = entry(files, album(files), albumNoteName, 'file');
    return withText(note, albumText) ? note : null;
  }

  window.DeclicChallenges = [
    {
      title: 'Préparer le projet du CDI',
      description: 'Le CDI lance un projet. Prépare un dossier pour retrouver le programme aujourd’hui et ranger les notes plus tard.',
      app: 'files',
      steps: [
        [
          'challengeCdiFolder',
          'Crée « Projet CDI » dans Travaux.',
          'Pars de Travaux dans la colonne de gauche de l’Explorateur.',
          (files) => Boolean(cdi(files)),
        ],
        [
          'challengeCdiSubfolders',
          'Dans Projet CDI, crée deux dossiers nommés « Programme » et « Notes ».',
          'Ouvre Projet CDI et vérifie que les deux dossiers se trouvent au même niveau.',
          (files) => Boolean(folderId(files, cdi(files), 'Programme') && folderId(files, cdi(files), 'Notes')),
        ],
        [
          'challengeCdiMove',
          'Déplace « Programme CDI.txt » de À classer vers Projet CDI › Programme.',
          'Utilise couper-coller ou le glisser-déposer pour déplacer le programme existant.',
          (files) => containsFixture(files, folderId(files, cdi(files), 'Programme'), 'Programme CDI.txt', 'challenge-cdi'),
        ],
      ],
    },
    {
      title: 'Mettre à jour les archives du club',
      description: 'Le club lecture a supprimé sa liste par erreur. Retrouve-la, donne-lui son nom définitif et range-la avec les archives du club.',
      app: 'files',
      steps: [
        [
          'challengeReadingFolder',
          'Crée « Club lecture » dans Archives.',
          'Clique sur Archives à gauche de l’Explorateur, puis sur Nouveau dossier.',
          (files) => Boolean(reading(files)),
        ],
        [
          'challengeReadingRestore',
          'Restaure « Liste lecture brouillon.txt » depuis la Corbeille.',
          'Dans la Corbeille, sélectionne le brouillon puis clique sur Restaurer. Il revient dans Archives.',
          (files) => files.some((file) => file.id === 'challenge-reading' && file.kind === 'file' && !file.trashed),
          'trash',
        ],
        [
          'challengeReadingArchive',
          'Renomme ce fichier en « Liste de lecture.txt » et range-le dans Archives › Club lecture.',
          'Vérifie que l’extension .txt est toujours présente et que le fichier est à l’intérieur de Club lecture.',
          (files) => containsFixture(files, reading(files), 'Liste de lecture.txt', 'challenge-reading'),
        ],
        [
          'challengeReadingTrashObsolete',
          'Mets « Ancienne liste du club.txt », qui se trouve dans À classer, à la corbeille.',
          'Vérifie le nom du fichier avant la suppression. Garde la liste que tu viens de ranger.',
          (files) => isTrashedFixture(files, 'challenge-obsolete'),
        ],
      ],
    },
    {
      title: 'Composer un album du collège',
      description: 'Prépare la première page d’un album. Rassemble le texte et la photo au même endroit et conserve une copie du texte dans les archives.',
      app: 'files',
      steps: [
        [
          'challengeAlbumFolder',
          'Crée « Album du collège » dans Travaux.',
          'Ce dossier recevra le texte et la photo.',
          (files) => Boolean(album(files)),
        ],
        [
          'challengeAlbumNote',
          `Enregistre « ${albumNoteName} » dans Album du collège. Tape « ${albumLines[0]} » sur la première ligne, « ${albumLines[1]} » sur la deuxième et « ${albumLines[2]} » sur la troisième.`,
          'Appuie sur Entrée entre les phrases. Relis les accents et sélectionne le dossier Album du collège dans la fenêtre d’enregistrement.',
          (files) => Boolean(albumNote(files)),
          'editor',
        ],
        [
          'challengeAlbumPhoto',
          'Enregistre la photo Chien de l’application Photos dans Album du collège sous « Photo du chien.jpg ».',
          'Choisis la photo Chien, puis vérifie le nom et le dossier lorsque tu enregistres l’image.',
          (files) => entry(files, album(files), 'Photo du chien.jpg', 'image')?.sourceId === 'dog',
          'images',
        ],
        [
          'challengeAlbumCopy',
          `Utilise Enregistrer sous pour créer « ${albumCopyName} » dans Archives. Laisse la note originale dans Album du collège.`,
          'Ouvre la note originale dans le Bloc-notes avant de créer la copie. Vérifie ensuite que les deux textes sont enregistrés.',
          (files) => {
            const original = albumNote(files);
            const copy = entry(files, archives, albumCopyName, 'file');
            return Boolean(original && copy?.originalId === original.id && withText(copy, albumText));
          },
          'editor',
        ],
      ],
    },
    {
      title: 'Préparer le dossier de sortie',
      description: 'La sortie au CDI est terminée. Range le programme, une photo et le bilan dans le même dossier.',
      app: 'files',
      steps: [
        [
          'challengeTripFolder',
          'Crée « Sortie au CDI » dans Travaux.',
          'Repère le dossier qui doit contenir tout ce qui concerne la sortie.',
          (files) => Boolean(trip(files)),
        ],
        [
          'challengeTripSubfolders',
          'Dans Sortie au CDI, crée trois dossiers nommés « Organisation », « Photos » et « Bilan ».',
          'Place les trois dossiers directement dans Sortie au CDI.',
          (files) => ['Organisation', 'Photos', 'Bilan'].every((name) => folderId(files, trip(files), name)),
        ],
        [
          'challengeTripRestore',
          'Récupère « Brouillon sortie CDI.txt » dans la Corbeille.',
          'La Corbeille indique le dossier où reviendra le fichier.',
          (files) => files.some((file) => file.id === 'challenge-trip' && file.kind === 'file' && !file.trashed),
          'trash',
        ],
        [
          'challengeTripProgramme',
          'Nomme ce fichier « Programme de la sortie CDI.txt » et range-le dans Sortie au CDI › Organisation.',
          'Retrouve le document restauré dans son dossier d’origine. Garde le fichier et change son nom et son emplacement.',
          (files) => containsFixture(files, folderId(files, trip(files), 'Organisation'), 'Programme de la sortie CDI.txt', 'challenge-trip'),
        ],
        [
          'challengeTripPhoto',
          'Choisis une photo dans l’application Photos et enregistre-la sous « Photo de la sortie.jpg » dans Sortie au CDI › Photos.',
          'Tu peux prendre le chat, le chien ou le lapin. Vérifie le chemin avant d’enregistrer.',
          (files) => gallerySources.has(entry(files, folderId(files, trip(files), 'Photos'), 'Photo de la sortie.jpg', 'image')?.sourceId),
          'images',
        ],
        [
          'challengeTripReport',
          `Enregistre « Bilan de la sortie CDI.txt » dans Sortie au CDI › Bilan. Tape « ${tripLines[0]} » sur la première ligne et « ${tripLines[1]} » sur la deuxième.`,
          'Relis les mots préparé, élève, fête et collège. Ouvre ensuite le sous-dossier Bilan et vérifie que le fichier s’y trouve.',
          (files) => Boolean(withText(entry(files, folderId(files, trip(files), 'Bilan'), 'Bilan de la sortie CDI.txt', 'file'), tripText)),
          'editor',
        ],
      ],
    },
  ];
})();
