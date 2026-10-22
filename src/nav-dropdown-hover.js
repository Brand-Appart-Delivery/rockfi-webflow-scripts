// src/nav-dropdown-hover.js

import { getLenis } from "./core.js";

export function initNavDropdownHover() {
  const CLOSE_DELAY = 200;
  const mq = window.matchMedia("(hover: hover) and (min-width: 992px)");

  const nav = document.querySelector(".nav_fixed");
  const dropdowns = document.querySelectorAll(".nav_fixed .w-dropdown");

  if (!nav || !dropdowns.length) return;

  setupDesktopMenuReset(nav);
  setupMobileMenuScroll(nav);
  setupScrollLock(nav);
  setupFirstLinkAlignment(nav, dropdowns);

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(".w-dropdown-toggle");
    const list = dropdown.querySelector(".w-dropdown-list");
    if (!toggle || !list) return;

    let closeTimer = null;
    const isOpen = () => toggle.classList.contains("w--open");

    function setOpen(open) {
      toggle.classList.toggle("w--open", open);
      list.classList.toggle("w--open", open);
      toggle.setAttribute("aria-expanded", String(open));
      dropdown.style.zIndex = open ? "901" : "";
    }

    dropdown.addEventListener("mouseenter", () => {
      if (!mq.matches) return;
      clearTimeout(closeTimer);
      if (!isOpen()) setOpen(true);
    });

    dropdown.addEventListener("mouseleave", () => {
      if (!mq.matches) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (isOpen()) setOpen(false);
      }, CLOSE_DELAY);
    });

    toggle.addEventListener(
      "click",
      (e) => {
        if (mq.matches && e.isTrusted) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      },
      true,
    );

    // Passage desktop ↔ mobile : on referme ce qui était ouvert au survol,
    // sinon la classe .w--open resterait coincée (le mouseleave est ignoré
    // hors desktop).
    mq.addEventListener("change", () => {
      clearTimeout(closeTimer);
      if (isOpen()) setOpen(false);
    });
  });
}

// Après un passage par le mobile, Webflow laisse sur .navbar_menu le style
// inline de son animation ("transition: all; transform: translate(0, 0)").
// En desktop, ce transform fait de .navbar_menu le bloc de référence des
// éléments en position fixed (panneaux de dropdown) : on le retire dès que
// la fenêtre est en desktop, et à chaque fois que Webflow le réécrit.
function setupDesktopMenuReset(nav) {
  const desktop = window.matchMedia("(min-width: 992px)");
  const menu = nav.querySelector(".navbar_menu");
  if (!menu) return;

  function reset() {
    if (!desktop.matches) return;
    if (menu.style.transform) menu.style.removeProperty("transform");
    if (menu.style.transition) menu.style.removeProperty("transition");
  }

  new MutationObserver(reset).observe(menu, {
    attributes: true,
    attributeFilter: ["style"],
  });

  desktop.addEventListener("change", reset);

  reset();
}

// Menu mobile scrollable pendant que la page est bloquée :
// - pose --nav-menu-top (bas de la barre, bannière comprise) pour le max-height
//   du menu (cf. nav.scss), recalculée au resize et quand la nav change de
//   hauteur (fermeture de la bannière) ;
// - marque le menu et l'overlay Webflow en data-lenis-prevent : Lenis arrêté
//   bloquerait sinon la molette à l'intérieur du menu.
function setupMobileMenuScroll(nav) {
  const bar = nav.querySelector(".navbar_component");
  if (!bar) return;

  nav
    .querySelectorAll(".navbar_menu, .w-nav-overlay")
    .forEach((el) => el.setAttribute("data-lenis-prevent", ""));

  function update() {
    nav.style.setProperty(
      "--nav-menu-top",
      `${Math.round(bar.getBoundingClientRect().bottom)}px`,
    );
  }

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    observer.observe(bar);
  }

  window.addEventListener("resize", update, { passive: true });

  update();
}

function setupScrollLock(nav) {
  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 991px)");
  let locked = false;

  function lock() {
    if (locked) return;
    locked = true;
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    getLenis()?.stop();
  }

  function unlock() {
    if (!locked) return;
    locked = false;
    root.style.overflow = "";
    root.style.scrollbarGutter = "";
    getLenis()?.start();
  }

  // Le bouton burger n'existe que sous 992px : en desktop, sa classe .w--open
  // peut rester coincée après un resize et ne doit pas bloquer le scroll.
  function sync() {
    const selector = mobile.matches
      ? ".navbar_menu-button.w--open, .w-dropdown-toggle.w--open"
      : ".w-dropdown-toggle.w--open";

    if (nav.querySelector(selector)) lock();
    else unlock();
  }

  new MutationObserver(sync).observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  mobile.addEventListener("change", sync);

  sync();
}

// Aligne la 1re colonne des dropdowns sur le texte de "Nos conseillers" en
// posant le padding-left de .dropdown-container (inline + !important, donc
// prioritaire sur le Designer). Mesuré à chaque ouverture, desktop ≥ 992px ;
// en dessous, le style inline est retiré.
function setupFirstLinkAlignment(nav, dropdowns) {
  const desktop = window.matchMedia("(min-width: 992px)");
  const firstLink = nav.querySelector(".navbar_menu .navbar_link");
  if (!firstLink) return;

  // Bord gauche du contenu réel d'un élément (bord + bordure + padding)
  const contentLeft = (el) => {
    const cs = getComputedStyle(el);
    return (
      el.getBoundingClientRect().left +
      (parseFloat(cs.borderLeftWidth) || 0) +
      (parseFloat(cs.paddingLeft) || 0)
    );
  };

  function align(dropdown) {
    const toggle = dropdown.querySelector(".w-dropdown-toggle");
    const list = dropdown.querySelector(".w-dropdown-list");
    const container = list?.querySelector(".dropdown-container");
    if (!toggle || !container) return;

    if (!desktop.matches) {
      container.style.removeProperty("padding-left");
      return;
    }

    // Liste fermée (display:none) : rien à mesurer, ce sera fait à l'ouverture
    if (!toggle.classList.contains("w--open")) return;

    const column = container.querySelector(".dropdown-list-wrapper");
    if (!column) return;

    const setPadding = (px) =>
      container.style.setProperty("padding-left", `${px}px`, "important");

    // Mesure de la pente (0px puis 100px) : exact même si le conteneur est
    // centré ou réparti. Toutes les écritures ont lieu dans la même frame.
    const target = contentLeft(firstLink);

    setPadding(0);
    const at0 = contentLeft(column);
    setPadding(100);
    const at100 = contentLeft(column);
    const slope = (at100 - at0) / 100;

    if (Math.abs(slope) < 0.05) {
      container.style.removeProperty("padding-left");
      return;
    }

    let value = Math.max(0, (target - at0) / slope);
    setPadding(value);

    // Affinage : un second passage corrige l'éventuel résidu
    const error = target - contentLeft(column);
    if (Math.abs(error) > 0.5) value = Math.max(0, value + error / slope);

    setPadding(Math.round(value * 100) / 100);
  }

  // Webflow change plusieurs classes d'affilée à l'ouverture/fermeture :
  // un seul calcul par frame. Le rAF passe avant le rendu, donc le menu
  // s'affiche déjà aligné.
  let alignFrame = null;
  function alignAll() {
    if (alignFrame) return;
    alignFrame = requestAnimationFrame(() => {
      alignFrame = null;
      dropdowns.forEach(align);
    });
  }

  new MutationObserver(alignAll).observe(nav, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener("resize", alignAll, { passive: true });
  desktop.addEventListener("change", alignAll);

  alignAll();
}