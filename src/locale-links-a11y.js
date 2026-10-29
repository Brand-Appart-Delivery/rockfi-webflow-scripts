// src/locale-links-a11y.js
// Sélecteur de langue : Webflow ajoute href="#" sur le texte « Français /
// English » (.link_locale), un <div> déjà placé dans le vrai lien de langue.
// Ce href imbriqué est signalé par les audits d'accessibilité et ne se retire
// pas depuis le Designer : on l'enlève au chargement.
export function initLocaleLinksA11y() {
  document.querySelectorAll(".link_locale[href]").forEach((el) => el.removeAttribute("href"));
}
