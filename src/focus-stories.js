// src/focus-stories.js

import { PRESETS } from "./animate/presets.js";
import { initDotArrow } from "./animate/dot-arrow.js";

const CTA_TEXT_SELECTOR = ".focus-card_cta .text-block";

function extractSlide(card) {
  const img = card.querySelector(".focus-card_image");
  const linkedinLink = card.querySelector(".img_wrapper_linkedin");
  const titleBlock = card.querySelector(".focus-card_header");
  const footerTop = card.querySelector(".focus-card_footer-top");
  const heading = card.querySelector(".focus-card_header h2");

  // Premier mot du nom complet = prénom. Sécurise contre un h2 vide/absent.
  const fullName = heading ? heading.textContent.trim() : "";
  const firstName = fullName.split(/\s+/)[0] || "";

  return {
    imgSrc: img ? img.src : "",
    imgAlt: img ? img.alt : "",
    linkedinHref: linkedinLink ? linkedinLink.getAttribute("href") : "#",
    titleHTML: titleBlock ? titleBlock.innerHTML : "",
    footerTopHTML: footerTop ? footerTop.innerHTML : "",
    firstName,
  };
}

function buildProgressSteps(progressEl, count) {
  if (!progressEl) return [];

  progressEl.innerHTML = "";
  const steps = [];

  for (let i = 0; i < count; i++) {
    const step = document.createElement("div");
    step.className = "focus-card_progress-step";

    const fill = document.createElement("div");
    fill.className = "focus-card_progress-fill";
    step.appendChild(fill);

    progressEl.appendChild(step);
    steps.push(step);
  }

  return steps;
}

// Remplace {name} par le prénom dans le CTA d'une carte (cas d'une carte unique, sans slider)
function fillCtaName(card) {
  const ctaText = card.querySelector(CTA_TEXT_SELECTOR);
  if (!ctaText || !ctaText.textContent.includes("{name}")) return;
  const { firstName } = extractSlide(card);
  ctaText.textContent = ctaText.textContent.replace("{name}", firstName);
}

