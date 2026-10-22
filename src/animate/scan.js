import { PRESETS } from "./presets.js";

function readOpts(el) {
  return {
    delay: el.dataset.animDelay ? parseFloat(el.dataset.animDelay) : undefined,
    duration: el.dataset.animDuration ? parseFloat(el.dataset.animDuration) : undefined,
    stagger: el.dataset.animStagger ? parseFloat(el.dataset.animStagger) : undefined,
    distance: el.dataset.animDistance ? parseFloat(el.dataset.animDistance) : undefined,
    scale: el.dataset.animScale ? parseFloat(el.dataset.animScale) : undefined,
    overlayStart: el.dataset.animOverlayStart ? parseFloat(el.dataset.animOverlayStart) : undefined,
    overlayColor: el.dataset.animOverlayColor || undefined,
  };
}

function siblingIndex(el) {
  const presetName = el.dataset.inview;
  let ancestor = el.parentElement;

  while (ancestor) {
    const matches = Array.from(ancestor.querySelectorAll(`[data-inview="${presetName}"]`));
    if (matches.length > 1) return matches.indexOf(el);
    ancestor = ancestor.parentElement;
  }

  return 0;
}

function attachTrigger(el, animation) {
  const start = el.dataset.animStart || "top 85%";
  const repeat = el.dataset.animRepeat === "true";

  animation.pause();

  window.ScrollTrigger.create({
    trigger: el,
    start,
    fastScrollEnd: true,
    onEnter: (self) => {
      el.classList.add("--visible");
      if (self.progress === 1 || el.getBoundingClientRect().bottom < 0) {
        animation.progress(1);
      } else {
        animation.play();
      }
    },
    onEnterBack: () => {
      if (repeat) {
        el.classList.add("--visible");
        animation.play();
      }
    },
    onLeaveBack: () => {
      if (repeat) {
        el.classList.remove("--visible");
        animation.pause(0);
      }
    },
  });

  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    el.classList.add("--visible");
    animation.play();
  } else if (rect.bottom <= 0 && window.scrollY > 200) {
    el.classList.add("--visible");
    animation.progress(1);
  }
}

// ---------------------------------------------------------------------------
// Grilles (data-grid-reveal="preset") : listes CMS, filtrées / paginées par
// Finsweet. Seule la PREMIÈRE RANGÉE s'anime, quand elle arrive à l'écran
// (montée + rideau, items enchaînés avec data-anim-stagger, 0.08 s par
// défaut) ; les autres rangées sont affichées directement.
//   - data-anim-curtain="false" : montée seule, sans rideau.
//   - Masqués dès le premier affichage par le CSS (animate.scss) : pas de flash.
//   - Items ajoutés ou réaffichés plus tard par Finsweet (filtre, « afficher
//     plus ») : affichés directement, sans animation.
//   - data-anim-target (facultatif, dans un item) : élément animé à la place
//     de l'item entier.
// ---------------------------------------------------------------------------
function getGridItems(grid) {
  let items = Array.from(grid.querySelectorAll(":scope > .w-dyn-item, :scope > [data-anim-item]"));
  if (!items.length) items = Array.from(grid.children);
  return items;
}

const toTarget = (item) => item.querySelector("[data-anim-target]") || item;

// "top 95%" (data-anim-start) → marge basse de l'IntersectionObserver
function gridRootMargin(start) {
  const match = /top\s+(\d+(?:\.\d+)?)%/.exec(start || "");
  const percent = match ? parseFloat(match[1]) : 95;
  return `0px 0px -${Math.max(0, 100 - percent)}% 0px`;
}

function showGridItem(item) {
  item._gridBound = true;
  item.classList.add("--visible");
  toTarget(item).classList.add("--visible");
}

// Items affichés dont le haut est aligné sur celui du premier (± 25 px)
function getFirstRow(items) {
  const shown = items.filter((item) => item.offsetParent !== null);
  if (!shown.length) return [];
  const firstTop = shown[0].getBoundingClientRect().top;
  return shown.filter((item) => Math.abs(item.getBoundingClientRect().top - firstTop) <= 25);
}

