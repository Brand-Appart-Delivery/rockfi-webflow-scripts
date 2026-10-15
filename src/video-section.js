// src/video-section.js
// Rend fonctionnelle la section vidéo (keynote, événement...) ET les cartes
// (personas, presse...) : une vidéo par carte.
//
// 1) SECTION :
//   .video_media[data-video-player="URL"]   conteneur + URL (mp4, YouTube, Vimeo)
//     img[data-video-poster]                affiche
//   .video_controller[data-video-play]      bouton "Voir la vidéo"
//     .video_controller-play                icône ronde (ancre du magnétisme)
//     [data-video-timer]                    durée affichée
//
// 2) CARTES (personas, presse...) :
//   .personas_card[data-video-card][data-video-player="URL"]
//     .personas_card-banner[data-video-magnet-zone]   accueille le lecteur + zone magnétique
//       .video_controller                   bouton
//         .video_controller-play            icône ronde (ancre du magnétisme)
//         .video_controller-time            durée affichée
//
// Formats acceptés dans data-video-player :
//   https://.../video.mp4                 fichier natif
//   youtube:ID  ou URL YouTube
//   vimeo:ID    vimeo:ID/HASH (non répertoriée)  ou URL Vimeo
//
// Un seul lecteur (avec son) actif à la fois : en lancer un remet les autres
// sur leur aperçu / poster. À la fin d'une vidéo, on revient à l'aperçu ou au
// poster (évite l'écran de fin "autres vidéos" de Vimeo).
//
// Options (data-attributes, facultatives) :
//   data-video-autoplay             aperçu muet en boucle, visible à l'écran ;
//                                   un clic relance la vidéo depuis le début avec
//                                   le lecteur complet. Absent ou "false" = désactivé.
//   data-video-autoplay-start="12"  l'aperçu commence (et reboucle) à 12 s. Défaut : 0.
//   data-video-autoplay-delay="0"   délai (secondes) entre l'arrivée à l'écran et le
//                                   début de l'aperçu. Défaut : 0 (immédiat).
//   data-video-bg                   fond vidéo (hero, section...) : cover fluide au resize, et
//                                   l'aperçu n'apparaît que quand la lecture a vraiment démarré
//                                   (pas de timeout : le visuel de secours reste dessous, le
//                                   loader du lecteur n'est jamais montré). À combiner avec
//                                   data-video-autoplay. Voir video.scss ([data-video-bg]).
//   data-video-ratio="16/9"         ratio réel de la vidéo (avec data-video-bg). Défaut : 16/9.
//   data-video-host                 (sur un élément enfant) accueille le lecteur à la
//                                   place de la carte entière ; prioritaire sur le reste
//   data-video-captions="URL.vtt"   sous-titres
//   data-video-title="Titre"        titre accessible
//   data-video-duration="2:30"      durée de secours (YouTube / Vimeo privé)
//   data-video-magnet="0.35"        force de l'effet magnétique (0 = désactivé)
//   data-video-magnet-zone          (sur un élément enfant) limite la zone où la
//                                   souris déclenche le magnétisme ; sinon tout le root
//   data-video-follow               le bouton REMPLACE le magnétisme : il apparaît quand la
//                                   souris entre dans la zone, la suit, et le curseur est
//                                   masqué. Un clic dans la zone lance la vidéo. Le bouton
//                                   se masque au-dessus des liens / boutons de la zone.
//                                   Valeur facultative = lissage (0.25 par défaut,
//                                   1 = instantané). Désactivé sur tactile.
//   data-video-follow-zone          définit la zone de suivi. Cherché dans l'ordre :
//                                   1) sur un élément ENFANT du root (réduit la zone),
//                                   2) sur un élément PARENT du root (agrandit la zone,
//                                      ex. la section entière, marges comprises),
//                                   3) sinon le root lui-même (.video_layout / carte)
//   data-video-no-follow            (sur un élément enfant de la zone) masque le bouton
//                                   et rend le curseur quand la souris le survole
//   data-video-tone="light|dark"    (sur n'importe quel bloc) thème du fond sous le bouton
//                                   qui suit la souris : "light" = fond clair (bouton
//                                   sombre), "dark" = fond sombre (bouton clair).
//                                   Sert de repli : si une grande image est sous la souris,
//                                   ses pixels sont mesurés (l'image doit être servie avec
//                                   CORS). Sinon, le script lit la couleur de fond CSS.

const PLYR_I18N_FR = {
  play: "Lire",
  pause: "Pause",
  mute: "Couper le son",
  unmute: "Activer le son",
  enableCaptions: "Activer les sous-titres",
  disableCaptions: "Désactiver les sous-titres",
  enterFullscreen: "Plein écran",
  exitFullscreen: "Quitter le plein écran",
};

