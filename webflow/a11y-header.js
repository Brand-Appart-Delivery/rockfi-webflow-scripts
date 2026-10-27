// Accessibilité du header (script de site Webflow "a11yheader", footer).
// - Nomme le logo, le bouton menu, les sous-menus et les sélecteurs de langue (FR / EN selon <html lang>).
// - Retire le href="#" que Webflow ajoute sur le texte des langues (div dans le lien).
// Relancé après l'init Webflow, qui pose aria-label="home" / "menu" en anglais.
(function () {
  var en = /^en/i.test(document.documentElement.lang);
  var L = en
    ? { home: "RockFi home", menu: "Open menu", lang: "Choose language", sub: " (submenu)" }
    : { home: "Accueil RockFi", menu: "Ouvrir le menu", lang: "Choisir la langue", sub: " (sous-menu)" };

  function run() {
    document.querySelectorAll(".link_locale[href]").forEach(function (el) {
      el.removeAttribute("href");
    });
    document.querySelectorAll(".w-nav-brand").forEach(function (el) {
      el.setAttribute("aria-label", L.home);
    });
    document.querySelectorAll(".w-nav-button").forEach(function (el) {
      el.setAttribute("aria-label", L.menu);
    });
    document.querySelectorAll(".w-dropdown-toggle").forEach(function (el) {
      var text = el.textContent.replace(/\s+/g, " ").trim();
      el.setAttribute("aria-label", text ? text + L.sub : L.lang);
    });
  }

  window.Webflow = window.Webflow || [];
  window.Webflow.push(run);
  window.addEventListener("load", run);
})();
