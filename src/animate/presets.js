// src/animate/presets.js
// Chaque preset reçoit l'élément cible + les options lues depuis ses
// data-anim-*, et retourne la timeline/tween GSAP correspondante (pas encore
// jouée — scan.js décide du déclenchement via ScrollTrigger).

import { splitWords, splitWordsMasked, getHiddenOffsets } from "./split-text.js";

export const PRESETS = {
  "fade-up": (el, opts) => {
    window.gsap.set(el, { opacity: 0, y: opts.distance ?? 32 });
    return window.gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: opts.duration ?? 0.8,
      delay: opts.delay ?? 0,
      ease: opts.ease ?? "power2.out",
    });
  },

  "fade-in": (el, opts) => {
    window.gsap.set(el, { opacity: 0 });
    return window.gsap.to(el, {
      opacity: 1,
      duration: opts.duration ?? 0.8,
      delay: opts.delay ?? 0,
      ease: opts.ease ?? "power1.out",
    });
  },

  "scale-in": (el, opts) => {
    window.gsap.set(el, { opacity: 0, scale: opts.scale ?? 0.92 });
    return window.gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: opts.duration ?? 0.8,
      delay: opts.delay ?? 0,
      ease: opts.ease ?? "power2.out",
    });
  },

  // Reveal d'image : montée (translate). L'élément doit avoir un wrapper avec
  // overflow:hidden côté CSS (ex: .image_blog).
  // opts.curtain : en plus, l'élément se dévoile en rideau de bas en haut
  // (clip-path), sans fondu. Activé par défaut pour la 1re rangée des grilles
  // (voir scan.js), désactivé ailleurs (hero : montée seule).
  "image-reveal": (el, opts) => {
    const distance = `${opts.distance ?? 1.5}rem`;
    const duration = opts.duration ?? 2;

    if (!opts.curtain) {
      window.gsap.set(el, { y: distance });
      return window.gsap.to(el, {
        y: 0,
        duration,
        delay: opts.delay ?? 0,
        ease: opts.ease ?? "power3.out",
      });
    }

    window.gsap.set(el, { y: distance, clipPath: "inset(100% 0% 0% 0%)" });
    return window.gsap
      .timeline({ delay: opts.delay ?? 0 })
      .to(el, { y: 0, duration, ease: opts.ease ?? "power3.out" }, 0)
      .to(
        el,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: Math.min(duration, 1.2),
          // Départ doux : au chargement, la 1re frame arrive souvent en retard
          ease: "power3.inOut",
          // Le clip-path ne doit pas rester (il couperait ombres, survols...)
          onComplete: () => window.gsap.set(el, { clearProps: "clipPath" }),
        },
        0,
      );
  },

  // Anime un nombre de 0 jusqu'à sa valeur finale, avec un pas d'incrément qui
  // s'adapte à la magnitude du nombre — un grand nombre (ex: 1500) compte par
  // paliers ronds (dizaines/centaines) plutôt que défiler chiffre par chiffre.
  //
  // Gère aussi les décimales (virgule ou point) : "1,3 Md€" défile par pas de
  // 0,1 (0,0 → 0,1 → … → 1,3), la virgule et le suffixe sont conservés.
  //
  // On extrait la partie numérique via regex, on anime UN OBJET intermédiaire
  // { value: 0 } avec GSAP, et à chaque frame on arrondit au multiple du pas
  // avant d'afficher. Le pas est choisi dans une liste de valeurs "rondes"
  // proche de target/40.
  "count-up": (el, opts) => {
    const rawText = el.textContent.trim();
    // Groupe 1 = préfixe, 2 = nombre (chiffres + séparateurs), 3 = suffixe
    const match = rawText.match(/^(.*?)(\d(?:[\d\s\u00a0\u202f.,]*\d)?)(.*)$/);
    if (!match) return window.gsap.timeline();

    const prefix = match[1];
    const numberGroup = match[2];
    const suffix = match[3];

    // Format repris tel qu'écrit dans Webflow, quelle que soit la langue :
    // un séparateur final suivi de 1 ou 2 chiffres = décimales (« 4,5 »,
    // « 4.5 ») ; les autres sont des séparateurs de milliers (« 1 500 »,
    // « 1,500 »).
    const decimalMatch = numberGroup.match(/([.,])(\d{1,2})$/);
    const decimals = decimalMatch ? decimalMatch[2].length : 0;
    const decSep = decimalMatch ? decimalMatch[1] : "";
    const intText = decimalMatch
      ? numberGroup.slice(0, -decimalMatch[0].length)
      : numberGroup;
    const groupSep = (intText.match(/[^\d]/) || [""])[0];

    const intValue = intText.replace(/[^\d]/g, "");
    const targetNumber = parseFloat(
      decimals ? `${intValue}.${decimalMatch[2]}` : intValue,
    );
    if (isNaN(targetNumber)) return window.gsap.timeline();

    const NICE_STEPS = decimals
      ? [0.1, 0.2, 0.5, 1, 2, 5, 10]
      : [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    const idealStep = targetNumber / 40;
    // Avec décimales : pas minimal = 10^-decimals (0,1 pour une décimale)
    const minStep = decimals ? Math.pow(10, -decimals) : 1;
    const step =
      NICE_STEPS.find((s) => s >= Math.max(idealStep, minStep)) ||
      NICE_STEPS[NICE_STEPS.length - 1];

    const format = (n) => {
      const [int, dec] = n.toFixed(decimals).split(".");
      const grouped = groupSep
        ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep)
        : int;
      return dec ? `${grouped}${decSep}${dec}` : grouped;
    };

    // Le texte du HTML n'est JAMAIS modifié : crawlers, LLM et lecteurs
    // d'écran lisent toujours la vraie valeur. Le chiffre animé est affiché
    // par-dessus, via un pseudo-élément (::after, voir animate.scss) qui ne
    // fait pas partie du texte de la page. Le vrai texte, masqué pendant
    // l'animation, garde aussi la place finale : pas de saut de mise en page.
    const show = (n) => {
      el.setAttribute("data-count-display", `${prefix}${format(n)}${suffix}`);
    };
    const stop = () => {
      el.classList.remove("is-counting");
      el.removeAttribute("data-count-display");
      el.style.removeProperty("--count-justify");
    };

    // Même alignement que le vrai texte pour le chiffre animé
    const align = getComputedStyle(el).textAlign;
    const justify =
      align === "center"
        ? "center"
        : align === "right" || align === "end"
          ? "flex-end"
          : "flex-start";
    el.style.setProperty("--count-justify", justify);

    const counter = { value: 0 };
    show(0);
    el.classList.add("is-counting");

    return window.gsap.to(counter, {
      value: targetNumber,
      duration: opts?.duration ?? 1.5,
      delay: opts?.delay ?? 0,
      ease: opts?.ease ?? "power1.out",
      onUpdate: () => {
        show(Math.min(Math.round(counter.value / step) * step, targetNumber));
      },
      onComplete: stop,
      onInterrupt: stop,
    });
  },

  // Reveal "rideau" sur une image : une boîte (overflow:hidden) grandit en
  // hauteur de 0 à 100%, révélant l'image du haut vers le bas. L'image
  // garde une hauteur FIXE en pixels égale à celle du wrapper (position
  // absolute), pour ne jamais être étirée/écrasée pendant que la boîte
  // grandit — seule la partie visible change, la boîte agit comme un cache
  // qui se rétracte.
  //
  // Un overlay noir est posé DANS box (donc rogné progressivement en même
  // temps que l'image, pas visible en entier dès le départ) : opacity
  // démarre à 1 (plein noir) et descend à 0 vers la fin de l'animation de
  // hauteur, chevauchement piloté par opts.overlayStart (fraction de la
  // durée totale où le fondu démarre).
  //
  // Le délai (opts.delay, calculé par siblingIndex() dans scan.js pour
  // décaler les éléments d'une même liste) est appliqué sur la TIMELINE
  // entière (gsap.timeline({ delay })), pas sur chaque .to() individuel —
  // sinon, positionnés à des offsets absolus internes à la timeline, ils
  // démarreraient toujours immédiatement au moment où ScrollTrigger
  // déclenche .play(), quel que soit opts.delay.
  //
  // À poser sur le WRAPPER qui contient l'image (pas sur l'<img> lui-même).
  // La hauteur du wrapper est figée explicitement (el.style.height) AVANT
  // de repositionner l'<img> en absolute — sinon, une fois l'image sortie
  // du flux normal, le wrapper (s'il n'a pas de hauteur CSS fixe) s'effondre
  // à 0px. Hauteur mesurée UNE SEULE FOIS à l'init (pas de resize handler).
  "image-wipe": (el, opts) => {
    const img = el.querySelector("img");
    if (!img) return window.gsap.timeline(); // pas d'image trouvée, no-op sûr

    const height = el.offsetHeight;

    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    el.style.overflow = "hidden";
    el.style.height = `${height}px`;

    const box = document.createElement("div");
    box.className = "img-reveal-box";
    Object.assign(box.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "0px",
      overflow: "hidden",
    });

    Object.assign(img.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: `${height}px`,
      objectFit: img.style.objectFit || "cover",
    });

    box.appendChild(img); // déplace l'<img> existante dans la boîte

    const overlay = document.createElement("div");
    overlay.className = "img-reveal-overlay";
    Object.assign(overlay.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: `${height}px`,
      background: opts.overlayColor || "#000",
      opacity: "1",
      pointerEvents: "none",
      zIndex: "1",
    });
    box.appendChild(overlay);

    el.appendChild(box);

    const duration = opts.duration ?? 1.1;
    const overlayStart = opts.overlayStart ?? 0.55;

    const tl = window.gsap.timeline({ delay: opts.delay ?? 0 });
    tl.to(box, { height, duration, ease: opts.ease ?? "power3.inOut" }, 0);
    tl.to(
      overlay,
      { opacity: 0, duration: duration * (1 - overlayStart) + 0.2, ease: "power1.out" },
      duration * overlayStart,
    );

    return tl;
  },

  // Texte révélé mot par mot en fondu simple (opacity/y), sans effet rideau.
  "text-words": (el, opts) => {
    const words = splitWords(el);
    window.gsap.set(words, { opacity: 0, y: 12 });
    return window.gsap.to(words, {
      opacity: 1,
      y: 0,
      duration: opts.duration ?? 0.6,
      delay: opts.delay ?? 0,
      stagger: opts.stagger ?? 0.03,
      ease: opts.ease ?? "power2.out",
    });
  },

  // Titre révélé mot par mot façon "rideau". Déplacement de départ calculé
  // en pixels réels (getHiddenOffsets) plutôt qu'en yPercent — garantit un
  // masquage total même avec le padding ajouté autour de chaque mot pour
  // protéger accents/descendantes.
  heading: (el, opts) => {
    const words = splitWordsMasked(el);
    const offsets = getHiddenOffsets(words);

    window.gsap.set(words, { y: (i) => offsets[i] });

    return window.gsap.to(words, {
      y: 0,
      duration: opts.duration ?? 0.7,
      delay: opts.delay ?? 0,
      stagger: opts.stagger ?? 0.04,
      ease: opts.ease ?? "power3.out",
    });
  },
};