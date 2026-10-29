// src/animate/hero-bg-parallax.js
// Apparition (scale + opacité, un par un) + parallax au scroll + suivi souris
// + parallax interne sur chaque .hero-bg_image.
//
// Structure créée par le script :
//   .hero-bg_image          positionnement (translate / --x / --y), jamais animé
//     .hero-bg_intro        apparition (scale + opacité)
//       .hero-bg_frame      déplacement scroll + souris, et cadre qui rogne
//         img               parallax interne léger (agrandi, glisse dans le cadre)
//
// Anti-flash : le CSS du <head> cache .hero-bg_image (opacity: 0).
// Le script pose la classe .is-ready une fois l'état de départ appliqué
// sur .hero-bg_intro (ou immédiatement si l'animation ne peut pas tourner).
//
// Attributs d'apparition (facultatifs) :
//   data-hero-bg-intro-start="0.5"      délai global avant le lancement de la séquence (s)
//                                       (sur .section_main_hero, sinon sur la première image)
//   data-hero-bg-order="1"              rang d'apparition (1 = premier, 2 = deuxième...)
//                                       Deux images avec le même rang apparaissent ensemble.
//                                       Sans attribut : après toutes les images ordonnées
//                                       (dans l'ordre du DOM).
//   data-hero-bg-intro-delay="0.3"      délai propre à l'image (s), s'ajoute au délai global
//                                       et remplace le délai calculé par l'ordre
//   data-hero-bg-intro-scale="0.8"      scale de départ
//   data-hero-bg-intro-opacity="0"      opacité de départ (1 = pas de fondu)
//   data-hero-bg-intro-duration="1.2"   durée (s)
//   data-hero-bg-intro-ease="power2.out"
//
// Attributs scroll / souris :
//   data-hero-bg-y="-120"       déplacement vertical au scroll en px (négatif = monte)
//   data-hero-bg-x="40"         déplacement horizontal au scroll en px
//   data-hero-bg-scale="1.08"   zoom final au scroll
//   data-hero-bg-rotate="6"     rotation finale au scroll
//   data-hero-bg-delay="0.2"    départ décalé du scroll, de 0 à 0.95
//   data-hero-bg-ease="power2.out"  courbe du scroll (défaut : none)
//   data-hero-bg-scrub="1"      lissage global (défaut 1)
//   data-hero-bg-start / data-hero-bg-end : bornes du trigger (sur le premier élément)
//   data-hero-bg-mouse="3"      suivi souris, amplitude max en % de la taille du cadre
//                               (uniquement quand la souris est dans le hero,
//                               et gelé tant qu'un dropdown / le menu mobile est ouvert)
//
// Attribut parallax interne :
//   data-hero-bg-inner="8"      amplitude en % (négatif = sens inverse, 0 ou absent = désactivé)

import { requestScrollRefresh } from "../utils/scroll-refresh.js";

const SCROLL_ATTRS =["heroBgY", "heroBgX", "heroBgScale", "heroBgRotate"];
const MOUSE_SMOOTH = 0.9;

// Images coupées par le bas du hero : même parallax que les autres (même
// trigger, même scrub, mouvement linéaire), mais avec une amplitude agrandie
// juste assez pour qu'elles soient entières à REVEAL_AT du scroll du hero.
// Détection automatique, recalculée au resize. false = comportement d'origine.
const REVEAL_ENABLED = false;
const REVEAL_AT = 0.5;    // fraction du scroll du hero (0.5 = à mi-parcours)
const REVEAL_MARGIN = 32; // espace (px) laissé sous l'image une fois entière

const INTRO_START_DELAY = 0.3; // délai avant le lancement de toute la séquence (s)
const INTRO_DEFAULT_SCALE = 0.8;
const INTRO_DEFAULT_OPACITY = 0;
const INTRO_DEFAULT_DURATION = 1.2;
const INTRO_DEFAULT_EASE = "power2.out";
const INTRO_STAGGER = 0.35;

// Dropdown ou menu mobile ouvert : le suivi souris est gelé
const NAV_OPEN_SELECTOR =
  ".nav_fixed .w-dropdown-toggle.w--open, .nav_fixed .w-nav-button.w--open";