// Options passées à l'iframe YouTube (ignorées pour Vimeo / mp4)
const YOUTUBE_OPTIONS = {
  noCookie: true, // youtube-nocookie.com
  rel: 0, // suggestions limitées à la même chaîne
  modestbranding: 1, // logo YouTube réduit
  iv_load_policy: 3, // pas d'annotations
  playsinline: 1,
};

const DEFAULT_MAGNET = 0.35;
const DEFAULT_FOLLOW = 0.25; // lissage du bouton qui suit la souris (plus petit = plus doux, 1 = instantané)
const DEFAULT_AUTOPLAY_DELAY = 0; // secondes (0 = dès que la carte est visible)
const FADE_MS = 350; // doit correspondre à la transition CSS des holders
const REVEAL_TIMEOUT_MS = 4000; // sécurité lecteur classique
const PREVIEW_REVEAL_TIMEOUT_MS = 2500; // sécurité aperçu (désactivée avec data-video-bg)
const COVER_BASE_W = 1920; // largeur fixe de l'iframe en mode fond (mise à l'échelle par transform)

function getVideoInfo(src) {
  const s = (src || "").trim();

  // Raccourcis : "youtube:ID" / "vimeo:ID" / "vimeo:ID/HASH" (ou "vimeo:ID:HASH")
  const short = s.match(/^(youtube|vimeo):([\w-]+)(?:[/:]([\w]+))?$/i);
  if (short) {
    const type = short[1].toLowerCase();
    const id = short[2];
    const hash = short[3] || "";
    if (type === "vimeo") {
      return {
        type,
        id,
        hash,
        url: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`,
      };
    }
    return { type, id, hash: "", url: `https://www.youtube.com/watch?v=${id}` };
  }

  const yt = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return { type: "youtube", id: yt[1], hash: "", url: s };

  // URL Vimeo, avec hash optionnel pour les vidéos non répertoriées
  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
  if (vimeo) {
    return { type: "vimeo", id: vimeo[1], hash: vimeo[2] || "", url: s };
  }

  return { type: "native", id: null, hash: "", url: s };
}

// preview = true : version muette sans sous-titres (aperçu autoplay)
// startAt        : seconde de départ de l'aperçu (fichier natif, via #t=)
function buildPlayerMarkup(src, captions, title, preview = false, startAt = 0) {
  const info = getVideoInfo(src);
  const frameTitle = title || "Lecteur vidéo";

  if (info.type === "youtube" || info.type === "vimeo") {
    // Vimeo avec hash : on passe l'URL complète, Plyr en extrait l'ID et le hash
    const embedId = info.type === "vimeo" && info.hash ? info.url : info.id;
    return `<div class="plyr__video-embed" data-plyr-provider="${info.type}" data-plyr-embed-id="${embedId}" title="${frameTitle}"></div>`;
  }

  if (preview) {
    const frag = startAt > 0 ? `#t=${startAt}` : "";
    return `<video playsinline muted preload="auto"><source src="${info.url}${frag}" type="video/mp4"></video>`;
  }

  const track = captions
    ? `<track kind="captions" label="Français" srclang="fr" src="${captions}" default>`
    : "";

  return `<video playsinline preload="metadata"><source src="${info.url}" type="video/mp4">${track}</video>`;
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setTimer(timerEl, text) {
  if (!timerEl || !text) return;
  timerEl.textContent = text;
  timerEl.classList.add("is-ready");
}

function loadDuration(src, timerEl, fallback) {
  if (!timerEl) return;

  // On vide le texte de démo : seule une vraie durée sera affichée
  timerEl.textContent = "";
  if (fallback) setTimer(timerEl, fallback);

  const info = getVideoInfo(src);

  if (info.type === "native") {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.playsInline = true;

    const done = () => {
      setTimer(timerEl, formatDuration(probe.duration));
      probe.removeAttribute("src");
      probe.load();
    };
    probe.addEventListener("loadedmetadata", done, { once: true });
    probe.addEventListener("error", () => {}, { once: true });

    probe.src = info.url;
    probe.load();
    return;
  }

  if (info.type === "vimeo" && typeof fetch === "function") {
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(info.url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.duration) setTimer(timerEl, formatDuration(d.duration));
      })
      .catch(() => {});
  }
}

// Effet magnétique :
//   scope  : zone où la souris déclenche l'effet
//   mover  : élément qui se déplace (tout le groupe .video_controller)
//   anchor : élément de référence pour la distance (.video_controller-play)
// Utilise la propriété CSS `translate` (variables --mx / --my posées sur mover),
// indépendante de `transform` utilisé par l'animation d'apparition.
function initMagnet(scope, mover, anchor, strength) {
  if (!scope || !mover || !anchor || !strength) return;
  if (
    window.matchMedia &&
    (window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  const RADIUS = 160; // distance d'influence autour de l'icône, en px
  const MAX = 14; // déplacement maximum, en px
  const EASE = 0.14; // lissage (0 = figé, 1 = instantané)

  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let raf = null;

  function render() {
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    mover.style.setProperty("--mx", `${cx.toFixed(2)}px`);
    mover.style.setProperty("--my", `${cy.toFixed(2)}px`);

    const settled = Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05;
    raf = settled ? null : requestAnimationFrame(render);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  function onMove(ev) {
    // L'icône bouge avec le groupe : on retire le décalage en cours
    // pour obtenir son centre "au repos"
    const rect = anchor.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - cx;
    const centerY = rect.top + rect.height / 2 - cy;
    const dx = ev.clientX - centerX;
    const dy = ev.clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < RADIUS) {
      const pull = (1 - dist / RADIUS) * strength;
      tx = Math.max(-MAX, Math.min(MAX, dx * pull));
      ty = Math.max(-MAX, Math.min(MAX, dy * pull));
    } else {
      tx = 0;
      ty = 0;
    }
    kick();
  }

  function reset() {
    tx = 0;
    ty = 0;
    kick();
  }

  scope.addEventListener("mousemove", onMove);
  scope.addEventListener("mouseleave", reset);
}

// Bouton qui suit la souris (data-video-follow) : remplace le magnétisme.
//   scope   : zone où le bouton apparaît, suit la souris et masque le curseur
//   mover   : élément qui suit (.video_controller, passé en position: fixed par le CSS)
//   anchor  : point du bouton placé pile sous la souris (.video_controller-play)
//   ease    : lissage (1 = instantané)
//   canShow : renvoie false pendant la lecture
//   onClick : lancé au clic dans la zone (le bouton lui-même ne reçoit pas la souris)
// Le bouton prend la classe is-tone-light / is-tone-dark selon le fond sous la souris
// (pixels de l'image sous le curseur, sinon data-video-tone, sinon couleur de fond CSS).
// Au clavier, le bouton s'affiche au centre de la zone quand il prend le focus.
function initFollow(scope, mover, anchor, ease, canShow, onClick) {
  if (!scope || !mover || !anchor) return null;
  if (window.matchMedia && window.matchMedia("(hover: none)").matches) return null;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    ease = 1;
  }

  const INTERACTIVE = "a, button, input, select, textarea, label, [data-video-no-follow]";
  const isInteractive = (t) => t instanceof Element && Boolean(t.closest(INTERACTIVE));

  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let mx = 0; // dernière position souris (viewport)
  let my = 0;
  let raf = null;
  let on = false;
  let last = 0; // timestamp de la frame précédente
  let tone = null; // "light" | "dark" | null

  mover.classList.add("is-follow");

  // ---- Thème selon le fond ----
  const LIGHT_THRESHOLD = 0.55; // au-dessus = fond clair (bouton sombre)
  const SAMPLE_W = 96; // résolution de l'image réduite utilisée pour mesurer
  const imgCache = new Map(); // src -> { data, w, h, nw, nh }

  // Luminosité perçue d'une couleur "rgb()/rgba()" (0 = noir, 1 = blanc)
  function luminance(str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(parseFloat);
    const a = p.length > 3 ? p[3] : 1;
    if (a < 0.5) return null; // fond transparent : on continue de remonter
    return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
  }

  // Charge l'image en version réduite (une seule fois) pour lire ses pixels.
  // Renvoie null tant qu'elle n'est pas prête, ou si le navigateur refuse (CORS).
  function getSample(img) {
    const src = img.currentSrc || img.src;
    if (!src) return null;
    const cached = imgCache.get(src);
    if (cached) return cached.data ? cached : null;

    imgCache.set(src, { data: null });
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      try {
        const w = SAMPLE_W;
        const h = Math.max(1, Math.round((w * probe.naturalHeight) / probe.naturalWidth));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(probe, 0, 0, w, h);
        imgCache.set(src, {
          data: ctx.getImageData(0, 0, w, h).data,
          w,
          h,
          nw: probe.naturalWidth,
          nh: probe.naturalHeight,
        });
        if (on) updateTone();
      } catch (e) {
        // canvas "tainted" (CORS) : on retombera sur data-video-tone / la couleur CSS
      }
    };
    probe.src = src;
    return null;
  }

  // Thème de l'image à l'endroit exact sous la souris (object-fit: cover, parallax compris)
  function sampleTone(img, x, y) {
    const s = getSample(img);
    if (!s) return null;

    const r = img.getBoundingClientRect(); // inclut les transforms (parallax)
    if (!r.width || !r.height) return null;

    let u;
    let v;
    if (getComputedStyle(img).objectFit === "cover") {
      const sc = Math.max(r.width / s.nw, r.height / s.nh);
      const dw = s.nw * sc;
      const dh = s.nh * sc;
      u = (x - r.left + (dw - r.width) / 2) / dw;
      v = (y - r.top + (dh - r.height) / 2) / dh;
    } else {
      u = (x - r.left) / r.width;
      v = (y - r.top) / r.height;
    }
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;

    // Moyenne sur une petite zone autour du curseur
    const px = Math.round(u * (s.w - 1));
    const py = Math.round(v * (s.h - 1));
    const rad = 4;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, py - rad); j <= Math.min(s.h - 1, py + rad); j++) {
      for (let i = Math.max(0, px - rad); i <= Math.min(s.w - 1, px + rad); i++) {
        const k = (j * s.w + i) * 4;
        sum += (0.299 * s.data[k] + 0.587 * s.data[k + 1] + 0.114 * s.data[k + 2]) / 255;
        n++;
      }
    }
    return n && sum / n > LIGHT_THRESHOLD ? "light" : "dark";
  }

  function toneAt(x, y) {
    // 1) Une grande image sous la souris : on mesure ses pixels
    const stack = document.elementsFromPoint(x, y); // le bouton a pointer-events: none
    for (const el of stack) {
      if (el.tagName !== "IMG") continue;
      if (el.getBoundingClientRect().width < 200) continue; // ignore icônes / logos
      const t = sampleTone(el, x, y);
      if (t) return t;
      break; // image trouvée mais pas lisible : repli ci-dessous
    }

    // 2) Repli : data-video-tone, sinon couleur de fond CSS la plus proche
    let el = stack[0];
    while (el && el !== document.documentElement) {
      const t = el.getAttribute("data-video-tone");
      if (t === "light" || t === "dark") return t;
      const lum = luminance(getComputedStyle(el).backgroundColor);
      if (lum !== null) return lum > 0.6 ? "light" : "dark";
      el = el.parentElement;
    }
    return null;
  }

  function updateTone() {
    const next = toneAt(mx, my);
    if (next === tone) return;
    tone = next;
    mover.classList.toggle("is-tone-light", tone === "light");
    mover.classList.toggle("is-tone-dark", tone === "dark");
  }

  function apply() {
    mover.style.setProperty("--fx", `${cx.toFixed(1)}px`);
    mover.style.setProperty("--fy", `${cy.toFixed(1)}px`);
  }

  function render(now) {
    // Lissage indépendant du framerate : même sensation à 60 Hz ou 120 Hz
    const dt = last ? Math.min(now - last, 64) : 16.67;
    last = now;
    const k = 1 - Math.pow(1 - ease, dt / 16.67);

    cx += (tx - cx) * k;
    cy += (ty - cy) * k;
    apply();

    const settled = Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05;
    if (settled) {
      cx = tx;
      cy = ty;
      apply();
      raf = null;
      last = 0;
    } else {
      raf = requestAnimationFrame(render);
    }
  }

  // Place le centre de l'icône sous la souris. On retire la translation en cours
  // pour retrouver sa position "au repos" (marche aussi si un parent est transformé).
  function retarget(snap) {
    const r = anchor.getBoundingClientRect();
    tx = mx - (r.left + r.width / 2 - cx);
    ty = my - (r.top + r.height / 2 - cy);
    if (snap) {
      cx = tx;
      cy = ty;
      apply();
    } else if (!raf) {
      last = 0;
      raf = requestAnimationFrame(render);
    }
  }

  function hide() {
    if (!on) return;
    on = false;
    mover.classList.remove("is-follow-visible");
    scope.classList.remove("is-follow-cursor");
  }

  function onMove(ev) {
    mx = ev.clientX;
    my = ev.clientY;
    if (!canShow() || isInteractive(ev.target)) return hide();
    const first = !on; // à l'apparition : pas de glissade depuis l'ancienne position
    on = true;
    mover.classList.add("is-follow-visible");
    scope.classList.add("is-follow-cursor");
    updateTone();
    retarget(first);
  }

  scope.addEventListener("mousemove", onMove);
  scope.addEventListener("mouseleave", hide);
  scope.addEventListener("click", (ev) => {
    if (canShow() && !isInteractive(ev.target)) onClick(ev);
  });

  // Défilement sans bouger la souris : on masque dès que la souris n'est plus dans la zone,
  // sinon le bouton glisse jusqu'au curseur et le thème est recalculé (le contenu a défilé).
  // On compare avec le rectangle de la zone (et non elementFromPoint seul, qui dépend de ce
  // qui passe au-dessus). capture: true attrape aussi le scroll d'un conteneur interne
  // (wrapper, Lenis...), que `scroll` sur window seul ne voit pas.
  const checkOut = () => {
    if (!on) return;
    const r = scope.getBoundingClientRect();
    const inside = mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
    if (!inside || !canShow()) return hide();
    const t = document.elementFromPoint(mx, my);
    if (t && scope.contains(t) && isInteractive(t)) return hide();
    updateTone();
    retarget(false);
  };
  window.addEventListener("scroll", checkOut, { passive: true, capture: true });
  window.addEventListener("resize", checkOut);

  // Clavier : affichage au centre de la partie visible de la zone
  mover.addEventListener("focus", () => {
    if (on || !canShow()) return;
    const r = scope.getBoundingClientRect();
    mx = (Math.max(r.left, 0) + Math.min(r.right, window.innerWidth)) / 2;
    my = (Math.max(r.top, 0) + Math.min(r.bottom, window.innerHeight)) / 2;
    on = true;
    mover.classList.add("is-follow-visible");
    updateTone();
    retarget(true);
  });
  mover.addEventListener("blur", hide);

  return {
    // À appeler quand la lecture démarre : masque le bouton et rend le curseur
    sync() {
      if (!canShow()) hide();
    },
  };
}

