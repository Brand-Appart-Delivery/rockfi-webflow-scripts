// src/utils/scroll-refresh.js
// Point d'entrée unique pour recalculer ScrollTrigger.
// ScrollTrigger.refresh() recalcule TOUS les déclencheurs de la page : on
// regroupe les demandes (resize, contenu chargé, switch, bannière...) pour
// n'en lancer qu'un seul à la fois.
// ScrollTrigger gère déjà seul le resize de fenêtre et le chargement de page :
// inutile de l'appeler pour ça.

let timer = null;
let dueAt = 0;

export function requestScrollRefresh(delay = 150) {
  if (typeof window.ScrollTrigger === "undefined") return;

  // Une demande plus tardive repousse l'échéance, une plus proche ne
  // l'avance pas : le refresh part une fois tout stabilisé.
  const target = Date.now() + delay;
  if (timer && target <= dueAt) return;

  clearTimeout(timer);
  dueAt = target;
  timer = setTimeout(() => {
    timer = null;
    window.ScrollTrigger.refresh();
  }, delay);
}
