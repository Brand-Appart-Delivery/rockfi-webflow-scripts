// src/steps-timeline.js
// Timeline verticale (composant Webflow "Steps Section").
// Le trait [data-steps-progress] descend avec le scroll et chaque étape
// (.steps_item) passe en .is-active quand le trait atteint sa pastille.
//
// Structure : [data-steps] > [data-steps-progress] + .steps_item (xN) > .steps_dot
// Sans JS (ou dans le Designer), toutes les étapes restent affichées "actives".

const ANCHOR = 0.6; // ligne de lecture : 60 % de la hauteur de l'écran

function setupList(list) {
  const progress = list.querySelector("[data-steps-progress]");
  const items = Array.from(list.querySelectorAll(".steps_item"));
  if (!progress || !items.length) return;

  list.classList.add("is-ready");

  let ticking = false;

  function update() {
    ticking = false;
    const rect = list.getBoundingClientRect();
    const lastDot = items[items.length - 1].querySelector(".steps_dot");
    const max = lastDot ? lastDot.offsetTop + items[items.length - 1].offsetTop + lastDot.offsetHeight / 2 : rect.height;
    const reached = Math.min(Math.max(window.innerHeight * ANCHOR - rect.top, 0), max);

    progress.style.height = `${reached}px`;
    items.forEach((item) => {
      const dot = item.querySelector(".steps_dot");
      const dotCenter = item.offsetTop + (dot ? dot.offsetTop + dot.offsetHeight / 2 : 0);
      item.classList.toggle("is-active", reached >= dotCenter);
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

export function initStepsTimeline(root = document) {
  root.querySelectorAll("[data-steps]").forEach(setupList);
}
