// src/schema/builders.js
// Données structurées des listes que Webflow ne sait pas générer nativement
// (pas de boucle sur une Collection List dans le JSON-LD des pages).
//
// Le reste est géré directement dans Webflow, modifiable sans code :
// - Organization + WebSite : head du site (Site settings > Custom code)
// - Article, Person (conseillers), FinancialService (villes) : JSON-LD des templates CMS
// - FAQPage : microdata sur les composants "FAQ Section" et "FAQ Item"
import { parseDate, text } from "./utils.js";
import { getLocaleTag } from "../utils/i18n.js";

// Organization déclarée dans le head Webflow
const ORG_REF = { "@id": "https://www.rockfi.fr/#organization" };

// --- Page À propos : dirigeants et équipe ---
export function buildTeamSchema(root) {
  return Array.from(root.querySelectorAll(".collection-item-conseiller"))
    .map((card) => {
      const name = text(card.querySelector(".heading-style-h6"));
      if (!name) return null;
      const person = { "@type": "Person", name, worksFor: ORG_REF };
      const jobTitle = text(card.querySelector(".profil-list-content-wrapper"));
      const image = card.querySelector(".profil-list_image")?.src;
      const linkedin = card.querySelector('a[href*="linkedin.com"]')?.href;
      if (jobTitle) person.jobTitle = jobTitle;
      if (image) person.image = image;
      if (linkedin) person.sameAs = [linkedin];
      return person;
    })
    .filter(Boolean);
}

// --- Page Presse : vidéos et podcasts YouTube ---
export function buildPressSchema(root) {
  const seen = new Set();
  return Array.from(root.querySelectorAll(".collection_list_item_presse a, a.item-presse"))
    .map((card) => {
      const id = getYoutubeId(card.getAttribute("data-video-player") || card.getAttribute("href"));
      if (!id || seen.has(id)) return null;

      const name = text(card.querySelector(".heading-presse"));
      const uploadDate = parseDate(text(card.querySelector(".text-size-12")));
      if (!name || !uploadDate) return null;
      seen.add(id);

      const thumbnails = [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
      const cover = card.querySelector(".item_presse_img")?.src;
      if (cover) thumbnails.unshift(cover);

      return {
        "@type": "VideoObject",
        name,
        description: name,
        uploadDate,
        thumbnailUrl: thumbnails,
        url: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        inLanguage: getLocaleTag(),
        publisher: ORG_REF,
      };
    })
    .filter(Boolean);
}

function getYoutubeId(value) {
  if (!value) return null;
  const match =
    value.match(/^youtube:([\w-]{11})$/) ||
    value.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([\w-]{11})/) ||
    value.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : null;
}
