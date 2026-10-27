// src/core.js
import { requestScrollRefresh } from "./utils/scroll-refresh.js";
import { prefersReducedMotion } from "./utils/motion-preference.js";

// Interrupteur du scroll fluide (Lenis).
// false = scroll natif du navigateur (demande cliente, oct. 2026).
// Repasser à true pour réactiver Lenis : tout le reste du code est conservé.
const SMOOTH_SCROLL_ENABLED = false;

let lenisInstance = null;

const ANCHOR_DURATION = 2; // secondes (1.6 = plus vif, 2.5 = très lent)
const HASH_LOAD_DELAY = 400; // ms d'attente avant le scroll animé à l'arrivée avec un #hash

// easeInOutCubic : départ doux, accélération, arrivée très douce
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Hauteur à laisser libre en haut : nav fixe + bannière (si visible) + marge
function getAnchorOffset() {
  const nav = document.querySelector(".nav_fixed");
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  return -(navHeight);
}

function scrollToHash(hash, { instant = false } = {}) {
  if (!hash || hash === "#") return false;

  let target = null;
  try {
    target = document.querySelector(hash);
  } catch (e) {
    return false;
  }
  if (!target) return false;

  const offset = getAnchorOffset();

  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset,
      duration: instant ? 0 : ANCHOR_DURATION,
      easing: easeInOutCubic,
      immediate: instant,
      // Lenis ignore scrollTo() quand il est arrêté (scroll bloqué par un menu
      // ou un dropdown ouvert) : force permet quand même de suivre l'ancre.
      force: true,
    });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
  }
  return true;
}

function initAnchors() {
  // Phase de capture (3e argument = true) : passe AVANT le gestionnaire
  // d'ancres de Webflow, qu'on neutralise avec stopPropagation.
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest && e.target.closest("a[href*='#']");
      if (!link) return;

      const url = new URL(link.href, window.location.href);
      const samePage =
        url.origin === window.location.origin && url.pathname === window.location.pathname;
      if (!samePage || !url.hash || url.hash === "#") return;

      if (scrollToHash(url.hash)) {
        e.preventDefault();
        e.stopPropagation(); // empêche Webflow de sauter à l'ancre
        history.pushState(null, "", url.hash);
      }
    },
    true,
  );

  // Arrivée sur la page avec un #hash : même scroll animé qu'un clic
  if (window.location.hash) {
    const hash = window.location.hash;

    // Reste en haut de page le temps du chargement (évite le saut natif)
    window.scrollTo(0, 0);

    const go = () => {
      // Si l'utilisateur a déjà scrollé pendant l'attente, on ne le ramène pas de force
      if (window.scrollY > 50) return;

      scrollToHash(hash); // animé, comme un clic

      // Recalage final : les images lazy peuvent avoir décalé la cible
      setTimeout(
        () => scrollToHash(hash, { instant: true }),
        ANCHOR_DURATION * 1000 + 100,
      );
    };

    const start = () => setTimeout(go, HASH_LOAD_DELAY);

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }
  }
}

// Seul endroit où Lenis est créé et branché sur GSAP / ScrollTrigger.
// (animate/setup.js ne fait plus qu'enregistrer le plugin.)
export function initLenis() {
  if (lenisInstance) return lenisInstance; // jamais deux instances
  if (!SMOOTH_SCROLL_ENABLED) return null;
  if (typeof window.Lenis === "undefined") return null;
  if (prefersReducedMotion()) return null;

  lenisInstance = new window.Lenis({
    duration: 1.2,
    smoothWheel: true,
    anchors: false,
  });

  const hasGsap = typeof window.gsap !== "undefined";
  const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";

  // 1. Une seule boucle d'animation : le ticker GSAP s'il existe, sinon RAF
  if (hasGsap) {
    if (hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      lenisInstance.on("scroll", window.ScrollTrigger.update);
    }
    window.gsap.ticker.add((time) => lenisInstance.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // 2. Hauteur de page qui change (accordéons, lazy loading, embeds, listes) :
  // recalcul regroupé, et seulement si la hauteur a vraiment changé. Évite de
  // relancer ScrollTrigger.refresh() (coûteux) en boucle pendant le scroll.
  if (typeof ResizeObserver !== "undefined") {
    let lastHeight = 0;
    let timer = null;

    const recalc = () => {
      timer = null;
      const height = document.body.scrollHeight;
      if (height === lastHeight) return;
      lastHeight = height;
      lenisInstance.resize();
      requestScrollRefresh(0);
    };

    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(recalc, 150);
    }).observe(document.body);
  }

  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

export function init() {
  initLenis();
  initAnchors();
}