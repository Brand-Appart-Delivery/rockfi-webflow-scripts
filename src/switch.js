// src/switch.js
// Switch à deux (ou plus) états piloté par data-attributes, avec :
//  - un fond qui GLISSE derrière le bouton sélectionné ;
//  - une transition PAR CONTENU : fondu classique, glissement latéral (slide), push, ou aucune (none).
//
// STRUCTURE :
//   [data-switch-group="desk"]            conteneur commun (switch + contenus)
//     [data-switch-btn="advisor"]         bouton / lien du switch
//     [data-switch-btn="client"]
//     [data-switch-panel="advisor"]       contenu affiché pour "advisor" (plusieurs éléments possibles)
//     [data-switch-panel="client"]        contenu affiché pour "client"
//
// OPTIONS SUR LE [data-switch-group] :
//   data-switch-default="advisor"         état au chargement. Défaut : le bouton qui a la classe
//                                         "sélectionné" Webflow, sinon le premier.
//   data-switch-selected-class="..."      classe posée sur le bouton actif (mode simple : ajoutée /
//                                         retirée). Défaut : détection automatique des variantes
//                                         Webflow (light : base / is-selected, dark : dark /
//                                         dark-selected...) : le bouton qui devient actif ÉCHANGE
//                                         la classe "non sélectionné" contre la classe "sélectionné",
//                                         et inversement. Le fond qui glisse reprend la couleur du
//                                         bouton sélectionné, donc suit la variante (light, dark...).
//   data-switch-param="vue"               synchronise avec l'URL (?vue=client) : lien partageable.
//   data-switch-duration="0.45"           durée d'entrée des contenus (s). 0 = sans animation.
//   data-switch-indicator="false"         désactive le fond qui glisse (retour au changement binaire).
//   data-switch-anim="fade"               transition par défaut des contenus ("fade", "slide", "push"
//                                         ou "none" = aucun fondu ni mouvement).
//   data-switch-distance="10"             distance du slide, en % de la largeur du contenu. Défaut : 10.
//   data-switch-lock-height               la hauteur du groupe est figée sur celle de la 1re étape
//                                         (le 1er bouton) : elle ne change plus d'une étape à l'autre.
//                                         Valeur = clé d'une autre étape pour la prendre comme base,
//                                         "false" pour désactiver. Actif par défaut.
//   data-switch-hide-class="hide"         classe(s) utilitaires qui masquent les étapes inactives
//                                         (display: none). Retirées AVANT l'animation d'entrée, remises
//                                         à la sortie. Défaut : détectées sur les panneaux (hide,
//                                         hide-desktop...). "none" pour ne pas y toucher.
//
// OPTIONS SUR UN [data-switch-panel] (prioritaires sur celles du groupe) :
//   data-switch-anim="slide"              ce contenu glisse sur le côté au lieu de fondre.
//   data-switch-anim="none"               ce contenu s'affiche / se masque sans aucune animation.
//   data-switch-distance="15"             distance du slide pour ce contenu (% de sa largeur).
//
// SENS DU SLIDE : on va vers un bouton situé APRÈS l'actuel → l'ancien contenu sort vers la gauche,
// le nouveau arrive par la droite. Vers un bouton situé AVANT : l'inverse.
//
// "fade"  : fondu simple, sans translation.
// "slide" : l'ancien contenu sort PUIS le nouveau entre (petit décalage, distance 10 % par défaut).
// "push"  : croisement SIMULTANÉ : le nouveau contenu prend la place de l'ancien en venant de la
//           droite pendant que l'ancien part vers la gauche (distance 100 % par défaut). L'ancien
//           contenu sort du flux (position absolue) le temps de l'animation, au même endroit.
// "none"  : changement instantané de ce contenu (display seulement).
//
// Classes posées en plus : "is-active" + aria-selected sur le bouton actif.
// Les contenus inactifs reçoivent l'attribut [hidden] (voir switch.scss).

const DEFAULT_DURATION = 0.45;
const DEFAULT_DISTANCE = 10; // % de la largeur du contenu ("slide")
const DEFAULT_PUSH_DISTANCE = 100; // % de la largeur du contenu ("push")
const VARIANT_RE = /w-variant-[\w-]+/g;

