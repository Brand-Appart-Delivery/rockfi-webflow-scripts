// src/schema/utils.js
import { getPathWithoutLocale } from "../utils/i18n.js";

// Ignore le préfixe de langue : "/en/blog-post/x" passe le test "/blog-post/"
export function pathnameStartsWith(prefix) {
  return getPathWithoutLocale().startsWith(prefix);
}

export function pathnameIs(path) {
  return getPathWithoutLocale().replace(/\/+$/, "") === path;
}

export function isRealUrl(url) {
  return Boolean(url) && url !== "#" && !url.startsWith("#");
}

export function text(el) {
  const value = el?.textContent?.replace(/\s+/g, " ").trim();
  return value || null;
}





const MONTHS = {
  // Français
  janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04",
  mai: "05", juin: "06", juillet: "07", août: "08", aout: "08",
  septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  // Anglais
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

// Date écrite en toutes lettres → "AAAA-MM-JJ".
// Accepte « 22 octobre 2026 », « 22 October 2026 » et « October 22, 2026 » (et « 1er mai 2026 »).
export function parseDate(text) {
  const value = (text || "").trim().toLowerCase().replace(/,/g, "");
  let match = value.match(/^(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-zéû]+)\s+(\d{4})$/i);
  let day, monthName, year;
  if (match) {
    [, day, monthName, year] = match;
  } else {
    match = value.match(/^([a-zéû]+)\s+(\d{1,2})(?:er|st|nd|rd|th)?\s+(\d{4})$/i);
    if (!match) return null;
    [, monthName, day, year] = match;
  }
  const month = MONTHS[monthName];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

export function getIsoDate(root, selector) {
  const el = root.querySelector(selector);
  return el?.getAttribute("datetime") || null;
}

export function getFaqEntities(root, scopeSelector, questionSelector = ".faq_question", answerSelector = ".rich-text-faq") {
  const scope = scopeSelector ? root.querySelector(scopeSelector) : root;
  if (!scope) return [];

  return Array.from(scope.querySelectorAll(".faq_item"))
    .map((item) => {
      const question = item.querySelector(questionSelector)?.textContent?.trim();
      const answer = item.querySelector(answerSelector)?.textContent?.trim();
      if (!question || !answer) return null;

      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      };
    })
    .filter(Boolean);
}

export function getBreadcrumbEntities(root, selector = ".breadcrumbs") {
  const nav = root.querySelector(selector);
  if (!nav) return [];

  const items = Array.from(nav.querySelectorAll("a")).map((a) => ({
    name: a.textContent.trim(),
    url: a.href,
  }));

  const activeText = nav.querySelector(".breadcrumbs-active")?.textContent?.trim();
  if (activeText) items.push({ name: activeText, url: window.location.href });

  return items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  }));
}

export function injectGraph(graph) {
  document.getElementById("schema-dynamic")?.remove();
  if (!graph.length) return;

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "schema-dynamic";
  script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  document.head.appendChild(script);
}