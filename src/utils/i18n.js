// src/utils/i18n.js
// Langue de la page et textes de l'interface générés par le code.
//
// La langue vient de l'attribut lang de <html>, que Webflow Localization
// remplit sur chaque version (fr-FR, en-GB). Pour ajouter une langue :
// une entrée dans LOCALES + son dictionnaire dans DICT.
//
// Le contenu (CMS, textes saisis dans Webflow) n'est pas concerné : il est
// déjà traduit dans Webflow.

const DEFAULT_LANG = "fr";

const LOCALES = {
  fr: { tag: "fr-FR", label: "Français", prefix: "" },
  en: { tag: "en-GB", label: "English", prefix: "/en" },
};

const DICT = {
  fr: {
    // Nav
    "menu.open": "Menu",
    "menu.close": "Fermer",
    "menu.ariaOpen": "menu",
    "menu.ariaClose": "fermer le menu",
    // Partage
    "share.copied": "Lien bien copié",
    "share.error": "Impossible de copier le lien",
    // Vidéo
    "video.watch": "Voir la vidéo",
    "video.player": "Lecteur vidéo",
    "video.background": "Vidéo d'arrière-plan",
    "video.play": "Lire",
    "video.pause": "Pause",
    "video.mute": "Couper le son",
    "video.unmute": "Activer le son",
    "video.enableCaptions": "Activer les sous-titres",
    "video.disableCaptions": "Désactiver les sous-titres",
    "video.enterFullscreen": "Plein écran",
    "video.exitFullscreen": "Quitter le plein écran",
    // Galerie
    "slider.region": "carrousel",
    "slider.slide": "diapositive",
    "slider.label": "Galerie d'images",
    "slider.prev": "Image précédente",
    "slider.next": "Image suivante",
    "slider.position": "{index} sur {total}",
    // Tableau comparatif
    "compare.na": "Non communiqué",
    "compare.yes": "Oui",
    "compare.rival": "Concurrent",
    // Contrôle des emails
    "email.invalid": "Cette adresse email n'est pas valide.",
    "email.disposable": "Les adresses email temporaires ne sont pas acceptées. Merci d'utiliser votre adresse habituelle.",
    "email.fake": "Merci de saisir votre véritable adresse email.",
    "email.suggest": "Vouliez-vous dire {email} ?",
  },
  en: {
    "menu.open": "Menu",
    "menu.close": "Close",
    "menu.ariaOpen": "menu",
    "menu.ariaClose": "close the menu",
    "share.copied": "Link copied",
    "share.error": "Unable to copy the link",
    "video.watch": "Watch the video",
    "video.player": "Video player",
    "video.background": "Background video",
    "video.play": "Play",
    "video.pause": "Pause",
    "video.mute": "Mute",
    "video.unmute": "Unmute",
    "video.enableCaptions": "Enable captions",
    "video.disableCaptions": "Disable captions",
    "video.enterFullscreen": "Enter fullscreen",
    "video.exitFullscreen": "Exit fullscreen",
    "slider.region": "carousel",
    "slider.slide": "slide",
    "slider.label": "Image gallery",
    "slider.prev": "Previous image",
    "slider.next": "Next image",
    "slider.position": "{index} of {total}",
    "compare.na": "Not disclosed",
    "compare.yes": "Yes",
    "compare.rival": "Competitor",
    "email.invalid": "This email address is not valid.",
    "email.disposable": "Temporary email addresses are not accepted. Please use your usual address.",
    "email.fake": "Please enter your real email address.",
    "email.suggest": "Did you mean {email}?",
  },
};

// "fr-FR" → "fr" ; langue inconnue → français
export function getLang() {
  const code = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
  return LOCALES[code] ? code : DEFAULT_LANG;
}

// Tag complet pour Intl / toLocaleString / schema (ex. "en-GB")
export function getLocaleTag() {
  return LOCALES[getLang()].tag;
}

// Nom de la langue dans sa propre langue (ex. piste de sous-titres)
export function getLangLabel() {
  return LOCALES[getLang()].label;
}

// t("slider.position", { index: 1, total: 4 }) → "1 sur 4"
export function t(key, vars) {
  const text = DICT[getLang()][key] ?? DICT[DEFAULT_LANG][key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
}

// Chemin sans le préfixe de langue : "/en/blog-post/x" → "/blog-post/x"
export function getPathWithoutLocale(pathname = window.location.pathname) {
  for (const { prefix } of Object.values(LOCALES)) {
    if (!prefix) continue;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}