function initGroup(group) {
  const buttons = Array.from(group.querySelectorAll("[data-switch-btn]"));
  const panels = Array.from(group.querySelectorAll("[data-switch-panel]"));
  if (buttons.length < 2 || !panels.length) return;

  const keys = buttons.map((b) => b.dataset.switchBtn);
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const durationAttr = parseFloat(group.dataset.switchDuration);
  const duration = isFinite(durationAttr) ? durationAttr : DEFAULT_DURATION;
  const outDuration = Math.min(0.3, duration * 0.65); // la sortie est plus rapide que l'entrée

  // Variantes Webflow des boutons. Le bouton sélectionné et les autres ne diffèrent pas toujours
  // par UNE classe en plus : en dark, "non sélectionné" = w-variant-A et "sélectionné" = w-variant-B
  // (B remplace A). Retirer B laisserait le bouton sans variante, donc en light.
  // On lit donc les deux jeux de classes au chargement (le bouton sélectionné est repéré par
  // data-wf--switch-item--variant, ex. "is-selected" ou "dark-selected") et on les échange.
  const variantsOf = (el) => el.className.match(VARIANT_RE) || [];

  const explicitClass = group.dataset.switchSelectedClass || "";
  let selSet = []; // classes du bouton sélectionné
  let unselSet = []; // classes d'un bouton non sélectionné
  let selBtn = null; // bouton sélectionné au chargement (sert aussi de référence de couleur)
  let initialKey = null;

  if (explicitClass) {
    selSet = [explicitClass];
  } else {
    selBtn =
      buttons.find((b) => /selected/i.test(b.getAttribute("data-wf--switch-item--variant") || "")) ||
      buttons.find((b) => variantsOf(b).length > 0) ||
      null;
    if (selBtn) {
      initialKey = selBtn.dataset.switchBtn;
      selSet = variantsOf(selBtn);
      const other = buttons.find((b) => b !== selBtn);
      unselSet = other ? variantsOf(other) : [];
    }
  }

  function applyVariant(btn, on) {
    const add = on ? selSet : unselSet;
    const remove = (on ? unselSet : selSet).filter((c) => add.indexOf(c) === -1);
    if (remove.length) btn.classList.remove(...remove);
    if (add.length) btn.classList.add(...add);
  }

  // Paramètre d'URL facultatif
  const param = group.dataset.switchParam || "";
  const fromUrl = param ? new URLSearchParams(window.location.search).get(param) : null;

  const startKey = [fromUrl, group.dataset.switchDefault, initialKey, keys[0]].find((k) => k && keys.indexOf(k) > -1);

  let currentKey = null;

  // ------------------------------------------------------------------ classes "hide" (display: none)
  // Les étapes inactives portent une classe utilitaire (ex. "hide") qui impose display: none.
  // On la retire avant d'afficher / animer un contenu, et on la remet quand il est masqué :
  // sinon l'animation joue sur un élément qui reste invisible.
  const hideAttr = (group.dataset.switchHideClass || "").trim();
  let hideClasses = [];
  if (hideAttr === "none") {
    hideClasses = [];
  } else if (hideAttr) {
    hideClasses = hideAttr.split(/\s+/).filter(Boolean);
  } else {
    panels.forEach((p) => {
      p.classList.forEach((c) => {
        if (/^hide(-[\w-]+)?$/.test(c) && hideClasses.indexOf(c) === -1) hideClasses.push(c);
      });
    });
  }

  function setVisible(panel, on) {
    if (on) {
      panel.hidden = false;
      if (hideClasses.length) panel.classList.remove(...hideClasses);
    } else {
      panel.hidden = true;
      if (hideClasses.length) panel.classList.add(...hideClasses);
    }
  }

  // ------------------------------------------------------------------ hauteur figée
  // Le groupe garde la hauteur qu'il a avec la 1re étape affichée (min-height en px).
  // Mesure synchrone : on affiche l'étape de base, on lit la hauteur, on restaure l'état
  // précédent dans la même passe (aucun rendu intermédiaire, donc aucun clignotement).
  const lockAttr = group.dataset.switchLockHeight;
  const lockKey = lockAttr === "false" ? null : keys.indexOf(lockAttr) > -1 ? lockAttr : keys[0];

  // Les images de l'étape de base doivent être chargées pour que la mesure soit juste
  if (lockKey) {
    panels
      .filter((p) => p.dataset.switchPanel === lockKey)
      .forEach((p) => p.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute("loading", "eager")));
  }

  function lockHeight() {
    if (!lockKey) return;

    const saved = panels.map((p) => !p.hidden);
    const prevMin = group.style.minHeight;

    group.style.minHeight = "";
    panels.forEach((p) => setVisible(p, p.dataset.switchPanel === lockKey));

    const cs = window.getComputedStyle(group);
    let h = group.getBoundingClientRect().height;
    if (cs.boxSizing === "content-box") {
      h -=
        (parseFloat(cs.paddingTop) || 0) +
        (parseFloat(cs.paddingBottom) || 0) +
        (parseFloat(cs.borderTopWidth) || 0) +
        (parseFloat(cs.borderBottomWidth) || 0);
    }

    panels.forEach((p, i) => setVisible(p, saved[i]));

    if (h > 0) {
      const px = `${Math.ceil(h)}px`;
      group.style.minHeight = px;
      if (prevMin && px !== prevMin && window.ScrollTrigger) window.ScrollTrigger.refresh();
    } else {
      group.style.minHeight = prevMin;
    }
  }

  // ------------------------------------------------------------------ fond qui glisse
  const list = buttons[0].parentElement;
  const useIndicator = group.dataset.switchIndicator !== "false" && !!list;
  let indicator = null;

  if (useIndicator) {
    indicator = document.createElement("span");
    indicator.className = "switch_indicator";
    indicator.setAttribute("aria-hidden", "true");

    // Le fond reprend l'apparence du bouton sélectionné (couleur, rayon, ombre) : il suit donc la
    // variante du switch (light, dark...). Lu AVANT d'ajouter "has-switch-indicator", classe qui
    // neutralise le fond propre des boutons (voir switch.scss).
    if (selBtn) {
      const cs = window.getComputedStyle(selBtn);
      const bg = cs.backgroundColor;
      if (bg && bg !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
        indicator.style.backgroundColor = bg;
      }
      if (cs.borderRadius) indicator.style.borderRadius = cs.borderRadius;
      if (cs.boxShadow && cs.boxShadow !== "none") indicator.style.boxShadow = cs.boxShadow;
    }

    list.classList.add("has-switch-indicator");
    list.insertBefore(indicator, list.firstChild);
  }

  // Place le fond sous le bouton. animate = false : placement instantané (init, resize)
  function placeIndicator(btn, animate) {
    if (!indicator || !btn) return;

    const instant = !animate || reduceMotion;
    if (instant) indicator.classList.remove("is-animated");

    indicator.style.setProperty("--sw-x", `${btn.offsetLeft}px`);
    indicator.style.setProperty("--sw-y", `${btn.offsetTop}px`);
    indicator.style.setProperty("--sw-w", `${btn.offsetWidth}px`);
    indicator.style.setProperty("--sw-h", `${btn.offsetHeight}px`);

    if (!indicator.classList.contains("is-visible")) {
      // Premier placement : on apparaît sans glisser depuis 0
      void indicator.offsetWidth;
      indicator.classList.add("is-visible");
    }

    if (instant) {
      // On réactive la transition après le placement instantané
      void indicator.offsetWidth;
      if (!reduceMotion) indicator.classList.add("is-animated");
    } else {
      indicator.classList.add("is-animated");
    }
  }

  function currentButton() {
    return buttons.find((b) => b.dataset.switchBtn === currentKey);
  }

  // ------------------------------------------------------------------ contenus
  function animType(panel) {
    return panel.dataset.switchAnim || group.dataset.switchAnim || "fade";
  }

  function distanceOf(panel, fallback = DEFAULT_DISTANCE) {
    const v = parseFloat(panel.dataset.switchDistance || group.dataset.switchDistance);
    return isFinite(v) ? v : fallback;
  }

  // "push" : sort le contenu qui part du flux (position absolue, même place, même largeur) pour que
  // le nouveau contenu occupe sa place immédiatement. Le parent devient relatif le temps de l'anim.
  function lift(panel) {
    const parent = panel.parentElement;
    if (!parent || panel._swLift) return;

    if (window.getComputedStyle(parent).position === "static") {
      if (!parent._swCount) parent._swPos = parent.style.position;
      parent.style.position = "relative";
    }
    parent._swCount = (parent._swCount || 0) + 1;

    const top = panel.offsetTop;
    const left = panel.offsetLeft;
    const width = panel.offsetWidth;

    panel._swLift = {
      position: panel.style.position,
      top: panel.style.top,
      left: panel.style.left,
      width: panel.style.width,
      margin: panel.style.margin,
      boxSizing: panel.style.boxSizing,
    };
    panel.style.position = "absolute";
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;
    panel.style.margin = "0";
    panel.style.boxSizing = "border-box";
  }

  function release(panel) {
    const saved = panel._swLift;
    if (!saved) return;
    panel._swLift = null;
    Object.keys(saved).forEach((k) => {
      panel.style[k] = saved[k];
    });

    const parent = panel.parentElement;
    if (parent && parent._swCount) {
      parent._swCount -= 1;
      if (parent._swCount <= 0) {
        parent._swCount = 0;
        parent.style.position = parent._swPos || "";
      }
    }
  }

  function clearAnimProps(panel) {
    if (window.gsap) window.gsap.set(panel, { clearProps: "opacity,transform" });
  }

  // dir : +1 = on va vers un bouton situé après l'actuel, -1 = avant
  function setPanels(key, animate, dir) {
    const canAnimate = animate && duration > 0 && !reduceMotion && !!window.gsap;
    const gsap = window.gsap;

    // Y a-t-il un contenu "slide" visible qui doit sortir ? Si oui, l'entrée des contenus "slide"
    // attend la fin de cette sortie (sinon les deux seraient visibles l'un sous l'autre).
    const exitingSlides = panels.filter(
      (p) => !p.hidden && p.dataset.switchPanel !== key && animType(p) === "slide",
    );
    const slideInDelay = canAnimate && exitingSlides.length ? outDuration : 0;

    // Les sorties d'abord : un contenu "push" sort du flux avant que le nouveau n'entre,
    // pour que les deux se croisent à la même place.
    const ordered = [
      ...panels.filter((p) => p.dataset.switchPanel !== key),
      ...panels.filter((p) => p.dataset.switchPanel === key),
    ];

    ordered.forEach((panel) => {
      const match = panel.dataset.switchPanel === key;
      const type = animType(panel);
      panel.setAttribute("role", "tabpanel");

      if (canAnimate) gsap.killTweensOf(panel);

      // ---------- contenu qui doit disparaître
      if (!match) {
        if (panel.hidden) return;

        if (type === "none") {
          // Aucune animation : masqué d'un coup
          release(panel);
          setVisible(panel, false);
          if (window.gsap) clearAnimProps(panel);
        } else if (canAnimate && type === "push") {
          const dist = distanceOf(panel, DEFAULT_PUSH_DISTANCE);
          lift(panel);
          gsap.to(panel, {
            xPercent: -dir * dist,
            opacity: 0,
            duration,
            ease: "power3.inOut",
            onComplete: () => {
              release(panel);
              setVisible(panel, false);
              clearAnimProps(panel);
            },
          });
        } else if (canAnimate && type === "slide") {
          const dist = distanceOf(panel);
          gsap.to(panel, {
            xPercent: -dir * dist,
            opacity: 0,
            duration: outDuration,
            ease: "power2.in",
            onComplete: () => {
              setVisible(panel, false);
              clearAnimProps(panel);
            },
          });
        } else {
          release(panel);
          setVisible(panel, false);
          if (window.gsap) clearAnimProps(panel);
        }
        return;
      }

      // ---------- contenu qui doit apparaître
      const wasHidden = panel.hidden;

      if (!canAnimate || type === "none") {
        release(panel);
        setVisible(panel, true);
        if (window.gsap) clearAnimProps(panel);
        return;
      }

      if (type === "push") {
        const dist = distanceOf(panel, DEFAULT_PUSH_DISTANCE);

        if (!wasHidden) {
          // Déjà visible (clic rapide pendant une sortie) : on le remet dans le flux et en place
          release(panel);
          gsap.to(panel, { xPercent: 0, opacity: 1, duration, ease: "power3.out", clearProps: "opacity,transform" });
          return;
        }

        // Prend la place de l'ancien contenu (déjà sorti du flux) en venant du côté opposé
        setVisible(panel, true);
        gsap.fromTo(
          panel,
          { xPercent: dir * dist, opacity: 0 },
          { xPercent: 0, opacity: 1, duration, ease: "power3.inOut", clearProps: "opacity,transform" },
        );
        return;
      }

      if (type === "slide") {
        const dist = distanceOf(panel);

        if (!wasHidden) {
          // Déjà visible (clic rapide pendant une sortie) : on le ramène en place
          gsap.to(panel, { xPercent: 0, opacity: 1, duration, ease: "power3.out", clearProps: "opacity,transform" });
          return;
        }

        // Départ côté opposé à la sortie, invisible tant que [hidden] est posé
        gsap.set(panel, { xPercent: dir * dist, opacity: 0 });
        gsap.to(panel, {
          xPercent: 0,
          opacity: 1,
          duration,
          delay: slideInDelay,
          ease: "power3.out",
          clearProps: "opacity,transform",
          onStart: () => {
            setVisible(panel, true); // display rétabli avant que l'animation ne soit visible
          },
        });
        // Pas de délai : on affiche tout de suite (évite une frame vide)
        if (slideInDelay === 0) setVisible(panel, true);
        return;
      }

      // Fondu classique (sans translation) : display rétabli avant l'animation
      setVisible(panel, true);
      if (wasHidden) {
        gsap.fromTo(
          panel,
          { opacity: 0 },
          { opacity: 1, duration, ease: "power2.out", clearProps: "opacity" },
        );
      }
    });
  }

  function setButtons(key) {
    buttons.forEach((btn) => {
      const on = btn.dataset.switchBtn === key;
      applyVariant(btn, on);
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
    });
  }

  function activate(key, { animate = true, updateUrl = true } = {}) {
    if (key === currentKey || keys.indexOf(key) === -1) return;

    const prevKey = currentKey;
    const dir = prevKey === null || keys.indexOf(key) > keys.indexOf(prevKey) ? 1 : -1;
    currentKey = key;

    setButtons(key);
    setPanels(key, animate && prevKey !== null, dir);
    placeIndicator(currentButton(), animate);

    if (param && updateUrl) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(param, key);
        window.history.replaceState({}, "", url.toString());
      } catch (e) {}
    }

    // Les hauteurs changent : on recalcule les animations au scroll (après la fin des transitions)
    const refreshDelay = animate ? (outDuration + duration) * 1000 + 50 : 0;
    setTimeout(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, refreshDelay);
  }

  // ------------------------------------------------------------------ accessibilité + interactions
  if (list) list.setAttribute("role", "tablist");

  buttons.forEach((btn, i) => {
    btn.setAttribute("role", "tab");

    btn.addEventListener("click", (ev) => {
      ev.preventDefault(); // le lien Webflow (href) ne doit pas naviguer
      activate(btn.dataset.switchBtn);
    });

    btn.addEventListener("keydown", (ev) => {
      let next = null;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = buttons[(i + 1) % buttons.length];
      if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = buttons[(i - 1 + buttons.length) % buttons.length];
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        activate(btn.dataset.switchBtn);
        return;
      }
      if (next) {
        ev.preventDefault();
        next.focus();
        activate(next.dataset.switchBtn);
      }
    });
  });

  activate(startKey, { animate: false, updateUrl: false });

  // Hauteur figée sur la 1re étape : mesure à l'init, puis quand le contenu change de taille
  // (images, polices, resize). Le resize ne déclenche que si la LARGEUR change.
  if (lockKey) {
    lockHeight();
    window.addEventListener("load", lockHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeight);

    group.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", lockHeight, { once: true });
    });

    if (typeof ResizeObserver !== "undefined") {
      let lastW = group.offsetWidth;
      let timer = null;
      new ResizeObserver(() => {
        const w = group.offsetWidth;
        if (w === lastW) return;
        lastW = w;
        clearTimeout(timer);
        timer = setTimeout(lockHeight, 100);
      }).observe(group);
    } else {
      let timer = null;
      window.addEventListener("resize", () => {
        clearTimeout(timer);
        timer = setTimeout(lockHeight, 100);
      });
    }
  }

  // Le fond doit rester calé si la taille des boutons change (resize, polices chargées)
  if (indicator) {
    const refit = () => placeIndicator(currentButton(), false);

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(refit).observe(list);
    } else {
      window.addEventListener("resize", refit);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    window.addEventListener("load", refit);
  }
}

export function initSwitch(root = document) {
  root.querySelectorAll("[data-switch-group]:not([data-switch-ready])").forEach((group) => {
    group.setAttribute("data-switch-ready", "true");
    initGroup(group);
  });
}