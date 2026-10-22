// src/schema/builders.js
import { parseDate, getIsoDate, getFaqEntities } from "./utils.js";
import { getLocaleTag } from "../utils/i18n.js";

const ORG_REF = {
  "@type": "Organization",
  name: "RockFi",
  url: "https://www.rockfi.com",
};

// --- Article de blog (/blog-post/<slug>) ---
export function buildArticleSchema(root) {
  const headline = root.querySelector(".heading-blog")?.textContent?.trim();
  if (!headline) return [];

  const image = root.querySelector(".large_img_blog img")?.src;
  const description = root
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");
  const authorName = root
    .querySelector(".profil-left")
    ?.textContent?.replace(/^\s*(par|by)\s*/i, "")
    .trim();

  const datePublished =
    getIsoDate(root, ".seo-date-source") ||
    parseDate(
      root.querySelector(".content_sidebar_date")?.lastElementChild
        ?.textContent,
    );

  const cleanUrl = window.location.origin + window.location.pathname;

  const post = {
    "@type": "BlogPosting",
    headline,
    url: cleanUrl,
    mainEntityOfPage: cleanUrl,
    inLanguage: getLocaleTag(),
  };
  if (image) post.image = image;
  if (datePublished) post.datePublished = datePublished;
  if (description) post.description = description;
  if (authorName) post.author = { "@type": "Person", name: authorName };
  post.publisher = ORG_REF;

  const entities = [post];

  const faqEntities = getFaqEntities(root, ".faq_content-blog");
  if (faqEntities.length) {
    entities.push({ "@type": "FAQPage", mainEntity: faqEntities });
  }

  return entities;
}

// --- Liste de blog (page /blog, et réutilisable pour la section "À lire") ---
export function buildBlogListSchema(root) {
  const blog = {
    "@type": "Blog",
    name: "RockFi Blog & Ressources",
    url: window.location.href,
  };

  const seenUrls = new Set();
  const posts = Array.from(root.querySelectorAll(".blog-list_item"))
    .map((card) => {
      const link = card.querySelector(".blog-list_item-link");
      const url = link?.href;
      if (!url || seenUrls.has(url)) return null;

      const headline = card
        .querySelector('[fs-list-field="heading"]')
        ?.textContent?.trim();
      if (!headline) return null;

      const image = card.querySelector(".blog-list_image")?.src;
      const dateText = Array.from(
        card.querySelectorAll('[fs-list-field="categories"]'),
      )
        .map((el) => el.textContent.trim())
        .find((text) => parseDate(text));
      const datePublished = parseDate(dateText);

      seenUrls.add(url);

      const post = { "@type": "BlogPosting", headline, url };
      if (image) post.image = image;
      if (datePublished) post.datePublished = datePublished;
      return post;
    })
    .filter(Boolean);

  if (posts.length) blog.blogPost = posts;

  return [blog];
}

export function buildLandingSchema(root) {
  const name = root.querySelector("h1")?.textContent?.trim();
  if (!name) return [];

  return [
    {
      "@type": "WebPage",
      name,
      url: window.location.href,
      isPartOf: ORG_REF,
    },
  ];
}