function num(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

// Combien de px l'image dépasse sous le bas du hero (0 si elle ne dépasse pas).
// Mesuré sur .hero-bg_image, que GSAP n'anime jamais : les transforms des
// couches internes ne faussent pas la mesure.
function getOverflow(el, hero) {
  const box = el.getBoundingClientRect();
  if (!box.height) return 0; // image masquée ou pas encore chargée
  const overflow = box.bottom - hero.getBoundingClientRect().bottom;
  return overflow > 0 ? overflow + REVEAL_MARGIN : 0;
}

// Déplacement vertical final : celui de data-hero-bg-y, agrandi si besoin
// pour que l'image coupée soit entière à REVEAL_AT (en tenant compte du délai).
function getScrollY(el, hero, delay) {
  const y = num(el.dataset.heroBgY, 0);
  if (!REVEAL_ENABLED) return y;
  const overflow = getOverflow(el, hero);
  if (!overflow) return y;
  const share = Math.max(0.05, (REVEAL_AT - delay) / (1 - delay));
  return Math.min(y, -overflow / share);
}

// img -> .hero-bg_intro > .hero-bg_frame > img
function buildLayers(img) {
  if (img.parentNode.classList.contains("hero-bg_frame")) {
    const frame = img.parentNode;
    return { intro: frame.parentNode, frame };
  }

  const intro = document.createElement("div");
  intro.className = "hero-bg_intro";
  intro.style.display = "block";
  intro.style.width = "100%";
  intro.style.willChange = "transform, opacity";

  const frame = document.createElement("div");
  frame.className = "hero-bg_frame";

  img.parentNode.insertBefore(intro, img);
  intro.appendChild(frame);
  frame.appendChild(img);
  return { intro, frame };
}

// Rang d'apparition : data-hero-bg-order, sinon après toutes les images ordonnées
function getOrder(el, index) {
  const custom = parseFloat(el.dataset.heroBgOrder);
  if (Number.isFinite(custom)) return custom;
  return 1000 + index;
}

export function initHeroBgParallax(root = document) {
  // Révèle toutes les images (cas où l'animation ne peut pas tourner)
  const showAll = () =>
    root.querySelectorAll(".hero-bg_image").forEach((el) => el.classList.add("is-ready"));

  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return showAll();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return showAll();

  const hero = root.querySelector(".section_main_hero");
  if (!hero) return showAll();

  const all = Array.from(hero.querySelectorAll(".hero-bg_image")).filter((el) => el.querySelector("img"));
  if (!all.length) return showAll();

  // Construit les couches et mémorise les éléments de chaque image
  const layers = new Map();
  all.forEach((el) => {
    const img = el.querySelector("img");
    layers.set(el, { img, ...buildLayers(img) });
  });

  // ---------------------------------------------------------- apparition (ordre choisi)
  // Le rang le plus bas sert de point de départ : il démarre après le délai global.
  const orders = all.map((el, i) => getOrder(el, i));
  const minOrder = Math.min(...orders);

  // Délai global : data-hero-bg-intro-start sur le hero, sinon sur la première image, sinon la constante
  const startDelay = num(
    hero.dataset.heroBgIntroStart ?? all[0].dataset.heroBgIntroStart,
    INTRO_START_DELAY
  );

  all.forEach((el, i) => {
    const d = el.dataset;
    const { intro } = layers.get(el);
    const delay = startDelay + num(d.heroBgIntroDelay, (orders[i] - minOrder) * INTRO_STAGGER);

    window.gsap.fromTo(
      intro,
      {
        scale: num(d.heroBgIntroScale, INTRO_DEFAULT_SCALE),
        opacity: num(d.heroBgIntroOpacity, INTRO_DEFAULT_OPACITY),
        force3D: true,
        immediateRender: true, // état de départ appliqué tout de suite (pas de flash pendant le délai)
      },
      {
        scale: 1,
        opacity: 1,
        duration: num(d.heroBgIntroDuration, INTRO_DEFAULT_DURATION),
        ease: d.heroBgIntroEase || INTRO_DEFAULT_EASE,
        delay,
        force3D: true,
        clearProps: "transform,opacity",
      }
    );

    // L'état de départ (opacité 0) est appliqué sur .hero-bg_intro : on peut
    // lever le masque CSS posé sur .hero-bg_image sans flash.
    el.classList.add("is-ready");
  });

  // ---------------------------------------------------------- scroll + souris + interne
  // Avec la révélation, toutes les images passent par le scroll (une image
  // sans attribut mais coupée doit quand même remonter ; sinon y reste à 0).
  const scrollItems = REVEAL_ENABLED
    ? all
    : all.filter((el) => SCROLL_ATTRS.some((a) => el.dataset[a] !== undefined));

  // Hauteur réelle connue seulement une fois l'image chargée
  if (REVEAL_ENABLED) {
    all.forEach((el) => {
      const { img } = layers.get(el);
      if (!img.complete) img.addEventListener("load", () => requestScrollRefresh(), { once: true });
    });
  }
  const mouseItems = all.filter((el) => el.dataset.heroBgMouse !== undefined);
  const innerItems = all.filter((el) => num(el.dataset.heroBgInner, 0) !== 0);
  if (!scrollItems.length && !mouseItems.length && !innerItems.length) return;

  const first = (scrollItems[0] || mouseItems[0] || innerItems[0]).dataset;
  const mm = window.gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    const tl = window.gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: first.heroBgStart || "top top",
        end: first.heroBgEnd || "bottom top",
        scrub: num(first.heroBgScrub, 1),
        invalidateOnRefresh: true,
      },
    });

    // Déplacement scroll : sur le cadre
    scrollItems.forEach((el) => {
      const d = el.dataset;
      const { frame } = layers.get(el);
      const delay = Math.min(0.95, Math.max(0, num(d.heroBgDelay, 0)));

      tl.fromTo(
        frame,
        { x: 0, y: 0, scale: 1, rotation: 0, force3D: true },
        {
          x: num(d.heroBgX, 0),
          y: () => getScrollY(el, hero, delay),
          scale: num(d.heroBgScale, 1),
          rotation: num(d.heroBgRotate, 0),
          ease: d.heroBgEase || "none",
          force3D: true,
          duration: 1 - delay,
        },
        delay
      );
    });

    // Parallax interne : l'image glisse dans son cadre
    innerItems.forEach((el) => {
      const amp = num(el.dataset.heroBgInner, 0);
      const { img } = layers.get(el);
      const zoom = 1 + (Math.abs(amp) / 100) * 2;

      window.gsap.set(img, { scale: zoom, transformOrigin: "50% 50%" });
      tl.fromTo(
        img,
        { yPercent: -amp, force3D: true },
        { yPercent: amp, ease: "none", force3D: true, duration: 1 },
        0
      );
    });

    // Souris : sur le cadre (xPercent / yPercent)
    if (mouseItems.length && window.matchMedia("(hover: hover)").matches) {
      const movers = mouseItems.map((el) => {
        const { frame } = layers.get(el);
        return {
          strength: num(el.dataset.heroBgMouse, 0),
          qx: window.gsap.quickTo(frame, "xPercent", { duration: MOUSE_SMOOTH, ease: "power3.out" }),
          qy: window.gsap.quickTo(frame, "yPercent", { duration: MOUSE_SMOOTH, ease: "power3.out" }),
        };
      });

      let outside = false;

      const resetMovers = () => {
        movers.forEach((m) => {
          m.qx(0);
          m.qy(0);
        });
      };

      const navOpen = () => !!document.querySelector(NAV_OPEN_SELECTOR);

      // Écoute sur window : le suivi continue au-dessus de la nav,
      // mais s'arrête dès que la souris sort de la zone du hero
      // ou qu'un dropdown / le menu mobile est ouvert.
      const onMove = (e) => {
        if (navOpen()) {
          if (!outside) {
            outside = true;
            resetMovers();
          }
          return;
        }

        const r = hero.getBoundingClientRect();

        const inside =
          e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right;

        if (!inside) {
          if (!outside) {
            outside = true;
            resetMovers();
          }
          return;
        }
        outside = false;

        const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;

        movers.forEach((m) => {
          m.qx(nx * m.strength);
          m.qy(ny * m.strength);
        });
      };

      // Souris qui quitte la fenêtre : retour au centre
      const onLeave = (e) => {
        if (e.relatedTarget) return;
        outside = true;
        resetMovers();
      };

      // Retour au centre dès l'ouverture d'un dropdown, sans attendre un mouvement
      const nav = document.querySelector(".nav_fixed");
      let navObserver = null;
      if (nav && typeof MutationObserver !== "undefined") {
        navObserver = new MutationObserver(() => {
          if (navOpen() && !outside) {
            outside = true;
            resetMovers();
          }
        });
        navObserver.observe(nav, { attributes: true, attributeFilter: ["class"], subtree: true });
      }

      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("mouseout", onLeave);

      return () => {
        window.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseout", onLeave);
        if (navObserver) navObserver.disconnect();
        resetMovers();
      };
    }
  });
}