// Cover fluide pour un fond vidéo (Vimeo / YouTube) :
// l'iframe garde une taille fixe (COVER_BASE_W × hauteur selon le ratio) et on la met à l'échelle
// avec transform (GPU) pour remplir le cadre. Pas de relayout de l'iframe au resize = fluide.
// Variables posées sur l'élément : --cover-w, --cover-h, --cover-scale (lues par video.scss).
function initCoverFit(el) {
  const [rw, rh] = (el.dataset.videoRatio || "16/9").split("/").map(Number);
  const ratioW = rw > 0 ? rw : 16;
  const ratioH = rh > 0 ? rh : 9;
  const baseW = COVER_BASE_W;
  const baseH = (baseW * ratioH) / ratioW;

  el.style.setProperty("--cover-w", `${baseW}px`);
  el.style.setProperty("--cover-h", `${baseH}px`);

  const update = () => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const scale = Math.max(w / baseW, h / baseH);
    el.style.setProperty("--cover-scale", scale.toFixed(4));
  };

  update();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(update).observe(el);
  else window.addEventListener("resize", update);
  window.addEventListener("load", update);
}

// ---------------------------------------------------------------------------
// Lecteur unique : un seul actif à la fois (les aperçus muets ne comptent pas)
// ---------------------------------------------------------------------------
let activeStop = null;

