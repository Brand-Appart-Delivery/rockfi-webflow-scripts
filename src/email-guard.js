// src/email-guard.js
// Filtre les fausses adresses dans tous les champs email des formulaires.
//
// - Adresses jetables (yopmail, mailinator…) : bloquées. La liste (~10 000 domaines,
//   maintenue sur GitHub) n'est chargée qu'au premier clic dans un champ email.
// - Adresses fantaisistes (test@test.com, aaa@aaa.fr, le placeholder recopié) : bloquées.
// - Fautes de frappe (gmial.com, orange.ft…) : simple suggestion cliquable, non bloquante.
//
// Le blocage passe par setCustomValidity : le champ devient invalide, donc les scripts
// qui testent checkValidity() (ex. formulaire Ressources) désactivent le bouton d'eux-mêmes.
// L'envoi est aussi intercepté en capture, avant Webflow et les scripts de page.
//
// Désactiver sur un champ : attribut data-email-guard="off".

import { t } from "./utils/i18n.js";

const LIST_URL =
  "https://cdn.jsdelivr.net/gh/disposable-email-domains/disposable-email-domains@main/disposable_email_blocklist.conf";

// Filet de sécurité si la liste ne se charge pas
const FALLBACK_DISPOSABLE = [
  "yopmail.com", "yopmail.fr", "yopmail.net", "mailinator.com", "guerrillamail.com",
  "10minutemail.com", "temp-mail.org", "tempmail.com", "trashmail.com", "jetable.org",
  "throwawaymail.com", "getnada.com", "maildrop.cc", "sharklasers.com", "dispostable.com",
  "mailnesia.com", "mohmal.com", "emailondeck.com", "fakeinbox.com", "tempr.email",
];

// Domaines courants, pour proposer une correction
const COMMON_DOMAINS = [
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr",
  "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com", "me.com",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "laposte.net", "bbox.fr",
  "aol.com", "proton.me", "protonmail.com", "gmx.fr", "gmx.com",
];

// Fournisseurs qui n'existent que sous une seule terminaison
const TLD_FIX = {
  gmail: "gmail.com", googlemail: "googlemail.com", icloud: "icloud.com",
  laposte: "laposte.net", orange: "orange.fr", wanadoo: "wanadoo.fr", free: "free.fr",
  sfr: "sfr.fr", neuf: "neuf.fr", bbox: "bbox.fr", protonmail: "protonmail.com",
};

const FAKE_DOMAINS = new Set([
  "example.com", "example.fr", "example.org", "exemple.com", "exemple.fr", "test.com",
  "test.fr", "test.test", "domain.com", "domaine.com", "domaine.fr", "email.test",
  "fake.com", "localhost",
]);

const FAKE_LOCALS = new Set([
  "test", "tests", "testing", "toto", "titi", "tata", "azerty", "qwerty", "asdf",
  "fake", "faux", "spam", "nope", "non", "aucun", "none", "null", "xxx",
]);

const FORMAT = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

let disposable = new Set(FALLBACK_DISPOSABLE);
let listPromise = null;

function loadList() {
  if (!listPromise) {
    listPromise = fetch(LIST_URL)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((text) => {
        const set = new Set(FALLBACK_DISPOSABLE);
        text.split("\n").forEach((line) => {
          const d = line.trim().toLowerCase();
          if (d && !d.startsWith("#")) set.add(d);
        });
        disposable = set;
      })
      .catch(() => {});
  }
  return listPromise;
}

