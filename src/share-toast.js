// src/share-toast.js

import { t } from "./utils/i18n.js";

function showToast(message) {
  let toast = document.querySelector(".toast-copy");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast-copy";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

function getPageUrl() {
  const canonical = document.querySelector('link[rel="canonical"]');
  const url = canonical ? canonical.href : window.location.href;
  return url.split("#")[0];
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    ok ? resolve() : reject();
  });
}

function initShareToast() {
  document.querySelectorAll(".link-page").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      copyText(getPageUrl())
        .then(() => showToast(t("share.copied")))
        .catch(() => showToast(t("share.error")));
    });
  });

  document.querySelectorAll(".link-page-linkedin").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const share =
        "https://www.linkedin.com/feed/?shareActive=true&shareUrl=" +
        encodeURIComponent(getPageUrl());
      window.open(share, "_blank", "noopener,noreferrer");
    });
  });
}
export { initShareToast };