function claimPlayback(stop) {
  if (activeStop && activeStop !== stop) activeStop();
  activeStop = stop;
}

// ---------------------------------------------------------------------------
// Logique commune section + cartes
//   root    : élément qui porte les classes is-playing / is-previewing
//   host    : élément dans lequel le lecteur est inséré (au-dessus du poster)
//   trigger : bouton (groupe) qui lance la vidéo et qui bouge au magnétisme
//   bg      : mode fond vidéo (pas de timeout d'affichage de l'aperçu)
// ---------------------------------------------------------------------------
function setupPlayback({
  root,
  host,
  trigger,
  extraTriggers = [],
  timerEl,
  src,
  captions,
  title,
  duration,
  magnet,
  follow,
  autoplay,
  autoplayDelay,
  autoplayStart,
  bg = false,
}) {
  loadDuration(src, timerEl, duration);

  // Tout le groupe bouge, mais la réaction part de l'icône ronde,
  // et uniquement quand la souris est dans la zone définie
  const playBtn = trigger && trigger.querySelector(".video_controller-play");
  const magnetScope = root.querySelector("[data-video-magnet-zone]") || root;
  // data-video-follow remplace le magnétisme
  if (!follow) initMagnet(magnetScope, trigger, playBtn, magnet);

  let holder = null;
  let player = null;
  let revealTimer = null;
  let cleanupTimer = null;

  // Aperçu muet (autoplay)
  let previewHolder = null;
  let previewPlayer = null;
  let previewTimer = null;
  let previewRevealTimer = null;
  let previewPaused = false;
  let inView = true;

  const isNative = getVideoInfo(src).type === "native";

  // Bouton qui suit la souris (null si désactivé ou appareil tactile)
  const follower = follow
    ? initFollow(
        root.querySelector("[data-video-follow-zone]") ||
          root.closest("[data-video-follow-zone]") ||
          root,
        trigger,
        playBtn,
        follow,
        () => !holder,
        (e) => start(e),
      )
    : null;

  // Un clic dans le lecteur ne doit jamais suivre le lien parent.
  // preventDefault seulement : Plyr doit continuer à recevoir ses clics.
  function blockLink(ev) {
    if (holder && holder.contains(ev.target)) ev.preventDefault();
  }

  // ---- Aperçu muet ----
  function clearPreviewTimer() {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  }

  // Détruit vraiment l'aperçu (lecteur classique prêt, ou fin de vie)
  function stopPreview() {
    clearPreviewTimer();
    clearTimeout(previewRevealTimer);
    previewRevealTimer = null;
    if (previewPlayer) {
      try {
        previewPlayer.destroy();
      } catch (e) {}
      previewPlayer = null;
    }
    if (previewHolder) {
      previewHolder.remove();
      previewHolder = null;
    }
    previewPaused = false;
    root.classList.remove("is-previewing");
  }

  // Met l'aperçu en pause (hors écran) sans le détruire : pas de rechargement
  function pausePreview() {
    clearPreviewTimer();
    if (!previewHolder || previewPaused) return;
    previewPaused = true;
    try {
      if (previewPlayer) previewPlayer.pause();
      else {
        const v = previewHolder.querySelector("video");
        if (v) v.pause();
      }
    } catch (e) {}
  }

  function resumePreview() {
    if (!previewHolder || !previewPaused) return;
    previewPaused = false;
    try {
      const p = previewPlayer
        ? previewPlayer.play()
        : previewHolder.querySelector("video")?.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}
  }

  function startPreview() {
    if (previewHolder || holder) return;

    previewHolder = document.createElement("div");
    // Invisible (opacity 0 en CSS) jusqu'à ce que la lecture démarre vraiment
    previewHolder.className = "video_preview-holder swiper-no-swiping";
    previewHolder.setAttribute("aria-hidden", "true");
    previewHolder.innerHTML = buildPlayerMarkup(src, "", title, true, autoplayStart);
    host.appendChild(previewHolder);

    const ph = previewHolder;
    let revealed = false;
    const reveal = () => {
      if (revealed || previewHolder !== ph) return;
      revealed = true;
      clearTimeout(previewRevealTimer);
      ph.classList.add("is-ready");
      root.classList.add("is-previewing");
    };

    // Sécurité : si "playing" n'arrive jamais, on affiche quand même l'aperçu.
    // Pas en mode fond : on préfère garder le visuel de secours que montrer le loader du lecteur.
    if (!bg) previewRevealTimer = setTimeout(reveal, PREVIEW_REVEAL_TIMEOUT_MS);

    const target = previewHolder.firstElementChild;

    // Plyr indisponible : vidéo native brute
    if (typeof window.Plyr === "undefined") {
      if (target.tagName === "VIDEO") {
        target.muted = true;
        target.addEventListener("playing", reveal, { once: true });
        // Reboucle à autoplayStart (ou au début si 0)
        target.addEventListener("ended", () => {
          target.currentTime = autoplayStart;
          target.play().catch(() => {});
        });
        target.play().catch(() => {});
      }
      return;
    }

    const pl = new window.Plyr(target, {
      controls: [],
      clickToPlay: false,
      keyboard: { focused: false, global: false },
      fullscreen: { enabled: false },
      // Boucle gérée à la main (voir "ended") pour pouvoir reboucler à autoplayStart.
      // Fond vidéo sans point de départ : boucle native du lecteur, qui évite l'écran de fin
      // (et l'interface Vimeo qui apparaît un instant) à chaque tour.
      loop: { active: bg && autoplayStart <= 0 },
      tooltips: { controls: false, seek: false },
      // YouTube : aucune barre de contrôle ni raccourci clavier dans l'aperçu
      youtube: { ...YOUTUBE_OPTIONS, controls: 0, disablekb: 1 },
      // Fond vidéo Vimeo : mode "background" natif (aucun élément d'interface : ni bouton play,
      // ni titre, ni barre, ni loader). Retirer cette ligne pour revenir au lecteur standard.
      vimeo: bg ? { background: 1 } : {},
    });
    previewPlayer = pl;

    pl.once("playing", reveal);
    pl.once("timeupdate", reveal);

    // Reboucle à autoplayStart (ou au début si 0)
    pl.on("ended", () => {
      if (previewPlayer !== pl) return;
      pl.currentTime = autoplayStart;
      const p = pl.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    });

    const run = () => {
      if (previewPlayer !== pl) return; // détruit entre-temps
      pl.muted = true;
      // Fichier natif : le départ est déjà géré par #t= ; embed : on se positionne ici
      if (autoplayStart > 0 && !isNative) pl.currentTime = autoplayStart;
      // Sorti de l'écran pendant le chargement : on reste en pause
      if (!inView) {
        previewPaused = true;
        return;
      }
      const p = pl.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    if (isNative) run();
    else pl.once("ready", run);
  }

  // Visible : crée l'aperçu une seule fois, puis le reprend. Hors écran : pause
  // (jamais détruit, donc pas de rechargement ni de frame noire à chaque entrée).
  function syncPreview() {
    if (!autoplay) return;

    if (inView && !holder) {
      if (previewHolder) {
        resumePreview();
        return;
      }
      if (previewTimer) return; // déjà programmé
      if (autoplayDelay <= 0) {
        startPreview();
        return;
      }
      previewTimer = setTimeout(() => {
        previewTimer = null;
        if (inView && !holder) startPreview();
      }, autoplayDelay * 1000);
    } else {
      pausePreview();
    }
  }

  // ---- Lecteur classique ----
  // Remet l'aperçu (ou le poster) : détruit le lecteur, retire le conteneur
  function stop() {
    clearTimeout(revealTimer);
    clearTimeout(cleanupTimer);
    revealTimer = null;
    cleanupTimer = null;

    if (player) {
      try {
        player.pause();
        player.destroy();
      } catch (e) {}
      player = null;
    }
    if (holder) {
      holder.remove();
      holder = null;
    }
    root.removeEventListener("click", blockLink, true);
    root.classList.remove("is-playing");
    if (activeStop === stop) activeStop = null;

    syncPreview();
  }

  function start(e) {
    if (e) {
      // Si la carte est un lien <a>, on empêche la navigation
      e.preventDefault();
      e.stopPropagation();
    }
    if (holder) return; // déjà en lecture

    claimPlayback(stop);

    // Plus de nouvel aperçu pendant la lecture ; l'aperçu en cours reste affiché
    // sous le lecteur jusqu'à ce que celui-ci soit prêt (évite le clignotement)
    clearPreviewTimer();
    root.classList.add("is-playing");

    holder = document.createElement("div");
    // Invisible (opacity 0 en CSS) jusqu'à ce que la lecture démarre vraiment
    holder.className = "video_player-holder swiper-no-swiping";
    holder.innerHTML = buildPlayerMarkup(src, captions, title);
    host.appendChild(holder);

    // Le lecteur peut se trouver dans un <a> : aucun clic dedans ne doit ouvrir le lien
    root.addEventListener("click", blockLink, true);

    // Le bouton qui suit la souris disparaît pendant la lecture
    if (follower) follower.sync();

    const h = holder;
    let revealed = false;

    // Le lecteur apparaît en fondu, puis l'aperçu en dessous est retiré
    const reveal = () => {
      if (revealed || holder !== h) return;
      revealed = true;
      clearTimeout(revealTimer);
      h.classList.add("is-ready");
      cleanupTimer = setTimeout(() => {
        cleanupTimer = null;
        if (holder === h) stopPreview();
      }, FADE_MS + 50);
    };
    revealTimer = setTimeout(reveal, REVEAL_TIMEOUT_MS);

    const target = holder.firstElementChild;

    // Plyr indisponible : lecteur natif
    if (typeof window.Plyr === "undefined") {
      if (target.tagName === "VIDEO") {
        target.controls = true;
        target.addEventListener("playing", reveal, { once: true });
        target.addEventListener("ended", () => stop(), { once: true });
        target.play().catch(() => {});
      }
      return;
    }

    const hasCaptions = Boolean(holder.querySelector("track"));
    player = new window.Plyr(target, {
      controls: [
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        ...(hasCaptions ? ["captions"] : []),
        "fullscreen",
      ],
      i18n: PLYR_I18N_FR,
      youtube: YOUTUBE_OPTIONS,
    });

    player.once("playing", reveal);
    // Sans aperçu en dessous : le lecteur Plyr (fond noir + contrôles) s'affiche dès qu'il est
    // prêt, sans attendre le premier "playing". Avec un aperçu, on attend "playing"
    // pour ne pas remplacer l'aperçu par un écran noir.
    if (!previewHolder) player.once("ready", reveal);

    if (isNative) player.play();
    else player.once("ready", () => player.play());

    player.on("loadedmetadata", () => setTimer(timerEl, formatDuration(player.duration)));

    // Fin de lecture : retour à l'aperçu / au poster (évite l'écran "autres vidéos" de Vimeo)
    player.on("ended", () => stop());
  }

  [trigger, ...extraTriggers].filter(Boolean).forEach((btn) => {
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", "Voir la vidéo");
    btn.addEventListener("click", start);
    btn.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        start(ev);
      }
    });
  });

  // Aperçu : lancé/mis en pause selon la visibilité à l'écran
  if (autoplay) {
    if (typeof IntersectionObserver === "undefined") {
      syncPreview();
    } else {
      inView = false;
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          syncPreview();
        },
        // Fond vidéo : la lecture reprend une demi-hauteur d'écran AVANT que la section entre
        // dans la vue, pour ne jamais voir l'état "en pause" du lecteur Vimeo en scrollant.
        bg ? { threshold: 0, rootMargin: "50% 0px" } : { threshold: 0.25 },
      ).observe(root);
    }
  }
}

