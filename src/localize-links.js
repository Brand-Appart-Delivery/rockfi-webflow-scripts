// src/localize-links.js
// Version anglaise : les liens internes écrits à la main (texte des articles,
// codes courts [button], embeds) pointent vers les adresses françaises,
// par ex. "/tarification" ou "/blog-post/frais-banque-privee-cout-reel".
// Webflow ne les traduit pas. Ce script les réécrit vers la page anglaise :
// "/en/pricing", "/en/blog-post/private-banking-fees-real-cost".
//
// Les liens générés par Webflow (menu, listes CMS, sélecteur de langue)
// sont déjà corrects et ne sont pas touchés.
//
// Nouvelle page ou nouvel article dont le slug anglais diffère du français :
// ajouter la correspondance ci-dessous (slug FR → slug EN).

import { getLang } from "./utils/i18n.js";

// Pages statiques : slug FR → slug EN (doit correspondre aux slugs EN du Designer).
// En attente : les slugs EN des pages n'ont pas encore été changés dans le
// Designer (changement de plan Webflow nécessaire). Tant que PAGES_READY vaut
// false, les pages gardent leur slug FR : "/tarification" → "/en/tarification".
// Le jour où les slugs EN sont en place dans le Designer : passer à true.
const PAGES_READY = false;

const PAGES_EN = {
  "a-propos": "about",
  conseil: "advice",
  "architecture-ouverte": "open-architecture",
  "contact-conseiller": "contact-an-advisor",
  "contact-demo": "book-a-demo",
  "contact-team": "contact-our-team",
  "devenir-partner": "become-a-partner",
  evenements: "events",
  "kit-presse": "press-kit",
  "livre-blancs": "white-papers",
  "mentions-legales": "legal-notice",
  "nos-conseillers": "our-advisors",
  "politique-de-confidentialite": "privacy-policy",
  presse: "press",
  produit: "product",
  tarification: "pricing",
};

const PAGES = PAGES_READY ? PAGES_EN : {};

