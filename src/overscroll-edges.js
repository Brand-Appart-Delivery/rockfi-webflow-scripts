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
  let ticking = false;

  function setFrozen(on) {
    if (on === frozen) return;
    if (on) {
      const r = media.getBoundingClientRect();
      Object.assign(media.style, {
        position: "fixed",
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        bottom: "auto",
      });
    } else {
      Object.assign(media.style, {
        position: "",
        top: "",
        left: "",
        width: "",
        height: "",
        bottom: `-${HERO_EXTRA}px`,
      });
    }
    frozen = on;
  }

  function update() {
    ticking = false;
    setFrozen(window.scrollY <= 0);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  // Au resize : on relâche puis on refige aux nouvelles dimensions
  window.addEventListener(
    "resize",
    () => {
      setFrozen(false);
      onScroll();
    },
    { passive: true },
  );
  update();
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
