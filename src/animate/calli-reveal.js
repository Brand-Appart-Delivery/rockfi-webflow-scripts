// src/animate/calli-reveal.js
// Calligraphie (SVG) qui s'éclaire au scroll, de gauche à droite et ligne par
// ligne, comme le texte [data-text-progress] de la home.
//
// Usage Webflow : une <img data-calli-reveal> qui pointe vers un SVG préparé :
//   - une paire de <path> par ligne : .calli-dim (couleur atténuée) puis
//     .calli-lit (couleur claire) masqué par mask="url(#calli-mN)"
//   - un <linearGradient id="calli-gN" data-x0="…" data-x1="…"> par ligne,
//     data-x0 / data-x1 = début et fin horizontale de la ligne (unités SVG)
// Le script remplace l'image par le SVG en ligne, puis fait avancer le bord
// adouci du masque de chaque ligne, l'une après l'autre.
//
// Options (sur l'<img>) :
//   data-calli-start="top 80%"   début du trigger
//   data-calli-end="bottom 35%"  fin du trigger
//   data-calli-scrub="1"         lissage (true = collé au scroll)

const SOFT = 70; // largeur du bord adouci, en unités SVG
const DEFAULT_START = "top 80%";
const DEFAULT_END = "bottom 35%";

let uid = 0;

function num(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

async function inlineSvg(img) {
  const res = await fetch(img.currentSrc || img.src, { mode: "cors" });
  if (!res.ok) throw new Error(`calli-reveal: ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg") throw new Error("calli-reveal: SVG invalide");

  // Identifiants uniques (plusieurs calligraphies possibles sur la page)
  const suffix = `-${++uid}`;
  svg.querySelectorAll("[id]").forEach((el) => {
    const old = el.id;
    el.id = old + suffix;
    svg.querySelectorAll(`[mask="url(#${old})"], [fill="url(#${old})"]`).forEach((ref) => {
      ["mask", "fill"].forEach((attr) => {
        if (ref.getAttribute(attr) === `url(#${old})`) ref.setAttribute(attr, `url(#${el.id})`);
      });
    });
  });

  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("class", img.className);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", img.alt || svg.getAttribute("aria-label") || "");
  svg.style.display = "block";
  svg.style.width = "100%";
  svg.style.height = "auto";

  const node = document.importNode(svg, true);
  img.replaceWith(node);
  return node;
}

function setup(svg, img) {
  const lines = Array.from(svg.querySelectorAll("linearGradient[data-x0]")).map((g) => {
    const x0 = num(g.dataset.x0, 0);
    const x1 = num(g.dataset.x1, 0);
    return { g, x0, width: x1 - x0 + SOFT };
  });
  if (!lines.length) return;

  const total = lines.reduce((sum, l) => sum + l.width, 0);

  const render = (progress) => {
    let left = progress * total;
    lines.forEach((l) => {
      const local = Math.min(Math.max(left, 0), l.width);
      left -= l.width;
      const edge = l.x0 + local; // fin du bord adouci
      l.g.setAttribute("x1", (edge - SOFT).toFixed(1));
      l.g.setAttribute("x2", edge.toFixed(1));
    });
  };

  render(0);

  const d = img.dataset;
  const scrubAttr = d.calliScrub;
  const state = { p: 0 };

  window.gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => render(state.p),
    scrollTrigger: {
      trigger: svg,
      start: d.calliStart || DEFAULT_START,
      end: d.calliEnd || DEFAULT_END,
      scrub: scrubAttr === undefined ? 1 : num(scrubAttr, 1),
      invalidateOnRefresh: true,
    },
  });
}

export function initCalliReveal(root = document) {
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
  // Mouvement réduit : la calligraphie reste affichée en entier (état du SVG par défaut)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  root.querySelectorAll("img[data-calli-reveal]").forEach((img) => {
    const data = { ...img.dataset };
    inlineSvg(img)
      .then((svg) => {
        Object.assign(svg.dataset, data);
        setup(svg, svg);
        window.ScrollTrigger.refresh();
      })
      .catch((err) => console.warn(err));
  });
}
