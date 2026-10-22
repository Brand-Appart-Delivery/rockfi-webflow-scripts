import { t } from "./utils/i18n.js";

export function initNavMenuLabel() {
  const btn = document.querySelector(".navbar_menu-button");
  const label = btn && btn.querySelector(".menu-icon .text");
  if (!btn || !label || label.querySelector(".menu-label_mask")) return;

  // Remplace "Menu" par deux libellés superposés dans un masque
  label.innerHTML = `
    <span class="menu-label_mask" aria-hidden="true">
      <span class="menu-label_item is-open">${t("menu.open")}</span>
      <span class="menu-label_item is-close">${t("menu.close")}</span>
    </span>
  `;

  // Le texte visible est masqué aux lecteurs d'écran : on synchronise l'aria-label
  const syncAria = () => {
    btn.setAttribute(
      "aria-label",
      btn.classList.contains("w--open") ? t("menu.ariaClose") : t("menu.ariaOpen")
    );
  };

  new MutationObserver(syncAria).observe(btn, {
    attributes: true,
    attributeFilter: ["class"],
  });
  syncAria();
}