// sub.yopmail.com → teste aussi yopmail.com
function isDisposable(domain) {
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (disposable.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

// "aaaa", "xx" : un seul caractère répété
const isRepeated = (s) => s.length > 1 && /^(.)\1+$/.test(s);

function isFake(local, domain, placeholder) {
  const name = domain.split(".")[0];
  return (
    FAKE_DOMAINS.has(domain) ||
    FAKE_LOCALS.has(local) ||
    isRepeated(local) ||
    isRepeated(name) ||
    (placeholder && `${local}@${domain}` === placeholder.trim().toLowerCase())
  );
}

// Distance d'édition (avec inversion de deux lettres : gmial → gmail)
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// strict = une seule faute tolérée (domaines jetables : yopmail ne doit pas devenir hotmail)
function suggestDomain(domain, strict = false) {
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best = null;
  let bestScore = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const score = distance(domain, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  // 1 faute pour les domaines courts, 2 au-delà
  const max = strict || domain.length < 8 ? 1 : 2;
  if (bestScore > 0 && bestScore <= max) return best;

  // Bon fournisseur, mauvaise terminaison : gmail.fr → gmail.com
  const fix = TLD_FIX[domain.split(".")[0]];
  return fix && fix !== domain ? fix : null;
}

// → { error: clé de message | null, suggestion: adresse corrigée | null }
export function checkEmail(value, placeholder = "") {
  const email = value.trim().toLowerCase();
  if (!email) return { error: null, suggestion: null };
  if (!FORMAT.test(email)) return { error: "email.invalid", suggestion: null };

  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const toEmail = (d) => (d ? `${local}@${d}` : null);

  // gmial.com, hotmial.com… sont des domaines piégés qui figurent dans la liste :
  // on bloque, mais en proposant la correction plutôt que le message "adresse temporaire"
  if (isDisposable(domain)) {
    const suggestion = toEmail(suggestDomain(domain, true));
    return { error: suggestion ? "email.invalid" : "email.disposable", suggestion };
  }
  if (isFake(local, domain, placeholder)) return { error: "email.fake", suggestion: null };

  return { error: null, suggestion: toEmail(suggestDomain(domain)) };
}

/* ---------- Affichage ---------- */

function isTarget(el) {
  return (
    el instanceof HTMLInputElement &&
    el.type === "email" &&
    el.form &&
    el.dataset.emailGuard !== "off"
  );
}

function messageFor(input) {
  let msg = input._emailGuardMsg;
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "email-guard_msg";
    msg.id = `email-guard-${Math.random().toString(36).slice(2, 8)}`;
    msg.setAttribute("aria-live", "polite");
    msg.hidden = true;
    input.insertAdjacentElement("afterend", msg);
    const described = input.getAttribute("aria-describedby");
    input.setAttribute("aria-describedby", described ? `${described} ${msg.id}` : msg.id);
    input._emailGuardMsg = msg;
  }
  return msg;
}

// Met à jour la validité ; show = afficher le message (après la saisie, pas pendant)
function validate(input, show) {
  const { error, suggestion } = checkEmail(input.value, input.placeholder);
  input.setCustomValidity(error ? t(error) : "");

  if (!show && !(input._emailGuardMsg && !input._emailGuardMsg.hidden)) return !error;

  const msg = messageFor(input);
  msg.textContent = "";
  msg.classList.remove("is-error", "is-suggestion");
  input.classList.toggle("is-email-error", Boolean(error));

  if (error) {
    const text = document.createElement("span");
    text.textContent = `${t(error)} `;
    msg.appendChild(text);
    msg.classList.add("is-error");
    msg.hidden = false;
  }
  if (suggestion) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "email-guard_suggest";
    btn.textContent = t("email.suggest", { email: suggestion });
    btn.addEventListener("click", () => {
      input.value = suggestion;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
    });
    msg.appendChild(btn);
    msg.classList.add("is-suggestion");
    msg.hidden = false;
  }
  if (!error && !suggestion) msg.hidden = true;
  return !error;
}

// Après chargement de la liste : revalide les champs déjà remplis
function revalidateAll() {
  document.querySelectorAll('form input[type="email"]').forEach((input) => {
    if (!isTarget(input) || !input.value) return;
    const before = input.validationMessage;
    validate(input, input._emailGuardTouched);
    if (input.validationMessage !== before) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

// Écouteurs délégués sur document : couvre aussi les formulaires ajoutés après coup
export function initEmailGuard() {
  document.addEventListener(
    "focusin",
    (e) => {
      if (isTarget(e.target)) loadList().then(revalidateAll);
    },
    true,
  );

  // Pendant la saisie : validité à jour (le bouton suit), message seulement s'il est déjà affiché
  document.addEventListener(
    "input",
    (e) => {
      if (isTarget(e.target)) validate(e.target, false);
    },
    true,
  );

  // En sortie de champ : message affiché
  document.addEventListener(
    "focusout",
    (e) => {
      if (!isTarget(e.target) || !e.target.value) return;
      e.target._emailGuardTouched = true;
      validate(e.target, true);
    },
    true,
  );

  // À l'envoi : dernier contrôle, avant Webflow et les scripts de page
  document.addEventListener(
    "submit",
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const inputs = Array.from(form.querySelectorAll('input[type="email"]')).filter(isTarget);
      const bad = inputs.filter((input) => !validate(input, true));
      if (!bad.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      bad[0].focus();
    },
    true,
  );
}
