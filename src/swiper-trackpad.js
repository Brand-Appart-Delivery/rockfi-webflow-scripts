// src/swiper-trackpad.js
// Sliders Swiper du site (profils conseillers, enjeux des pages villes, cartes
// de l'accueil en tablette/mobile...) : le geste horizontal à deux doigts sur
// le trackpad fait glisser le slider comme un drag. Les cartes suivent le
// doigt en continu (avec l'élan du trackpad), puis se calent sur la carte la
// plus proche quand le geste s'arrête.
//
// Swiper est initialisé dans des embeds Webflow. On ajoute ce comportement sur
// les instances existantes, et on revérifie au redimensionnement : certains
// sliders ne sont créés qu'en dessous d'une largeur (ex. accueil < 992 px).
//
// Les gestes verticaux ne sont pas interceptés : la page défile normalement.

const SNAP_DELAY = 140; // ms sans mouvement avant de se caler sur une carte
const SNAP_SPEED = 500; // durée de l'animation de calage (ms)
const EDGE_RESISTANCE = 3; // au-delà des bords, le slider résiste
const EDGE_MAX = 80; // dépassement maximum aux bords (px)

const done = new WeakSet();

function attach(swiper) {
  const el = swiper.el;
  let timer;
  let active = false;

  el.addEventListener(
    "wheel",
    (e) => {
      if (swiper.destroyed || !swiper.enabled) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); // évite aussi le « retour arrière » du navigateur (Mac)

      const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
      if (!active) {
        active = true;
        swiper.setTransition(0);
      }

      const start = swiper.minTranslate(); // 0
      const end = swiper.maxTranslate(); // négatif
      let t = swiper.getTranslate() - dx;
      if (t > start) t = Math.min(start + EDGE_MAX, start + (t - start) / EDGE_RESISTANCE);
      if (t < end) t = Math.max(end - EDGE_MAX, end + (t - end) / EDGE_RESISTANCE);

      swiper.setTranslate(t);
      swiper.updateProgress(t);
      swiper.updateActiveIndex();
      swiper.updateSlidesClasses();

      clearTimeout(timer);
      timer = setTimeout(() => {
        active = false;
        if (!swiper.destroyed) swiper.slideToClosest(SNAP_SPEED);
      }, SNAP_DELAY);
    },
    { passive: false },
  );
}

function enable(el) {
  const swiper = el.swiper;
  if (!swiper || swiper.destroyed) return;
  if (done.has(swiper)) return;
  done.add(swiper);
  attach(swiper);
}

function scan() {
  document.querySelectorAll(".swiper").forEach(enable);
}

export function initSwiperTrackpad() {
  if (!document.querySelector(".swiper")) return;

  // Les embeds créent Swiper au DOMContentLoaded : quelques passages au début.
  let tries = 0;
  const early = () => {
    scan();
    if (++tries < 12) setTimeout(early, 250);
  };
  early();

  // Sliders créés / recréés selon la largeur de fenêtre
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(scan, 300);
  });
}