function readMagnet(el) {
  return el.dataset.videoMagnet !== undefined ? parseFloat(el.dataset.videoMagnet) : DEFAULT_MAGNET;
}

// Bouton qui suit la souris : actif si data-video-follow est présent (et != "false").
// Une valeur entre 0 et 1 règle le lissage (1 = instantané)
function readFollow(el) {
  const v = el.dataset.videoFollow;
  if (v === undefined || v === "false") return 0;
  const n = parseFloat(v);
  return n > 0 && n <= 1 ? n : DEFAULT_FOLLOW;
}

// Autoplay actif si l'attribut est présent (et différent de "false"),
// sauf si l'utilisateur préfère moins d'animations
function readAutoplay(el) {
  const v = el.dataset.videoAutoplay;
  if (v === undefined || v === "false") return false;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return true;
}

// Délai avant le début de l'aperçu (secondes)
function readAutoplayDelay(el) {
  const v = parseFloat(el.dataset.videoAutoplayDelay);
  return isFinite(v) && v >= 0 ? v : DEFAULT_AUTOPLAY_DELAY;
}

// Seconde de départ de l'aperçu
function readAutoplayStart(el) {
  const v = parseFloat(el.dataset.videoAutoplayStart);
  return isFinite(v) && v > 0 ? v : 0;
}

