// src/list-pagination-canonical.js
// Listes CMS en mode « charger plus » (Finsweet, fs-list-load="more"), ex. /presse.
// Webflow crée des URL de pagination (?b68665eb_page=2). Sur ces URL, le script
// Finsweet réaffiche la liste depuis la page 1 : page 2 = page 1 à l'écran.
// On remet donc l'adresse propre (/presse) et la balise canonical vers cette
// adresse, pour que Google n'indexe pas un doublon de la page 1.

const PAGE_PARAM = /^[0-9a-f]+_page$/;

export function initListPaginationCanonical() {
  if (!document.querySelector('[fs-list-load="more"]')) return;

  const url = new URL(window.location.href);
  const keys = [...url.searchParams.keys()].filter((k) => PAGE_PARAM.test(k));
  if (!keys.length) return;

  keys.forEach((k) => url.searchParams.delete(k));
  const clean = url.pathname + (url.search || "") + url.hash;
  window.history.replaceState(window.history.state, "", clean);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", url.origin + url.pathname + (url.search || ""));
}
