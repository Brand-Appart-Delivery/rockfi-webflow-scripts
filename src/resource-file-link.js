// src/resource-file-link.js
// Page ressource : le message de confirmation propose un lien de secours
// ("ouvrez-la ici") si le téléchargement automatique ne démarre pas.
// Le lien (attribut data-resource-file-link) prend l'adresse du PDF,
// lue sur le formulaire (data-form-download-url, relié au champ CMS File URL).

export function initResourceFileLink() {
  document.querySelectorAll("[data-resource-file-link]").forEach((link) => {
    const scope = link.closest(".w-form") || document;
    const form = scope.querySelector("form[data-form-download-url]");
    const url = form && form.getAttribute("data-form-download-url").trim();
    if (!url) return;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
  });
}