function setupGridReveal(grid) {
  const preset = PRESETS[grid.dataset.gridReveal || "image-reveal"];
  if (!preset) return;

  // Rideau par défaut sur la 1re rangée (data-anim-curtain="false" pour l'enlever)
  const opts = { ...readOpts(grid), curtain: grid.dataset.animCurtain !== "false" };
  const stagger = opts.stagger ?? 0.08;
  const items = getGridItems(grid);
  const firstRow = getFirstRow(items);

  // Rangées suivantes : visibles tout de suite
  items.filter((item) => !firstRow.includes(item)).forEach(showGridItem);

  // Première rangée : animée à son arrivée à l'écran. IntersectionObserver
  // (position réelle à chaque instant) plutôt que ScrollTrigger, dont les
  // positions, calculées avant le chargement des images, étaient fausses.
  const observer = new IntersectionObserver(
    (entries) => {
      let index = 0;
      entries.forEach((entry) => {
        const item = entry.target;
        const passed = entry.boundingClientRect.bottom < 0 && entry.boundingClientRect.height > 0;
        if (!entry.isIntersecting && !passed) return;

        observer.unobserve(item);
        showGridItem(item);
        // Déjà au-dessus de l'écran (scroll restauré, retour arrière) : état final
        if (passed) item._gridAnim.progress(1);
        else window.gsap.delayedCall(index++ * stagger, () => item._gridAnim.play());
      });
    },
    { rootMargin: gridRootMargin(grid.dataset.animStart), threshold: 0 },
  );

  firstRow.forEach((item) => {
    item._gridBound = true;
    item._gridAnim = preset(toTarget(item), { ...opts, delay: 0 });
    item._gridAnim.pause();
    observer.observe(item);
  });

  // Finsweet ajoute / réaffiche des items (filtre, « afficher plus ») :
  // affichés directement, sans rejouer d'animation.
  new MutationObserver(() => {
    getGridItems(grid).forEach((item) => {
      if (!item._gridBound) showGridItem(item);
    });
  }).observe(grid, { childList: true });
}

export function scanAnimations(root = document) {
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

  const claim = (el) => {
    if (el.dataset.animBound === "true") return false;
    el.dataset.animBound = "true";
    return true;
  };

  root.querySelectorAll("[data-grid-reveal]").forEach((grid) => {
    if (claim(grid)) setupGridReveal(grid);
  });

  root.querySelectorAll("[data-inview]").forEach((el) => {
    const presetName = el.dataset.inview;
    const preset = PRESETS[presetName];
    if (!preset) return;
    if (!claim(el)) return;

    const opts = readOpts(el);

    const STAGGER_BY_PRESET = {
      "count-up": { step: 0.25, max: 1 },
    };
    const cfg = STAGGER_BY_PRESET[presetName] || { step: 0.08, max: 0.3 };

    const staggerStep = opts.stagger ?? cfg.step;
    const extraDelay = Math.min(siblingIndex(el) * staggerStep, cfg.max);
    opts.delay = (opts.delay ?? 0) + extraDelay;

    const animation = preset(el, opts);
    attachTrigger(el, animation);
  });

  root.querySelectorAll("[data-text-reveal]").forEach((el) => {
    if (!claim(el)) return;
    const opts = readOpts(el);
    const animation = PRESETS.heading(el, opts);
    attachTrigger(el, animation);
  });

  root.querySelectorAll("[data-grid-enter]").forEach((group) => {
    const items = Array.from(group.querySelectorAll(":scope > [data-anim-item]"));
    if (!items.length) return;

    const presetName = items[0].dataset.animItem;
    const preset = PRESETS[presetName];
    if (!preset) return;
    if (!claim(group)) return;

    const opts = readOpts(group);
    const animations = items.map((item) => preset(item, readOpts(item)));
    animations.forEach((a) => a.pause());

    const tl = window.gsap.timeline({ paused: true });
    animations.forEach((a, i) => {
      tl.add(a.play(), i * (opts.stagger ?? 0.1));
    });

    attachTrigger(group, tl);
  });
}