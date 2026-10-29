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

// --- Articles (blog et landing) : FAQ écrite dans le texte de l'article ---
// Un titre h2 « Questions fréquentes » / « Frequently asked questions », suivi
// de questions en h3 et de leurs réponses (paragraphes, listes) jusqu'au h3 ou
// h2 suivant. Ce format est repris par Google et les assistants IA.
const FAQ_HEADING = /^(questions fréquentes|foire aux questions|faq|frequently asked questions)$/i;

export function buildArticleFaqSchema(root) {
  const heading = Array.from(root.querySelectorAll(".w-richtext h2")).find((h) =>
    FAQ_HEADING.test(text(h)),
  );
  if (!heading) return [];

  const questions = [];
  let current = null;
  for (let el = heading.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
    if (el.tagName === "H3") {
      current = { name: text(el), answer: [] };
      questions.push(current);
    } else if (current) {
      const t = (text(el) || "").replace(/‍/g, "").trim();
      if (t) current.answer.push(t);
    }
  }

  const mainEntity = questions
    .filter((q) => q.name && q.answer.length)
    .map((q) => ({
      "@type": "Question",
      name: q.name,
      acceptedAnswer: { "@type": "Answer", text: q.answer.join(" ") },
    }));

  return mainEntity.length ? [{ "@type": "FAQPage", mainEntity }] : [];
}

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
