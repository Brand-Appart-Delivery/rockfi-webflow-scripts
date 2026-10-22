// src/embeds/index.js
// Deux phases distinctes, dans cet ordre strict :
// 1. Transformation TEXTE uniquement (chaque module lit/écrit une string,
//    aucun accès au DOM) — chaînées, puis écrites dans .innerHTML UNE SEULE
//    FOIS à la fin.
// 2. Attache des listeners (slider, vidéo) sur les nœuds DOM finaux, après
//    ce write unique.

import { transformTable } from "./table-enhance.js";
import { transformList } from "./list-enhance.js";
import { transformCalc } from "./calc-enhance.js";
import { transformButton } from "./button-enhance.js";
import { transformQuote } from "./quote-enhance.js";
import { transformQuoteLarge } from "./quote-large-enhance.js";
import { transformSlider, initSliderListeners } from "./slider-enhance.js";
import { transformVideo, initVideoListeners } from "./video-enhance.js";

export function initEmbeds(root = document) {
  // Le tableau comparatif a son propre module (src/compare-table.js).
  const contentEl = root.querySelector(
    ".rich-text_blog:not([data-compare-table])",
  );
  if (!contentEl) return;

  let html = contentEl.innerHTML;
  html = transformTable(html);
  html = transformList(html);
  html = transformCalc(html);
  html = transformButton(html);
  html = transformQuote(html);
  html = transformQuoteLarge(html);
  html = transformSlider(html);
  html = transformVideo(html);

  contentEl.innerHTML = html;

  initSliderListeners(contentEl);
  initVideoListeners(contentEl);
}