// Fiches CMS : dossier de la collection → { slug FR → slug EN }
// Les fiches absentes gardent le même slug dans les deux langues.
const ITEMS = {
  "blog-post": {
    "rockfi-intelligence-lia-au-service-de-la-gestion-privee": "rockfi-intelligence-ai-for-private-wealth-management",
    "rockfi-accueille-laurent-garret-ex-directeur-general-de-neuflize-obc": "laurent-garret-former-ceo-of-neuflize-obc-joins-rockfi",
    "rockfi-lance-rockfi-philanthropy-son-fonds-de-dotation-pour-soutenir-des-associations-dinteret-general": "rockfi-launches-rockfi-philanthropy-endowment-fund",
    "banque-privee-ou-rockfi-difference-majeure": "private-banking-or-rockfi-the-major-difference",
    "investir-dans-le-non-cote-les-quatre-portes-d-entree": "investing-in-unlisted-assets-four-entry-points",
    "gestion-de-patrimoine-comparatif": "wealth-management-comparison-2026",
    "frais-banque-privee-cout-reel": "private-banking-fees-real-cost",
    "rockfi-dote-ses-conseillers-prives-dun-agent-ia-pour-un-suivi-patrimonial-sur-mesure-et-proactif": "rockfi-ai-agent-for-private-wealth-advisors",
    "rockfi-et-blackrock-sassocient-pour-placer-les-projets-de-vie-au-coeur-de-la-gestion-patrimoniale": "rockfi-and-blackrock-partner-on-goal-based-wealth-management",
    "spotlight-sur-maxime-durand": "spotlight-on-maxime-durand",
    "spotlight-sur-marie-bedu": "spotlight-on-marie-bedu",
    "rockfi-leve-18-millions-deuros-en-serie-a-et-deploie-son-espace-client-dedie": "rockfi-raises-18-million-in-series-a-and-launches-client-portal",
    "rockfi-accelere-son-developpement-avec-louverture-de-trois-nouveaux-bureaux-et-le-lancement-de-son-application-privee": "rockfi-opens-three-new-offices-and-launches-private-app",
    "comment-est-calculee-votre-performance-methode-rockfi": "how-your-performance-is-calculated-rockfi-method",
  },
  "landing-posts": {
    "rockfi-lance-rockfi-philanthropy-son-fonds-de-dotation-pour-soutenir-des-associations-dinteret-general": "rockfi-launches-rockfi-philanthropy-endowment-fund",
    "comment-est-calculee-votre-performance": "how-your-performance-is-calculated",
    "rockfi-accelere-son-developpement-avec-louverture-de-trois-nouveaux-bureaux-et-le-lancement-de-son-application-privee": "rockfi-opens-three-new-offices-and-launches-private-app",
    "rockfi-leve-18-millions-deuros-en-serie-a-et-deploie-son-espace-client-dedie": "rockfi-raises-18-million-in-series-a-and-launches-client-portal",
    "spotlight-sur-marie-bedu": "spotlight-on-marie-bedu",
    "rockfi-et-blackrock-sassocient-pour-placer-les-projets-de-vie-au-coeur-de-la-gestion-patrimoniale": "rockfi-and-blackrock-partner-on-goal-based-wealth-management",
    "rockfi-dote-ses-conseillers-prives-dun-agent-ia-pour-un-suivi-patrimonial-sur-mesure-et-proactif": "rockfi-ai-agent-for-private-wealth-advisors",
    "investir-dans-le-non-cote-les-quatre-portes-d-entree": "investing-in-unlisted-assets-four-entry-points",
    "frais-banque-privee-cout-reel": "private-banking-fees-real-cost",
    "gestion-de-patrimoine-comparatif": "wealth-management-comparison-2026",
    "banque-privee-ou-rockfi-difference-majeure": "private-banking-or-rockfi-the-major-difference",
    "spotlight-sur-maxime-durand": "spotlight-on-maxime-durand",
  },
  ressources: {
    "les-differentes-strategies-en-private-equity": "private-equity-strategies",
    "retraite-diversifier-son-patrimoine-et-ses-revenus-grace-aux-etf": "retirees-diversify-wealth-and-income-with-etfs",
    "private-equity-3-profils-dinvestisseurs-3-strategies-concretes": "private-equity-3-investor-profiles-3-strategies",
    "comprendre-et-construire-un-portefeuille-sur-mesure-avec-les-etf": "understanding-and-building-a-tailored-etf-portfolio",
    "entrepreneur-securiser-et-diversifier-son-patrimoine-apres-une-cession-avec-les-etf": "entrepreneurs-secure-and-diversify-wealth-after-a-business-sale",
    "comment-choisir-des-etf-les-criteres-de-selection": "how-to-choose-etfs-selection-criteria",
    "chef-dentreprise-optimiser-sa-tresorerie-grace-a-une-strategie-detf": "business-owners-optimise-company-cash-with-etfs",
    "cadre-dirigeant-preparer-sa-retraite-avec-un-portefeuille-detf-sur-mesure": "senior-executives-prepare-retirement-with-etfs",
    "kit-de-presse": "press-kit",
  },
  evenements: {
    "rockfi-summit-mars-2025": "rockfi-summit-march-2025",
    "summit-rentree-25": "autumn-summit-25",
    "partner-day-juin-2026": "partner-day-june-2026",
    "soirees-exclusives-ritz-paris": "exclusive-evenings-ritz-paris",
    "rockfi-acte-i": "rockfi-act-i",
  },
};

// "/tarification#faq" → "/en/pricing#faq" ; null si le lien ne doit pas changer
export function toEnglishPath(path) {
  const match = path.match(/^\/([^?#]*)([?#].*)?$/);
  if (!match) return null;
  const [, rawPath, suffix = ""] = match;
  const parts = rawPath.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts[0] === "en") return null; // déjà en anglais
  if (!parts.length) return `/en${suffix}`;

  if (parts.length === 1) {
    return `/en/${PAGES[parts[0]] || parts[0]}${suffix}`;
  }
  const [folder, slug, ...rest] = parts;
  const enSlug = ITEMS[folder]?.[slug] || slug;
  return `/en/${[folder, enSlug, ...rest].join("/")}${suffix}`;
}

export function initLocalizeLinks() {
  if (getLang() !== "en") return;

  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    // Sélecteur de langue Webflow : doit garder le lien vers la version FR
    if (link.hasAttribute("hreflang") || link.closest(".w-locales-list")) return;
    if (link.hasAttribute("data-no-localize")) return;

    const href = link.getAttribute("href");
    if (href.startsWith("//")) return; // URL absolue sans protocole
    const localized = toEnglishPath(href);
    if (localized && localized !== href) link.setAttribute("href", localized);
  });
}
