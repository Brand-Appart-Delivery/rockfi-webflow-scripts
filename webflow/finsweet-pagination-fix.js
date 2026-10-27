// Script site Webflow (head) : "FinsweetPaginationFix"
// Finsweet List en mode load more (fs-list-load="more") affiche toujours la page 1,
// même sur les URLs ?xxxx_page=N générées par la pagination Webflow.
// Sur ces URLs : on nettoie l'adresse, on pointe la canonical vers la page propre
// et on passe la page en noindex pour éviter le contenu dupliqué.
(function () {
  var params = new URLSearchParams(location.search);
  var keys = [];
  params.forEach(function (v, k) {
    if (/^[a-z0-9]+_page$/i.test(k)) keys.push(k);
  });
  if (!keys.length) return;

  function fix() {
    if (!document.querySelector('[fs-list-load="more"]')) return;

    keys.forEach(function (k) { params.delete(k); });
    var qs = params.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);

    var path = location.pathname.replace(/\/+$/, '') || '/';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://www.rockfi.fr' + path;

    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = 'noindex, follow';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix);
  else fix();
})();
