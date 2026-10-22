// src/embeds/slider-enhance.js
// transformSlider(html) : pur texte, génère le markup .rt-slider.
// initSliderListeners(root) : attache drag + boutons sur les nœuds DOM
// finaux, appelé une seule fois après le write global de innerHTML.

import { t } from "../utils/i18n.js";

const SLIDER_BLOCK_REGEX =
  /(?:<p>)?\[slider\](?:<\/p>)?([\s\S]*?)(?:<p>)?\[\/slider\](?:<\/p>)?/gi;

// SVG d'origine conservé (inversé pour prev via votre règle SCSS transform: scaleX(-1))
const CHEVRON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M6.00003 4L10 8L6 12" stroke="#1A1A1A" stroke-miterlimit="16" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buildSlidesHTML(body) {
  const lines = body
    .replace(/<\/p>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const total = lines.length;

  return lines
    .map((line, idx) => {
      const parts = line.split("|").map((s) => s.trim());
      const url = parts[0];
      const caption = parts[1] || "";
      if (!url) return "";

      const captionHTML = caption
        ? `<figcaption class="rt-slider-caption">${caption}</figcaption>`
        : "";

      // On garde <div> pour éviter les marges natives des <figure>
      return `
        <div class="rt-slider-item" role="group" aria-roledescription="${t("slider.slide")}" aria-label="${t("slider.position", { index: idx + 1, total })}">
          <img src="${url}" alt="${caption}" loading="lazy" draggable="false">
          ${captionHTML}
        </div>
      `;
    })
    .join("");
}

export function transformSlider(html) {
  return html.replace(SLIDER_BLOCK_REGEX, (match, body) => {
    const slidesHTML = buildSlidesHTML(body);
    if (!slidesHTML) return match;

    // Pleine largeur garantie, balise <div> préservée
    return `
      <div class="rt-slider" role="region" aria-roledescription="${t("slider.region")}" aria-label="${t("slider.label")}" tabindex="0">
        <div class="rt-slider-track">${slidesHTML}</div>
        <div class="rt-slider-controls">
          <button type="button" class="rt-slider-prev" aria-label="${t("slider.prev")}">${CHEVRON_SVG}</button>
          <button type="button" class="rt-slider-next" aria-label="${t("slider.next")}">${CHEVRON_SVG}</button>
        </div>
      </div>
    `;
  });
}

function initOneSlider(el) {
  const track = el.querySelector(".rt-slider-track");
  const items = Array.from(el.querySelectorAll(".rt-slider-item"));
  const prevBtn = el.querySelector(".rt-slider-prev");
  const nextBtn = el.querySelector(".rt-slider-next");
  if (!track || !items.length) return;

  let index = 0;
  let currentOffset = 0;
  let isDragging = false;
  let startX = 0;
  let startOffset = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;

  const RESISTANCE = 3;
  const SWIPE_THRESHOLD_RATIO = 0.15;
  const FLICK_VELOCITY = 0.5;
  const TRANSITION = "transform 1.3s cubic-bezier(0.16, 1, 0.3, 1)";

  function getMaxOffset() {
    return Math.max(0, track.scrollWidth - el.clientWidth);
  }

  function getLiveOffset() {
    const style = window.getComputedStyle(track);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return -matrix.m41;
  }

  function setOffset(offset, withTransition) {
    track.style.transition = withTransition ? TRANSITION : "none";
    currentOffset = offset;
    track.style.transform = `translateX(-${offset}px)`;
  }

  function goToIndex(i, withTransition = true) {
    index = Math.min(Math.max(i, 0), items.length - 1);
    const maxOffset = getMaxOffset();
    const target = Math.min(items[index].offsetLeft, maxOffset);
    setOffset(target, withTransition);
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === items.length - 1;
  }

  if (prevBtn) prevBtn.addEventListener("click", () => goToIndex(index - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => goToIndex(index + 1));

  // Navigation pratique au clavier quand le carrousel est sélectionné
  el.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToIndex(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToIndex(index + 1);
    }
  });

  track.addEventListener("pointerdown", (e) => {
    const liveOffset = getLiveOffset();
    track.style.transition = "none";
    track.style.transform = `translateX(-${liveOffset}px)`;
    currentOffset = liveOffset;

    isDragging = true;
    startX = e.clientX;
    startOffset = currentOffset;
    lastX = e.clientX;
    lastTime = performance.now();
    velocity = 0;
    track.classList.add("is-dragging");
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener("pointermove", (e) => {
    if (!isDragging) return;

    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) velocity = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastTime = now;

    const delta = e.clientX - startX;
    let proposed = startOffset - delta;
    const maxOffset = getMaxOffset();

    if (proposed < 0) {
      proposed = proposed / RESISTANCE;
    } else if (proposed > maxOffset) {
      proposed = maxOffset + (proposed - maxOffset) / RESISTANCE;
    }

    setOffset(proposed, false);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");

    const finalX = e.clientX ?? lastX;
    const deltaX = finalX - startX;
    const threshold = Math.min(el.clientWidth * SWIPE_THRESHOLD_RATIO, 100);
    const isFlick = Math.abs(velocity) > FLICK_VELOCITY;

    if (Math.abs(deltaX) > threshold || isFlick) {
      const direction = deltaX > 0 || (isFlick && velocity > 0) ? -1 : 1;
      goToIndex(index + direction, true);
    } else {
      goToIndex(index, true);
    }
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => goToIndex(index, false), 150);
  });

  goToIndex(0, false);
}

export function initSliderListeners(root = document) {
  root.querySelectorAll(".rt-slider:not([data-slider-initialized])").forEach((el) => {
    el.setAttribute("data-slider-initialized", "true");
    initOneSlider(el);
  });
}