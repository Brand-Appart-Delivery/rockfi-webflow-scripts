// Typographie FR (script de site Webflow "frtypo", footer).
// Sur les pages FR uniquement : "90%" ou "90 %" devient "90 %" avec une espace insécable,
// pour que le nombre et le % ne soient jamais séparés en fin de ligne.
// Couvre le texte riche du CMS (articles) et les contenus chargés ensuite (Finsweet, compteurs).
(function () {
  if (!/^fr/i.test(document.documentElement.lang)) return;
  var RX = /(\d)[  ]?%/g;
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|NOSCRIPT)$/;

  function fix(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.parentNode && SKIP.test(n.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf("%") > -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    var node;
    while ((node = walker.nextNode())) {
      var next = node.nodeValue.replace(RX, "$1 %");
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function start() {
    fix(document.body);
    var timer;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { fix(document.body); }, 200);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