// Fond vidéo : actif si data-video-bg est présent (et != "false")
function readBg(el) {
  return el.dataset.videoBg !== undefined && el.dataset.videoBg !== "false";
}

// Section principale
function initOne(media) {
  const src = media.dataset.videoPlayer;
  if (!src) return;

  const bg = readBg(media);
  if (bg) initCoverFit(media);

  const layout = media.closest(".video_layout") || media.parentElement;

  // Plusieurs boutons possibles (ex. desktop + mobile) : tous lancent la vidéo,
  // le premier est celui qui bouge (magnétisme / suivi de la souris)
  const triggers = [...layout.querySelectorAll("[data-video-play]")];

  setupPlayback({
    root: layout,
    host: media.querySelector("[data-video-host]") || media,
    trigger: triggers[0],
    extraTriggers: triggers.slice(1),
    timerEl: layout.querySelector("[data-video-timer]"),
    src,
    captions: media.dataset.videoCaptions || "",
    title: media.dataset.videoTitle || "",
    duration: media.dataset.videoDuration,
    magnet: readMagnet(media),
    follow: readFollow(media),
    autoplay: readAutoplay(media),
    autoplayDelay: readAutoplayDelay(media),
    autoplayStart: readAutoplayStart(media),
    bg,
  });
}

// Cartes (personas, presse...)
function initCard(card) {
  const src = card.dataset.videoPlayer;
  if (!src) return;

  setupPlayback({
    root: card,
    host:
      card.querySelector("[data-video-host]") ||
      card.querySelector(".personas_card-banner") ||
      card,
    trigger: card.querySelector(".video_controller"),
    timerEl: card.querySelector(".video_controller-time"),
    src,
    captions: card.dataset.videoCaptions || "",
    title: card.dataset.videoTitle || "",
    duration: card.dataset.videoDuration,
    magnet: readMagnet(card),
    follow: readFollow(card),
    autoplay: readAutoplay(card),
    autoplayDelay: readAutoplayDelay(card),
    autoplayStart: readAutoplayStart(card),
  });
}

export function initVideoSection(root = document) {
  // Section principale (les cartes sont exclues)
  root
    .querySelectorAll("[data-video-player]:not([data-video-ready]):not([data-video-card])")
    .forEach((media) => {
      media.setAttribute("data-video-ready", "true");
      initOne(media);
    });

  // Cartes
  root.querySelectorAll("[data-video-card]:not([data-video-ready])").forEach((card) => {
    card.setAttribute("data-video-ready", "true");
    initCard(card);
  });
}