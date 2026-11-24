(() => {
  "use strict";

  const fieldNames = ["recipient", "subject", "body"];
  const storageKey = document.documentElement.dataset.mode === "eval" ? "declic-os-eval-mail-v1" : "declic-os-mail-v1";
  let { draft, sent } = load();

  function emptyDraft() {
    return { recipient: "", subject: "", body: "" };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved?.draft && fieldNames.every((name) => typeof saved.draft[name] === "string")) {
        const draft = Object.fromEntries(fieldNames.map((name) => [name, saved.draft[name]]));
        return { draft, sent: saved.sent === true };
      }
    } catch {
      // The composer also works when local storage is unavailable.
    }
    return { draft: emptyDraft(), sent: false };
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ draft, sent }));
    } catch {
      // The current draft remains available while the page is open.
    }
  }

  function reset() {
    draft = emptyDraft();
    sent = false;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // The current draft has already been cleared.
    }
  }

  function isAddress(address) {
    const [local, domain, ...extra] = address.split("@");
    if (extra.length || !local || !domain || local.length > 64 || address.length > 254) return false;
    const atom = /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+$/i;
    const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    const labels = domain.split(".");
    return local.split(".").every((part) => atom.test(part)) &&
      labels.length >= 2 && labels.every((part) => label.test(part));
  }

  function render(body, emit) {
    body.innerHTML = `
      <form class="mail-form" novalidate>
        <div class="app-toolbar">
          <button type="submit" class="app-button is-primary" data-command="send-mail">
            ${window.icon?.("mail", 16) || ""}<span>Envoyer</span>
          </button>
          <button type="button" class="app-button" data-command="new-mail">
            ${window.icon?.("plus", 16) || ""}<span>Nouveau message</span>
          </button>
        </div>
        <div class="mail-fields">
          <label class="mail-field">
            <span>À</span>
            <input name="recipient" type="text" inputmode="email" maxlength="254" autocomplete="off" autocapitalize="off" spellcheck="false" required>
          </label>
          <label class="mail-field">
            <span>Objet</span>
            <input name="subject" type="text" maxlength="160" autocomplete="off" spellcheck="false" required>
          </label>
          <label class="mail-field mail-message">
            <span>Message</span>
            <textarea name="body" rows="5" maxlength="4000" spellcheck="false" required></textarea>
          </label>
        </div>
        <p class="app-status mail-status" role="status"></p>
      </form>`;

    const form = body.querySelector(".mail-form");
    const status = form.querySelector(".mail-status");
    const send = form.querySelector('[data-command="send-mail"]');
    const fields = Object.fromEntries(fieldNames.map((name) => [name, form.elements.namedItem(name)]));

    function updateStatus(error) {
      send.disabled = sent;
      status.classList.toggle("is-error", Boolean(error));
      const message = error || (sent ? "Message envoyé dans l’atelier." : "Courriel d’entraînement · Envoi simulé");
      if (status.textContent !== message) status.textContent = message;
    }

    function clearErrors() {
      fieldNames.forEach((name) => fields[name].removeAttribute("aria-invalid"));
    }

    function showError(name, message) {
      fields[name].setAttribute("aria-invalid", "true");
      fields[name].focus();
      updateStatus(message);
    }

    for (const name of fieldNames) {
      const field = fields[name];
      field.value = draft[name];
      function readInput(inputType, isComposing) {
        draft[name] = field.value;
        sent = false;
        if (!isComposing) persist();
        clearErrors();
        updateStatus();
        emit("mail-input", {
          field: name,
          value: field.value,
          inputType,
          isComposing,
        });
      }
      field.addEventListener("input", (event) => readInput(event.inputType, event.isComposing));
      field.addEventListener("compositionend", () => readInput("insertCompositionText", false));
    }

    form.querySelector('[data-command="new-mail"]').addEventListener("click", () => {
      reset();
      form.reset();
      clearErrors();
      updateStatus();
      fields.recipient.focus();
      for (const field of fieldNames) emit("mail-input", { field, value: "" });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (sent) return;
      clearErrors();
      const recipient = draft.recipient.trim().normalize("NFC");
      const subject = draft.subject.trim().normalize("NFC");
      const message = draft.body.trim().normalize("NFC");
      if (!isAddress(recipient)) {
        showError("recipient", "Vérifie l’adresse du destinataire. Elle doit contenir un @ et un nom de domaine, sans espace.");
        return;
      }
      if (!subject) {
        showError("subject", "Indique l’objet du courriel.");
        return;
      }
      if (!message) {
        showError("body", "Écris un message avant de l’envoyer.");
        return;
      }
      const delivery = { recipient, subject, body: message };
      const issue = window.DeclicMissions?.mailSendIssue(delivery);
      if (issue) {
        updateStatus(issue);
        return;
      }
      sent = true;
      persist();
      updateStatus();
      emit("mail-send", delivery);
    });

    updateStatus();
  }

  window.DeclicMail = { render, reset, inspect: () => ({ draft: { ...draft }, sent }) };
})();