export function initFocusStories(root = document) {
  const sections = root.querySelectorAll(".section_focus");

  sections.forEach((section) => {
    const cards = Array.from(section.querySelectorAll(".focus-card"));
    if (cards.length === 0) return;

    // Une seule carte : rien à faire défiler, mais on remplit quand même {name}
    if (cards.length === 1) {
      fillCtaName(cards[0]);
      return;
    }

    const duration = parseFloat(section.dataset.focusDuration) || 5; // secondes
    const transitionDuration = parseFloat(section.dataset.focusTransition) || 0.6; // secondes
    const titleStagger = parseFloat(section.dataset.focusTitleStagger) || 0.04;
    const quoteStagger = parseFloat(section.dataset.focusQuoteStagger) || 0.08;
    const quoteDuration = parseFloat(section.dataset.focusQuoteDuration) || 0.9;

    const mainCard = cards[0];

    // Capture le TEMPLATE du CTA avant tout traitement — texte tel que
    // défini/traduit dans Webflow, avec {name} dedans.
    const ctaTemplateEl = mainCard.querySelector(CTA_TEXT_SELECTOR);
    const ctaTemplate = ctaTemplateEl ? ctaTemplateEl.textContent.trim() : "";

    const slides = cards.map(extractSlide);

    // La première carte devient LA carte persistante ; les autres sont
    // retirées du DOM une fois leurs données extraites.
    cards.slice(1).forEach((card) => card.remove());

    const imgWrapper = mainCard.querySelector(".focus-card_image-wrapper");
    let currentImg = mainCard.querySelector(".focus-card_image");
    const linkedinLink = mainCard.querySelector(".img_wrapper_linkedin");
    const titleBlock = mainCard.querySelector(".focus-card_header");
    const footerTop = mainCard.querySelector(".focus-card_footer-top");
    const progressEl = mainCard.querySelector(".focus-card_progress");

    const steps = buildProgressSteps(progressEl, slides.length);

    let index = 0;
    let progressTween = null;
    let isInView = false;

    function swapImage(newSrc, newAlt) {
      if (!imgWrapper || !currentImg) return;

      const nextImg = currentImg.cloneNode(false);
      nextImg.src = newSrc;
      nextImg.alt = newAlt;
      nextImg.classList.remove("is-active", "is-entering", "is-leaving");
      nextImg.classList.add("is-entering");

      imgWrapper.appendChild(nextImg);
      currentImg.classList.remove("is-entering");
      currentImg.classList.add("is-leaving");

      void nextImg.offsetWidth;
      nextImg.classList.remove("is-entering");
      nextImg.classList.add("is-active");

      const oldImg = currentImg;
      currentImg = nextImg;

      oldImg.addEventListener(
        "transitionend",
        () => {
          oldImg.remove();
        },
        { once: true },
      );

      setTimeout(() => {
        if (oldImg.parentNode) oldImg.remove();
      }, transitionDuration * 1000 + 100);
    }

    function animateTitle() {
      if (!titleBlock || typeof window.gsap === "undefined") return;

      const heading = titleBlock.querySelector("h2");
      if (!heading) return;

      PRESETS.heading(heading, { stagger: titleStagger });
    }

    function animateQuote() {
      if (!footerTop || typeof window.gsap === "undefined" || typeof window.SplitText === "undefined") return;

      const quote = footerTop.querySelector(".focus-card_footer-quote");
      if (!quote) return;

      const split = new window.SplitText(quote, {
        type: "lines",
        mask: "lines",
      });

      window.gsap.set(split.lines, { yPercent: 110, opacity: 0 });
      window.gsap.to(split.lines, {
        yPercent: 0,
        opacity: 1,
        duration: quoteDuration,
        stagger: quoteStagger,
        ease: "power3.out",
      });
    }

    function applySlide(i) {
      const slide = slides[i];
      swapImage(slide.imgSrc, slide.imgAlt);
      if (linkedinLink) linkedinLink.setAttribute("href", slide.linkedinHref);
      if (titleBlock) titleBlock.innerHTML = slide.titleHTML;
      if (footerTop) footerTop.innerHTML = slide.footerTopHTML;

      const ctaText = footerTop ? footerTop.querySelector(CTA_TEXT_SELECTOR) : null;
      if (ctaText && ctaTemplate) {
        ctaText.textContent = ctaTemplate.replace("{name}", slide.firstName || "");
      }

      if (footerTop) initDotArrow(footerTop);

      animateTitle();
      animateQuote();
    }

    function startProgress(i) {
      if (!steps.length) return;

      // 1. Tuer l'animation précédente si existante
      if (progressTween) {
        progressTween.kill();
        progressTween = null;
      }

      // 2. Mettre à jour l'état visuel de chaque étape
      steps.forEach((step, si) => {
        const fill = step.querySelector(".focus-card_progress-fill");
        if (si < i) {
          window.gsap.set(fill, { scaleX: 1, transformOrigin: "left center" });
        } else if (si > i) {
          window.gsap.set(fill, { scaleX: 0, transformOrigin: "left center" });
        }
      });

      const currentFill = steps[i].querySelector(".focus-card_progress-fill");
      window.gsap.set(currentFill, { scaleX: 0, transformOrigin: "left center" });

      // 3. Animer la barre courante avec GSAP (permet pause/reprise précise)
      progressTween = window.gsap.to(currentFill, {
        scaleX: 1,
        duration: duration,
        ease: "none",
        paused: !isInView, // Reste en pause tant que pas dans le viewport
        onComplete: next,
      });
    }

    function showSlide(i) {
      applySlide(i);
      startProgress(i);
    }

    function next() {
      index = (index + 1) % slides.length;
      showSlide(index);
    }

    // Initialise le 1er slide (visuel prêt)
    applySlide(index);

    // Initialise les barres (première prête à 0)
    steps.forEach((step, si) => {
      const fill = step.querySelector(".focus-card_progress-fill");
      window.gsap.set(fill, { scaleX: si < index ? 1 : 0, transformOrigin: "left center" });
    });

    startProgress(index);

    // Contrôle via ScrollTrigger : pause hors écran, lecture dans l'écran
    if (typeof window.ScrollTrigger !== "undefined") {
      window.ScrollTrigger.create({
        trigger: section,
        start: "top 90%",
        end: "bottom 10%",
        onEnter: () => {
          isInView = true;
          if (progressTween) progressTween.play();
        },
        onLeave: () => {
          isInView = false;
          if (progressTween) progressTween.pause();
        },
        onEnterBack: () => {
          isInView = true;
          if (progressTween) progressTween.play();
        },
        onLeaveBack: () => {
          isInView = false;
          if (progressTween) progressTween.pause();
        },
      });
    } else {
      // Fallback si ScrollTrigger n'est pas dispo
      isInView = true;
      if (progressTween) progressTween.play();
    }
  });
}