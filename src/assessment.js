(() => {
  "use strict";

  const resultKey = "declic-os-eval-result-v1";
  const target = {
    folder: "Sortie nature",
    texts: "Textes",
    photos: "Photos",
    program: "Programme de la sortie.txt",
    notebook: "Carnet de sortie.txt",
    notebookText: "Le groupe observe une île et visite un château.\nIl note la date de la fête.",
    rulesCopy: "Règles de sortie.txt",
    photo: "Lapin du parc.jpg",
    recipient: "club-nature.6e@example.org",
    subject: "Sortie du club nature",
    message: "Bonjour,\nLa visite du château commence à 10 h.\nMerci !",
  };
  const program = {
    id: "eval-program",
    name: "Programme brouillon.txt",
    parentId: "practice-inbox",
    text: "9 h 30 : rendez-vous devant le collège.\n10 h : début de la visite.",
  };
  const obsolete = {
    id: "eval-obsolete",
    name: "Ancienne affiche.txt",
    parentId: "practice-inbox",
    text: "Ancienne affiche du club. Les horaires ont changé.",
  };
  const recover = {
    id: "eval-recover",
    name: "Horaires du parc.txt",
    parentId: "practice-archive",
    text: "Le parc accueille les groupes à partir de 10 h.",
    trashed: true,
  };
  const rules = {
    id: "eval-rules",
    name: "Règles du club.txt",
    parentId: "practice-archive",
    text: "Respecte le sentier.\nGarde le parc propre.",
  };

  function sampleLines(text) {
    return `<ol class="assessment-sample">${text.split("\n").map((line) => `<li>${line}</li>`).join("")}</ol>`;
  }

  const sections = [
    {
      title: "Organiser les dossiers",
      instructions: `<li>Dans <strong>Travaux</strong>, crée le dossier <strong>${target.folder}</strong>. Dans ce dossier, crée <strong>${target.texts}</strong> et <strong>${target.photos}</strong>.</li>
        <li>Dans <strong>À classer</strong>, retrouve <strong>${program.name}</strong>. Renomme-le en <strong>${target.program}</strong>, puis dépose-le dans <strong>${target.texts}</strong>.</li>`,
      criteria: [
        { id: "folder", label: "Dossier Sortie nature dans Travaux", max: 2 },
        { id: "texts", label: "Sous-dossier Textes", max: 1 },
        { id: "photos", label: "Sous-dossier Photos", max: 1 },
        { id: "rename", label: "Programme renommé", max: 1 },
        { id: "place", label: "Programme déplacé dans Textes", max: 1 },
      ],
    },
    {
      title: "Utiliser la Corbeille",
      instructions: `<li>Dans <strong>À classer</strong>, mets <strong>${obsolete.name}</strong> à la Corbeille.</li>
        <li>Dans la Corbeille, retrouve <strong>${recover.name}</strong>. Restaure-le et vérifie qu’il est revenu dans <strong>Archives</strong>.</li>`,
      criteria: [
        { id: "trash", label: "Ancienne affiche à la Corbeille", max: 1 },
        { id: "restore", label: "Horaires restaurés dans Archives", max: 2 },
      ],
    },
    {
      title: "Enregistrer des fichiers",
      instructions: `<li>Dans un nouveau document du <strong>Bloc-notes</strong>, tape les deux lignes ci-dessous. Respecte les accents et le passage à la ligne. Enregistre-le dans <strong>Textes</strong> sous <strong>${target.notebook}</strong>.${sampleLines(target.notebookText)}</li>
        <li>Ouvre <strong>${rules.name}</strong> dans <strong>Archives</strong>. Utilise <strong>Enregistrer sous</strong> pour en faire une copie dans <strong>Textes</strong>, sous <strong>${target.rulesCopy}</strong>. Garde le fichier d’origine dans Archives.</li>
        <li>Dans l’application <strong>Photos</strong>, choisis la photo <strong>Lapin</strong>. Enregistre-la dans le dossier <strong>Photos</strong> de Sortie nature sous <strong>${target.photo}</strong>.</li>`,
      criteria: [
        { id: "notebookText", label: "Texte enregistré avec les accents et les deux lignes", max: 2 },
        { id: "notebookFile", label: "Nom du carnet et rangement dans Textes", max: 2 },
        { id: "copy", label: "Copie des règles avec l’original conservé", max: 1 },
        { id: "photo", label: "Photo Lapin, nom et dossier demandés", max: 2 },
      ],
    },
    {
      title: "Écrire un courriel",
      instructions: `<li>Dans <strong>Courriel</strong>, tape l’adresse <strong>${target.recipient}</strong> dans le champ <strong>À</strong> et l’objet <strong>${target.subject}</strong>.</li>
        <li>Tape le message en trois lignes, en respectant les accents et la ponctuation.${sampleLines(target.message)}</li>
        <li>Relis ton message, puis clique sur <strong>Envoyer</strong> pour l’envoyer dans l’atelier.</li>`,
      criteria: [
        { id: "recipient", label: "Adresse du destinataire", max: 1 },
        { id: "subject", label: "Objet du courriel", max: 1 },
        { id: "message", label: "Message sur trois lignes", max: 1 },
        { id: "send", label: "Envoi simulé du courriel complet", max: 1 },
      ],
    },
  ];
  const criteria = sections.flatMap((section) => section.criteria);
  const maximum = criteria.reduce((sum, criterion) => sum + criterion.max, 0);
  const fixtureList = [program, obsolete, recover, rules];
  const existingIds = new Set(["welcome", "example-note", ...fixtureList.map((file) => file.id)]);
  let panel;
  let result = null;
  let sectionIndex = 0;
  let confirmingRetry = false;

  function fixtures() {
    return fixtureList.map((file) => ({ ...file, kind: "file" }));
  }

  function normalized(text) {
    return (text || "").normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\u00a0\u202f]/g, " ").trim();
  }

  function sameName(actual, expected) {
    return normalized(actual).toLocaleLowerCase("fr") === normalized(expected).toLocaleLowerCase("fr");
  }

  function scoreWork(files, mail) {
    const byId = new Map(files.map((file) => [file.id, file]));
    const folder = (name, parentId) => parentId && files.find((file) => (
      file.kind === "folder" && !file.trashed && file.parentId === parentId && sameName(file.name, name)
    ));
    const outing = folder(target.folder, "practice-work");
    const texts = folder(target.texts, outing?.id);
    const photos = folder(target.photos, outing?.id);
    const submittedProgram = byId.get(program.id);
    const currentObsolete = byId.get(obsolete.id);
    const currentRecover = byId.get(recover.id);
    const currentRules = byId.get(rules.id);
    const visible = files.filter((file) => !file.trashed);
    const inTexts = (file) => Boolean(texts && texts.id === file.parentId);
    const inPhotos = (file) => Boolean(photos && photos.id === file.parentId);
    const draft = mail.draft;
    const graded = {
      folder: outing ? 2 : 0,
      texts: texts ? 1 : 0,
      photos: photos ? 1 : 0,
      rename: submittedProgram && !submittedProgram.trashed && sameName(submittedProgram.name, target.program) ? 1 : 0,
      place: submittedProgram && !submittedProgram.trashed && inTexts(submittedProgram) ? 1 : 0,
      trash: currentObsolete?.trashed && !byId.get(currentObsolete.parentId)?.trashed ? 1 : 0,
      restore: currentRecover && !currentRecover.trashed ? (currentRecover.parentId === recover.parentId ? 2 : 1) : 0,
      notebookText: 0,
      notebookFile: 0,
      copy: 0,
      photo: 0,
      recipient: normalized(draft.recipient) === target.recipient ? 1 : 0,
      subject: normalized(draft.subject) === target.subject ? 1 : 0,
      message: normalized(draft.body) === target.message ? 1 : 0,
      send: 0,
    };

    let bestNotebook = null;
    for (const file of visible) {
      if (file.kind !== "file" || file.id.startsWith("practice-") || existingIds.has(file.id)) continue;
      const text = normalized(file.text) === target.notebookText ? 2 : 0;
      const name = sameName(file.name, target.notebook);
      if (!text && !name) continue;
      const location = Number(name) + Number(inTexts(file));
      const total = text + location;
      if (!bestNotebook || total > bestNotebook.total || (total === bestNotebook.total && text > bestNotebook.text)) {
        bestNotebook = { text, location, total };
      }
    }
    if (bestNotebook) {
      graded.notebookText = bestNotebook.text;
      graded.notebookFile = bestNotebook.location;
    }

    if (currentRules && !currentRules.trashed && currentRules.parentId === rules.parentId &&
        sameName(currentRules.name, rules.name) && normalized(currentRules.text) === rules.text) {
      graded.copy = Number(visible.some((file) => file.kind === "file" && file.originalId === rules.id &&
        sameName(file.name, target.rulesCopy) && inTexts(file) && normalized(file.text) === rules.text));
    }
    for (const file of visible) {
      if (file.kind === "image" && file.sourceId === "rabbit") {
        graded.photo = Math.max(graded.photo, Number(sameName(file.name, target.photo)) + Number(inPhotos(file)));
      }
    }
    graded.send = mail.sent && graded.recipient && graded.subject && graded.message ? 1 : 0;
    return criteria.map(({ id }) => graded[id]);
  }

  function readResult() {
    try {
      const saved = JSON.parse(localStorage.getItem(resultKey));
      if (Array.isArray(saved?.points) && saved.points.length === criteria.length && criteria.every(({ max }, index) => (
        Number.isInteger(saved.points[index]) && saved.points[index] >= 0 && saved.points[index] <= max
      ))) return saved.points;
    } catch {
      // The evaluation remains available if storage is unavailable.
    }
    return null;
  }

  function saveResult() {
    try {
      localStorage.setItem(resultKey, JSON.stringify({ points: result }));
    } catch {
      // The score remains visible while the current page is open.
    }
  }

  function reset() {
    if (document.documentElement.dataset.mode !== "eval") return;
    window.Declic.reset();
    result = null;
    sectionIndex = 0;
    confirmingRetry = false;
    try {
      localStorage.removeItem(resultKey);
    } catch {
      // The score for the current page has already been cleared.
    }
    if (panel) {
      render();
      panel.status.textContent = "Nouvelle tentative. L’évaluation a été réinitialisée.";
    }
  }

  function renderInstructions() {
    const section = sections[sectionIndex];
    panel.content.innerHTML = `
      <h2 class="mission-card-heading assessment-heading">Sortie du club nature</h2>
      <p class="mission-description assessment-intro">Prépare les fichiers et le courriel pour la sortie. Tu peux passer d’une partie à l’autre avant de rendre ton travail.</p>
      <section class="assessment-section" aria-labelledby="assessment-section-title">
        <h3 id="assessment-section-title" class="assessment-section-title" tabindex="-1">${section.title}</h3>
        <ul class="assessment-instructions">${section.instructions}</ul>
      </section>
      <div class="mission-actions assessment-actions">
        <button class="mission-next" id="assessment-submit" type="button">Rendre et voir ma note</button>
      </div>`;
    panel.indexTitle.textContent = "Parties de l’évaluation";
    panel.list.innerHTML = sections.map(({ title, criteria }, index) => {
      const selected = index === sectionIndex;
      const points = criteria.reduce((sum, criterion) => sum + criterion.max, 0);
      return `<button class="mission-item assessment-index-row${selected ? " is-active" : ""}" type="button" data-assessment-section="${index}"${selected ? ' aria-current="true"' : ""}><span class="mission-item-label">${title}</span><span class="assessment-points">${points} pts</span></button>`;
    }).join("");
  }

  function renderResult(score) {
    panel.content.innerHTML = `
      <h2 class="mission-card-heading assessment-heading" id="assessment-result-title" tabindex="-1">Résultat de l’évaluation</h2>
      <p class="assessment-score" id="assessment-score">${score} / ${maximum}</p>
      <p class="mission-description assessment-intro">Consulte les points obtenus dans le détail de la note.</p>
      <div class="mission-actions assessment-actions">
        <button class="mission-hint-toggle" id="assessment-retry" type="button" aria-expanded="${confirmingRetry}" aria-controls="assessment-confirmation">Recommencer l’évaluation</button>
      </div>
      <div class="assessment-confirmation" id="assessment-confirmation"${confirmingRetry ? "" : " hidden"}>
        <p>Cette tentative, ses fichiers et son courriel seront effacés.</p>
        <div class="mission-actions assessment-actions">
          <button class="mission-hint-toggle" id="assessment-cancel-retry" type="button">Annuler</button>
          <button class="mission-next" id="assessment-confirm-retry" type="button">Recommencer</button>
        </div>
      </div>`;
    panel.indexTitle.textContent = "Détail de la note";
    panel.list.innerHTML = `<ul class="assessment-grade-list">${criteria.map(({ label, max }, index) => (
      `<li class="assessment-grade-row"><span>${label}</span><strong class="assessment-points">${result[index]} / ${max}</strong></li>`
    )).join("")}</ul>`;
  }

  function render() {
    const score = result?.reduce((sum, points) => sum + points, 0);
    panel.index.classList.toggle("assessment-nav", !result);
    if (result && panel.index.previousElementSibling !== panel.content) panel.content.after(panel.index);
    if (!result && panel.content.previousElementSibling !== panel.index) panel.content.before(panel.index);
    panel.count.textContent = result ? `${score} / ${maximum}` : "Sur 20";
    panel.progress.hidden = !result;
    panel.progress.max = maximum;
    panel.progress.value = score ?? 0;
    panel.progress.setAttribute("aria-label", "Note obtenue sur 20");
    if (result) renderResult(score);
    else renderInstructions();
    panel.list.scrollTop = 0;
    panel.container.scrollTop = 0;
  }

  function init() {
    if (document.documentElement.dataset.mode !== "eval") return;
    panel = {
      container: document.getElementById("missions-panel"),
      index: document.querySelector("#missions-panel .mission-index"),
      content: document.getElementById("mission-content"),
      list: document.getElementById("mission-list"),
      indexTitle: document.getElementById("mission-index-title"),
      count: document.getElementById("mission-count"),
      progress: document.getElementById("mission-progress"),
      status: document.getElementById("mission-status"),
    };
    panel.list.classList.add("assessment-index");
    result = readResult();
    render();
    panel.list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-assessment-section]");
      if (!button || result) return;
      sectionIndex = Number(button.dataset.assessmentSection);
      render();
      document.getElementById("assessment-section-title").focus();
    });
    panel.content.addEventListener("click", (event) => {
      if (event.target.closest("#assessment-submit") && !result) {
        result = scoreWork(window.Declic.inspectFiles(), window.DeclicMail.inspect());
        saveResult();
        render();
        panel.status.textContent = `Note obtenue : ${panel.count.textContent}.`;
        document.getElementById("assessment-result-title").focus();
      } else if (event.target.closest("#assessment-retry, #assessment-cancel-retry")) {
        confirmingRetry = !confirmingRetry;
        render();
        document.getElementById(confirmingRetry ? "assessment-cancel-retry" : "assessment-retry").focus();
      } else if (event.target.closest("#assessment-confirm-retry") && confirmingRetry) {
        reset();
        document.getElementById("assessment-section-title").focus();
      }
    });
  }

  window.DeclicAssessment = { fixtures, reset };
  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
