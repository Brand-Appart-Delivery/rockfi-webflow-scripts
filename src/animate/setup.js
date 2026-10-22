// src/animate/setup.js
// Enregistre ScrollTrigger. La synchro Lenis <-> ScrollTrigger (scroll +
// ticker) est faite une seule fois dans core.js : la refaire ici faisait
// avancer Lenis deux fois par frame.

let isSetup = false;

export function setupGsap() {
  if (isSetup) return;
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

  isSetup = true;
  window.gsap.registerPlugin(window.ScrollTrigger);
}
