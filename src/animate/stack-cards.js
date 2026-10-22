// src/animate/stack-cards.js
// Cards empilées (position: sticky en CSS) + effet de profondeur :
// chaque card couverte réduit son scale (donc sa largeur visible) selon le nombre
// de cards qui la recouvrent, comme le stacking cards de CodyHouse.
//
// Structure : .section_stack-list > .stack-item (xN)
//
// Attributs facultatifs (sur .section_stack-list) :
//   data-stack-step="0.05"        réduction de scale par card au-dessus (0.05 = 5 %)
//   data-stack-brightness="0.8"   luminosité retirée par card au-dessus (1 = aucune)
//   data-stack-start="top bottom" début (position de la card qui arrive)
//   data-stack-end="top 20%"      fin (par défaut : le top sticky réel de la card qui arrive)
//
// Désactivé sous 768px (cards non sticky en CSS).

import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const DEFAULT_STEP = 0.05;
const DEFAULT_BRIGHTNESS = 0.8;
const DEFAULT_START = "top bottom";

function num(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function initStackCards(root = document) {
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lists = root.querySelectorAll(".section_stack-list");
  if (!lists.length) return;

  const mm = window.gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    lists.forEach((list) => {
      const d = list.dataset;
      const step = num(d.stackStep, DEFAULT_STEP);
      const brightness = num(d.stackBrightness, DEFAULT_BRIGHTNESS);
      const items = Array.from(list.querySelectorAll(":scope > .stack-item"));

      // Origine en haut : le bord haut reste à son `top` sticky
      window.gsap.set(items, { transformOrigin: "50% 0", force3D: true });

      items.forEach((item, i) => {
        // Chaque card j (j > i) qui arrive ajoute une réduction à la card i.
        for (let j = i + 1; j < items.length; j++) {
          const depth = j - i;
          const fromScale = 1 - (depth - 1) * step;
          const toScale = 1 - depth * step;
          const fromB = 1 - (1 - brightness) * (depth - 1);
          const toB = 1 - (1 - brightness) * depth;

          window.gsap.fromTo(
            item,
            { scale: fromScale, filter: `brightness(${fromB})` },
            {
              scale: toScale,
              filter: `brightness(${toB})`,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: items[j],
                start: d.stackStart || DEFAULT_START,
                // fin = quand la card j atteint son propre top sticky
                end:
                  d.stackEnd ||
                  (() => {
                    const top = parseFloat(getComputedStyle(items[j]).top) || 0;
                    return `top ${top}px`;
                  }),
                scrub: true,
                invalidateOnRefresh: true,
              },
            }
          );
        }
      });
    });

    // Recalcule les paliers si la bannière s'ouvre/se ferme (classe sur body).
    // Le resize et le chargement sont déjà gérés par ScrollTrigger lui-même.
    const mo = new MutationObserver(() => requestScrollRefresh());
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => mo.disconnect();
  });
}