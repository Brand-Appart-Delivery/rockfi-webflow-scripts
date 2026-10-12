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

function getGridItems(grid) {
  let items = Array.from(grid.querySelectorAll(":scope > .w-dyn-item, :scope > [data-anim-item]"));
  if (!items.length) items = Array.from(grid.querySelectorAll(":scope > *"));
  return items;
}

function isShown(item) {
  const style = window.getComputedStyle(item);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    item.offsetHeight > 0
  );
}

function itemKey(item) {
  const link = item.querySelector("a[href]");
  return (link && link.getAttribute("href")) || (item.textContent || "").trim().slice(0, 40);
}

const toTarget = (item) => item.querySelector("[data-anim-target]") || item;

function showWithoutAnimation(items) {
  items.forEach((item) => {
    const target = toTarget(item);
    target.classList.add("--visible");
    window.gsap.killTweensOf(target);
    window.gsap.set(target, { clearProps: "all" });
  });
}

function runGridReveal(grid, isRefilter = false) {
  const presetName = grid.dataset.gridReveal || "image-reveal";
  const preset = PRESETS[presetName];
  if (!preset) return;

  const visibleItems = getGridItems(grid).filter(isShown);
  if (!visibleItems.length) return;

  if (isRefilter && grid._gridEntered) {
    showWithoutAnimation(visibleItems);
    return;
  }

  const opts = readOpts(grid);
  const staggerStep = opts.stagger ?? 0.08;

  const rowTop = (item) => item.getBoundingClientRect().top;
  const firstTop = rowTop(visibleItems[0]);
  const tolerance = 25;

  const firstRowItems = visibleItems.filter((item) => Math.abs(rowTop(item) - firstTop) <= tolerance);
  const otherItems = visibleItems.filter((item) => !firstRowItems.includes(item));

  const signature = firstRowItems.map(itemKey).join("|");
  if (isRefilter && grid._gridSig === signature) return;
  grid._gridSig = signature;

  const firstRowTargets = firstRowItems.map(toTarget);
  const otherTargets = otherItems.map(toTarget);

  if (grid._gridRevealTl) {
    grid._gridRevealTl.kill();
    grid._gridRevealTl = null;
  }

  otherTargets.forEach((target) => {
    target.classList.add("--visible");
    window.gsap.set(target, { opacity: 1, y: 0, scale: 1, clearProps: "all" });
  });

  const tl = window.gsap.timeline({ paused: true });
  grid._gridRevealTl = tl;
  grid._gridFirstRow = firstRowTargets;

  firstRowTargets.forEach((target, index) => {
    target.classList.remove("--visible");
    window.gsap.killTweensOf(target);

    const itemAnim = preset(target, { ...opts, delay: 0 });
    tl.add(itemAnim, index * staggerStep);
  });

  if (!grid._gridTrigger) {
    const start = grid.dataset.animStart || "top 95%";

    grid._gridTrigger = window.ScrollTrigger.create({
      trigger: grid,
      start,
      fastScrollEnd: true,
      once: true,
      onEnter: (self) => {
        grid._gridEntered = true;
        const current = grid._gridRevealTl;
        if (!current) return;
        (grid._gridFirstRow || []).forEach((t) => t.classList.add("--visible"));
        if (self.progress === 1 || grid.getBoundingClientRect().bottom < 0) {
          current.progress(1);
        } else {
          current.play();
        }
      },
    });
  }

  if (grid._gridEntered) return;

  const rect = grid.getBoundingClientRect();
  const hasAlreadyScrolledPast = window.scrollY > 200 && rect.bottom < 0;

  if (hasAlreadyScrolledPast) {
    grid._gridEntered = true;
    firstRowTargets.forEach((t) => t.classList.add("--visible"));
    tl.progress(1);
  } else if (rect.top < window.innerHeight) {
    grid._gridEntered = true;
    firstRowTargets.forEach((t) => t.classList.add("--visible"));
    tl.play();
  }
}

let refilterBound = false;
let refilterTimer = null;

function triggerRefilter() {
  clearTimeout(refilterTimer);
  refilterTimer = setTimeout(() => {
    document.querySelectorAll("[data-grid-reveal]").forEach((grid) => runGridReveal(grid, true));
  }, 120);
}

function bindRefilter(root) {
  if (refilterBound) return;
  refilterBound = true;

  root
    .querySelectorAll('[fs-list-element="filters"], form.blog-list_filter-form-flex')
    .forEach((form) => {
      form.addEventListener("change", triggerRefilter);
      form.addEventListener("input", triggerRefilter);
      form.addEventListener("reset", triggerRefilter);
    });

  root.querySelectorAll('[fs-list-element="clear"]').forEach((btn) => {
    btn.addEventListener("click", triggerRefilter);
  });

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push([
    "list",
    (listInstances) => {
      listInstances.forEach((listInstance) => {
        if (typeof listInstance.addHook === "function") {
          listInstance.addHook("afterRender", triggerRefilter);
        }
      });
    },
  ]);
}

export function scanAnimations(root = document) {
  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

  const claim = (el) => {
    if (el.dataset.animBound === "true") return false;
    el.dataset.animBound = "true";
    return true;
  };

  const grids = Array.from(root.querySelectorAll("[data-grid-reveal]"));
  grids.forEach((grid) => {
    if (claim(grid)) runGridReveal(grid, false);
  });
  if (grids.length) bindRefilter(root);

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