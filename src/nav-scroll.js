// src/nav-scroll.js
// Desktop étroit : quand les liens de la nav ne tiennent plus, la zone
// .navbar_menu défile horizontalement (voir nav.scss). Ce module :
//   - pose .is-fade-left / .is-fade-right selon ce qui dépasse, pour le fondu ;
//   - fait défiler la zone à la molette verticale quand la souris est dessus
//     (sinon seuls les trackpads pourraient la faire défiler) ;
//   - amène le lien de la page courante dans la zone visible au chargement.

const DESKTOP = "(min-width: 992px)";

export function initNavScroll() {
  const menu = document.querySelector(".navbar_menu");
  if (!menu) return;

  const desktop = window.matchMedia(DESKTOP);

  function update() {
    const max = menu.scrollWidth - menu.clientWidth;
    const scrollable = desktop.matches && max > 1;
    menu.classList.toggle("is-fade-left", scrollable && menu.scrollLeft > 1);
    menu.classList.toggle("is-fade-right", scrollable && menu.scrollLeft < max - 1);
  }

  menu.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(update).observe(menu);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

  // Molette verticale → défilement horizontal, tant que la zone peut encore
  // défiler dans ce sens ; au bout, la page reprend la main.
  menu.addEventListener(
    "wheel",
    (e) => {
      if (!desktop.matches || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = menu.scrollWidth - menu.clientWidth;
      if (max <= 1) return;
      const atStart = menu.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = menu.scrollLeft >= max - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      e.stopPropagation(); // Lenis ne doit pas faire défiler la page en même temps
      menu.scrollLeft += e.deltaY;
    },
    { passive: false },
  );

  // Lien de la page courante visible dès l'arrivée
  const current = menu.querySelector(".w--current");
  if (current && desktop.matches) {
    const left = current.offsetLeft - menu.offsetLeft;
    if (left + current.offsetWidth > menu.clientWidth) {
      menu.scrollLeft = left - (menu.clientWidth - current.offsetWidth) / 2;
    }
  }

  update();
}
