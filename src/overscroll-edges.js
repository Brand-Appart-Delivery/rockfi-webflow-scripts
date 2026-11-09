// src/overscroll-edges.js
// Rebond du navigateur en bas de page (Safari / Chrome Mac, iPhone, iPad).
//
// - Couleur : la zone vide qui apparaît sous le footer prend la couleur du
//   footer. Cette zone affiche le fond de <html> : on lui donne la couleur du
//   footer quand on est dans la moitié basse de la page.
// - Barre d'accent : tout en bas de la page, elle passe en position fixe
//   (sans décalage visible). Pendant le rebond, les éléments fixes ne bougent
//   pas : elle reste collée au bas de l'écran et le footer a l'air de s'étirer.
//
// Haut de page : sur un hero photo / vidéo ([data-nav-hero] > .img_wrapper),
// le média est figé pile en haut de page (voir initHeroFreeze).
//
// Repérage automatique, ou attribut Webflow pour forcer :
//   data-overscroll-pin   sur l'élément du footer à garder en bas

const FOOTER_SELECTOR = "footer, .footer_component";
const FOOTER_PIN_SELECTOR = "[data-overscroll-pin], .footer_accent";

function isOpaque(color) {
  if (!color || color === "transparent") return false;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return true;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length < 4 || parseFloat(parts[3]) > 0;
}

function bgOf(el) {
  for (let n = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (isOpaque(bg)) return bg;
  }
  return null;
}

const PIN_STYLES = ["position", "left", "right", "bottom", "top", "width", "zIndex"];

// ------------------------------------------------------------- haut : hero

// Rebond max couvert (px) : le média dépasse d'autant sous le hero (rogné).
const HERO_EXTRA = 160;
// En remontant, distance du haut (px) à partir de laquelle le média est figé
const HERO_ANTICIPATE = 400;
const HERO_SELECTOR = "[data-nav-hero]";
const HERO_MEDIA_SELECTOR = "[data-overscroll-stretch], .img_wrapper";

// Hero photo / vidéo : pile en haut de page, le média passe en position fixe
// à l'endroit exact où il est (aucun saut). Pendant le rebond, il reste figé
// en haut de l'écran pendant que la page descend ; le hero le rogne à son
// bord bas (clip-path, qui rogne aussi les éléments fixes). Ne dépend pas
// de la valeur du rebond (que les navigateurs Mac ne donnent pas).
function initHeroFreeze() {
  const hero = document.querySelector(HERO_SELECTOR);
  if (!hero) return;
  const media = hero.querySelector(HERO_MEDIA_SELECTOR);
  if (!media || getComputedStyle(media).position !== "absolute") return;

  // Ouvert vers le haut (le média couvre la zone du rebond), rogné ailleurs
  hero.style.clipPath = `inset(-100vh 0 0 0)`;
  // Le média dépasse sous le hero : de quoi couvrir le bas pendant le rebond
  media.style.bottom = `-${HERO_EXTRA}px`;

  let frozen = false;
  let lastY = window.scrollY;
  let box = null; // position du média au repos, en coordonnées de page

  // Position "normale" du média (mesurée quand il n'est pas figé)
  function measure() {
    const r = media.getBoundingClientRect();
    box = { top: r.top + window.scrollY, left: r.left, width: r.width, height: r.height };
  }

  function freeze(y) {
    // Exactement là où il serait sans le figer : aucun saut, quel que soit y
    media.style.top = `${box.top - y}px`;
    if (frozen) return;
    Object.assign(media.style, {
      position: "fixed",
      left: `${box.left}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      bottom: "auto",
    });
    frozen = true;
  }

  function release() {
    if (!frozen) return;
    Object.assign(media.style, {
      position: "",
      top: "",
      left: "",
      width: "",
      height: "",
      bottom: `-${HERO_EXTRA}px`,
    });
    frozen = false;
  }

  // Avec l'inertie, la page arrive à 0 déjà lancée et rebondit aussitôt :
  // figer à 0 serait trop tard d'une image. On fige donc dès qu'on remonte
  // près du haut, en suivant le scroll ; arrivé à 0, le média est déjà fixe.
  // En redescendant, il reprend aussitôt sa place normale.
  // Synchrone (pas de requestAnimationFrame) pour ne perdre aucune image.
  function onScroll() {
    const y = window.scrollY;
    const goingUp = y < lastY;
    lastY = y;
    if (y <= 0 || (goingUp && y < HERO_ANTICIPATE)) freeze(Math.max(0, y));
    else release();
  }

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  // Au resize : on relâche, on remesure, puis on refige si besoin
  window.addEventListener(
    "resize",
    () => {
      release();
      measure();
      onScroll();
    },
    { passive: true },
  );
  onScroll();
}

// ------------------------------------------------------------- bas : footer

export function initOverscrollEdges() {
  initHeroFreeze();

  const footer = document.querySelector(FOOTER_SELECTOR);
  if (!footer) return;

  const root = document.documentElement;
  const pin = footer.querySelector(FOOTER_PIN_SELECTOR);
  const footerColor = bgOf(footer);
  let pinned = false;
  let ticking = false;

  function setPinned(on) {
    if (!pin || on === pinned) return;
    if (on) {
      Object.assign(pin.style, {
        position: "fixed",
        left: "0",
        right: "0",
        bottom: "0",
        top: "auto",
        width: "100%",
        zIndex: "1",
      });
    } else {
      PIN_STYLES.forEach((p) => (pin.style[p] = ""));
    }
    pinned = on;
  }

  function update() {
    ticking = false;
    const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
    const y = window.scrollY;

    // Fond de <html> : couleur du footer dans la moitié basse, sinon défaut
    const color = footerColor && y >= maxScroll / 2 ? footerColor : "";
    if (root.style.backgroundColor !== color) root.style.backgroundColor = color;

    setPinned(maxScroll > 0 && y >= maxScroll - 1);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll, { once: true });
  update();
}
