// src/projects-carousel.js
// Carrousel des projets (composant Webflow "Projects Section").
// Une carte par projet, défilement automatique ; l'onglet actif affiche la
// progression du temps restant, un clic sur un onglet affiche son projet.
//
// Structure :
//   [data-projects] > .projects_track > .projects_card (xN)
//   ... > [data-project-tab] (xN) > .projects_bar > .projects_bar-fill
// Les onglets sont cherchés dans la même section que [data-projects].
//
// Options (sur [data-projects]) :
//   data-projects-delay="7000"   durée d'affichage d'un projet (ms)

import { enable as enableTrackpad } from "./swiper-trackpad.js";

const DEFAULT_DELAY = 7000;

function setup(el) {
  const section = el.closest("section") || el.parentElement;
  const tabs = Array.from(section.querySelectorAll("[data-project-tab]"));
  const fills = tabs.map((tab) => tab.querySelector(".projects_bar-fill"));
  const delay = parseInt(el.dataset.projectsDelay, 10) || DEFAULT_DELAY;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setFill = (i, ratio) => {
    if (fills[i]) fills[i].style.width = `${Math.round(ratio * 1000) / 10}%`;
  };

  const markActive = (active) => {
    tabs.forEach((tab, i) => {
      tab.classList.toggle("is-active", i === active);
      tab.setAttribute("aria-selected", String(i === active));
      // Onglets déjà vus : barre pleine ; à venir : vide
      if (i !== active) setFill(i, i < active ? 1 : 0);
    });
    if (reduced) setFill(active, 1);
  };

  const swiper = new window.Swiper(el, {
    wrapperClass: "projects_track",
    slideClass: "projects_card",
    slidesPerView: 1,
    spaceBetween: 24,
    speed: 900,
    rewind: true,
    grabCursor: true,
    autoplay: reduced
      ? false
      : { delay, disableOnInteraction: false, pauseOnMouseEnter: true },
    a11y: { enabled: true },
    on: {
      init(s) {
        markActive(s.activeIndex);
      },
      slideChange(s) {
        markActive(s.activeIndex);
      },
      autoplayTimeLeft(s, timeLeft, progress) {
        setFill(s.activeIndex, 1 - progress);
      },
    },
  });

  enableTrackpad(el);

  tabs.forEach((tab, i) => {
    tab.setAttribute("role", "tab");
    tab.setAttribute("tabindex", "0");
    const go = () => {
      swiper.slideTo(i);
      if (swiper.autoplay && swiper.autoplay.running) swiper.autoplay.start();
    };
    tab.addEventListener("click", go);
    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });

  // Pas d'avance automatique hors écran : reprend quand la section est visible
  if (swiper.autoplay && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) swiper.autoplay.resume();
      else swiper.autoplay.pause();
    }).observe(el);
  }
}

export function initProjectsCarousel(root = document) {
  if (typeof window.Swiper === "undefined") return;
  root.querySelectorAll("[data-projects]:not([data-projects-ready])").forEach((el) => {
    el.setAttribute("data-projects-ready", "");
    setup(el);
  });
}
