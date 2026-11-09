(() => {
  // src/utils/on-ready.js
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // src/utils/scroll-refresh.js
  var timer = null;
  var dueAt = 0;
  function requestScrollRefresh(delay = 150) {
    if (typeof window.ScrollTrigger === "undefined") return;
    const target = Date.now() + delay;
    if (timer && target <= dueAt) return;
    clearTimeout(timer);
    dueAt = target;
    timer = setTimeout(() => {
      timer = null;
      window.ScrollTrigger.refresh();
    }, delay);
  }

  // src/utils/motion-preference.js
  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // src/core.js
  var SMOOTH_SCROLL_ENABLED = false;
  var lenisInstance = null;
  var ANCHOR_DURATION = 2;
  var HASH_LOAD_DELAY = 400;
  var easeInOutCubic = (t2) => t2 < 0.5 ? 4 * t2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 3) / 2;
  function getAnchorOffset() {
    const nav = document.querySelector(".nav_fixed");
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    return -navHeight;
  }
  function scrollToHash(hash, { instant = false } = {}) {
    if (!hash || hash === "#") return false;
    let target = null;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return false;
    }
    if (!target) return false;
    const offset = getAnchorOffset();
    if (lenisInstance) {
      lenisInstance.scrollTo(target, {
        offset,
        duration: instant ? 0 : ANCHOR_DURATION,
        easing: easeInOutCubic,
        immediate: instant,
        // Lenis ignore scrollTo() quand il est arrêté (scroll bloqué par un menu
        // ou un dropdown ouvert) : force permet quand même de suivre l'ancre.
        force: true
      });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: instant ? "auto" : "smooth" });
    }
    return true;
  }
  function initAnchors() {
    document.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest && e.target.closest("a[href*='#']");
        if (!link) return;
        const url = new URL(link.href, window.location.href);
        const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
        if (!samePage || !url.hash || url.hash === "#") return;
        if (scrollToHash(url.hash)) {
          e.preventDefault();
          e.stopPropagation();
          history.pushState(null, "", url.hash);
        }
      },
      true
    );
    if (window.location.hash) {
      const hash = window.location.hash;
      window.scrollTo(0, 0);
      const go = () => {
        if (window.scrollY > 50) return;
        scrollToHash(hash);
        setTimeout(
          () => scrollToHash(hash, { instant: true }),
          ANCHOR_DURATION * 1e3 + 100
        );
      };
      const start = () => setTimeout(go, HASH_LOAD_DELAY);
      if (document.readyState === "complete") {
        start();
      } else {
        window.addEventListener("load", start, { once: true });
      }
    }
  }
  function initLenis() {
    if (lenisInstance) return lenisInstance;
    if (!SMOOTH_SCROLL_ENABLED) return null;
    if (typeof window.Lenis === "undefined") return null;
    if (prefersReducedMotion()) return null;
    lenisInstance = new window.Lenis({
      duration: 1.2,
      smoothWheel: true,
      anchors: false
    });
    const hasGsap = typeof window.gsap !== "undefined";
    const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";
    if (hasGsap) {
      if (hasScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        lenisInstance.on("scroll", window.ScrollTrigger.update);
      }
      window.gsap.ticker.add((time) => lenisInstance.raf(time * 1e3));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
    if (typeof ResizeObserver !== "undefined") {
      let lastHeight = 0;
      let timer2 = null;
      const recalc = () => {
        timer2 = null;
        const height = document.body.scrollHeight;
        if (height === lastHeight) return;
        lastHeight = height;
        lenisInstance.resize();
        requestScrollRefresh(0);
      };
      new ResizeObserver(() => {
        clearTimeout(timer2);
        timer2 = setTimeout(recalc, 150);
      }).observe(document.body);
    }
    return lenisInstance;
  }
  function getLenis() {
    return lenisInstance;
  }
  function init() {
    initLenis();
    initAnchors();
  }

  // src/collapse.js
  function initCollapses() {
    const collapses = document.querySelectorAll("[data-collapse]");
    collapses.forEach((el) => {
      const trigger = el.querySelector("[data-collapse-trigger]");
      const content = el.querySelector("[data-collapse-content]");
      if (!trigger || !content) return;
      trigger.addEventListener("click", () => {
        const isOpen = el.classList.contains("is-open");
        el.classList.toggle("is-open", !isOpen);
      });
    });
  }

  // src/tag-reveal.js
  var SVG_NS = "http://www.w3.org/2000/svg";
  var DEFAULT_STAGGER = 0.12;
  var MAX_DELAY = 3;
  function createFadeGradient(svg, color) {
    const gradientId = `tag-trace-${Math.random().toString(36).slice(2, 9)}`;
    const gradient = document.createElementNS(SVG_NS, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    [
      { offset: "0", opacity: "0" },
      { offset: "0.55", opacity: "0.5" },
      { offset: "0.85", opacity: "1" },
      { offset: "1", opacity: "0" }
    ].forEach(({ offset, opacity }) => {
      const stop = document.createElementNS(SVG_NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      stop.setAttribute("stop-opacity", opacity);
      gradient.appendChild(stop);
    });
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.appendChild(gradient);
    svg.appendChild(defs);
    return { gradient };
  }
  function buildTraceSvg(tag) {
    const width = tag.offsetWidth;
    const height = tag.offsetHeight;
    if (!width || !height) return null;
    const computed = getComputedStyle(tag);
    const radius = Math.min(parseFloat(computed.borderRadius) || 0, height / 2);
    const strokeWidth = parseFloat(tag.dataset.tagTraceWidth) || 1;
    const inset = strokeWidth / 2;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", inset);
    rect.setAttribute("y", inset);
    rect.setAttribute("width", width - strokeWidth);
    rect.setAttribute("height", height - strokeWidth);
    rect.setAttribute("rx", Math.max(radius - inset, 0));
    rect.setAttribute("ry", Math.max(radius - inset, 0));
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(rect);
    return { svg, rect };
  }
  function animateTag(tag, delay = 0) {
    if (typeof window.gsap === "undefined") return;
    if (tag.dataset.tagTraced) return;
    const built = buildTraceSvg(tag);
    if (!built) return;
    tag.dataset.tagTraced = "1";
    const { svg, rect } = built;
    if (getComputedStyle(tag).position === "static") {
      tag.style.position = "relative";
    }
    const borderWidth = parseFloat(getComputedStyle(tag).borderWidth) || 0;
    svg.style.inset = `-${borderWidth}px`;
    tag.appendChild(svg);
    const totalLength = rect.getTotalLength();
    const segmentLength = parseFloat(tag.dataset.tagTraceLength) || totalLength * 0.22;
    const travelRatio = Math.min(Math.max(parseFloat(tag.dataset.tagTraceTravel) || 0.5, 0.1), 1);
    const travelDuration = parseFloat(tag.dataset.tagTraceDuration) || 0.35;
    const endDuration = parseFloat(tag.dataset.tagTraceEndDuration) || 0.15;
    const color = tag.dataset.tagTraceColor || "#1A1A1A";
    const baseWidth = parseFloat(tag.dataset.tagTraceWidth) || 1;
    const headEnd = Math.max(totalLength * travelRatio, segmentLength + 1);
    const growDuration = Math.min(travelDuration * 0.25, 0.12);
    const { gradient } = createFadeGradient(svg, color);
    rect.style.stroke = `url(#${gradient.id})`;
    function setIntensity(i) {
      rect.style.strokeOpacity = i;
      rect.setAttribute("stroke-width", baseWidth * (0.7 + 0.8 * i));
    }
    function setSegment(start, length) {
      rect.style.strokeDasharray = `${length} ${totalLength - length}`;
      rect.style.strokeDashoffset = `${-start}`;
    }
    function updateGradient(start, length) {
      const p1 = rect.getPointAtLength((start % totalLength + totalLength) % totalLength);
      const p2 = rect.getPointAtLength(((start + length) % totalLength + totalLength) % totalLength);
      gradient.setAttribute("x1", p1.x);
      gradient.setAttribute("y1", p1.y);
      gradient.setAttribute("x2", p2.x);
      gradient.setAttribute("y2", p2.y);
    }
    setSegment(0, 0);
    setIntensity(0);
    let currentLength = 0;
    const tl = window.gsap.timeline({ delay });
    const growProxy = { len: 0 };
    tl.to(growProxy, {
      len: segmentLength,
      duration: growDuration,
      ease: "power1.in",
      onUpdate: () => {
        currentLength = growProxy.len;
        setSegment(0, currentLength);
        updateGradient(0, currentLength);
      }
    });
    const travelProxy = { pos: segmentLength };
    tl.to(travelProxy, {
      pos: headEnd,
      duration: travelDuration,
      ease: "power1.inOut",
      onUpdate: () => {
        const start = travelProxy.pos - currentLength;
        setSegment(start, currentLength);
        updateGradient(start, currentLength);
      }
    });
    const shrinkProxy = { len: segmentLength };
    tl.to(shrinkProxy, {
      len: 0,
      duration: endDuration,
      ease: "power2.in",
      onUpdate: () => {
        currentLength = shrinkProxy.len;
        const start = headEnd - currentLength;
        setSegment(start, currentLength);
        updateGradient(start, currentLength);
      }
    });
    const peakTime = growDuration + travelDuration * 0.45;
    const fx = { i: 0 };
    tl.to(fx, { i: 1, duration: peakTime, ease: "sine.out", onUpdate: () => setIntensity(fx.i) }, 0);
    tl.to(
      fx,
      {
        i: 0,
        duration: growDuration + travelDuration + endDuration - peakTime,
        ease: "sine.in",
        onUpdate: () => setIntensity(fx.i)
      },
      peakTime
    );
    tl.call(() => svg.remove());
  }
  function initTagReveal(root = document) {
    if (typeof window.gsap === "undefined") return;
    const observed = /* @__PURE__ */ new WeakSet();
    let queueIndex = 0;
    let resetTimer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => {
          const ra = a.target.getBoundingClientRect();
          const rb = b.target.getBoundingClientRect();
          return ra.top - rb.top || ra.left - rb.left;
        });
        visible.forEach((entry) => {
          const tag = entry.target;
          observer.unobserve(tag);
          const stagger = parseFloat(tag.dataset.tagTraceStagger) || DEFAULT_STAGGER;
          const delay = Math.min(queueIndex * stagger, MAX_DELAY);
          queueIndex += 1;
          animateTag(tag, delay);
          if (!tag.dataset.tagTraced) observed.delete(tag);
        });
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          queueIndex = 0;
        }, 300);
      },
      { threshold: 0.1 }
    );
    function observeAll(scope) {
      scope.querySelectorAll(".tag-animated").forEach((tag) => {
        if (observed.has(tag) || tag.dataset.tagTraced) return;
        observed.add(tag);
        observer.observe(tag);
      });
    }
    observeAll(root);
    new MutationObserver(() => observeAll(document)).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // src/blog-accordion.js
  function initBlogAccordion() {
    const accordions = document.querySelectorAll(".accordion1_component");
    if (!accordions.length) return;
    accordions.forEach((accordion) => {
      const top = accordion.querySelector(".accordion1_top");
      const bottom = accordion.querySelector(".accordion1_bottom");
      const icon = accordion.querySelector(".accordion1_icon");
      if (!top || !bottom) return;
      bottom.style.height = "0px";
      top.addEventListener("click", () => {
        if (bottom.style.height !== "0px") {
          bottom.style.height = "0px";
          if (icon) icon.style.transform = "rotateZ(0deg)";
        } else {
          bottom.style.height = bottom.scrollHeight + "px";
          if (icon) icon.style.transform = "rotateZ(180deg)";
        }
      });
    });
  }

  // src/utils/i18n.js
  var DEFAULT_LANG = "fr";
  var LOCALES = {
    fr: { tag: "fr-FR", label: "Fran\xE7ais", prefix: "" },
    en: { tag: "en-GB", label: "English", prefix: "/en" }
  };
  var DICT = {
    fr: {
      // Nav
      "menu.open": "Menu",
      "menu.close": "Fermer",
      "menu.ariaOpen": "menu",
      "menu.ariaClose": "fermer le menu",
      // Partage
      "share.copied": "Lien bien copi\xE9",
      "share.error": "Impossible de copier le lien",
      // Vidéo
      "video.watch": "Voir la vid\xE9o",
      "video.player": "Lecteur vid\xE9o",
      "video.background": "Vid\xE9o d'arri\xE8re-plan",
      "video.play": "Lire",
      "video.pause": "Pause",
      "video.mute": "Couper le son",
      "video.unmute": "Activer le son",
      "video.enableCaptions": "Activer les sous-titres",
      "video.disableCaptions": "D\xE9sactiver les sous-titres",
      "video.enterFullscreen": "Plein \xE9cran",
      "video.exitFullscreen": "Quitter le plein \xE9cran",
      // Galerie
      "slider.region": "carrousel",
      "slider.slide": "diapositive",
      "slider.label": "Galerie d'images",
      "slider.prev": "Image pr\xE9c\xE9dente",
      "slider.next": "Image suivante",
      "slider.position": "{index} sur {total}",
      // Tableau comparatif
      "compare.na": "Non communiqu\xE9",
      "compare.yes": "Oui",
      "compare.rival": "Concurrent",
      // Contrôle des emails
      "email.invalid": "Cette adresse email n'est pas valide.",
      "email.disposable": "Les adresses email temporaires ne sont pas accept\xE9es. Merci d'utiliser votre adresse habituelle.",
      "email.fake": "Merci de saisir votre v\xE9ritable adresse email.",
      "email.suggest": "Vouliez-vous dire {email} ?"
    },
    en: {
      "menu.open": "Menu",
      "menu.close": "Close",
      "menu.ariaOpen": "menu",
      "menu.ariaClose": "close the menu",
      "share.copied": "Link copied",
      "share.error": "Unable to copy the link",
      "video.watch": "Watch the video",
      "video.player": "Video player",
      "video.background": "Background video",
      "video.play": "Play",
      "video.pause": "Pause",
      "video.mute": "Mute",
      "video.unmute": "Unmute",
      "video.enableCaptions": "Enable captions",
      "video.disableCaptions": "Disable captions",
      "video.enterFullscreen": "Enter fullscreen",
      "video.exitFullscreen": "Exit fullscreen",
      "slider.region": "carousel",
      "slider.slide": "slide",
      "slider.label": "Image gallery",
      "slider.prev": "Previous image",
      "slider.next": "Next image",
      "slider.position": "{index} of {total}",
      "compare.na": "Not disclosed",
      "compare.yes": "Yes",
      "compare.rival": "Competitor",
      "email.invalid": "This email address is not valid.",
      "email.disposable": "Temporary email addresses are not accepted. Please use your usual address.",
      "email.fake": "Please enter your real email address.",
      "email.suggest": "Did you mean {email}?"
    }
  };
  function getLang() {
    const code = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return LOCALES[code] ? code : DEFAULT_LANG;
  }
  function getLocaleTag() {
    return LOCALES[getLang()].tag;
  }
  function getLangLabel() {
    return LOCALES[getLang()].label;
  }
  function t(key, vars) {
    var _a, _b;
    const text2 = (_b = (_a = DICT[getLang()][key]) != null ? _a : DICT[DEFAULT_LANG][key]) != null ? _b : key;
    if (!vars) return text2;
    return text2.replace(
      /\{(\w+)\}/g,
      (match, name) => name in vars ? String(vars[name]) : match
    );
  }
  function getPathWithoutLocale(pathname = window.location.pathname) {
    for (const { prefix } of Object.values(LOCALES)) {
      if (!prefix) continue;
      if (pathname === prefix) return "/";
      if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
    }
    return pathname;
  }

  // src/share-toast.js
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
  function copyText(text2) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text2);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text2;
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
        copyText(getPageUrl()).then(() => showToast(t("share.copied"))).catch(() => showToast(t("share.error")));
      });
    });
    document.querySelectorAll(".link-page-linkedin").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const share = "https://www.linkedin.com/feed/?shareActive=true&shareUrl=" + encodeURIComponent(getPageUrl());
        window.open(share, "_blank", "noopener,noreferrer");
      });
    });
  }

  // src/blog-toc.js
  var NAV_OFFSET_DESKTOP = 164;
  var NAV_OFFSET_MOBILE = 164;
  var TOC_LABEL_REGEX = /\s*\[toc:([^\]]+)\]\s*$/i;
  var TOC_SKIP_VALUE = "-";
  var DESKTOP_MIN = 992;
  var CHEVRON_SVG = '<svg class="toc-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function getNavOffset() {
    return window.innerWidth < DESKTOP_MIN ? NAV_OFFSET_MOBILE : NAV_OFFSET_DESKTOP;
  }
  function slugify(text2) {
    return text2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function extractTocLabel(heading) {
    const rawText = heading.textContent;
    const match = rawText.match(TOC_LABEL_REGEX);
    if (!match) {
      return { label: rawText.trim(), skip: false };
    }
    const cleanText = rawText.replace(TOC_LABEL_REGEX, "").trim();
    heading.textContent = cleanText;
    const value = match[1].trim();
    if (value === TOC_SKIP_VALUE) {
      return { label: null, skip: true };
    }
    return { label: value, skip: false };
  }
  function wrapSections(root) {
    const headings = Array.from(root.querySelectorAll(":scope > h2"));
    return headings.map((heading) => {
      const { label, skip } = extractTocLabel(heading);
      const baseId = slugify(heading.textContent);
      let id = baseId;
      let n = 1;
      while (document.getElementById(id)) {
        id = `${baseId}-${n}`;
        n += 1;
      }
      const wrapper = document.createElement("div");
      wrapper.id = id;
      wrapper.dataset.tocSkip = skip ? "true" : "false";
      if (label) wrapper.dataset.tocLabel = label;
      wrapper.style.scrollMarginTop = "5rem";
      heading.before(wrapper);
      wrapper.appendChild(heading);
      let next = wrapper.nextSibling;
      while (next && !(next.nodeType === 1 && next.tagName === "H2")) {
        const toMove = next;
        next = next.nextSibling;
        wrapper.appendChild(toMove);
      }
      return wrapper;
    });
  }
  function buildLinks(container, sections) {
    const itemsHTML = sections.filter((section) => section.dataset.tocSkip !== "true").map((section) => {
      const title = section.dataset.tocLabel;
      if (!title) return "";
      return `
        <a href="#${section.id}" class="toc_link w-inline-block">
          <div class="toc_link-text">${title}</div>
        </a>
      `;
    }).join("");
    container.innerHTML = `<div class="toc-wrapper_inner">${itemsHTML}</div>`;
  }
  function insertChevron(heading) {
    if (heading.querySelector(".toc-chevron")) return;
    heading.insertAdjacentHTML("beforeend", CHEVRON_SVG);
  }
  function bindMobileToggle(toc, heading) {
    heading.setAttribute("role", "button");
    heading.setAttribute("tabindex", "0");
    heading.setAttribute("aria-expanded", "false");
    function toggle() {
      const isOpen = toc.classList.toggle("is-open");
      heading.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    heading.addEventListener("click", toggle);
    heading.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  }
  function bindResizeReset(toc, heading) {
    let wasDesktop = window.innerWidth >= DESKTOP_MIN;
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const isDesktop = window.innerWidth >= DESKTOP_MIN;
        if (isDesktop !== wasDesktop) {
          toc.classList.remove("is-open");
          heading.setAttribute("aria-expanded", "false");
          wasDesktop = isDesktop;
        }
      }, 150);
    });
  }
  function closeTocInstant(toc, heading) {
    toc.classList.add("no-transition");
    toc.classList.remove("is-open");
    heading.setAttribute("aria-expanded", "false");
    void toc.offsetHeight;
    toc.classList.remove("no-transition");
  }
  function bindClickScroll(container, toc, heading) {
    container.querySelectorAll(".toc_link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = link.getAttribute("href").slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        closeTocInstant(toc, heading);
        const offset = getNavOffset();
        const rawTop = target.getBoundingClientRect().top + window.scrollY;
        const targetY = rawTop - offset;
        const lenis = getLenis();
        if (lenis) {
          lenis.scrollTo(targetY, { duration: 1 });
        } else {
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
        history.pushState(null, "", `#${id}`);
      });
    });
  }
  function bindActiveHighlight(links, sections) {
    const observedSections = sections.filter((s) => s.dataset.tocSkip !== "true");
    const linkByHref = /* @__PURE__ */ new Map();
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        linkByHref.set(href.slice(1), link);
      }
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = linkByHref.get(entry.target.id);
          if (!link) return;
          links.forEach((l) => l.classList.remove("w--current"));
          link.classList.add("w--current");
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0
      }
    );
    observedSections.forEach((section) => observer.observe(section));
  }
  var hasInitialized = false;
  function init2() {
    if (hasInitialized) return;
    hasInitialized = true;
    const root = document.querySelector(".rich-text_blog");
    const container = document.querySelector(".toc-wrapper");
    const toc = document.querySelector(".toc");
    const heading = document.querySelector(".toc-heading");
    if (!root || !container || !toc || !heading) return;
    const sections = wrapSections(root);
    if (!sections.length) return;
    buildLinks(container, sections);
    insertChevron(heading);
    bindMobileToggle(toc, heading);
    bindResizeReset(toc, heading);
    const links = Array.from(container.querySelectorAll(".toc_link"));
    bindClickScroll(container, toc, heading);
    bindActiveHighlight(links, sections);
  }

  // src/embeds/table-enhance.js
  var TABLE_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[table(\s+split)?\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/table\](?:<\/p>)?/gi;
  function decodeEntities(str) {
    return str.replace(/&nbsp;/g, "\xA0").replace(/&amp;/g, "&");
  }
  function formatCell(cell) {
    return cell.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }
  function transformTable(html) {
    return html.replace(TABLE_BLOCK_REGEX, (match, splitFlag, body) => {
      const useSplit = Boolean(splitFlag);
      const lines = body.replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").split("\n").map((line) => decodeEntities(line).trim()).filter((line) => line && line !== "\u200D");
      const separator = lines.some((line) => line.includes("|")) ? "|" : ",";
      const rows = lines.map(
        (line) => line.split(separator).map((cell) => formatCell(cell.trim()))
      );
      if (!rows.length) return match;
      const [headerRow, ...bodyRows] = rows;
      const theadHTML = `<tr>${headerRow.map((cell) => `<th scope="col">${cell}</th>`).join("")}</tr>`;
      const tbodyHTML = bodyRows.map((row) => {
        if (!useSplit) {
          return `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
        }
        const [rowHeader, ...rest] = row;
        const cellsHTML = rest.map((cell) => `<td>${cell}</td>`).join("");
        return `<tr><th scope="row">${rowHeader}</th>${cellsHTML}</tr>`;
      }).join("");
      return `
      <div class="rt-table-wrap blog-embed_wrapper">
        <table class="rt-table${useSplit ? " rt-table--split" : ""}">
          <thead>${theadHTML}</thead>
          <tbody>${tbodyHTML}</tbody>
        </table>
      </div>
    `;
    });
  }

  // src/embeds/list-enhance.js
  var LIST_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[list\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/list\](?:<\/p>)?/gi;
  var BOLD_REGEX = /\[b\](.*?)\[\/b\]/gi;
  function applyBold(text2) {
    return text2.replace(BOLD_REGEX, '<strong class="rt-bold">$1</strong>');
  }
  function transformList(html) {
    return html.replace(LIST_BLOCK_REGEX, (match, body) => {
      const items = body.replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
      if (!items.length) return match;
      const itemsHTML = items.map(
        (item) => `
          <li class="rt-list-item">
            <span class="rt-list-bullet" aria-hidden="true"></span>
            <span class="rt-list-content">${applyBold(item)}</span>
          </li>
        `
      ).join("");
      return `<div class="blog-embed_wrapper"><ul class="rt-list rt-text" role="list">${itemsHTML}</ul></div>`;
    });
  }

  // src/embeds/calc-enhance.js
  var CALC_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[calc\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/calc\](?:<\/p>)?/gi;
  function transformCalc(html) {
    return html.replace(CALC_BLOCK_REGEX, (match, body) => {
      const lines = body.replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").split("\n").map((line) => line.replace(/&nbsp;/g, " ").trim()).filter((line) => line && line !== "\u200D");
      if (!lines.length) return match;
      const blocks = [];
      const noteLines = [];
      let currentBlock = null;
      let afterSeparator = false;
      lines.forEach((line) => {
        if (/^title:/i.test(line)) {
          currentBlock = { title: line.replace(/^title:/i, "").trim(), lines: [] };
          blocks.push(currentBlock);
          return;
        }
        if (/^-{3,}$/.test(line)) {
          afterSeparator = true;
          return;
        }
        if (afterSeparator) {
          noteLines.push(line);
          return;
        }
        if (currentBlock) {
          currentBlock.lines.push(line);
        }
      });
      const blocksHTML = blocks.map(
        (block) => `
          <div class="rt-calc-block">
            <h4 class="rt-calc-title">${block.title}</h4>
            ${block.lines.map((l) => `<p class="rt-calc-line">${l}</p>`).join("")}
          </div>
        `
      ).join("");
      const footerHTML = noteLines.length ? `
        <div class="rt-calc-footer">
          <p class="rt-calc-note">${noteLines.join(" ")}</p>
        </div>
      ` : "";
      return `
      <div class="blog-embed_wrapper">
        <div class="rt-calc">
          ${blocksHTML}
          ${footerHTML}
        </div>
      </div>
    `;
    });
  }

  // src/utils/parse-attrs.js
  var ATTR_REGEX = /(\w+)="([^"]*)"/g;
  function parseAttrs(attrString = "") {
    const attrs = {};
    let match;
    ATTR_REGEX.lastIndex = 0;
    while ((match = ATTR_REGEX.exec(attrString)) !== null) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }

  // src/embeds/button-enhance.js
  var BUTTON_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[button([^\]]*)\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/button\](?:<\/p>)?/gi;
  function buildIconSVG(idSuffix) {
    const raw = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<foreignObject x="-1.69982" y="-1.69494" width="7.55394" height="7.55321"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(1.23px);clip-path:url(#bgblur_0_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="2.46154" cx="2.07751" cy="2.08166" r="1.31507" transform="rotate(-180 2.07751 2.08166)" fill="white" fill-opacity="0.1"/>
<foreignObject x="5.81274" y="-0.110111" width="4.38428" height="4.38355"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(0.44px);clip-path:url(#bgblur_1_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="0.876712" cx="8.00524" cy="2.08166" r="1.31507" transform="rotate(-180 8.00524 2.08166)" fill="white"/>
<foreignObject x="10.142" y="-1.69494" width="7.55394" height="7.55321"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(1.23px);clip-path:url(#bgblur_2_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="2.46154" cx="13.9193" cy="2.08166" r="1.31507" transform="rotate(-180 13.9193 2.08166)" fill="white" fill-opacity="0.1"/>
<foreignObject x="-0.114994" y="5.80664" width="4.38428" height="4.38355"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(0.44px);clip-path:url(#bgblur_3_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="0.876712" cx="2.07751" cy="7.99841" r="1.31507" transform="rotate(-180 2.07751 7.99841)" fill="white" fill-opacity="0.1"/>
<foreignObject x="5.81274" y="5.80664" width="4.38428" height="4.38355"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(0.44px);clip-path:url(#bgblur_4_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="0.876712" cx="8.00524" cy="7.99841" r="1.31507" transform="rotate(-180 8.00524 7.99841)" fill="white"/>
<foreignObject x="11.7268" y="5.80664" width="4.38428" height="4.38355"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(0.44px);clip-path:url(#bgblur_5_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="0.876712" cx="13.9193" cy="7.99841" r="1.31507" transform="rotate(-180 13.9193 7.99841)" fill="white"/>
<foreignObject x="-1.69982" y="10.1408" width="7.55394" height="7.55321"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(1.23px);clip-path:url(#bgblur_6_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="2.46154" cx="2.07751" cy="13.9174" r="1.31507" transform="rotate(-180 2.07751 13.9174)" fill="white" fill-opacity="0.1"/>
<foreignObject x="5.81274" y="11.7256" width="4.38428" height="4.38355"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(0.44px);clip-path:url(#bgblur_7_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="0.876712" cx="8.00524" cy="13.9174" r="1.31507" transform="rotate(-180 8.00524 13.9174)" fill="white"/>
<foreignObject x="10.142" y="10.1408" width="7.55394" height="7.55321"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(1.23px);clip-path:url(#bgblur_8_27936_9718_clip_path);height:100%;width:100%"></div></foreignObject><circle data-figma-bg-blur-radius="2.46154" cx="13.9193" cy="13.9174" r="1.31507" transform="rotate(-180 13.9193 13.9174)" fill="white" fill-opacity="0.1"/>
<defs>
<clipPath id="bgblur_0_27936_9718_clip_path" transform="translate(1.69982 1.69494)"><circle cx="2.07751" cy="2.08166" r="1.31507" transform="rotate(-180 2.07751 2.08166)"/>
</clipPath><clipPath id="bgblur_1_27936_9718_clip_path" transform="translate(-5.81274 0.110111)"><circle cx="8.00524" cy="2.08166" r="1.31507" transform="rotate(-180 8.00524 2.08166)"/>
</clipPath><clipPath id="bgblur_2_27936_9718_clip_path" transform="translate(-10.142 1.69494)"><circle cx="13.9193" cy="2.08166" r="1.31507" transform="rotate(-180 13.9193 2.08166)"/>
</clipPath><clipPath id="bgblur_3_27936_9718_clip_path" transform="translate(0.114994 -5.80664)"><circle cx="2.07751" cy="7.99841" r="1.31507" transform="rotate(-180 2.07751 7.99841)"/>
</clipPath><clipPath id="bgblur_4_27936_9718_clip_path" transform="translate(-5.81274 -5.80664)"><circle cx="8.00524" cy="7.99841" r="1.31507" transform="rotate(-180 8.00524 7.99841)"/>
</clipPath><clipPath id="bgblur_5_27936_9718_clip_path" transform="translate(-11.7268 -5.80664)"><circle cx="13.9193" cy="7.99841" r="1.31507" transform="rotate(-180 13.9193 7.99841)"/>
</clipPath><clipPath id="bgblur_6_27936_9718_clip_path" transform="translate(1.69982 -10.1408)"><circle cx="2.07751" cy="13.9174" r="1.31507" transform="rotate(-180 2.07751 13.9174)"/>
</clipPath><clipPath id="bgblur_7_27936_9718_clip_path" transform="translate(-5.81274 -11.7256)"><circle cx="8.00524" cy="13.9174" r="1.31507" transform="rotate(-180 8.00524 13.9174)"/>
</clipPath><clipPath id="bgblur_8_27936_9718_clip_path" transform="translate(-10.142 -10.1408)"><circle cx="13.9193" cy="13.9174" r="1.31507" transform="rotate(-180 13.9193 13.9174)"/>
</clipPath></defs>
</svg>`;
    return raw.split("27936_9718").join(idSuffix).split('fill="white"').join('fill="currentColor"');
  }
  var buttonInstanceCounter = 0;
  function transformButton(html) {
    return html.replace(BUTTON_BLOCK_REGEX, (match, attrString, body) => {
      const attrs = parseAttrs(attrString);
      const href = attrs.href || "#";
      const label = body.replace(/<[^>]+>/g, "").trim();
      if (!label) return match;
      const showIcon = attrs.icon !== "false";
      buttonInstanceCounter += 1;
      const iconHTML = showIcon ? `<div class="rt-button-icon">${buildIconSVG(`rtbtn${buttonInstanceCounter}`)}</div>` : "";
      return `<div class="blog-embed_wrapper"><a href="${href}" class="rt-button">${iconHTML}<div>${label}</div></a></div>`;
    });
  }

  // src/embeds/quote-enhance.js
  var QUOTE_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[quote(?=[\s\]])([^\]]*)\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/quote\](?:<\/p>)?/gi;
  function transformQuote(html) {
    return html.replace(QUOTE_BLOCK_REGEX, (match, attrString, body) => {
      const attrs = parseAttrs(attrString);
      const text2 = body.replace(/<\/p>|<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim();
      if (!text2) return match;
      const name = attrs.name || "";
      const role = attrs.role || "";
      const img = attrs.img || "";
      const authorHTML = name || img ? `
          <div class="rt-quote-author">
            ${img ? `<img src="${img}" alt="${name}" class="rt-quote-avatar">` : ""}
            <div class="rt-quote-author-info">
              ${name ? `<p class="rt-quote-name">${name}</p>` : ""}
              ${role ? `<p class="rt-quote-role">${role}</p>` : ""}
            </div>
          </div>
        ` : "";
      return `
      <div class="blog-embed_wrapper">
        <div class="rt-quote">
          <p class="rt-quote-text">&ldquo;${text2}&rdquo;</p>
          ${authorHTML}
        </div>
      </div>
    `;
    });
  }

  // src/embeds/quote-large-enhance.js
  var QUOTE_LARGE_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[quote-large\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/quote-large\](?:<\/p>)?/gi;
  function transformQuoteLarge(html) {
    return html.replace(QUOTE_LARGE_BLOCK_REGEX, (match, body) => {
      const text2 = body.replace(/<\/p>|<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim();
      if (!text2) return match;
      return `
      <div class="blog-embed_wrapper">
        <blockquote class="rt-quote-large" data-text-reveal data-anim-stagger="0.06">&ldquo;${text2}&rdquo;</blockquote>
      </div>
    `;
    });
  }

  // src/embeds/slider-enhance.js
  var SLIDER_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[slider\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/slider\](?:<\/p>)?/gi;
  var CHEVRON_SVG2 = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M6.00003 4L10 8L6 12" stroke="#1A1A1A" stroke-miterlimit="16" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function buildSlidesHTML(body) {
    const lines = body.replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
    const total = lines.length;
    return lines.map((line, idx) => {
      const parts = line.split("|").map((s) => s.trim());
      const url = parts[0];
      const caption = parts[1] || "";
      if (!url) return "";
      const captionHTML = caption ? `<figcaption class="rt-slider-caption">${caption}</figcaption>` : "";
      return `
        <div class="rt-slider-item" role="group" aria-roledescription="${t("slider.slide")}" aria-label="${t("slider.position", { index: idx + 1, total })}">
          <img src="${url}" alt="${caption}" loading="lazy" draggable="false">
          ${captionHTML}
        </div>
      `;
    }).join("");
  }
  function transformSlider(html) {
    return html.replace(SLIDER_BLOCK_REGEX, (match, body) => {
      const slidesHTML = buildSlidesHTML(body);
      if (!slidesHTML) return match;
      return `
      <div class="rt-slider" role="region" aria-roledescription="${t("slider.region")}" aria-label="${t("slider.label")}" tabindex="0">
        <div class="rt-slider-track">${slidesHTML}</div>
        <div class="rt-slider-controls">
          <button type="button" class="rt-slider-prev" aria-label="${t("slider.prev")}">${CHEVRON_SVG2}</button>
          <button type="button" class="rt-slider-next" aria-label="${t("slider.next")}">${CHEVRON_SVG2}</button>
        </div>
      </div>
    `;
    });
  }
  function initOneSlider(el) {
    const track = el.querySelector(".rt-slider-track");
    const items = Array.from(el.querySelectorAll(".rt-slider-item"));
    const prevBtn = el.querySelector(".rt-slider-prev");
    const nextBtn = el.querySelector(".rt-slider-next");
    if (!track || !items.length) return;
    let index = 0;
    let currentOffset = 0;
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    const RESISTANCE = 3;
    const SWIPE_THRESHOLD_RATIO = 0.15;
    const FLICK_VELOCITY = 0.5;
    const TRANSITION = "transform 1.3s cubic-bezier(0.16, 1, 0.3, 1)";
    function getMaxOffset() {
      return Math.max(0, track.scrollWidth - el.clientWidth);
    }
    function getLiveOffset() {
      const style = window.getComputedStyle(track);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return -matrix.m41;
    }
    function setOffset(offset, withTransition) {
      track.style.transition = withTransition ? TRANSITION : "none";
      currentOffset = offset;
      track.style.transform = `translateX(-${offset}px)`;
    }
    function goToIndex(i, withTransition = true) {
      index = Math.min(Math.max(i, 0), items.length - 1);
      const maxOffset = getMaxOffset();
      const target = Math.min(items[index].offsetLeft, maxOffset);
      setOffset(target, withTransition);
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === items.length - 1;
    }
    if (prevBtn) prevBtn.addEventListener("click", () => goToIndex(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goToIndex(index + 1));
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToIndex(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToIndex(index + 1);
      }
    });
    let wheelTimer;
    let wheeling = false;
    el.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        if (!wheeling) {
          wheeling = true;
          currentOffset = getLiveOffset();
        }
        const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
        const maxOffset = getMaxOffset();
        let proposed = currentOffset + dx;
        if (proposed < 0) proposed = Math.max(-80, proposed / RESISTANCE);
        else if (proposed > maxOffset) proposed = Math.min(maxOffset + 80, maxOffset + (proposed - maxOffset) / RESISTANCE);
        setOffset(proposed, false);
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          wheeling = false;
          let nearest = 0;
          items.forEach((item, i) => {
            if (Math.abs(item.offsetLeft - currentOffset) < Math.abs(items[nearest].offsetLeft - currentOffset)) nearest = i;
          });
          goToIndex(nearest, true);
        }, 140);
      },
      { passive: false }
    );
    track.addEventListener("pointerdown", (e) => {
      const liveOffset = getLiveOffset();
      track.style.transition = "none";
      track.style.transform = `translateX(-${liveOffset}px)`;
      currentOffset = liveOffset;
      isDragging = true;
      startX = e.clientX;
      startOffset = currentOffset;
      lastX = e.clientX;
      lastTime = performance.now();
      velocity = 0;
      track.classList.add("is-dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastTime = now;
      const delta = e.clientX - startX;
      let proposed = startOffset - delta;
      const maxOffset = getMaxOffset();
      if (proposed < 0) {
        proposed = proposed / RESISTANCE;
      } else if (proposed > maxOffset) {
        proposed = maxOffset + (proposed - maxOffset) / RESISTANCE;
      }
      setOffset(proposed, false);
    });
    function endDrag(e) {
      var _a;
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove("is-dragging");
      const finalX = (_a = e.clientX) != null ? _a : lastX;
      const deltaX = finalX - startX;
      const threshold = Math.min(el.clientWidth * SWIPE_THRESHOLD_RATIO, 100);
      const isFlick = Math.abs(velocity) > FLICK_VELOCITY;
      if (Math.abs(deltaX) > threshold || isFlick) {
        const direction = deltaX > 0 || isFlick && velocity > 0 ? -1 : 1;
        goToIndex(index + direction, true);
      } else {
        goToIndex(index, true);
      }
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => goToIndex(index, false), 150);
    });
    goToIndex(0, false);
  }
  function initSliderListeners(root = document) {
    root.querySelectorAll(".rt-slider:not([data-slider-initialized])").forEach((el) => {
      el.setAttribute("data-slider-initialized", "true");
      initOneSlider(el);
    });
  }

  // src/embeds/video-enhance.js
  var VIDEO_BLOCK_REGEX = /(?:<p(?:\s[^>]*)?>)?\[video([^\]]*)\](?:<\/p>)?/gi;
  var getPlyrI18n = () => ({
    play: t("video.play"),
    pause: t("video.pause"),
    mute: t("video.mute"),
    unmute: t("video.unmute"),
    enableCaptions: t("video.enableCaptions"),
    disableCaptions: t("video.disableCaptions"),
    enterFullscreen: t("video.enterFullscreen"),
    exitFullscreen: t("video.exitFullscreen")
  });
  function getVideoInfo(src) {
    const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (ytMatch) return { type: "youtube", id: ytMatch[1] };
    const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { type: "vimeo", id: vimeoMatch[1] };
    return { type: "native", id: null };
  }
  function buildPlayerMarkup(src, poster, captions, title) {
    const info = getVideoInfo(src);
    const frameTitle = title || t("video.player");
    if (info.type === "youtube") {
      return `<div class="plyr__video-embed" data-plyr-provider="youtube" data-plyr-embed-id="${info.id}" title="${frameTitle}"></div>`;
    }
    if (info.type === "vimeo") {
      return `<div class="plyr__video-embed" data-plyr-provider="vimeo" data-plyr-embed-id="${info.id}" title="${frameTitle}"></div>`;
    }
    const posterAttr = poster ? ` poster="${poster}"` : "";
    const trackHTML = captions ? `<track kind="captions" label="${getLangLabel()}" srclang="${getLang()}" src="${captions}" default>` : "";
    return `<video playsinline preload="metadata"${posterAttr}><source src="${src}" type="video/mp4">${trackHTML}</video>`;
  }
  function buildGlassIconSVG(idSuffix) {
    const raw = `<svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<foreignObject x="-48" y="-48" width="144" height="144"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(24px);clip-path:url(#bgblur_0_102_1211_clip_path);height:100%;width:100%"></div></foreignObject><g data-figma-bg-blur-radius="48">
<rect width="48" height="48" rx="24" fill="white" fill-opacity="0.2"></rect>
<path fill-rule="evenodd" clip-rule="evenodd" d="M19.5 19.8599C19.5 18.9472 20.5008 18.388 21.2781 18.8663L28.0061 23.0066C28.7464 23.4622 28.7464 24.5382 28.0061 24.9938L21.2781 29.1341C20.5008 29.6124 19.5 29.0532 19.5 28.1405V19.8599Z" fill="white"></path>
</g>
<defs>
<clipPath id="bgblur_0_102_1211_clip_path" transform="translate(48 48)"><rect width="48" height="48" rx="24"></rect>
</clipPath></defs>
</svg>`;
    return raw.split("102_1211").join(idSuffix);
  }
  function formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  var videoInstanceCounter = 0;
  function transformVideo(html) {
    return html.replace(VIDEO_BLOCK_REGEX, (match, attrString) => {
      const attrs = parseAttrs(attrString);
      const src = attrs.src || "";
      const poster = attrs.poster || "";
      const captions = attrs.captions || "";
      const title = attrs.title || "";
      if (!src) return match;
      videoInstanceCounter += 1;
      const iconSVG = buildGlassIconSVG(`rtvid${videoInstanceCounter}`);
      return `
      <div class="rt-video">
        <div class="rt-video-player">${buildPlayerMarkup(src, poster, captions, title)}</div>
        <div class="rt-video-overlay">
          <div class="rt-video-gradient"></div>
          <div class="rt-video-cta">
            <button type="button" class="rt-video-play-glass" aria-label="${t("video.watch")}">${iconSVG}</button>
            <div class="rt-video-cta-meta">
              <span class="rt-video-cta-text">${t("video.watch")}</span>
              <span class="rt-video-cta-duration"></span>
            </div>
          </div>
        </div>
      </div>
    `;
    });
  }
  function initVideoListeners(root = document) {
    root.querySelectorAll(".rt-video:not([data-video-initialized])").forEach((el) => {
      var _a;
      el.setAttribute("data-video-initialized", "true");
      if (typeof window.Plyr === "undefined") return;
      const target = (_a = el.querySelector(".rt-video-player")) == null ? void 0 : _a.firstElementChild;
      if (!target) return;
      const hasCaptions = Boolean(el.querySelector("track"));
      const controls = [
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        ...hasCaptions ? ["captions"] : [],
        "fullscreen"
      ];
      const player = new window.Plyr(target, {
        controls,
        i18n: getPlyrI18n()
      });
      const glassBtn = el.querySelector(".rt-video-play-glass");
      const durationEl = el.querySelector(".rt-video-cta-duration");
      if (glassBtn) {
        glassBtn.addEventListener("click", () => player.play());
      }
      player.on("play", () => el.classList.add("is-playing"));
      player.on("pause", () => el.classList.remove("is-playing"));
      player.on("loadedmetadata", () => {
        const formatted = formatDuration(player.duration);
        if (formatted && durationEl) durationEl.textContent = formatted;
      });
    });
  }

  // src/embeds/index.js
  function initEmbeds(root = document) {
    const contentEl = root.querySelector(
      ".rich-text_blog:not([data-compare-table])"
    );
    if (!contentEl) return;
    let html = contentEl.innerHTML;
    html = transformTable(html);
    html = transformList(html);
    html = transformCalc(html);
    html = transformButton(html);
    html = transformQuote(html);
    html = transformQuoteLarge(html);
    html = transformSlider(html);
    html = transformVideo(html);
    contentEl.innerHTML = html;
    initSliderListeners(contentEl);
    initVideoListeners(contentEl);
  }

  // src/compare-table.js
  var ROOT_SELECTOR = "[data-compare-table]";
  var OPEN_REGEX = /^\[comparatif([^\]]*)\]$/i;
  var CLOSE_REGEX = /^\[\/comparatif\]$/i;
  var CHECK_SVG = `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.2L8.7 12.9L14 7.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  var ROCKFI_LOGO_SVG = `<svg class="rt-compare_logo is-svg" viewBox="0 0 97 26" fill="none" role="img" aria-label="RockFi" xmlns="http://www.w3.org/2000/svg"><path d="M84.7026 13.5324L87.4836 17.4728H87.9987V8.8391H87.4836L84.565 12.5732C84.4622 12.7444 84.2906 12.7786 83.9814 12.7786H80.0673V1.4389H84.7023V0.68512H72.6845V1.19903L75.157 3.32276V21.3443C75.157 21.687 75.0536 22.0639 74.7444 22.3376L73.8474 23.1283C73.2287 23.6737 72.2849 23.6191 71.7332 23.0059L65.5548 16.1361H61.5715V15.7934L71.3233 9.35241V8.8385H63.9406V9.35241L66.6192 11.5793L60.8161 15.4855V0H60.1983L54.361 1.30188V1.81579L56.215 3.4262V21.3446C56.215 21.6873 56.1117 22.03 55.8031 22.3379L53.8799 24.1537V24.6676H62.9451V24.1537L60.8161 22.4069V16.2057L66.9626 24.6679H83.0881V24.154L80.0669 22.304V13.5324H84.7026Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M11.5581 13.1896V13.5326H15.9188L22.8547 24.1533V24.6672H17.1202L10.15 13.2927H7.60909V22.3034L10.0815 24.1533V24.6672H0.26123V24.1533L2.25257 22.3372C2.52782 22.0635 2.66454 21.7208 2.66454 21.3439V3.32238L0.26123 1.19866V0.684747H10.6654C17.2578 0.684747 20.5542 2.77429 20.5542 6.98845C20.5542 10.8254 17.8071 12.539 11.5581 13.1896ZM7.60909 1.37017V12.6073H10.7336C13.5152 12.6073 15.1285 10.7574 15.1285 6.95427C15.1285 3.15118 13.5152 1.37017 10.7336 1.37017H7.60909Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M21.1777 16.7533C21.1777 11.7506 24.6457 8.42752 29.8309 8.42752C35.0498 8.42752 38.5177 11.7854 38.5177 16.7533C38.5177 21.7212 35.0161 25.0785 29.8309 25.0785C24.6457 25.0785 21.1777 21.756 21.1777 16.7533ZM25.9846 16.7533C25.9846 21.7893 27.2209 24.3937 29.8309 24.3937C32.5431 24.3937 33.7108 21.7899 33.7108 16.7533C33.7108 11.7167 32.5095 9.11294 29.8309 9.11294C27.1523 9.11294 25.9846 11.7173 25.9846 16.7533Z" fill="currentColor"/><path d="M94.1073 8.83998V22.4078L94.1076 22.4081L96.2366 24.1549V24.6688H87.1714V24.1549L89.0945 22.3391C89.4031 22.0312 89.5065 21.6885 89.5065 21.3457V8.83998H94.1073Z" fill="currentColor"/><path d="M89.5088 3.32295V5.27544H94.1095V0.684747H86.2056V1.13389L89.5085 3.32235L89.5088 3.32295Z" fill="currentColor"/><path d="M49.2082 23.6755C51.6115 23.6755 53.5689 22.1676 54.6335 19.3243L54.6338 19.3246L55.2865 19.53C53.9126 23.1957 51.3375 25.0799 47.7661 25.0799C42.6158 25.0799 39.4913 21.7913 39.4913 16.7547C39.4913 11.7181 42.9592 8.83998 48.4188 8.83998H54.702V14.8016H54.1383L50.2902 9.5254H48.7623C45.9812 9.5254 44.2988 12.095 44.2988 16.7547C44.2988 21.1059 46.2895 23.6755 49.2082 23.6755Z" fill="currentColor"/></svg>`;
  function escapeHTML(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function readLines(el) {
    const blocks = el.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");
    const source = blocks.length ? Array.from(blocks) : [el];
    return source.flatMap((node) => {
      const clone = node.cloneNode(true);
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      return clone.textContent.split(/\r?\n/);
    }).map((line) => line.replace(/ /g, " ").trim()).filter(Boolean);
  }
  function parseCell(raw = "") {
    const text2 = raw.trim();
    if (!text2) return { type: "empty" };
    if (text2 === "?") return { type: "na" };
    if (text2.startsWith("+")) {
      return { type: "check", detail: text2.slice(1).trim() };
    }
    const [main, ...rest] = text2.split("//");
    return { type: "text", main: main.trim(), detail: rest.join("//").trim() };
  }
  function parse(lines) {
    const meta = {};
    const groups = [];
    let current = null;
    lines.forEach((line) => {
      const open = line.match(OPEN_REGEX);
      if (open) {
        Object.assign(meta, parseAttrs(open[1]));
        return;
      }
      if (CLOSE_REGEX.test(line)) return;
      if (line.startsWith("#")) {
        current = { title: line.replace(/^#+/, "").trim(), rows: [] };
        groups.push(current);
        return;
      }
      if (!line.includes("|")) return;
      if (!current) {
        current = { title: "", rows: [] };
        groups.push(current);
      }
      const [label = "", rockfi = "", rival = ""] = line.split("|");
      current.rows.push({
        label: label.trim(),
        cells: [parseCell(rockfi), parseCell(rival)]
      });
    });
    return { meta, groups: groups.filter((g) => g.rows.length) };
  }
  function renderCell(cell) {
    switch (cell.type) {
      case "na":
        return `<span class="rt-compare_na">${t("compare.na")}</span>`;
      case "check":
        return `<div class="rt-compare_cell">
        <span class="rt-compare_check">${CHECK_SVG}<span class="rt-compare_sr">${t("compare.yes")}</span></span>
        ${cell.detail ? `<span class="rt-compare_detail">${escapeHTML(cell.detail)}</span>` : ""}
      </div>`;
      case "text":
        return `<div class="rt-compare_text">
        ${cell.main ? `<span class="rt-compare_main">${escapeHTML(cell.main)}</span>` : ""}
        ${cell.detail ? `<span class="rt-compare_detail">${escapeHTML(cell.detail)}</span>` : ""}
      </div>`;
      default:
        return "";
    }
  }
  function renderImage(src, name) {
    return `<img class="rt-compare_logo" src="${escapeHTML(src)}" alt="${escapeHTML(name)}" loading="lazy">`;
  }
  function findLogoImage(scope, key, name) {
    const logo = scope.querySelector(`[data-compare-logo="${key}"]`);
    if (!logo) return "";
    const img = logo.tagName === "IMG" ? logo : logo.querySelector("img");
    if (!img || !img.getAttribute("src")) return "";
    const clone = img.cloneNode(true);
    clone.removeAttribute("hidden");
    clone.removeAttribute("data-compare-logo");
    clone.removeAttribute("class");
    clone.classList.add("rt-compare_logo");
    if (!clone.getAttribute("alt")) clone.setAttribute("alt", name);
    return clone.outerHTML;
  }
  function renderRockfiHead(scope, name) {
    return findLogoImage(scope, "rockfi", name) || ROCKFI_LOGO_SVG;
  }
  function renderRivalHead(el, scope, name) {
    const src = (el.getAttribute("data-compare-logo-src") || "").trim();
    if (src) return renderImage(src, name);
    return findLogoImage(scope, "concurrent", name) || `<span class="rt-compare_name">${escapeHTML(name)}</span>`;
  }
  function render({ meta, groups }, el, scope) {
    const rockfiName = meta.rockfi || "RockFi";
    const rivalName = meta.concurrent || (el.getAttribute("data-compare-table") || "").trim() || t("compare.rival");
    const body = groups.map((group, index) => {
      const groupRow = group.title ? `<tr class="rt-compare_group" data-compare-group="${index}">
            <th scope="colgroup">${escapeHTML(group.title)}</th>
            <td class="is-rockfi"></td><td></td>
          </tr>` : "";
      const rows = group.rows.map(
        (row) => `<tr class="rt-compare_row">
            <th scope="row">${escapeHTML(row.label)}</th>
            <td class="is-rockfi">${renderCell(row.cells[0])}</td>
            <td>${renderCell(row.cells[1])}</td>
          </tr>`
      ).join("");
      return groupRow + rows;
    }).join("");
    return `<div class="rt-compare">
    <div class="rt-compare_scroll">
      <table class="rt-compare_table">
        <colgroup><col class="rt-compare_col-label"><col><col></colgroup>
        <thead>
          <tr>
            <td class="rt-compare_corner"><span class="rt-compare_current" aria-hidden="true"></span></td>
            <th scope="col" class="is-rockfi">${renderRockfiHead(scope, rockfiName)}</th>
            <th scope="col">${renderRivalHead(el, scope, rivalName)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
        <tfoot aria-hidden="true">
          <tr><td></td><td class="is-rockfi"></td><td></td></tr>
        </tfoot>
      </table>
    </div>
  </div>`;
  }
  function getStickyTop() {
    const nav = document.querySelector(".nav_fixed");
    if (!nav) return 0;
    const rect = nav.getBoundingClientRect();
    return Math.max(0, rect.bottom);
  }
  function bindSticky(root) {
    const thead = root.querySelector("thead");
    const headCell = root.querySelector("thead th");
    const current = root.querySelector(".rt-compare_current");
    const groupRows = Array.from(root.querySelectorAll(".rt-compare_group"));
    if (!thead || !headCell || !current) return;
    let ticking = false;
    let shown = null;
    const mobile = window.matchMedia("(max-width: 767px)");
    function setTop() {
      root.style.setProperty("--rt-compare-top", `${getStickyTop()}px`);
    }
    setTop();
    const nav = document.querySelector(".nav_fixed");
    if (nav && typeof ResizeObserver !== "undefined") new ResizeObserver(setTop).observe(nav);
    window.addEventListener("resize", setTop);
    function update() {
      ticking = false;
      const top = getStickyTop();
      if (mobile.matches) {
        const tableRect = root.getBoundingClientRect();
        const max = Math.max(tableRect.height - thead.offsetHeight * 2, 0);
        const shift = Math.min(Math.max(top - tableRect.top, 0), max);
        root.style.setProperty("--rt-compare-shift", `${shift}px`);
      } else {
        root.style.removeProperty("--rt-compare-shift");
      }
      const headBottom = headCell.getBoundingClientRect().bottom;
      let active = null;
      groupRows.forEach((row) => {
        if (row.getBoundingClientRect().bottom <= headBottom + 1) active = row;
      });
      const tableBottom = root.getBoundingClientRect().bottom;
      if (tableBottom <= headBottom) active = null;
      if (active === shown) return;
      shown = active;
      if (active) {
        current.textContent = active.querySelector("th").textContent;
        current.classList.add("is-visible");
      } else {
        current.classList.remove("is-visible");
      }
    }
    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    let listening = false;
    function listen(on) {
      if (on === listening) return;
      listening = on;
      const method = on ? "addEventListener" : "removeEventListener";
      window[method]("scroll", requestUpdate, { passive: true });
      window[method]("resize", requestUpdate);
      if (on) requestUpdate();
    }
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(
        ([entry]) => {
          listen(entry.isIntersecting);
          if (!entry.isIntersecting) update();
        },
        { rootMargin: "200px 0px" }
      ).observe(root);
    } else {
      listen(true);
    }
    update();
  }
  function initCompareTable(root = document) {
    root.querySelectorAll(ROOT_SELECTOR).forEach((el) => {
      const data = parse(readLines(el));
      if (!data.groups.length) return;
      const scope = el.closest("section") || root;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = render(data, el, scope);
      const table = wrapper.firstElementChild;
      el.replaceWith(table);
      bindSticky(table);
    });
  }

  // src/blog-faq.js
  function initBlogFaq(root = document) {
    const faqItems = root.querySelectorAll(".faq_item");
    if (!faqItems.length) return;
    faqItems.forEach((item, index) => {
      const trigger = item.querySelector(".faq_question-wrapper");
      const content = item.querySelector(".overflow-hidden");
      if (!trigger || !content) return;
      const contentId = `faq-answer-${index + 1}`;
      const triggerId = `faq-question-${index + 1}`;
      content.id = contentId;
      content.setAttribute("role", "region");
      content.setAttribute("aria-labelledby", triggerId);
      trigger.id = triggerId;
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-controls", contentId);
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trigger.click();
        }
      });
      const observer = new MutationObserver(() => {
        const isOpen = content.style.height !== "0px" && content.style.height !== "";
        trigger.setAttribute("aria-expanded", String(isOpen));
      });
      observer.observe(content, {
        attributes: true,
        attributeFilter: ["style"]
      });
    });
  }

  // src/schema/utils.js
  function pathnameIs(path) {
    return getPathWithoutLocale().replace(/\/+$/, "") === path;
  }
  function text(el) {
    var _a;
    const value = (_a = el == null ? void 0 : el.textContent) == null ? void 0 : _a.replace(/\s+/g, " ").trim();
    return value || null;
  }
  var MONTHS = {
    // Français
    janvier: "01",
    f\u00E9vrier: "02",
    fevrier: "02",
    mars: "03",
    avril: "04",
    mai: "05",
    juin: "06",
    juillet: "07",
    ao\u00FBt: "08",
    aout: "08",
    septembre: "09",
    octobre: "10",
    novembre: "11",
    d\u00E9cembre: "12",
    decembre: "12",
    // Anglais
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12"
  };
  function parseDate(text2) {
    const value = (text2 || "").trim().toLowerCase().replace(/,/g, "");
    let match = value.match(/^(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-zéû]+)\s+(\d{4})$/i);
    let day, monthName, year;
    if (match) {
      [, day, monthName, year] = match;
    } else {
      match = value.match(/^([a-zéû]+)\s+(\d{1,2})(?:er|st|nd|rd|th)?\s+(\d{4})$/i);
      if (!match) return null;
      [, monthName, day, year] = match;
    }
    const month = MONTHS[monthName];
    if (!month) return null;
    return `${year}-${month}-${day.padStart(2, "0")}`;
  }
  function injectGraph(graph) {
    var _a;
    (_a = document.getElementById("schema-dynamic")) == null ? void 0 : _a.remove();
    if (!graph.length) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "schema-dynamic";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    document.head.appendChild(script);
  }

  // src/schema/builders.js
  var ORG_REF = { "@id": "https://www.rockfi.fr/#organization" };
  var FAQ_HEADING = /^(questions fréquentes|foire aux questions|faq|frequently asked questions)$/i;
  function buildArticleFaqSchema(root) {
    const heading = Array.from(root.querySelectorAll(".w-richtext h2")).find(
      (h) => FAQ_HEADING.test(text(h))
    );
    if (!heading) return [];
    const questions = [];
    let current = null;
    for (let el = heading.nextElementSibling; el && el.tagName !== "H2"; el = el.nextElementSibling) {
      if (el.tagName === "H3") {
        current = { name: text(el), answer: [] };
        questions.push(current);
      } else if (current) {
        const t2 = (text(el) || "").replace(/‍/g, "").trim();
        if (t2) current.answer.push(t2);
      }
    }
    const mainEntity = questions.filter((q) => q.name && q.answer.length).map((q) => ({
      "@type": "Question",
      name: q.name,
      acceptedAnswer: { "@type": "Answer", text: q.answer.join(" ") }
    }));
    return mainEntity.length ? [{ "@type": "FAQPage", mainEntity }] : [];
  }
  function buildTeamSchema(root) {
    return Array.from(root.querySelectorAll(".collection-item-conseiller")).map((card) => {
      var _a, _b;
      const name = text(card.querySelector(".heading-style-h6"));
      if (!name) return null;
      const person = { "@type": "Person", name, worksFor: ORG_REF };
      const jobTitle = text(card.querySelector(".profil-list-content-wrapper"));
      const image = (_a = card.querySelector(".profil-list_image")) == null ? void 0 : _a.src;
      const linkedin = (_b = card.querySelector('a[href*="linkedin.com"]')) == null ? void 0 : _b.href;
      if (jobTitle) person.jobTitle = jobTitle;
      if (image) person.image = image;
      if (linkedin) person.sameAs = [linkedin];
      return person;
    }).filter(Boolean);
  }
  function buildPressSchema(root) {
    const seen = /* @__PURE__ */ new Set();
    return Array.from(root.querySelectorAll(".collection_list_item_presse a, a.item-presse")).map((card) => {
      var _a;
      const id = getYoutubeId(card.getAttribute("data-video-player") || card.getAttribute("href"));
      if (!id || seen.has(id)) return null;
      const name = text(card.querySelector(".heading-presse"));
      const uploadDate = parseDate(text(card.querySelector(".text-size-12")));
      if (!name || !uploadDate) return null;
      seen.add(id);
      const thumbnails = [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
      const cover = (_a = card.querySelector(".item_presse_img")) == null ? void 0 : _a.src;
      if (cover) thumbnails.unshift(cover);
      return {
        "@type": "VideoObject",
        name,
        description: name,
        uploadDate,
        thumbnailUrl: thumbnails,
        url: `https://www.youtube.com/watch?v=${id}`,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        inLanguage: getLocaleTag(),
        publisher: ORG_REF
      };
    }).filter(Boolean);
  }
  function getYoutubeId(value) {
    if (!value) return null;
    const match = value.match(/^youtube:([\w-]{11})$/) || value.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([\w-]{11})/) || value.match(/youtu\.be\/([\w-]{11})/);
    return match ? match[1] : null;
  }

  // src/schema/registry.js
  var PAGE_BUILDERS = [
    // Articles (FR et EN) : FAQ rédigée dans le texte de l'article
    {
      test: () => /\/(blog-post|landing-posts)\//.test(window.location.pathname),
      build: buildArticleFaqSchema
    },
    { test: () => pathnameIs("/a-propos") || pathnameIs("/about"), build: buildTeamSchema },
    // FR : /presse, EN : /en/press
    { test: () => pathnameIs("/presse") || pathnameIs("/press"), build: buildPressSchema }
  ];

  // src/schema/index.js
  function initSchema(root = document) {
    var _a, _b;
    const graph = (_b = (_a = PAGE_BUILDERS.find((entry) => entry.test(root))) == null ? void 0 : _a.build(root)) != null ? _b : [];
    injectGraph(graph);
  }

  // src/animate/setup.js
  var isSetup = false;
  function setupGsap() {
    if (isSetup) return;
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    isSetup = true;
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  // src/animate/split-text.js
  var MASK_PADDING = "0.3em";
  function tokenize(el) {
    const tokens = [];
    const pushText = (text2) => {
      text2.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (!part.trim()) tokens.push({ type: "space" });
        else tokens.push({ type: "word", text: part });
      });
    };
    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          pushText(child.textContent);
        } else if (child.nodeName === "BR") {
          tokens.push({ type: "br" });
        } else {
          walk(child);
        }
      });
    };
    walk(el);
    return tokens;
  }
  function splitWordsMasked(el) {
    const tokens = tokenize(el);
    el.innerHTML = "";
    const innerEls = [];
    tokens.forEach((token) => {
      if (token.type === "br") {
        el.appendChild(document.createElement("br"));
        return;
      }
      if (token.type === "space") {
        el.appendChild(document.createTextNode(" "));
        return;
      }
      const mask = document.createElement("span");
      mask.className = "split-word-mask";
      mask.style.display = "inline-block";
      mask.style.overflow = "hidden";
      mask.style.verticalAlign = "top";
      mask.style.padding = MASK_PADDING;
      mask.style.margin = `-${MASK_PADDING}`;
      const inner = document.createElement("span");
      inner.className = "split-word-inner";
      inner.style.display = "inline-block";
      inner.textContent = token.text;
      mask.appendChild(inner);
      el.appendChild(mask);
      innerEls.push(inner);
    });
    return innerEls;
  }
  function getHiddenOffsets(innerEls) {
    return innerEls.map((inner) => {
      const mask = inner.parentElement;
      return mask.offsetHeight;
    });
  }
  function splitWords(el) {
    const tokens = tokenize(el);
    el.innerHTML = "";
    const wordEls = [];
    tokens.forEach((token) => {
      if (token.type === "br") {
        el.appendChild(document.createElement("br"));
        return;
      }
      if (token.type === "space") {
        el.appendChild(document.createTextNode(" "));
        return;
      }
      const span = document.createElement("span");
      span.className = "split-word";
      span.style.display = "inline-block";
      span.textContent = token.text;
      el.appendChild(span);
      wordEls.push(span);
    });
    return wordEls;
  }

  // src/animate/presets.js
  var PRESETS = {
    "fade-up": (el, opts) => {
      var _a, _b, _c, _d;
      window.gsap.set(el, { opacity: 0, y: (_a = opts.distance) != null ? _a : 32 });
      return window.gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: (_b = opts.duration) != null ? _b : 0.8,
        delay: (_c = opts.delay) != null ? _c : 0,
        ease: (_d = opts.ease) != null ? _d : "power2.out"
      });
    },
    "fade-in": (el, opts) => {
      var _a, _b, _c;
      window.gsap.set(el, { opacity: 0 });
      return window.gsap.to(el, {
        opacity: 1,
        duration: (_a = opts.duration) != null ? _a : 0.8,
        delay: (_b = opts.delay) != null ? _b : 0,
        ease: (_c = opts.ease) != null ? _c : "power1.out"
      });
    },
    "scale-in": (el, opts) => {
      var _a, _b, _c, _d;
      window.gsap.set(el, { opacity: 0, scale: (_a = opts.scale) != null ? _a : 0.92 });
      return window.gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: (_b = opts.duration) != null ? _b : 0.8,
        delay: (_c = opts.delay) != null ? _c : 0,
        ease: (_d = opts.ease) != null ? _d : "power2.out"
      });
    },
    // Reveal d'image : montée (translate). L'élément doit avoir un wrapper avec
    // overflow:hidden côté CSS (ex: .image_blog).
    // opts.curtain : en plus, l'élément se dévoile en rideau de bas en haut
    // (clip-path), sans fondu. Activé par défaut pour la 1re rangée des grilles
    // (voir scan.js), désactivé ailleurs (hero : montée seule).
    "image-reveal": (el, opts) => {
      var _a, _b, _c, _d, _e, _f;
      const distance2 = `${(_a = opts.distance) != null ? _a : 1.5}rem`;
      const duration = (_b = opts.duration) != null ? _b : 2;
      if (!opts.curtain) {
        window.gsap.set(el, { y: distance2 });
        return window.gsap.to(el, {
          y: 0,
          duration,
          delay: (_c = opts.delay) != null ? _c : 0,
          ease: (_d = opts.ease) != null ? _d : "power3.out"
        });
      }
      window.gsap.set(el, { y: distance2, clipPath: "inset(100% 0% 0% 0%)" });
      return window.gsap.timeline({ delay: (_e = opts.delay) != null ? _e : 0 }).to(el, { y: 0, duration, ease: (_f = opts.ease) != null ? _f : "power3.out" }, 0).to(
        el,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: Math.min(duration, 1.2),
          // Départ doux : au chargement, la 1re frame arrive souvent en retard
          ease: "power3.inOut",
          // Le clip-path ne doit pas rester (il couperait ombres, survols...)
          onComplete: () => window.gsap.set(el, { clearProps: "clipPath" })
        },
        0
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
      var _a, _b, _c;
      const rawText = el.textContent.trim();
      const match = rawText.match(/^(.*?)(\d(?:[\d\s\u00a0\u202f.,]*\d)?)(.*)$/);
      if (!match) return window.gsap.timeline();
      const prefix = match[1];
      const numberGroup = match[2];
      const suffix = match[3];
      const decimalMatch = numberGroup.match(/([.,])(\d{1,2})$/);
      const decimals = decimalMatch ? decimalMatch[2].length : 0;
      const decSep = decimalMatch ? decimalMatch[1] : "";
      const intText = decimalMatch ? numberGroup.slice(0, -decimalMatch[0].length) : numberGroup;
      const groupSep = (intText.match(/[^\d]/) || [""])[0];
      const intValue = intText.replace(/[^\d]/g, "");
      const targetNumber = parseFloat(
        decimals ? `${intValue}.${decimalMatch[2]}` : intValue
      );
      if (isNaN(targetNumber)) return window.gsap.timeline();
      const NICE_STEPS = decimals ? [0.1, 0.2, 0.5, 1, 2, 5, 10] : [1, 2, 5, 10, 25, 50, 100, 250, 500, 1e3, 2500, 5e3, 1e4];
      const idealStep = targetNumber / 40;
      const minStep = decimals ? Math.pow(10, -decimals) : 1;
      const step = NICE_STEPS.find((s) => s >= Math.max(idealStep, minStep)) || NICE_STEPS[NICE_STEPS.length - 1];
      const format = (n) => {
        const [int, dec] = n.toFixed(decimals).split(".");
        const grouped = groupSep ? int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep) : int;
        return dec ? `${grouped}${decSep}${dec}` : grouped;
      };
      const show = (n) => {
        el.setAttribute("data-count-display", `${prefix}${format(n)}${suffix}`);
      };
      const stop = () => {
        el.classList.remove("is-counting");
        el.removeAttribute("data-count-display");
        el.style.removeProperty("--count-justify");
      };
      const align = getComputedStyle(el).textAlign;
      const justify = align === "center" ? "center" : align === "right" || align === "end" ? "flex-end" : "flex-start";
      el.style.setProperty("--count-justify", justify);
      const counter = { value: 0 };
      show(0);
      el.classList.add("is-counting");
      return window.gsap.to(counter, {
        value: targetNumber,
        duration: (_a = opts == null ? void 0 : opts.duration) != null ? _a : 1.5,
        delay: (_b = opts == null ? void 0 : opts.delay) != null ? _b : 0,
        ease: (_c = opts == null ? void 0 : opts.ease) != null ? _c : "power1.out",
        onUpdate: () => {
          show(Math.min(Math.round(counter.value / step) * step, targetNumber));
        },
        onComplete: stop,
        onInterrupt: stop
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
      var _a, _b, _c, _d;
      const img = el.querySelector("img");
      if (!img) return window.gsap.timeline();
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
        overflow: "hidden"
      });
      Object.assign(img.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: `${height}px`,
        objectFit: img.style.objectFit || "cover"
      });
      box.appendChild(img);
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
        zIndex: "1"
      });
      box.appendChild(overlay);
      el.appendChild(box);
      const duration = (_a = opts.duration) != null ? _a : 1.1;
      const overlayStart = (_b = opts.overlayStart) != null ? _b : 0.55;
      const tl = window.gsap.timeline({ delay: (_c = opts.delay) != null ? _c : 0 });
      tl.to(box, { height, duration, ease: (_d = opts.ease) != null ? _d : "power3.inOut" }, 0);
      tl.to(
        overlay,
        { opacity: 0, duration: duration * (1 - overlayStart) + 0.2, ease: "power1.out" },
        duration * overlayStart
      );
      return tl;
    },
    // Texte révélé mot par mot en fondu simple (opacity/y), sans effet rideau.
    "text-words": (el, opts) => {
      var _a, _b, _c, _d;
      const words = splitWords(el);
      window.gsap.set(words, { opacity: 0, y: 12 });
      return window.gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: (_a = opts.duration) != null ? _a : 0.6,
        delay: (_b = opts.delay) != null ? _b : 0,
        stagger: (_c = opts.stagger) != null ? _c : 0.03,
        ease: (_d = opts.ease) != null ? _d : "power2.out"
      });
    },
    // Titre révélé mot par mot façon "rideau". Déplacement de départ calculé
    // en pixels réels (getHiddenOffsets) plutôt qu'en yPercent — garantit un
    // masquage total même avec le padding ajouté autour de chaque mot pour
    // protéger accents/descendantes.
    heading: (el, opts) => {
      var _a, _b, _c, _d;
      const words = splitWordsMasked(el);
      const offsets = getHiddenOffsets(words);
      window.gsap.set(words, { y: (i) => offsets[i] });
      return window.gsap.to(words, {
        y: 0,
        duration: (_a = opts.duration) != null ? _a : 0.7,
        delay: (_b = opts.delay) != null ? _b : 0,
        stagger: (_c = opts.stagger) != null ? _c : 0.04,
        ease: (_d = opts.ease) != null ? _d : "power3.out"
      });
    }
  };

  // src/animate/scan.js
  function readOpts(el) {
    return {
      delay: el.dataset.animDelay ? parseFloat(el.dataset.animDelay) : void 0,
      duration: el.dataset.animDuration ? parseFloat(el.dataset.animDuration) : void 0,
      stagger: el.dataset.animStagger ? parseFloat(el.dataset.animStagger) : void 0,
      distance: el.dataset.animDistance ? parseFloat(el.dataset.animDistance) : void 0,
      scale: el.dataset.animScale ? parseFloat(el.dataset.animScale) : void 0,
      overlayStart: el.dataset.animOverlayStart ? parseFloat(el.dataset.animOverlayStart) : void 0,
      overlayColor: el.dataset.animOverlayColor || void 0
    };
  }
  function siblingIndex(el) {
    const presetName = el.dataset.inview;
    let ancestor = el.parentElement;
    while (ancestor) {
      const matches = Array.from(ancestor.querySelectorAll(`[data-inview="${presetName}"]`));
      if (matches.length > 1) return matches.indexOf(el);
      ancestor = ancestor.parentElement;
    }
    return 0;
  }
  function attachTrigger(el, animation) {
    const start = el.dataset.animStart || "top 85%";
    const repeat = el.dataset.animRepeat === "true";
    animation.pause();
    window.ScrollTrigger.create({
      trigger: el,
      start,
      fastScrollEnd: true,
      onEnter: (self) => {
        el.classList.add("--visible");
        if (self.progress === 1 || el.getBoundingClientRect().bottom < 0) {
          animation.progress(1);
        } else {
          animation.play();
        }
      },
      onEnterBack: () => {
        if (repeat) {
          el.classList.add("--visible");
          animation.play();
        }
      },
      onLeaveBack: () => {
        if (repeat) {
          el.classList.remove("--visible");
          animation.pause(0);
        }
      }
    });
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add("--visible");
      animation.play();
    } else if (rect.bottom <= 0 && window.scrollY > 200) {
      el.classList.add("--visible");
      animation.progress(1);
    }
  }
  function getGridItems(grid) {
    let items = Array.from(grid.querySelectorAll(":scope > .w-dyn-item, :scope > [data-anim-item]"));
    if (!items.length) items = Array.from(grid.children);
    return items;
  }
  var toTarget = (item) => item.querySelector("[data-anim-target]") || item;
  function gridRootMargin(start) {
    const match = /top\s+(\d+(?:\.\d+)?)%/.exec(start || "");
    const percent = match ? parseFloat(match[1]) : 95;
    return `0px 0px -${Math.max(0, 100 - percent)}% 0px`;
  }
  function showGridItem(item) {
    item._gridBound = true;
    item.classList.add("--visible");
    toTarget(item).classList.add("--visible");
  }
  function getFirstRow(items) {
    const shown = items.filter((item) => item.offsetParent !== null);
    if (!shown.length) return [];
    const firstTop = shown[0].getBoundingClientRect().top;
    return shown.filter((item) => Math.abs(item.getBoundingClientRect().top - firstTop) <= 25);
  }
  function setupGridReveal(grid) {
    var _a;
    const preset = PRESETS[grid.dataset.gridReveal || "image-reveal"];
    if (!preset) return;
    const opts = { ...readOpts(grid), curtain: grid.dataset.animCurtain !== "false" };
    const stagger = (_a = opts.stagger) != null ? _a : 0.08;
    const items = getGridItems(grid);
    const firstRow = getFirstRow(items);
    items.filter((item) => !firstRow.includes(item)).forEach(showGridItem);
    const observer = new IntersectionObserver(
      (entries) => {
        let index = 0;
        entries.forEach((entry) => {
          const item = entry.target;
          const passed = entry.boundingClientRect.bottom < 0 && entry.boundingClientRect.height > 0;
          if (!entry.isIntersecting && !passed) return;
          observer.unobserve(item);
          showGridItem(item);
          if (passed) item._gridAnim.progress(1);
          else window.gsap.delayedCall(index++ * stagger, () => item._gridAnim.play());
        });
      },
      { rootMargin: gridRootMargin(grid.dataset.animStart), threshold: 0 }
    );
    firstRow.forEach((item) => {
      item._gridBound = true;
      item._gridAnim = preset(toTarget(item), { ...opts, delay: 0 });
      item._gridAnim.pause();
      observer.observe(item);
    });
    new MutationObserver(() => {
      getGridItems(grid).forEach((item) => {
        if (!item._gridBound) showGridItem(item);
      });
    }).observe(grid, { childList: true });
  }
  function scanAnimations(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    const claim = (el) => {
      if (el.dataset.animBound === "true") return false;
      el.dataset.animBound = "true";
      return true;
    };
    root.querySelectorAll("[data-grid-reveal]").forEach((grid) => {
      if (claim(grid)) setupGridReveal(grid);
    });
    root.querySelectorAll("[data-inview]").forEach((el) => {
      var _a, _b;
      const presetName = el.dataset.inview;
      const preset = PRESETS[presetName];
      if (!preset) return;
      if (!claim(el)) return;
      const opts = readOpts(el);
      const STAGGER_BY_PRESET = {
        "count-up": { step: 0.25, max: 1 }
      };
      const cfg = STAGGER_BY_PRESET[presetName] || { step: 0.08, max: 0.3 };
      const staggerStep = (_a = opts.stagger) != null ? _a : cfg.step;
      const extraDelay = Math.min(siblingIndex(el) * staggerStep, cfg.max);
      opts.delay = ((_b = opts.delay) != null ? _b : 0) + extraDelay;
      const animation = preset(el, opts);
      attachTrigger(el, animation);
    });
    root.querySelectorAll("[data-text-reveal]").forEach((el) => {
      if (!claim(el)) return;
      const opts = readOpts(el);
      const animation = PRESETS.heading(el, opts);
      attachTrigger(el, animation);
    });
    root.querySelectorAll("[data-grid-enter]").forEach((group) => {
      const items = Array.from(group.querySelectorAll(":scope > [data-anim-item]"));
      if (!items.length) return;
      const presetName = items[0].dataset.animItem;
      const preset = PRESETS[presetName];
      if (!preset) return;
      if (!claim(group)) return;
      const opts = readOpts(group);
      const animations = items.map((item) => preset(item, readOpts(item)));
      animations.forEach((a) => a.pause());
      const tl = window.gsap.timeline({ paused: true });
      animations.forEach((a, i) => {
        var _a;
        tl.add(a.play(), i * ((_a = opts.stagger) != null ? _a : 0.1));
      });
      attachTrigger(group, tl);
    });
  }

  // src/animate/parallax.js
  function initOne(el) {
    const speed = parseFloat(el.dataset.parallaxSpeed) || 0.15;
    const start = el.dataset.parallaxStart || "top bottom";
    const end = el.dataset.parallaxEnd || "bottom top";
    const scale = 1 + Math.max(speed * 1.5, 0.12);
    window.gsap.set(el, {
      scale,
      transformOrigin: "center center",
      willChange: "transform"
    });
    window.gsap.to(el, {
      yPercent: speed * 50,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub: true
      }
    });
  }
  function initParallax(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    root.querySelectorAll("[data-parallax]").forEach((el) => {
      if (el instanceof HTMLImageElement || el instanceof HTMLElement) {
        initOne(el);
      }
    });
  }

  // src/animate/hero-parallax.js
  function initOne2(el) {
    if (el.dataset.heroParallaxBound === "true") return;
    el.dataset.heroParallaxBound = "true";
    const speed = parseFloat(el.dataset.heroParallaxSpeed) || 0.15;
    const smooth = parseFloat(el.dataset.heroParallaxSmooth) || 1;
    const start = el.dataset.heroParallaxStart || "top top";
    const end = el.dataset.heroParallaxEnd || "bottom top";
    const container = el.dataset.heroParallaxContainer ? el.closest(el.dataset.heroParallaxContainer) : el.parentElement;
    if (!container) return;
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    container.style.overflow = "hidden";
    Object.assign(el.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      objectFit: el.style.objectFit || "cover",
      willChange: "transform"
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.gsap.fromTo(
      el,
      { y: 0, yPercent: 0, force3D: true },
      {
        y: 0,
        yPercent: speed * 100,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          trigger: container,
          start,
          end,
          scrub: smooth,
          invalidateOnRefresh: true
        }
      }
    );
  }
  function initHeroParallax(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    root.querySelectorAll("[data-hero-parallax]").forEach((el) => {
      if (el instanceof HTMLElement) initOne2(el);
    });
  }

  // src/animate/blur-placeholder.js
  function initOne3(img) {
    const srcset = img.getAttribute("srcset");
    if (!srcset) return;
    const smallest = srcset.split(",")[0].trim().split(" ")[0];
    if (!smallest) return;
    const parent = img.parentElement;
    if (!parent) return;
    if (img.complete && img.naturalWidth > 0) return;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent.style.overflow = "hidden";
    const amount = parseFloat(img.dataset.blurAmount) || 20;
    const duration = parseFloat(img.dataset.blurDuration) || 0.6;
    const ph = document.createElement("div");
    Object.assign(ph.style, {
      position: "absolute",
      inset: "0",
      backgroundImage: `url("${smallest}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      filter: `blur(${amount}px)`,
      transform: "scale(1.1)",
      // evite les bords clairs dus au flou
      transition: `opacity ${duration}s ease`,
      pointerEvents: "none"
    });
    parent.insertBefore(ph, img);
    const done2 = () => {
      ph.style.opacity = "0";
      setTimeout(() => ph.remove(), duration * 1e3 + 50);
    };
    if (img.decode) img.decode().then(done2).catch(done2);
    else img.addEventListener("load", done2, { once: true });
    img.addEventListener("error", done2, { once: true });
  }
  function initBlurPlaceholders(root = document) {
    root.querySelectorAll("img[data-blur]").forEach(initOne3);
  }

  // src/animate/text-progress.js
  var DEFAULT_FROM = 0.2;
  var DEFAULT_START = "top 80%";
  var DEFAULT_END = "bottom 40%";
  function num(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function splitWords2(el) {
    const words = [];
    const frag = document.createDocumentFragment();
    const walk = (node) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const span = document.createElement("span");
            span.className = "text-progress_word";
            span.style.display = "inline-block";
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          });
        } else if (child.nodeName === "BR") {
          frag.appendChild(document.createElement("br"));
        } else {
          walk(child);
        }
      });
    };
    const label = el.textContent.replace(/\s+/g, " ").trim();
    walk(el);
    el.textContent = "";
    el.appendChild(frag);
    el.setAttribute("aria-label", label);
    words.forEach((w) => w.setAttribute("aria-hidden", "true"));
    return words;
  }
  function initTextProgress(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.querySelectorAll("[data-text-progress]:not([data-text-progress-ready])").forEach((el) => {
      el.setAttribute("data-text-progress-ready", "true");
      const d = el.dataset;
      const words = splitWords2(el);
      if (!words.length) return;
      const scrubAttr = d.textProgressScrub;
      const scrub = scrubAttr === void 0 ? true : num(scrubAttr, true);
      window.gsap.set(words, { opacity: num(d.textProgressFrom, DEFAULT_FROM) });
      window.gsap.to(words, {
        opacity: 1,
        ease: "none",
        stagger: 1,
        // une unité par mot : progression mot après mot
        scrollTrigger: {
          trigger: el,
          start: d.textProgressStart || DEFAULT_START,
          end: d.textProgressEnd || DEFAULT_END,
          scrub,
          invalidateOnRefresh: true
        },
        duration: 1
      });
    });
  }

  // src/animate/calli-reveal.js
  var SOFT = 70;
  var DEFAULT_START2 = "top 80%";
  var DEFAULT_END2 = "bottom 35%";
  var uid = 0;
  function num2(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  async function inlineSvg(img) {
    const res = await fetch(img.currentSrc || img.src, { mode: "cors" });
    if (!res.ok) throw new Error(`calli-reveal: ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (svg.nodeName !== "svg") throw new Error("calli-reveal: SVG invalide");
    const suffix = `-${++uid}`;
    svg.querySelectorAll("[id]").forEach((el) => {
      const old = el.id;
      el.id = old + suffix;
      svg.querySelectorAll(`[mask="url(#${old})"], [fill="url(#${old})"]`).forEach((ref) => {
        ["mask", "fill"].forEach((attr) => {
          if (ref.getAttribute(attr) === `url(#${old})`) ref.setAttribute(attr, `url(#${el.id})`);
        });
      });
    });
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("class", img.className);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", img.alt || svg.getAttribute("aria-label") || "");
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";
    const node = document.importNode(svg, true);
    img.replaceWith(node);
    return node;
  }
  function setup(svg, img) {
    const lines = Array.from(svg.querySelectorAll("linearGradient[data-x0]")).map((g) => {
      const x0 = num2(g.dataset.x0, 0);
      const x1 = num2(g.dataset.x1, 0);
      return { g, x0, width: x1 - x0 + SOFT };
    });
    if (!lines.length) return;
    const total = lines.reduce((sum, l) => sum + l.width, 0);
    const render2 = (progress) => {
      let left = progress * total;
      lines.forEach((l) => {
        const local = Math.min(Math.max(left, 0), l.width);
        left -= l.width;
        const edge = l.x0 + local;
        l.g.setAttribute("x1", (edge - SOFT).toFixed(1));
        l.g.setAttribute("x2", edge.toFixed(1));
      });
    };
    render2(0);
    const d = img.dataset;
    const scrubAttr = d.calliScrub;
    const state = { p: 0 };
    window.gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: () => render2(state.p),
      scrollTrigger: {
        trigger: svg,
        start: d.calliStart || DEFAULT_START2,
        end: d.calliEnd || DEFAULT_END2,
        scrub: scrubAttr === void 0 ? 1 : num2(scrubAttr, 1),
        invalidateOnRefresh: true
      }
    });
  }
  function initCalliReveal(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.querySelectorAll("img[data-calli-reveal]").forEach((img) => {
      const data = { ...img.dataset };
      inlineSvg(img).then((svg) => {
        Object.assign(svg.dataset, data);
        setup(svg, svg);
        window.ScrollTrigger.refresh();
      }).catch((err) => console.warn(err));
    });
  }

  // src/animate/index.js
  function initAnimations(root = document) {
    initBlurPlaceholders(root);
    if (prefersReducedMotion()) return;
    setupGsap();
    scanAnimations(root);
    initParallax(root);
    initHeroParallax(root);
    initTextProgress(root);
    initCalliReveal(root);
  }

  // src/animate/svg-trace.js
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  function createFadeGradient2(svg, color) {
    const gradientId = `trace-fade-${Math.random().toString(36).slice(2, 9)}`;
    const gradient = document.createElementNS(SVG_NS2, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    [
      { offset: "0", opacity: "0" },
      { offset: "0.5", opacity: "1" },
      { offset: "1", opacity: "0" }
    ].forEach(({ offset, opacity }) => {
      const stop = document.createElementNS(SVG_NS2, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      stop.setAttribute("stop-opacity", opacity);
      gradient.appendChild(stop);
    });
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS2, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    defs.appendChild(gradient);
    return { gradient, gradientId };
  }
  function initTrace(path) {
    const svg = path.closest("svg");
    if (!svg) return;
    const totalLength = path.getTotalLength();
    const segmentLength = parseFloat(path.dataset.traceLength) || totalLength * 0.08;
    const duration = parseFloat(path.dataset.traceDuration) || 4;
    const color = path.dataset.traceColor || getComputedStyle(path).stroke || "#1A1A1A";
    const startFraction = parseFloat(path.dataset.traceOffset) || 0;
    const startOffset = startFraction * totalLength;
    const { gradient } = createFadeGradient2(svg, color);
    path.style.fill = "none";
    path.style.stroke = `url(#${gradient.id})`;
    path.style.strokeDasharray = `${segmentLength} ${totalLength - segmentLength}`;
    path.style.strokeDashoffset = `${startOffset}`;
    function updateGradient() {
      const raw = -window.gsap.getProperty(path, "strokeDashoffset");
      const start = (raw % totalLength + totalLength) % totalLength;
      const end = (start + segmentLength) % totalLength;
      const p1 = path.getPointAtLength(start);
      const p2 = path.getPointAtLength(end);
      gradient.setAttribute("x1", p1.x);
      gradient.setAttribute("y1", p1.y);
      gradient.setAttribute("x2", p2.x);
      gradient.setAttribute("y2", p2.y);
    }
    window.gsap.to(path, {
      strokeDashoffset: startOffset - totalLength,
      duration,
      ease: "none",
      repeat: -1,
      onUpdate: updateGradient
    });
    updateGradient();
  }
  function initSvgTrace(root = document) {
    if (typeof window.gsap === "undefined") return;
    root.querySelectorAll("[data-svg-trace]").forEach((path) => {
      if (path instanceof SVGPathElement) {
        initTrace(path);
      } else {
        console.warn("[svg-trace] l'\xE9l\xE9ment data-svg-trace n'est pas un <path>", path);
      }
    });
  }

  // src/animate/dot-arrow.js
  function getMainDots(svg) {
    return Array.from(svg.querySelectorAll("circle")).filter((c) => {
      const attr = c.getAttribute("fill-opacity");
      return attr === null || parseFloat(attr) === 1;
    });
  }
  function sortDots(dots) {
    return dots.sort((a, b) => {
      const dy = parseFloat(a.getAttribute("cy")) - parseFloat(b.getAttribute("cy"));
      if (Math.abs(dy) > 0.5) return dy;
      return parseFloat(a.getAttribute("cx")) - parseFloat(b.getAttribute("cx"));
    });
  }
  function initArrow(svg) {
    const dots = sortDots(getMainDots(svg));
    if (!dots.length) return;
    const duration = parseFloat(svg.dataset.arrowDuration) || 0.2;
    const overlap = svg.dataset.arrowOverlap !== void 0 ? parseFloat(svg.dataset.arrowOverlap) : 0.85;
    const finalOpacity = svg.dataset.arrowOpacity !== void 0 ? parseFloat(svg.dataset.arrowOpacity) : 0.12;
    const step = duration * (1 - Math.min(Math.max(overlap, 0), 0.95));
    const targets = dots.map((dot) => {
      const prev = dot.previousElementSibling;
      return prev && prev.tagName.toLowerCase() === "foreignobject" ? [prev, dot] : [dot];
    });
    const tl = window.gsap.timeline({ paused: true });
    targets.forEach((els, i) => {
      tl.to(els, { opacity: finalOpacity, duration, ease: "power2.out" }, i * step);
    });
    const trigger = svg.closest("a, button") || svg;
    trigger.addEventListener("mouseenter", () => tl.timeScale(1).play());
    trigger.addEventListener("mouseleave", () => tl.timeScale(1.3).reverse());
  }
  function initDotArrow(root = document) {
    if (typeof window.gsap === "undefined") return;
    root.querySelectorAll("[data-dot-arrow]").forEach((svg) => {
      if (svg instanceof SVGSVGElement) {
        initArrow(svg);
      } else {
        console.warn("[dot-arrow] l'\xE9l\xE9ment data-dot-arrow n'est pas un <svg>", svg);
      }
    });
  }

  // src/list-lenis-sync.js
  function initListLenisSync() {
    var _a;
    if (typeof window.FinsweetAttributes === "undefined") return;
    const listModule = (_a = window.FinsweetAttributes.modules) == null ? void 0 : _a.list;
    if (!listModule || !listModule.loading) return;
    listModule.loading.then((listInstances) => {
      listInstances.forEach((instance) => {
        if (typeof instance.addHook !== "function") return;
        instance.addHook("afterRender", () => {
          const lenis = getLenis();
          if (!lenis) return;
          requestAnimationFrame(() => {
            lenis.resize();
          });
        });
      });
    });
  }

  // src/focus-stories.js
  var CTA_TEXT_SELECTOR = ".focus-card_cta .text-block";
  function extractSlide(card) {
    const img = card.querySelector(".focus-card_image");
    const linkedinLink = card.querySelector(".img_wrapper_linkedin");
    const titleBlock = card.querySelector(".focus-card_header");
    const footerTop = card.querySelector(".focus-card_footer-top");
    const heading = card.querySelector(".focus-card_header h2");
    const fullName = heading ? heading.textContent.trim() : "";
    const firstName = fullName.split(/\s+/)[0] || "";
    return {
      imgSrc: img ? img.src : "",
      imgAlt: img ? img.alt : "",
      linkedinHref: linkedinLink ? linkedinLink.getAttribute("href") : "#",
      titleHTML: titleBlock ? titleBlock.innerHTML : "",
      footerTopHTML: footerTop ? footerTop.innerHTML : "",
      firstName
    };
  }
  function buildProgressSteps(progressEl, count) {
    if (!progressEl) return [];
    progressEl.innerHTML = "";
    const steps = [];
    for (let i = 0; i < count; i++) {
      const step = document.createElement("div");
      step.className = "focus-card_progress-step";
      const fill = document.createElement("div");
      fill.className = "focus-card_progress-fill";
      step.appendChild(fill);
      progressEl.appendChild(step);
      steps.push(step);
    }
    return steps;
  }
  function fillCtaName(card) {
    const ctaText = card.querySelector(CTA_TEXT_SELECTOR);
    if (!ctaText || !ctaText.textContent.includes("{name}")) return;
    const { firstName } = extractSlide(card);
    ctaText.textContent = ctaText.textContent.replace("{name}", firstName);
  }
  function initFocusStories(root = document) {
    const sections = root.querySelectorAll(".section_focus");
    sections.forEach((section) => {
      const cards = Array.from(section.querySelectorAll(".focus-card"));
      if (cards.length === 0) return;
      if (cards.length === 1) {
        fillCtaName(cards[0]);
        return;
      }
      const duration = parseFloat(section.dataset.focusDuration) || 5;
      const transitionDuration = parseFloat(section.dataset.focusTransition) || 0.6;
      const titleStagger = parseFloat(section.dataset.focusTitleStagger) || 0.04;
      const quoteStagger = parseFloat(section.dataset.focusQuoteStagger) || 0.08;
      const quoteDuration = parseFloat(section.dataset.focusQuoteDuration) || 0.9;
      const mainCard = cards[0];
      const ctaTemplateEl = mainCard.querySelector(CTA_TEXT_SELECTOR);
      const ctaTemplate = ctaTemplateEl ? ctaTemplateEl.textContent.trim() : "";
      const slides = cards.map(extractSlide);
      cards.slice(1).forEach((card) => card.remove());
      const imgWrapper = mainCard.querySelector(".focus-card_image-wrapper");
      let currentImg = mainCard.querySelector(".focus-card_image");
      const linkedinLink = mainCard.querySelector(".img_wrapper_linkedin");
      const titleBlock = mainCard.querySelector(".focus-card_header");
      const footerTop = mainCard.querySelector(".focus-card_footer-top");
      const progressEl = mainCard.querySelector(".focus-card_progress");
      const steps = buildProgressSteps(progressEl, slides.length);
      let index = 0;
      let progressTween = null;
      let isInView = false;
      function swapImage(newSrc, newAlt) {
        if (!imgWrapper || !currentImg) return;
        const nextImg = currentImg.cloneNode(false);
        nextImg.src = newSrc;
        nextImg.alt = newAlt;
        nextImg.classList.remove("is-active", "is-entering", "is-leaving");
        nextImg.classList.add("is-entering");
        imgWrapper.appendChild(nextImg);
        currentImg.classList.remove("is-entering");
        currentImg.classList.add("is-leaving");
        void nextImg.offsetWidth;
        nextImg.classList.remove("is-entering");
        nextImg.classList.add("is-active");
        const oldImg = currentImg;
        currentImg = nextImg;
        oldImg.addEventListener(
          "transitionend",
          () => {
            oldImg.remove();
          },
          { once: true }
        );
        setTimeout(() => {
          if (oldImg.parentNode) oldImg.remove();
        }, transitionDuration * 1e3 + 100);
      }
      function animateTitle() {
        if (!titleBlock || typeof window.gsap === "undefined") return;
        const heading = titleBlock.querySelector("h2");
        if (!heading) return;
        PRESETS.heading(heading, { stagger: titleStagger });
      }
      function animateQuote() {
        if (!footerTop || typeof window.gsap === "undefined" || typeof window.SplitText === "undefined") return;
        const quote = footerTop.querySelector(".focus-card_footer-quote");
        if (!quote) return;
        const split = new window.SplitText(quote, {
          type: "lines",
          mask: "lines"
        });
        window.gsap.set(split.lines, { yPercent: 110, opacity: 0 });
        window.gsap.to(split.lines, {
          yPercent: 0,
          opacity: 1,
          duration: quoteDuration,
          stagger: quoteStagger,
          ease: "power3.out"
        });
      }
      function applySlide(i) {
        const slide = slides[i];
        swapImage(slide.imgSrc, slide.imgAlt);
        if (linkedinLink) linkedinLink.setAttribute("href", slide.linkedinHref);
        if (titleBlock) titleBlock.innerHTML = slide.titleHTML;
        if (footerTop) footerTop.innerHTML = slide.footerTopHTML;
        const ctaText = footerTop ? footerTop.querySelector(CTA_TEXT_SELECTOR) : null;
        if (ctaText && ctaTemplate) {
          ctaText.textContent = ctaTemplate.replace("{name}", slide.firstName || "");
        }
        if (footerTop) initDotArrow(footerTop);
        animateTitle();
        animateQuote();
      }
      function startProgress(i) {
        if (!steps.length) return;
        if (progressTween) {
          progressTween.kill();
          progressTween = null;
        }
        steps.forEach((step, si) => {
          const fill = step.querySelector(".focus-card_progress-fill");
          if (si < i) {
            window.gsap.set(fill, { scaleX: 1, transformOrigin: "left center" });
          } else if (si > i) {
            window.gsap.set(fill, { scaleX: 0, transformOrigin: "left center" });
          }
        });
        const currentFill = steps[i].querySelector(".focus-card_progress-fill");
        window.gsap.set(currentFill, { scaleX: 0, transformOrigin: "left center" });
        progressTween = window.gsap.to(currentFill, {
          scaleX: 1,
          duration,
          ease: "none",
          paused: !isInView,
          // Reste en pause tant que pas dans le viewport
          onComplete: next
        });
      }
      function showSlide(i) {
        applySlide(i);
        startProgress(i);
      }
      function next() {
        index = (index + 1) % slides.length;
        showSlide(index);
      }
      applySlide(index);
      steps.forEach((step, si) => {
        const fill = step.querySelector(".focus-card_progress-fill");
        window.gsap.set(fill, { scaleX: si < index ? 1 : 0, transformOrigin: "left center" });
      });
      startProgress(index);
      if (typeof window.ScrollTrigger !== "undefined") {
        window.ScrollTrigger.create({
          trigger: section,
          start: "top 90%",
          end: "bottom 10%",
          onEnter: () => {
            isInView = true;
            if (progressTween) progressTween.play();
          },
          onLeave: () => {
            isInView = false;
            if (progressTween) progressTween.pause();
          },
          onEnterBack: () => {
            isInView = true;
            if (progressTween) progressTween.play();
          },
          onLeaveBack: () => {
            isInView = false;
            if (progressTween) progressTween.pause();
          }
        });
      } else {
        isInView = true;
        if (progressTween) progressTween.play();
      }
    });
  }

  // src/video-section.js
  var getPlyrI18n2 = () => ({
    play: t("video.play"),
    pause: t("video.pause"),
    mute: t("video.mute"),
    unmute: t("video.unmute"),
    enableCaptions: t("video.enableCaptions"),
    disableCaptions: t("video.disableCaptions"),
    enterFullscreen: t("video.enterFullscreen"),
    exitFullscreen: t("video.exitFullscreen")
  });
  var YOUTUBE_OPTIONS = {
    noCookie: true,
    // youtube-nocookie.com
    rel: 0,
    // suggestions limitées à la même chaîne
    modestbranding: 1,
    // logo YouTube réduit
    iv_load_policy: 3,
    // pas d'annotations
    playsinline: 1
  };
  var DEFAULT_MAGNET = 0.35;
  var DEFAULT_FOLLOW = 0.25;
  var DEFAULT_AUTOPLAY_DELAY = 0;
  var FADE_MS = 350;
  var REVEAL_TIMEOUT_MS = 4e3;
  var PREVIEW_REVEAL_TIMEOUT_MS = 2500;
  var COVER_BASE_W = 1920;
  var PREWARM_MARGIN = "300px";
  var HERO_FADE_MS = 0;
  var HERO_EMBED_REVEAL_MS = 1200;
  var HERO_DEFAULT_RATIO = "89/40";
  var HERO_VIMEO_FALLBACK_MS = 1800;
  function prefersReducedMotion2() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function saveDataEnabled() {
    const c = navigator.connection;
    return Boolean(c && c.saveData);
  }
  var stylesInjected = false;
  function ensureStyles() {
    if (stylesInjected || typeof document === "undefined") return;
    stylesInjected = true;
    const style = document.createElement("style");
    style.setAttribute("data-video-section-style", "");
    style.textContent = `
.video_loader{position:absolute;inset:0;display:grid;place-items:center;z-index:3;pointer-events:none;opacity:0;animation:video-loader-in .2s ease .15s forwards}
.video_loader::after{content:"";width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:video-loader-spin .8s linear infinite}
@keyframes video-loader-in{to{opacity:1}}
@keyframes video-loader-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.video_loader::after{animation-duration:2s}}
`;
    document.head.appendChild(style);
  }
  function getVideoInfo2(src) {
    const s = (src || "").trim();
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
          url: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`
        };
      }
      return { type, id, hash: "", url: `https://www.youtube.com/watch?v=${id}` };
    }
    const yt = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (yt) return { type: "youtube", id: yt[1], hash: "", url: s };
    const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
    if (vimeo) {
      return { type: "vimeo", id: vimeo[1], hash: vimeo[2] || "", url: s };
    }
    return { type: "native", id: null, hash: "", url: s };
  }
  var warmedProviders = /* @__PURE__ */ new Set();
  function warmProvider(src) {
    const { type } = getVideoInfo2(src);
    if (warmedProviders.has(type)) return;
    const map = {
      youtube: {
        script: "https://www.youtube.com/iframe_api",
        origins: ["https://www.youtube-nocookie.com", "https://www.youtube.com", "https://i.ytimg.com"]
      },
      vimeo: {
        script: "https://player.vimeo.com/api/player.js",
        origins: ["https://player.vimeo.com", "https://i.vimeocdn.com", "https://f.vimeocdn.com"]
      }
    };
    const conf = map[type];
    if (!conf) return;
    warmedProviders.add(type);
    conf.origins.forEach((href) => {
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    });
    const pre = document.createElement("link");
    pre.rel = "preload";
    pre.as = "script";
    pre.href = conf.script;
    document.head.appendChild(pre);
  }
  function buildPlayerMarkup2(src, captions, title, preview = false, startAt = 0) {
    const info = getVideoInfo2(src);
    const frameTitle = title || t("video.player");
    if (info.type === "youtube" || info.type === "vimeo") {
      const embedId = info.type === "vimeo" && info.hash ? info.url : info.id;
      return `<div class="plyr__video-embed" data-plyr-provider="${info.type}" data-plyr-embed-id="${embedId}" title="${frameTitle}"></div>`;
    }
    if (preview) {
      const frag = startAt > 0 ? `#t=${startAt}` : "";
      return `<video playsinline muted preload="auto"><source src="${info.url}${frag}" type="video/mp4"></video>`;
    }
    const track = captions ? `<track kind="captions" label="${getLangLabel()}" srclang="${getLang()}" src="${captions}" default>` : "";
    return `<video playsinline preload="metadata"><source src="${info.url}" type="video/mp4">${track}</video>`;
  }
  function formatDuration2(seconds) {
    if (!seconds || !isFinite(seconds)) return "";
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor(total % 3600 / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function setTimer(timerEl, text2) {
    if (!timerEl || !text2) return;
    timerEl.textContent = text2;
    timerEl.classList.add("is-ready");
  }
  function loadDuration(src, timerEl, fallback) {
    if (!timerEl) return;
    timerEl.textContent = "";
    if (fallback) setTimer(timerEl, fallback);
    const info = getVideoInfo2(src);
    if (info.type === "native") {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.muted = true;
      probe.playsInline = true;
      const done2 = () => {
        setTimer(timerEl, formatDuration2(probe.duration));
        probe.removeAttribute("src");
        probe.load();
      };
      probe.addEventListener("loadedmetadata", done2, { once: true });
      probe.addEventListener("error", () => {
      }, { once: true });
      probe.src = info.url;
      probe.load();
      return;
    }
    if (info.type === "vimeo" && typeof fetch === "function") {
      fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(info.url)}`).then((r) => r.ok ? r.json() : null).then((d) => {
        if (d && d.duration) setTimer(timerEl, formatDuration2(d.duration));
      }).catch(() => {
      });
    }
  }
  function initMagnet(scope, mover, anchor, strength) {
    if (!scope || !mover || !anchor || !strength) return;
    if (window.matchMedia && (window.matchMedia("(hover: none)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      return;
    }
    const RADIUS = 160;
    const MAX = 14;
    const EASE = 0.14;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = null;
    function render2() {
      cx += (tx - cx) * EASE;
      cy += (ty - cy) * EASE;
      mover.style.setProperty("--mx", `${cx.toFixed(2)}px`);
      mover.style.setProperty("--my", `${cy.toFixed(2)}px`);
      const settled = Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05;
      raf = settled ? null : requestAnimationFrame(render2);
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(render2);
    }
    function onMove(ev) {
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
  function initFollow(scope, mover, anchor, ease, canShow, onClick) {
    if (!scope || !mover || !anchor) return null;
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) return null;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ease = 1;
    }
    const INTERACTIVE = "a, button, input, select, textarea, label, [data-video-no-follow]";
    const isInteractive = (t2) => t2 instanceof Element && Boolean(t2.closest(INTERACTIVE));
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let mx = 0;
    let my = 0;
    let raf = null;
    let on = false;
    let last = 0;
    let tone = null;
    mover.classList.add("is-follow");
    const LIGHT_THRESHOLD = 0.55;
    const SAMPLE_W = 96;
    const imgCache = /* @__PURE__ */ new Map();
    function luminance(str) {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      const a = p.length > 3 ? p[3] : 1;
      if (a < 0.5) return null;
      return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
    }
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
          const h = Math.max(1, Math.round(w * probe.naturalHeight / probe.naturalWidth));
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
            nh: probe.naturalHeight
          });
          if (on) updateTone();
        } catch (e) {
        }
      };
      probe.src = src;
      return null;
    }
    function sampleTone(img, x, y) {
      const s = getSample(img);
      if (!s) return null;
      const r = img.getBoundingClientRect();
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
      const stack = document.elementsFromPoint(x, y);
      for (const el2 of stack) {
        if (el2.tagName !== "IMG") continue;
        if (el2.getBoundingClientRect().width < 200) continue;
        const t2 = sampleTone(el2, x, y);
        if (t2) return t2;
        break;
      }
      let el = stack[0];
      while (el && el !== document.documentElement) {
        const t2 = el.getAttribute("data-video-tone");
        if (t2 === "light" || t2 === "dark") return t2;
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
    function render2(now) {
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
        raf = requestAnimationFrame(render2);
      }
    }
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
        raf = requestAnimationFrame(render2);
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
      const first = !on;
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
    const checkOut = () => {
      if (!on) return;
      const r = scope.getBoundingClientRect();
      const inside = mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
      if (!inside || !canShow()) return hide();
      const t2 = document.elementFromPoint(mx, my);
      if (t2 && scope.contains(t2) && isInteractive(t2)) return hide();
      updateTone();
      retarget(false);
    };
    window.addEventListener("scroll", checkOut, { passive: true, capture: true });
    window.addEventListener("resize", checkOut);
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
      }
    };
  }
  function initCoverFit(el) {
    const [rw, rh] = (el.dataset.videoRatio || "16/9").split("/").map(Number);
    const ratioW = rw > 0 ? rw : 16;
    const ratioH = rh > 0 ? rh : 9;
    const baseW = COVER_BASE_W;
    const baseH = baseW * ratioH / ratioW;
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
  var activeStop = null;
  var anchorControllers = /* @__PURE__ */ new Map();
  var anchorsBound = false;
  function controllerFromEvent(e) {
    const link = e.target.closest && e.target.closest("a[href*='#']");
    if (!link) return null;
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return null;
    }
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
      return null;
    }
    return anchorControllers.get(decodeURIComponent(url.hash.slice(1))) || null;
  }
  function bindVideoAnchors() {
    if (anchorsBound) return;
    anchorsBound = true;
    window.addEventListener(
      "click",
      (e) => {
        const ctrl = controllerFromEvent(e);
        if (ctrl) ctrl.start();
      },
      true
    );
    const warm = (e) => {
      const ctrl = controllerFromEvent(e);
      if (ctrl) ctrl.warmUp();
    };
    window.addEventListener("pointerover", warm, { passive: true, capture: true });
    window.addEventListener("touchstart", warm, { passive: true, capture: true });
    window.addEventListener("focusin", warm, true);
  }
  function registerVideoAnchors(elements, controller) {
    const ids = elements.map((el) => el && el.id).filter(Boolean);
    if (!ids.length) return;
    ids.forEach((id) => anchorControllers.set(id, controller));
    bindVideoAnchors();
  }
  function claimPlayback(stop) {
    if (activeStop && activeStop !== stop) activeStop();
    activeStop = stop;
  }
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
    prewarm = "hover",
    bg = false,
    anchors = []
  }) {
    ensureStyles();
    loadDuration(src, timerEl, duration);
    const playBtn = trigger && trigger.querySelector(".video_controller-play");
    const magnetScope = root.querySelector("[data-video-magnet-zone]") || root;
    if (!follow) initMagnet(magnetScope, trigger, playBtn, magnet);
    let holder = null;
    let player = null;
    let warm = null;
    let loaderEl = null;
    let revealTimer = null;
    let cleanupTimer = null;
    let previewHolder = null;
    let previewPlayer = null;
    let previewTimer = null;
    let previewRevealTimer = null;
    let previewPaused = false;
    let inView = true;
    const isNative = getVideoInfo2(src).type === "native";
    const follower = follow ? initFollow(
      root.querySelector("[data-video-follow-zone]") || root.closest("[data-video-follow-zone]") || root,
      trigger,
      playBtn,
      follow,
      () => !holder,
      (e) => start(e)
    ) : null;
    function blockLink(ev) {
      if (holder && holder.contains(ev.target)) ev.preventDefault();
    }
    function showLoader() {
      if (loaderEl) return;
      loaderEl = document.createElement("span");
      loaderEl.className = "video_loader";
      loaderEl.setAttribute("aria-hidden", "true");
      host.appendChild(loaderEl);
      root.classList.add("is-loading");
    }
    function hideLoader() {
      if (loaderEl) {
        loaderEl.remove();
        loaderEl = null;
      }
      root.classList.remove("is-loading");
    }
    function clearPreviewTimer() {
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
    }
    function stopPreview() {
      clearPreviewTimer();
      clearTimeout(previewRevealTimer);
      previewRevealTimer = null;
      if (previewPlayer) {
        try {
          previewPlayer.destroy();
        } catch (e) {
        }
        previewPlayer = null;
      }
      if (previewHolder) {
        previewHolder.remove();
        previewHolder = null;
      }
      previewPaused = false;
      root.classList.remove("is-previewing");
    }
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
      } catch (e) {
      }
    }
    function resumePreview() {
      var _a;
      if (!previewHolder || !previewPaused) return;
      previewPaused = false;
      try {
        const p = previewPlayer ? previewPlayer.play() : (_a = previewHolder.querySelector("video")) == null ? void 0 : _a.play();
        if (p && typeof p.catch === "function") p.catch(() => {
        });
      } catch (e) {
      }
    }
    function startPreview() {
      if (previewHolder || holder) return;
      previewHolder = document.createElement("div");
      previewHolder.className = "video_preview-holder swiper-no-swiping";
      previewHolder.setAttribute("aria-hidden", "true");
      previewHolder.innerHTML = buildPlayerMarkup2(src, "", title, true, autoplayStart);
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
      if (!bg) previewRevealTimer = setTimeout(reveal, PREVIEW_REVEAL_TIMEOUT_MS);
      const target = previewHolder.firstElementChild;
      if (typeof window.Plyr === "undefined") {
        if (target.tagName === "VIDEO") {
          target.muted = true;
          target.addEventListener("playing", reveal, { once: true });
          target.addEventListener("ended", () => {
            target.currentTime = autoplayStart;
            target.play().catch(() => {
            });
          });
          target.play().catch(() => {
          });
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
        vimeo: bg ? { background: 1 } : {}
      });
      previewPlayer = pl;
      pl.once("playing", reveal);
      pl.once("timeupdate", reveal);
      pl.on("ended", () => {
        if (previewPlayer !== pl) return;
        pl.currentTime = autoplayStart;
        const p = pl.play();
        if (p && typeof p.catch === "function") p.catch(() => {
        });
      });
      const run = () => {
        if (previewPlayer !== pl) return;
        pl.muted = true;
        if (autoplayStart > 0 && !isNative) pl.currentTime = autoplayStart;
        if (!inView) {
          previewPaused = true;
          return;
        }
        const p = pl.play();
        if (p && typeof p.catch === "function") p.catch(() => {
        });
      };
      if (isNative) run();
      else pl.once("ready", run);
    }
    function syncPreview() {
      if (!autoplay) return;
      if (inView && !holder) {
        if (previewHolder) {
          resumePreview();
          return;
        }
        if (previewTimer) return;
        if (autoplayDelay <= 0) {
          startPreview();
          return;
        }
        previewTimer = setTimeout(() => {
          previewTimer = null;
          if (inView && !holder) startPreview();
        }, autoplayDelay * 1e3);
      } else {
        pausePreview();
      }
    }
    function prepare() {
      if (warm) return warm;
      const h = document.createElement("div");
      h.className = "video_player-holder swiper-no-swiping";
      h.style.pointerEvents = "none";
      h.innerHTML = buildPlayerMarkup2(src, captions, title);
      host.appendChild(h);
      const target = h.firstElementChild;
      const w = { holder: h, player: null, target, ready: false };
      warm = w;
      if (typeof window.Plyr === "undefined") {
        if (target.tagName === "VIDEO") target.controls = true;
        w.ready = true;
        return w;
      }
      const hasCaptions = Boolean(h.querySelector("track"));
      const pl = new window.Plyr(target, {
        controls: [
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          ...hasCaptions ? ["captions"] : [],
          "fullscreen"
        ],
        // Temps écoulé / durée totale (par défaut Plyr affiche le temps restant, ex. "-1:11:39",
        // ce qui se lit comme une durée erronée)
        invertTime: false,
        i18n: getPlyrI18n2(),
        youtube: YOUTUBE_OPTIONS
      });
      w.player = pl;
      pl.once("ready", () => {
        w.ready = true;
      });
      pl.on("loadedmetadata", () => setTimer(timerEl, formatDuration2(pl.duration)));
      pl.on("ended", () => {
        if (player === pl) stop();
      });
      return w;
    }
    function warmUp() {
      if (holder || warm) return;
      warmProvider(src);
      prepare();
    }
    function stop() {
      clearTimeout(revealTimer);
      clearTimeout(cleanupTimer);
      revealTimer = null;
      cleanupTimer = null;
      hideLoader();
      if (player) {
        try {
          player.pause();
          player.destroy();
        } catch (e) {
        }
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
        e.preventDefault();
        e.stopPropagation();
      }
      if (holder) return;
      claimPlayback(stop);
      clearPreviewTimer();
      root.classList.add("is-playing");
      const w = prepare();
      warm = null;
      holder = w.holder;
      player = w.player;
      holder.style.pointerEvents = "";
      showLoader();
      root.addEventListener("click", blockLink, true);
      if (follower) follower.sync();
      const h = holder;
      let revealed = false;
      const reveal = () => {
        if (revealed || holder !== h) return;
        revealed = true;
        clearTimeout(revealTimer);
        hideLoader();
        h.classList.add("is-ready");
        cleanupTimer = setTimeout(() => {
          cleanupTimer = null;
          if (holder === h) stopPreview();
        }, FADE_MS + 50);
      };
      revealTimer = setTimeout(reveal, REVEAL_TIMEOUT_MS);
      const target = w.target;
      if (!player) {
        if (target.tagName === "VIDEO") {
          target.controls = true;
          target.addEventListener("playing", reveal, { once: true });
          target.addEventListener("ended", () => stop(), { once: true });
          target.play().catch(() => {
          });
        }
        return;
      }
      const pl = player;
      pl.once("playing", reveal);
      if (!previewHolder) {
        if (w.ready) reveal();
        else pl.once("ready", reveal);
      }
      const play = () => {
        const p = pl.play();
        if (!p || typeof p.catch !== "function") return;
        p.catch((err) => {
          if (!err || err.name !== "NotAllowedError" || holder !== h) return;
          pl.muted = true;
          const retry = pl.play();
          if (retry && typeof retry.catch === "function") retry.catch(() => {
          });
        });
      };
      if (isNative || w.ready) play();
      else pl.once("ready", play);
    }
    [trigger, ...extraTriggers].filter(Boolean).forEach((btn) => {
      btn.setAttribute("role", "button");
      btn.setAttribute("tabindex", "0");
      btn.setAttribute("aria-label", t("video.watch"));
      btn.addEventListener("click", start);
      btn.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          start(ev);
        }
      });
    });
    if (!bg) registerVideoAnchors(anchors, {
      start: () => start(),
      warmUp: () => {
        if (prewarm !== "off") warmUp();
      }
    });
    if (prewarm !== "off") {
      root.addEventListener("pointerenter", warmUp, { passive: true });
      root.addEventListener("touchstart", warmUp, { passive: true });
      root.addEventListener("focusin", warmUp);
      if (prewarm === "visible" && typeof IntersectionObserver !== "undefined") {
        const io = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            io.disconnect();
            if (typeof requestIdleCallback === "function") requestIdleCallback(warmUp, { timeout: 1500 });
            else setTimeout(warmUp, 200);
          },
          { rootMargin: PREWARM_MARGIN, threshold: 0 }
        );
        io.observe(root);
      }
    }
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
          bg ? { threshold: 0, rootMargin: "50% 0px" } : { threshold: 0.25 }
        ).observe(root);
      }
    }
  }
  function initHero(media) {
    const embedSrc = media.dataset.videoPlayer || "";
    const mp4 = (media.dataset.videoHeroMp4 || "").trim();
    const src = mp4 || embedSrc;
    if (!src) return;
    if (prefersReducedMotion2() || saveDataEnabled()) return;
    const minW = parseFloat(media.dataset.videoHeroMinWidth);
    if (isFinite(minW) && minW > 0 && window.innerWidth < minW) return;
    const root = media.closest(".video_layout") || media.parentElement;
    const info = getVideoInfo2(src);
    const startAt = readAutoplayStart(media);
    warmProvider(src);
    const holder = document.createElement("div");
    holder.className = "video_hero-holder";
    holder.setAttribute("aria-hidden", "true");
    Object.assign(holder.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      opacity: "0",
      transition: HERO_FADE_MS > 0 ? `opacity ${HERO_FADE_MS}ms ease` : "none",
      pointerEvents: "none"
    });
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      holder.style.opacity = "1";
      root.classList.add("is-previewing");
    };
    let pauseFn = null;
    let resumeFn = null;
    if (info.type === "native") {
      const v = document.createElement("video");
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute("muted", "");
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.autoplay = true;
      v.loop = startAt <= 0;
      v.preload = "auto";
      Object.assign(v.style, {
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover"
      });
      v.addEventListener("playing", reveal, { once: true });
      if (startAt > 0) {
        v.addEventListener("ended", () => {
          v.currentTime = startAt;
          v.play().catch(() => {
          });
        });
      }
      v.src = `${info.url}${startAt > 0 ? `#t=${startAt}` : ""}`;
      holder.appendChild(v);
      media.appendChild(holder);
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {
      });
      pauseFn = () => v.pause();
      resumeFn = () => {
        const r = v.play();
        if (r && typeof r.catch === "function") r.catch(() => {
        });
      };
    } else if (info.type === "vimeo" || info.type === "youtube") {
      if (!media.dataset.videoRatio) media.dataset.videoRatio = HERO_DEFAULT_RATIO;
      initCoverFit(media);
      const iframe = document.createElement("iframe");
      iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
      iframe.setAttribute("tabindex", "-1");
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("loading", "eager");
      iframe.title = media.dataset.videoTitle || t("video.background");
      Object.assign(iframe.style, {
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "var(--cover-w, 1920px)",
        height: "var(--cover-h, 1080px)",
        border: "0",
        transform: "translate(-50%, -50%) scale(var(--cover-scale, 1))",
        transformOrigin: "center center",
        pointerEvents: "none"
      });
      if (info.type === "vimeo") {
        const params = new URLSearchParams({
          background: "1",
          // aucune interface, lecture automatique, muet, en boucle
          autoplay: "1",
          muted: "1",
          loop: "1",
          autopause: "0",
          playsinline: "1",
          dnt: "1"
        });
        if (info.hash) params.set("h", info.hash);
        iframe.src = `https://player.vimeo.com/video/${info.id}?${params.toString()}`;
        holder.appendChild(iframe);
        media.appendChild(holder);
        let fallback = null;
        const bindSdk = () => {
          try {
            const vp = new window.Vimeo.Player(iframe);
            const done2 = () => {
              clearTimeout(fallback);
              reveal();
            };
            vp.on("playing", done2);
            vp.on("timeupdate", done2);
            pauseFn = () => vp.pause().catch(() => {
            });
            resumeFn = () => vp.play().catch(() => {
            });
          } catch (e) {
          }
        };
        iframe.addEventListener(
          "load",
          () => {
            fallback = setTimeout(reveal, HERO_VIMEO_FALLBACK_MS);
            if (window.Vimeo && typeof window.Vimeo.Player === "function") bindSdk();
            else {
              const sc = document.createElement("script");
              sc.src = "https://player.vimeo.com/api/player.js";
              sc.async = true;
              sc.onload = () => window.Vimeo && bindSdk();
              document.head.appendChild(sc);
            }
          },
          { once: true }
        );
      } else {
        const id = info.id;
        const params = new URLSearchParams({
          autoplay: "1",
          mute: "1",
          controls: "0",
          loop: "1",
          playlist: id,
          // requis par YouTube pour que loop fonctionne
          playsinline: "1",
          modestbranding: "1",
          rel: "0",
          disablekb: "1",
          iv_load_policy: "3",
          fs: "0"
        });
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
        iframe.addEventListener("load", () => setTimeout(reveal, HERO_EMBED_REVEAL_MS), { once: true });
        holder.appendChild(iframe);
        media.appendChild(holder);
      }
    } else {
      return;
    }
    if (pauseFn && typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) resumeFn && resumeFn();
          else pauseFn && pauseFn();
        },
        { threshold: 0 }
      ).observe(root);
    }
  }
  function readMagnet(el) {
    return el.dataset.videoMagnet !== void 0 ? parseFloat(el.dataset.videoMagnet) : DEFAULT_MAGNET;
  }
  function readFollow(el) {
    const v = el.dataset.videoFollow;
    if (v === void 0 || v === "false") return 0;
    const n = parseFloat(v);
    return n > 0 && n <= 1 ? n : DEFAULT_FOLLOW;
  }
  function readAutoplay(el) {
    const v = el.dataset.videoAutoplay;
    if (v === void 0 || v === "false") return false;
    if (prefersReducedMotion2()) return false;
    return true;
  }
  function readAutoplayDelay(el) {
    const v = parseFloat(el.dataset.videoAutoplayDelay);
    return isFinite(v) && v >= 0 ? v : DEFAULT_AUTOPLAY_DELAY;
  }
  function readAutoplayStart(el) {
    const v = parseFloat(el.dataset.videoAutoplayStart);
    return isFinite(v) && v > 0 ? v : 0;
  }
  function readBg(el) {
    return el.dataset.videoBg !== void 0 && el.dataset.videoBg !== "false";
  }
  function readHero(el) {
    return el.dataset.videoHero !== void 0 && el.dataset.videoHero !== "false";
  }
  function readPrewarm(el) {
    const v = el.dataset.videoPrewarm;
    if (v === void 0) return "hover";
    if (v === "false" || v === "off") return "off";
    if (v === "visible") return "visible";
    return "hover";
  }
  function initOne4(media) {
    const src = media.dataset.videoPlayer || media.dataset.videoHeroMp4;
    if (!src) return;
    if (readHero(media)) {
      initHero(media);
      return;
    }
    const bg = readBg(media);
    if (bg) initCoverFit(media);
    const layout = media.closest(".video_layout") || media.parentElement;
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
      prewarm: readPrewarm(media),
      bg,
      // Seuls la vidéo et son bloc .video_layout comptent comme cible d'ancre
      anchors: [media, media.closest(".video_layout")]
    });
  }
  function initLinkCard(card) {
    const trigger = card.querySelector(".video_controller");
    const playBtn = trigger && trigger.querySelector(".video_controller-play");
    const magnetScope = card.querySelector("[data-video-magnet-zone]") || card;
    initMagnet(magnetScope, trigger, playBtn, readMagnet(card));
    if (card.dataset.videoPlayer) {
      loadDuration(card.dataset.videoPlayer, card.querySelector(".video_controller-time"), card.dataset.videoDuration);
    }
  }
  function initCard(card) {
    if (card.hasAttribute("data-video-link")) return initLinkCard(card);
    const src = card.dataset.videoPlayer;
    if (!src) return;
    setupPlayback({
      root: card,
      host: card.querySelector("[data-video-host]") || card.querySelector(".personas_card-banner") || card,
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
      prewarm: readPrewarm(card),
      anchors: [card]
    });
  }
  function initVideoSection(root = document) {
    root.querySelectorAll("[data-video-player]:not([data-video-ready]):not([data-video-card])").forEach((media) => {
      media.setAttribute("data-video-ready", "true");
      initOne4(media);
    });
    root.querySelectorAll("[data-video-card]:not([data-video-ready])").forEach((card) => {
      card.setAttribute("data-video-ready", "true");
      initCard(card);
    });
  }

  // src/switch.js
  var DEFAULT_DURATION = 0.45;
  var DEFAULT_DISTANCE = 10;
  var DEFAULT_PUSH_DISTANCE = 100;
  var VARIANT_RE = /w-variant-[\w-]+/g;
  function initGroup(group) {
    const buttons = Array.from(group.querySelectorAll("[data-switch-btn]"));
    const panels = Array.from(group.querySelectorAll("[data-switch-panel]"));
    if (buttons.length < 2 || !panels.length) return;
    const keys = buttons.map((b) => b.dataset.switchBtn);
    const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const durationAttr = parseFloat(group.dataset.switchDuration);
    const duration = isFinite(durationAttr) ? durationAttr : DEFAULT_DURATION;
    const outDuration = Math.min(0.3, duration * 0.65);
    const variantsOf = (el) => el.className.match(VARIANT_RE) || [];
    const explicitClass = group.dataset.switchSelectedClass || "";
    let selSet = [];
    let unselSet = [];
    let selBtn = null;
    let initialKey = null;
    if (explicitClass) {
      selSet = [explicitClass];
    } else {
      selBtn = buttons.find((b) => /selected/i.test(b.getAttribute("data-wf--switch-item--variant") || "")) || buttons.find((b) => variantsOf(b).length > 0) || null;
      if (selBtn) {
        initialKey = selBtn.dataset.switchBtn;
        selSet = variantsOf(selBtn);
        const other = buttons.find((b) => b !== selBtn);
        unselSet = other ? variantsOf(other) : [];
      }
    }
    function applyVariant(btn, on) {
      const add = on ? selSet : unselSet;
      const remove = (on ? unselSet : selSet).filter((c) => add.indexOf(c) === -1);
      if (remove.length) btn.classList.remove(...remove);
      if (add.length) btn.classList.add(...add);
    }
    const param = group.dataset.switchParam || "";
    const fromUrl = param ? new URLSearchParams(window.location.search).get(param) : null;
    const startKey = [fromUrl, group.dataset.switchDefault, initialKey, keys[0]].find((k) => k && keys.indexOf(k) > -1);
    let currentKey = null;
    const hideAttr = (group.dataset.switchHideClass || "").trim();
    let hideClasses = [];
    if (hideAttr === "none") {
      hideClasses = [];
    } else if (hideAttr) {
      hideClasses = hideAttr.split(/\s+/).filter(Boolean);
    } else {
      panels.forEach((p) => {
        p.classList.forEach((c) => {
          if (/^hide(-[\w-]+)?$/.test(c) && hideClasses.indexOf(c) === -1) hideClasses.push(c);
        });
      });
    }
    function setVisible(panel, on) {
      if (on) {
        panel.hidden = false;
        if (hideClasses.length) panel.classList.remove(...hideClasses);
      } else {
        panel.hidden = true;
        if (hideClasses.length) panel.classList.add(...hideClasses);
      }
    }
    const lockAttr = group.dataset.switchLockHeight;
    const lockKey = lockAttr === "false" ? null : keys.indexOf(lockAttr) > -1 ? lockAttr : keys[0];
    if (lockKey) {
      panels.filter((p) => p.dataset.switchPanel === lockKey).forEach((p) => p.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute("loading", "eager")));
    }
    function lockHeight() {
      if (!lockKey) return;
      const saved = panels.map((p) => !p.hidden);
      const prevMin = group.style.minHeight;
      group.style.minHeight = "";
      panels.forEach((p) => setVisible(p, p.dataset.switchPanel === lockKey));
      const cs = window.getComputedStyle(group);
      let h = group.getBoundingClientRect().height;
      if (cs.boxSizing === "content-box") {
        h -= (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      }
      panels.forEach((p, i) => setVisible(p, saved[i]));
      if (h > 0) {
        const px = `${Math.ceil(h)}px`;
        group.style.minHeight = px;
        if (prevMin && px !== prevMin) requestScrollRefresh();
      } else {
        group.style.minHeight = prevMin;
      }
    }
    const list = buttons[0].parentElement;
    const useIndicator = group.dataset.switchIndicator !== "false" && !!list;
    let indicator = null;
    if (useIndicator) {
      indicator = document.createElement("span");
      indicator.className = "switch_indicator";
      indicator.setAttribute("aria-hidden", "true");
      if (selBtn) {
        const cs = window.getComputedStyle(selBtn);
        const bg = cs.backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
          indicator.style.backgroundColor = bg;
        }
        if (cs.borderRadius) indicator.style.borderRadius = cs.borderRadius;
        if (cs.boxShadow && cs.boxShadow !== "none") indicator.style.boxShadow = cs.boxShadow;
      }
      list.classList.add("has-switch-indicator");
      list.insertBefore(indicator, list.firstChild);
    }
    function placeIndicator(btn, animate) {
      if (!indicator || !btn) return;
      const instant = !animate || reduceMotion;
      if (instant) indicator.classList.remove("is-animated");
      indicator.style.setProperty("--sw-x", `${btn.offsetLeft}px`);
      indicator.style.setProperty("--sw-y", `${btn.offsetTop}px`);
      indicator.style.setProperty("--sw-w", `${btn.offsetWidth}px`);
      indicator.style.setProperty("--sw-h", `${btn.offsetHeight}px`);
      if (!indicator.classList.contains("is-visible")) {
        void indicator.offsetWidth;
        indicator.classList.add("is-visible");
      }
      if (instant) {
        void indicator.offsetWidth;
        if (!reduceMotion) indicator.classList.add("is-animated");
      } else {
        indicator.classList.add("is-animated");
      }
    }
    function currentButton() {
      return buttons.find((b) => b.dataset.switchBtn === currentKey);
    }
    function animType(panel) {
      return panel.dataset.switchAnim || group.dataset.switchAnim || "fade";
    }
    function distanceOf(panel, fallback = DEFAULT_DISTANCE) {
      const v = parseFloat(panel.dataset.switchDistance || group.dataset.switchDistance);
      return isFinite(v) ? v : fallback;
    }
    function lift(panel) {
      const parent = panel.parentElement;
      if (!parent || panel._swLift) return;
      if (window.getComputedStyle(parent).position === "static") {
        if (!parent._swCount) parent._swPos = parent.style.position;
        parent.style.position = "relative";
      }
      parent._swCount = (parent._swCount || 0) + 1;
      const top = panel.offsetTop;
      const left = panel.offsetLeft;
      const width = panel.offsetWidth;
      panel._swLift = {
        position: panel.style.position,
        top: panel.style.top,
        left: panel.style.left,
        width: panel.style.width,
        margin: panel.style.margin,
        boxSizing: panel.style.boxSizing
      };
      panel.style.position = "absolute";
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
      panel.style.width = `${width}px`;
      panel.style.margin = "0";
      panel.style.boxSizing = "border-box";
    }
    function release(panel) {
      const saved = panel._swLift;
      if (!saved) return;
      panel._swLift = null;
      Object.keys(saved).forEach((k) => {
        panel.style[k] = saved[k];
      });
      const parent = panel.parentElement;
      if (parent && parent._swCount) {
        parent._swCount -= 1;
        if (parent._swCount <= 0) {
          parent._swCount = 0;
          parent.style.position = parent._swPos || "";
        }
      }
    }
    function clearAnimProps(panel) {
      if (window.gsap) window.gsap.set(panel, { clearProps: "opacity,transform" });
    }
    function setPanels(key, animate, dir) {
      const canAnimate = animate && duration > 0 && !reduceMotion && !!window.gsap;
      const gsap = window.gsap;
      const exitingSlides = panels.filter(
        (p) => !p.hidden && p.dataset.switchPanel !== key && animType(p) === "slide"
      );
      const slideInDelay = canAnimate && exitingSlides.length ? outDuration : 0;
      const ordered = [
        ...panels.filter((p) => p.dataset.switchPanel !== key),
        ...panels.filter((p) => p.dataset.switchPanel === key)
      ];
      ordered.forEach((panel) => {
        const match = panel.dataset.switchPanel === key;
        const type = animType(panel);
        panel.setAttribute("role", "tabpanel");
        if (canAnimate) gsap.killTweensOf(panel);
        if (!match) {
          if (panel.hidden) return;
          if (type === "none") {
            release(panel);
            setVisible(panel, false);
            if (window.gsap) clearAnimProps(panel);
          } else if (canAnimate && type === "push") {
            const dist = distanceOf(panel, DEFAULT_PUSH_DISTANCE);
            lift(panel);
            gsap.to(panel, {
              xPercent: -dir * dist,
              opacity: 0,
              duration,
              ease: "power3.inOut",
              onComplete: () => {
                release(panel);
                setVisible(panel, false);
                clearAnimProps(panel);
              }
            });
          } else if (canAnimate && type === "slide") {
            const dist = distanceOf(panel);
            gsap.to(panel, {
              xPercent: -dir * dist,
              opacity: 0,
              duration: outDuration,
              ease: "power2.in",
              onComplete: () => {
                setVisible(panel, false);
                clearAnimProps(panel);
              }
            });
          } else {
            release(panel);
            setVisible(panel, false);
            if (window.gsap) clearAnimProps(panel);
          }
          return;
        }
        const wasHidden = panel.hidden;
        if (!canAnimate || type === "none") {
          release(panel);
          setVisible(panel, true);
          if (window.gsap) clearAnimProps(panel);
          return;
        }
        if (type === "push") {
          const dist = distanceOf(panel, DEFAULT_PUSH_DISTANCE);
          if (!wasHidden) {
            release(panel);
            gsap.to(panel, { xPercent: 0, opacity: 1, duration, ease: "power3.out", clearProps: "opacity,transform" });
            return;
          }
          setVisible(panel, true);
          gsap.fromTo(
            panel,
            { xPercent: dir * dist, opacity: 0 },
            { xPercent: 0, opacity: 1, duration, ease: "power3.inOut", clearProps: "opacity,transform" }
          );
          return;
        }
        if (type === "slide") {
          const dist = distanceOf(panel);
          if (!wasHidden) {
            gsap.to(panel, { xPercent: 0, opacity: 1, duration, ease: "power3.out", clearProps: "opacity,transform" });
            return;
          }
          gsap.set(panel, { xPercent: dir * dist, opacity: 0 });
          gsap.to(panel, {
            xPercent: 0,
            opacity: 1,
            duration,
            delay: slideInDelay,
            ease: "power3.out",
            clearProps: "opacity,transform",
            onStart: () => {
              setVisible(panel, true);
            }
          });
          if (slideInDelay === 0) setVisible(panel, true);
          return;
        }
        setVisible(panel, true);
        if (wasHidden) {
          gsap.fromTo(
            panel,
            { opacity: 0 },
            { opacity: 1, duration, ease: "power2.out", clearProps: "opacity" }
          );
        }
      });
    }
    function setButtons(key) {
      buttons.forEach((btn) => {
        const on = btn.dataset.switchBtn === key;
        applyVariant(btn, on);
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.setAttribute("tabindex", on ? "0" : "-1");
      });
    }
    function activate(key, { animate = true, updateUrl = true } = {}) {
      if (key === currentKey || keys.indexOf(key) === -1) return;
      const prevKey = currentKey;
      const dir = prevKey === null || keys.indexOf(key) > keys.indexOf(prevKey) ? 1 : -1;
      currentKey = key;
      setButtons(key);
      setPanels(key, animate && prevKey !== null, dir);
      placeIndicator(currentButton(), animate);
      if (param && updateUrl) {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(param, key);
          window.history.replaceState({}, "", url.toString());
        } catch (e) {
        }
      }
      const refreshDelay = animate ? (outDuration + duration) * 1e3 + 50 : 0;
      requestScrollRefresh(refreshDelay);
    }
    if (list) list.setAttribute("role", "tablist");
    buttons.forEach((btn, i) => {
      btn.setAttribute("role", "tab");
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        activate(btn.dataset.switchBtn);
      });
      btn.addEventListener("keydown", (ev) => {
        let next = null;
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = buttons[(i + 1) % buttons.length];
        if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = buttons[(i - 1 + buttons.length) % buttons.length];
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activate(btn.dataset.switchBtn);
          return;
        }
        if (next) {
          ev.preventDefault();
          next.focus();
          activate(next.dataset.switchBtn);
        }
      });
    });
    activate(startKey, { animate: false, updateUrl: false });
    if (lockKey) {
      lockHeight();
      window.addEventListener("load", lockHeight);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeight);
      group.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", lockHeight, { once: true });
      });
      if (typeof ResizeObserver !== "undefined") {
        let lastW = group.offsetWidth;
        let timer2 = null;
        new ResizeObserver(() => {
          const w = group.offsetWidth;
          if (w === lastW) return;
          lastW = w;
          clearTimeout(timer2);
          timer2 = setTimeout(lockHeight, 100);
        }).observe(group);
      } else {
        let timer2 = null;
        window.addEventListener("resize", () => {
          clearTimeout(timer2);
          timer2 = setTimeout(lockHeight, 100);
        });
      }
    }
    if (indicator) {
      const refit = () => placeIndicator(currentButton(), false);
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(refit).observe(list);
      } else {
        window.addEventListener("resize", refit);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
      window.addEventListener("load", refit);
    }
  }
  function initSwitch(root = document) {
    root.querySelectorAll("[data-switch-group]:not([data-switch-ready])").forEach((group) => {
      group.setAttribute("data-switch-ready", "true");
      initGroup(group);
    });
  }

  // src/name-tokens.js
  function splitFullName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return { firstName, lastName };
  }
  function walkTextNodes(root, callback) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node2) {
        const tag = node2.parentElement ? node2.parentElement.tagName : "";
        if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while (node = walker.nextNode()) {
      callback(node);
    }
  }
  function initNameTokens(root = document) {
    const sourceEl = root.querySelector("[data-name-source]");
    if (!sourceEl) return;
    const attrValue = sourceEl.getAttribute("data-name-source") || "";
    const fullName = (attrValue.trim() || sourceEl.textContent).trim();
    if (!fullName) return;
    const { firstName, lastName } = splitFullName(fullName);
    const scanRoot = root === document ? document.body : root;
    walkTextNodes(scanRoot, (node) => {
      if (node.nodeValue.includes("{name}") || node.nodeValue.includes("{surname}")) {
        node.nodeValue = node.nodeValue.replace(/\{name\}/g, firstName).replace(/\{surname\}/g, lastName);
      }
    });
  }

  // src/nav-hero.js
  function initNavHero() {
    const nav = document.querySelector(".nav_fixed");
    const hero = document.querySelector("[data-nav-hero]");
    if (!nav || !hero) return;
    const bar = nav.querySelector(".navbar_component") || nav;
    let observer = null;
    function observe() {
      if (observer) observer.disconnect();
      const barTop = Math.max(1, Math.round(bar.getBoundingClientRect().top));
      observer = new IntersectionObserver(
        ([entry]) => {
          const past = !entry.isIntersecting && entry.boundingClientRect.bottom <= barTop;
          nav.classList.toggle("is-past-hero", past);
        },
        { rootMargin: `-${barTop}px 0px 0px 0px`, threshold: 0 }
      );
      observer.observe(hero);
    }
    observe();
    if (typeof ResizeObserver !== "undefined") {
      let last = nav.offsetHeight;
      new ResizeObserver(() => {
        if (nav.offsetHeight !== last) {
          last = nav.offsetHeight;
          observe();
        }
      }).observe(nav);
    }
  }

  // src/animate/hero-bg-parallax.js
  var SCROLL_ATTRS = ["heroBgY", "heroBgX", "heroBgScale", "heroBgRotate"];
  var MOUSE_SMOOTH = 0.9;
  var REVEAL_ENABLED = false;
  var REVEAL_AT = 0.5;
  var REVEAL_MARGIN = 32;
  var INTRO_START_DELAY = 0.3;
  var INTRO_DEFAULT_SCALE = 0.8;
  var INTRO_DEFAULT_OPACITY = 0;
  var INTRO_DEFAULT_DURATION = 1.2;
  var INTRO_DEFAULT_EASE = "power2.out";
  var INTRO_STAGGER = 0.35;
  var NAV_OPEN_SELECTOR = ".nav_fixed .w-dropdown-toggle.w--open, .nav_fixed .w-nav-button.w--open";
  function num3(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function getOverflow(el, hero) {
    const box = el.getBoundingClientRect();
    if (!box.height) return 0;
    const overflow = box.bottom - hero.getBoundingClientRect().bottom;
    return overflow > 0 ? overflow + REVEAL_MARGIN : 0;
  }
  function getScrollY(el, hero, delay) {
    const y = num3(el.dataset.heroBgY, 0);
    if (!REVEAL_ENABLED) return y;
    const overflow = getOverflow(el, hero);
    if (!overflow) return y;
    const share = Math.max(0.05, (REVEAL_AT - delay) / (1 - delay));
    return Math.min(y, -overflow / share);
  }
  function buildLayers(img) {
    if (img.parentNode.classList.contains("hero-bg_frame")) {
      const frame2 = img.parentNode;
      return { intro: frame2.parentNode, frame: frame2 };
    }
    const intro = document.createElement("div");
    intro.className = "hero-bg_intro";
    intro.style.display = "block";
    intro.style.width = "100%";
    intro.style.willChange = "transform, opacity";
    const frame = document.createElement("div");
    frame.className = "hero-bg_frame";
    img.parentNode.insertBefore(intro, img);
    intro.appendChild(frame);
    frame.appendChild(img);
    return { intro, frame };
  }
  function getOrder(el, index) {
    const custom = parseFloat(el.dataset.heroBgOrder);
    if (Number.isFinite(custom)) return custom;
    return 1e3 + index;
  }
  function initHeroBgParallax(root = document) {
    var _a;
    const showAll = () => root.querySelectorAll(".hero-bg_image").forEach((el) => el.classList.add("is-ready"));
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return showAll();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return showAll();
    const hero = root.querySelector(".section_main_hero");
    if (!hero) return showAll();
    const all = Array.from(hero.querySelectorAll(".hero-bg_image")).filter((el) => el.querySelector("img"));
    if (!all.length) return showAll();
    const layers = /* @__PURE__ */ new Map();
    all.forEach((el) => {
      const img = el.querySelector("img");
      layers.set(el, { img, ...buildLayers(img) });
    });
    const orders = all.map((el, i) => getOrder(el, i));
    const minOrder = Math.min(...orders);
    const startDelay = num3(
      (_a = hero.dataset.heroBgIntroStart) != null ? _a : all[0].dataset.heroBgIntroStart,
      INTRO_START_DELAY
    );
    all.forEach((el, i) => {
      const d = el.dataset;
      const { intro } = layers.get(el);
      const delay = startDelay + num3(d.heroBgIntroDelay, (orders[i] - minOrder) * INTRO_STAGGER);
      window.gsap.fromTo(
        intro,
        {
          scale: num3(d.heroBgIntroScale, INTRO_DEFAULT_SCALE),
          opacity: num3(d.heroBgIntroOpacity, INTRO_DEFAULT_OPACITY),
          force3D: true,
          immediateRender: true
          // état de départ appliqué tout de suite (pas de flash pendant le délai)
        },
        {
          scale: 1,
          opacity: 1,
          duration: num3(d.heroBgIntroDuration, INTRO_DEFAULT_DURATION),
          ease: d.heroBgIntroEase || INTRO_DEFAULT_EASE,
          delay,
          force3D: true,
          clearProps: "transform,opacity"
        }
      );
      el.classList.add("is-ready");
    });
    const scrollItems = REVEAL_ENABLED ? all : all.filter((el) => SCROLL_ATTRS.some((a) => el.dataset[a] !== void 0));
    if (REVEAL_ENABLED) {
      all.forEach((el) => {
        const { img } = layers.get(el);
        if (!img.complete) img.addEventListener("load", () => requestScrollRefresh(), { once: true });
      });
    }
    const mouseItems = all.filter((el) => el.dataset.heroBgMouse !== void 0);
    const innerItems = all.filter((el) => num3(el.dataset.heroBgInner, 0) !== 0);
    if (!scrollItems.length && !mouseItems.length && !innerItems.length) return;
    const first = (scrollItems[0] || mouseItems[0] || innerItems[0]).dataset;
    const mm = window.gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      const tl = window.gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero,
          start: first.heroBgStart || "top top",
          end: first.heroBgEnd || "bottom top",
          scrub: num3(first.heroBgScrub, 1),
          invalidateOnRefresh: true
        }
      });
      scrollItems.forEach((el) => {
        const d = el.dataset;
        const { frame } = layers.get(el);
        const delay = Math.min(0.95, Math.max(0, num3(d.heroBgDelay, 0)));
        tl.fromTo(
          frame,
          { x: 0, y: 0, scale: 1, rotation: 0, force3D: true },
          {
            x: num3(d.heroBgX, 0),
            y: () => getScrollY(el, hero, delay),
            scale: num3(d.heroBgScale, 1),
            rotation: num3(d.heroBgRotate, 0),
            ease: d.heroBgEase || "none",
            force3D: true,
            duration: 1 - delay
          },
          delay
        );
      });
      innerItems.forEach((el) => {
        const amp = num3(el.dataset.heroBgInner, 0);
        const { img } = layers.get(el);
        const zoom = 1 + Math.abs(amp) / 100 * 2;
        window.gsap.set(img, { scale: zoom, transformOrigin: "50% 50%" });
        tl.fromTo(
          img,
          { yPercent: -amp, force3D: true },
          { yPercent: amp, ease: "none", force3D: true, duration: 1 },
          0
        );
      });
      if (mouseItems.length && window.matchMedia("(hover: hover)").matches) {
        const movers = mouseItems.map((el) => {
          const { frame } = layers.get(el);
          return {
            strength: num3(el.dataset.heroBgMouse, 0),
            qx: window.gsap.quickTo(frame, "xPercent", { duration: MOUSE_SMOOTH, ease: "power3.out" }),
            qy: window.gsap.quickTo(frame, "yPercent", { duration: MOUSE_SMOOTH, ease: "power3.out" })
          };
        });
        let outside = false;
        const resetMovers = () => {
          movers.forEach((m) => {
            m.qx(0);
            m.qy(0);
          });
        };
        const navOpen = () => !!document.querySelector(NAV_OPEN_SELECTOR);
        const onMove = (e) => {
          if (navOpen()) {
            if (!outside) {
              outside = true;
              resetMovers();
            }
            return;
          }
          const r = hero.getBoundingClientRect();
          const inside = e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right;
          if (!inside) {
            if (!outside) {
              outside = true;
              resetMovers();
            }
            return;
          }
          outside = false;
          const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
          movers.forEach((m) => {
            m.qx(nx * m.strength);
            m.qy(ny * m.strength);
          });
        };
        const onLeave = (e) => {
          if (e.relatedTarget) return;
          outside = true;
          resetMovers();
        };
        const nav = document.querySelector(".nav_fixed");
        let navObserver = null;
        if (nav && typeof MutationObserver !== "undefined") {
          navObserver = new MutationObserver(() => {
            if (navOpen() && !outside) {
              outside = true;
              resetMovers();
            }
          });
          navObserver.observe(nav, { attributes: true, attributeFilter: ["class"], subtree: true });
        }
        window.addEventListener("mousemove", onMove, { passive: true });
        document.addEventListener("mouseout", onLeave);
        return () => {
          window.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseout", onLeave);
          if (navObserver) navObserver.disconnect();
          resetMovers();
        };
      }
    });
  }

  // src/animate/stack-cards.js
  var DEFAULT_STEP = 0.05;
  var DEFAULT_BRIGHTNESS = 0.8;
  var DEFAULT_START3 = "top bottom";
  function num4(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function initStackCards(root = document) {
    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lists = root.querySelectorAll(".section_stack-list");
    if (!lists.length) return;
    const mm = window.gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      lists.forEach((list) => {
        const d = list.dataset;
        const step = num4(d.stackStep, DEFAULT_STEP);
        const brightness = num4(d.stackBrightness, DEFAULT_BRIGHTNESS);
        const items = Array.from(list.querySelectorAll(":scope > .stack-item"));
        window.gsap.set(items, { transformOrigin: "50% 0", force3D: true });
        items.forEach((item, i) => {
          for (let j = i + 1; j < items.length; j++) {
            const depth = j - i;
            const fromScale = 1 - (depth - 1) * step;
            const toScale = 1 - depth * step;
            const fromB = 1 - (1 - brightness) * (depth - 1);
            const toB = 1 - (1 - brightness) * depth;
            window.gsap.fromTo(
              item,
              { scale: fromScale, filter: `brightness(${fromB})` },
              {
                scale: toScale,
                filter: `brightness(${toB})`,
                ease: "none",
                immediateRender: false,
                scrollTrigger: {
                  trigger: items[j],
                  start: d.stackStart || DEFAULT_START3,
                  // fin = quand la card j atteint son propre top sticky
                  end: d.stackEnd || (() => {
                    const top = parseFloat(getComputedStyle(items[j]).top) || 0;
                    return `top ${top}px`;
                  }),
                  scrub: true,
                  invalidateOnRefresh: true
                }
              }
            );
          }
        });
      });
      const mo = new MutationObserver(() => requestScrollRefresh());
      mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      return () => mo.disconnect();
    });
  }

  // src/speakers-slot.js
  var TAG = /\[\s*speakers_list\s*\/?\s*\]/i;
  var clean = (s) => s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");
  function findTagNode() {
    const root = document.querySelector(".w-richtext");
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (TAG.test(clean(walker.currentNode.nodeValue))) return walker.currentNode;
    }
    return null;
  }
  function revealRowByRow(section) {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger) return;
    const items = section.querySelectorAll(".speakers_item");
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 24 });
    ScrollTrigger.batch(items, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08
      })
    });
  }
  function initSpeakersSlot() {
    const section = document.querySelector(".section_event_speakers");
    if (!section) return;
    const textNode = findTagNode();
    if (!textNode) {
      section.remove();
      return;
    }
    const block = textNode.parentElement.closest("p, li, div");
    const onlyTag = block && !block.classList.contains("w-richtext") && block.textContent.replace(TAG, "").trim() === "";
    if (onlyTag) {
      block.replaceWith(section);
    } else {
      textNode.nodeValue = clean(textNode.nodeValue).replace(TAG, "");
      textNode.after(section);
    }
    section.classList.add("is-placed");
    revealRowByRow(section);
    requestScrollRefresh();
  }

  // src/nav-dropdown-hover.js
  function initNavDropdownHover() {
    const CLOSE_DELAY = 200;
    const mq = window.matchMedia("(hover: hover) and (min-width: 992px)");
    const nav = document.querySelector(".nav_fixed");
    const dropdowns = document.querySelectorAll(".nav_fixed .w-dropdown");
    if (!nav || !dropdowns.length) return;
    setupDesktopMenuReset(nav);
    setupMobileMenuScroll(nav);
    setupScrollLock(nav);
    setupFirstLinkAlignment(nav, dropdowns);
    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".w-dropdown-toggle");
      const list = dropdown.querySelector(".w-dropdown-list");
      if (!toggle || !list) return;
      let closeTimer = null;
      const isOpen = () => toggle.classList.contains("w--open");
      function setOpen(open) {
        toggle.classList.toggle("w--open", open);
        list.classList.toggle("w--open", open);
        toggle.setAttribute("aria-expanded", String(open));
        dropdown.style.zIndex = open ? "901" : "";
      }
      dropdown.addEventListener("mouseenter", () => {
        if (!mq.matches) return;
        clearTimeout(closeTimer);
        if (!isOpen()) setOpen(true);
      });
      dropdown.addEventListener("mouseleave", () => {
        if (!mq.matches) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          if (isOpen()) setOpen(false);
        }, CLOSE_DELAY);
      });
      toggle.addEventListener(
        "click",
        (e) => {
          if (mq.matches && e.isTrusted) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        },
        true
      );
      mq.addEventListener("change", () => {
        clearTimeout(closeTimer);
        if (isOpen()) setOpen(false);
      });
    });
  }
  function setupDesktopMenuReset(nav) {
    const desktop = window.matchMedia("(min-width: 992px)");
    const menu = nav.querySelector(".navbar_menu");
    if (!menu) return;
    function reset() {
      if (!desktop.matches) return;
      if (menu.style.transform) menu.style.removeProperty("transform");
      if (menu.style.transition) menu.style.removeProperty("transition");
    }
    new MutationObserver(reset).observe(menu, {
      attributes: true,
      attributeFilter: ["style"]
    });
    desktop.addEventListener("change", reset);
    reset();
  }
  function setupMobileMenuScroll(nav) {
    const bar = nav.querySelector(".navbar_component");
    if (!bar) return;
    nav.querySelectorAll(".navbar_menu, .w-nav-overlay").forEach((el) => el.setAttribute("data-lenis-prevent", ""));
    function update() {
      nav.style.setProperty(
        "--nav-menu-top",
        `${Math.round(bar.getBoundingClientRect().bottom)}px`
      );
    }
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(nav);
      observer.observe(bar);
    }
    window.addEventListener("resize", update, { passive: true });
    update();
  }
  function setupScrollLock(nav) {
    const root = document.documentElement;
    const mobile = window.matchMedia("(max-width: 991px)");
    let locked = false;
    function lock() {
      var _a;
      if (locked) return;
      locked = true;
      root.style.scrollbarGutter = "stable";
      root.style.overflow = "hidden";
      (_a = getLenis()) == null ? void 0 : _a.stop();
    }
    function unlock() {
      var _a;
      if (!locked) return;
      locked = false;
      root.style.overflow = "";
      root.style.scrollbarGutter = "";
      (_a = getLenis()) == null ? void 0 : _a.start();
    }
    function sync() {
      const selector = mobile.matches ? ".navbar_menu-button.w--open, .w-dropdown-toggle.w--open" : ".w-dropdown-toggle.w--open";
      if (nav.querySelector(selector)) lock();
      else unlock();
    }
    new MutationObserver(sync).observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    mobile.addEventListener("change", sync);
    sync();
  }
  function setupFirstLinkAlignment(nav, dropdowns) {
    const desktop = window.matchMedia("(min-width: 992px)");
    const firstLink = nav.querySelector(".navbar_menu .navbar_link");
    if (!firstLink) return;
    const contentLeft = (el) => {
      const cs = getComputedStyle(el);
      return el.getBoundingClientRect().left + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0);
    };
    function align(dropdown) {
      const toggle = dropdown.querySelector(".w-dropdown-toggle");
      const list = dropdown.querySelector(".w-dropdown-list");
      const container = list == null ? void 0 : list.querySelector(".dropdown-container");
      if (!toggle || !container) return;
      if (!desktop.matches) {
        container.style.removeProperty("padding-left");
        return;
      }
      if (!toggle.classList.contains("w--open")) return;
      const column = container.querySelector(".dropdown-list-wrapper");
      if (!column) return;
      const setPadding = (px) => container.style.setProperty("padding-left", `${px}px`, "important");
      const target = contentLeft(firstLink);
      setPadding(0);
      const at0 = contentLeft(column);
      setPadding(100);
      const at100 = contentLeft(column);
      const slope = (at100 - at0) / 100;
      if (Math.abs(slope) < 0.05) {
        container.style.removeProperty("padding-left");
        return;
      }
      let value = Math.max(0, (target - at0) / slope);
      setPadding(value);
      const error = target - contentLeft(column);
      if (Math.abs(error) > 0.5) value = Math.max(0, value + error / slope);
      setPadding(Math.round(value * 100) / 100);
    }
    let alignFrame = null;
    function alignAll() {
      if (alignFrame) return;
      alignFrame = requestAnimationFrame(() => {
        alignFrame = null;
        dropdowns.forEach(align);
      });
    }
    new MutationObserver(alignAll).observe(nav, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    window.addEventListener("resize", alignAll, { passive: true });
    desktop.addEventListener("change", alignAll);
    alignAll();
  }

  // src/fit-scale.js
  function initFitScale() {
    if (document.documentElement.classList.contains("wf-design-mode")) return;
    document.querySelectorAll("[data-fit-scale-wrap]").forEach((wrap) => {
      var _a;
      const row = wrap.querySelector("[data-fit-scale]");
      if (!row) return;
      const readMax = () => parseFloat(getComputedStyle(wrap).getPropertyValue("--s")) || parseFloat(row.dataset.fitScaleMax) || 1;
      wrap.classList.add("is-fit-ready");
      const update = () => {
        const natural = row.offsetWidth;
        const naturalH = row.offsetHeight;
        const available = wrap.clientWidth;
        if (!natural || !available) return;
        const max = readMax();
        const scale = Math.min(max, available / natural);
        const offsetX = (available - natural * scale) / 2;
        row.style.transform = `translateX(${offsetX}px) scale(${scale})`;
        wrap.style.height = `${naturalH * scale}px`;
      };
      update();
      new ResizeObserver(update).observe(wrap);
      if ((_a = document.fonts) == null ? void 0 : _a.ready) document.fonts.ready.then(update);
    });
  }

  // src/nav-menu-label.js
  function initNavMenuLabel() {
    const btn = document.querySelector(".navbar_menu-button");
    const label = btn && btn.querySelector(".menu-icon .text");
    if (!btn || !label || label.querySelector(".menu-label_mask")) return;
    label.innerHTML = `
    <span class="menu-label_mask" aria-hidden="true">
      <span class="menu-label_item is-open">${t("menu.open")}</span>
      <span class="menu-label_item is-close">${t("menu.close")}</span>
    </span>
  `;
    const syncAria = () => {
      btn.setAttribute(
        "aria-label",
        btn.classList.contains("w--open") ? t("menu.ariaClose") : t("menu.ariaOpen")
      );
    };
    new MutationObserver(syncAria).observe(btn, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncAria();
  }

  // src/nav-scroll.js
  var DESKTOP = "(min-width: 992px)";
  function initNavScroll() {
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
        e.stopPropagation();
        menu.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
    const current = menu.querySelector(".w--current");
    if (current && desktop.matches) {
      const left = current.offsetLeft - menu.offsetLeft;
      if (left + current.offsetWidth > menu.clientWidth) {
        menu.scrollLeft = left - (menu.clientWidth - current.offsetWidth) / 2;
      }
    }
    update();
  }

  // src/embed-i18n.js
  var DICT2 = {
    // Politique de confidentialité, annexe 1
    "Tableau des traitements de donn\xE9es personnelles": "Table of personal data processing",
    "Finalit\xE9 du traitement": "Purpose of processing",
    "Cat\xE9gories de Donn\xE9es \xE0 Caract\xE8re Personnel": "Categories of Personal Data",
    "Qualit\xE9 de RockFi": "RockFi's role",
    "Base l\xE9gale": "Legal basis",
    "Dur\xE9e de conservation": "Retention period",
    "Gestion du site internet": "Website management",
    "Donn\xE9es d'identification et de contact (nom, pr\xE9nom, adresse e-mail, t\xE9l\xE9phone), contenu de votre demande": "Identification and contact data (last name, first name, email address, phone), content of your request",
    "Responsable de traitement": "Data controller",
    "Responsable de traitement*": "Data controller*",
    "Int\xE9r\xEAt l\xE9gitime": "Legitimate interest",
    "3 ans \xE0 compter du dernier contact.": "3 years from the last contact.",
    "Gestion de la relation avec les prospects (r\xE9ponse aux demandes d'information, prise de rendez-vous, newsletters, invitations \xE0 des \xE9v\xE9nements et communications commerciales etc)": "Prospect relationship management (responding to information requests, booking appointments, newsletters, event invitations, marketing communications, etc.)",
    "Donn\xE9es d'identification et de contact, pr\xE9f\xE9rences de communication, inscriptions \xE0 des \xE9v\xE9nements, formulaires compl\xE9t\xE9s": "Identification and contact data, communication preferences, event registrations, completed forms",
    "Int\xE9r\xEAt l\xE9gitime/Consentement (lorsque requis)": "Legitimate interest/Consent (where required)",
    "3 ans \xE0 compter du dernier contact ou jusqu'au retrait du consentement.": "3 years from the last contact or until consent is withdrawn.",
    "Gestion de la relation avec les clients (entr\xE9e en relation, contractualisation, mise \xE0 jour des conditions g\xE9n\xE9rales, newsletters, etc.)": "Client relationship management (onboarding, contracting, updates to the terms and conditions, newsletters, etc.)",
    "Donn\xE9es d'identification et de contact, donn\xE9es relatives \xE0 la situation personnelle, familiale, patrimoniale, financi\xE8re et fiscale, documents justificatifs.": "Identification and contact data, data on personal, family, wealth, financial and tax situation, supporting documents.",
    "Ex\xE9cution du contrat, mesures pr\xE9contractuelles et obligations l\xE9gales": "Performance of the contract, pre-contractual measures and legal obligations",
    "Pendant la dur\xE9e du contrat ou de la relation d'affaires, puis archivage pendant 5 ans \xE0 compter de sa cessation.": "For the duration of the contract or business relationship, then archived for 5 years from its termination.",
    "Gestion des recrutements": "Recruitment management",
    "Donn\xE9es d'identification, coordonn\xE9es, CV, lettre de motivation, dipl\xF4mes, exp\xE9riences professionnelles": "Identification data, contact details, CV, cover letter, qualifications, professional experience",
    "Mesures pr\xE9contractuelles et int\xE9r\xEAt l\xE9gitime": "Pre-contractual measures and legitimate interest",
    "2 ans apr\xE8s le dernier contact avec le candidat, sauf opposition ou accord pour une dur\xE9e diff\xE9rente.": "2 years after the last contact with the candidate, unless the candidate objects or agrees to a different period.",
    "Gestion des demandes d'exercice des droits RGPD": "Handling of GDPR rights requests",
    "Donn\xE9es d'identification, coordonn\xE9es, justificatif d'identit\xE9 (le cas \xE9ch\xE9ant), contenu de la demande": "Identification data, contact details, proof of identity (where applicable), content of the request",
    "Obligation l\xE9gale": "Legal obligation",
    "5 ans \xE0 compter du traitement de la demande.": "5 years from the handling of the request.",
    "Gestion des contentieux, pr\xE9contentieux et demandes des autorit\xE9s comp\xE9tentes": "Management of disputes, pre-litigation and requests from competent authorities",
    "Donn\xE9es d'identification, donn\xE9es contractuelles, correspondances, documents utiles au traitement du dossier": "Identification data, contractual data, correspondence, documents relevant to the case",
    "Obligation l\xE9gale et int\xE9r\xEAt l\xE9gitime": "Legal obligation and legitimate interest",
    "Pendant la dur\xE9e du contentieux puis conform\xE9ment aux d\xE9lais de prescription applicables.": "For the duration of the dispute, then in accordance with the applicable limitation periods.",
    "Gestion de la relation avec les fournisseurs": "Supplier relationship management",
    "Donn\xE9es d'identification et de contact (nom, pr\xE9nom, adresse e-mail, num\xE9ro de t\xE9l\xE9phone), coordonn\xE9es professionnelles.": "Identification and contact data (last name, first name, email address, phone number), professional contact details.",
    "Ex\xE9cution du contrat ou mesures pr\xE9contractuelles": "Performance of the contract or pre-contractual measures",
    "Pendant la dur\xE9e de la relation contractuelle.": "For the duration of the contractual relationship.",
    "Respect des obligations de lutte contre le blanchiment de capitaux et le financement du terrorisme (LCB-FT)": "Compliance with anti-money laundering and counter-terrorist financing obligations (AML/CFT)",
    "Donn\xE9es d'identification, justificatifs d'identit\xE9 et de domicile, informations relatives \xE0 l'origine des fonds, situation patrimoniale.": "Identification data, proof of identity and address, information on the source of funds, wealth situation.",
    "5 ans \xE0 compter de la cessation de la relation d'affaires, conform\xE9ment au Code mon\xE9taire et financier.": "5 years from the end of the business relationship, in accordance with the French Monetary and Financial Code.",
    "Transmission des informations n\xE9cessaires aux \xE9tablissements financiers (d\xE9positaires, soci\xE9t\xE9s de gestion, assureurs, etc.)": "Transmission of the necessary information to financial institutions (custodians, asset managers, insurers, etc.)",
    "Donn\xE9es d'identification, informations patrimoniales, financi\xE8res et fiscales, documents n\xE9cessaires \xE0 l'ouverture ou \xE0 la gestion des produits souscrits": "Identification data, wealth, financial and tax information, documents required to open or manage the products subscribed",
    "Ex\xE9cution du contrat": "Performance of the contract",
    "Pendant la dur\xE9e n\xE9cessaire \xE0 l'ex\xE9cution de l'op\xE9ration.": "For the time needed to carry out the transaction.",
    "Gestion de notre application et de la s\xE9curit\xE9 des syst\xE8mes d'information": "Management of our app and information system security",
    "Donn\xE9es d'identification, identifiants de connexion, journaux de connexion, donn\xE9es techniques et de navigation": "Identification data, login credentials, connection logs, technical and browsing data",
    "Pendant la dur\xE9e de la relation puis archivage lorsque n\xE9cessaire \xE0 des fins de s\xE9curit\xE9.": "For the duration of the relationship, then archived where necessary for security purposes.",
    "Mesure d'audience, am\xE9lioration des services, statistiques et analyses d'utilisation": "Audience measurement, service improvement, usage statistics and analysis",
    "Donn\xE9es de navigation, cookies, adresse IP, donn\xE9es d'utilisation des services, enqu\xEAtes de satisfaction, statistiques agr\xE9g\xE9es": "Browsing data, cookies, IP address, service usage data, satisfaction surveys, aggregated statistics",
    "Int\xE9r\xEAt l\xE9gitime ou consentement lorsque requis (cookies)": "Legitimate interest or consent where required (cookies)",
    "Voir la Politique relative aux cookies.": "See the Cookie Policy.",
    // Carte des bureaux
    "Voir tous les bureaux": "View all offices",
    "Afficher tous les bureaux RockFi": "Show all RockFi offices",
    // Maquette de l'application (page « Devenir partner »)
    "L'application Desk": "The Desk app",
    "\xE0 votre service.": "at your service.",
    "L\u2019Advisor App vous accompagne dans la gestion de votre portefeuille client, vous permet d\u2019anticiper vos rendez-vous et de vous concentrez sur votre m\xE9tier : le conseil.": "The Advisor App supports you in managing your client portfolio, helps you prepare your meetings and lets you focus on your job: advice.",
    "Collecte": "Inflows",
    "Revenus": "Revenue",
    "Factures": "Invoices",
    "Produits structur\xE9s": "Structured products",
    "Autres": "Other",
    "Outils": "Tools",
    "Voir les documents": "View documents",
    "Brochure commerciale": "Sales brochure",
    "Reporting trimestriel": "Quarterly report",
    "Valorisation actuelle": "Current valuation",
    "Valeur liquidative": "Net asset value",
    "Estim. coupons vers\xE9s": "Est. coupons paid",
    "Estim. coupons m\xE9moris\xE9s": "Est. memorised coupons",
    "Cours du sous-jacent(s)": "Underlying price(s)",
    "Et barri\xE8res du produit": "And product barriers",
    "Nom du produit": "Product name",
    "Cours de ref.": "Ref. price",
    "Prix courant": "Current price",
    "\xC9volution": "Change",
    "Prochains \xE9v\xE8nements pr\xE9vus": "Upcoming scheduled events",
    "Pr\xE9vu": "Scheduled",
    "Voir tous les \xE9v\xE8nements": "View all events",
    "Caract\xE9ristiques": "Features",
    "Maturit\xE9": "Maturity",
    "Emetteur": "Issuer",
    "Remboursement anticip\xE9": "Early redemption",
    "Montant": "Amount",
    "Niveau de barri\xE8re": "Barrier level",
    "Trimestrielle": "Quarterly",
    "Autocall barri\xE8re d\xE9gressive": "Autocall with step-down barrier",
    "Coupons non vers\xE9s, conserv\xE9s en m\xE9moire": "Unpaid coupons, kept in memory",
    "D\xE9tail des coupons m\xE9moris\xE9s": "Memorised coupons breakdown",
    "D\xE9tail du calcul de la valorisation": "Valuation calculation breakdown",
    "P\xE9riode affich\xE9e": "Period shown",
    "Revenir \xE0 la liste des produits": "Back to the product list",
    "Pr\xE9c\xE9dent": "Previous",
    // Textes alternatifs (images de la bibliothèque d'assets)
    "Conf\xE9rence RockFi": "RockFi conference",
    "Conseill\xE8re RockFi au t\xE9l\xE9phone": "RockFi advisor on the phone",
    "Vue du patrimoine dans l'application RockFi": "Wealth overview in the RockFi app",
    "Logo de BlackRock": "BlackRock logo",
    "Logo de Neuflize OBC": "Neuflize OBC logo",
    "Logo de Nortia": "Nortia logo",
    "Logo de Wealins": "Wealins logo",
    "Logo Snowflake avec un symbole g\xE9om\xE9trique en forme de flocon de neige \xE0 gauche et le mot \xAB snowflake \xBB en lettres minuscules \xE0 droite.": "Snowflake logo with a geometric snowflake symbol on the left and the word \u201Csnowflake\u201D in lowercase on the right.",
    "Texte 'RockFi' en gris clair sur un fond gris uni, sugg\xE9rant un logo ou un \xE9l\xE9ment de marque minimaliste.": "The word 'RockFi' in light grey on a plain grey background, a minimalist logo.",
    "Deux hommes en costume sombre posant dehors devant des plantes vertes, l'un plus \xE2g\xE9 avec les cheveux blancs, l'autre plus jeune avec une cravate bleue, souriant et debout \xE0 c\xF4t\xE9 d'une chaise en bois claire.": "Two men in dark suits posing outdoors in front of green plants, one older with white hair, the other younger with a blue tie, smiling and standing next to a light wooden chair.",
    "Entr\xE9e principale d'un b\xE2timent en pierre beige avec un grand auvent en verre noir au-dessus de la porte, plusieurs fen\xEAtres avec balustrades, et un escalier menant \xE0 la porte entrouverte o\xF9 une personne est visible.": "Main entrance of a beige stone building with a large black glass canopy above the door, several windows with balustrades, and steps leading to a half-open door where a person is visible.",
    "Femme aux cheveux blonds portant une veste bleu marine et une blouse blanche \xE0 motifs floraux, regardant l\xE9g\xE8rement vers la droite avec une expression attentive, dans un environnement o\xF9 des personnes floues sont en arri\xE8re-plan.": "Blonde woman wearing a navy jacket and a white floral blouse, looking slightly to the right with an attentive expression, with blurred people in the background.",
    "Femme aux cheveux blonds portant une veste bleue et une chemise \xE0 rayures, parlant au t\xE9l\xE9phone avec un fond flou de feuillage vert.": "Blonde woman wearing a blue jacket and a striped shirt, talking on the phone against a blurred background of green foliage.",
    "Femme en veste bleu fonc\xE9 parlant au t\xE9l\xE9phone avec un fond naturel flou, affichant une carte de profil indiquant Delphine Colin, conseill\xE8re en patrimoine RockFi disponible, un rendez-vous suivant fix\xE9 au 20 janvier \xE0 18h00, et la performance cumulative de patrimoine \xE0 1 483 269 \u20AC avec une augmentation de 62 % soit +568 000 \u20AC.": "Woman in a dark blue jacket talking on the phone against a blurred natural background, with a profile card showing Delphine Colin, available RockFi wealth advisor, a next appointment on 20 January at 6pm, and cumulative wealth performance of \u20AC1,483,269, up 62% or +\u20AC568,000.",
    "Femme portant des lunettes regardant attentivement l'\xE9cran d'un ordinateur portable Apple sur une table en bois, avec des plantes en arri\xE8re-plan.": "Woman wearing glasses looking closely at an Apple laptop screen on a wooden table, with plants in the background.",
    "Gros plan abstrait de la surface d'un tissu \xE9clair\xE9 par une lumi\xE8re chaude orange et ombres marqu\xE9es, soulignant la texture douce et les plis.": "Abstract close-up of a fabric surface lit by warm orange light with strong shadows, highlighting its soft texture and folds.",
    "Homme aux cheveux attach\xE9s en chignon et barbe, portant une chemise blanche et un blazer sombre, regardant vers la gauche devant un mur en bois.": "Man with his hair in a bun and a beard, wearing a white shirt and a dark blazer, looking to the left in front of a wooden wall.",
    "Homme d'\xE2ge moyen avec cheveux gris courts et barbe l\xE9g\xE8re, portant un costume et une chemise blanche, en conversation lors d'un \xE9v\xE9nement int\xE9rieur avec d'autres personnes floues en arri\xE8re-plan.": "Middle-aged man with short grey hair and a light beard, wearing a suit and a white shirt, in conversation at an indoor event with other blurred people in the background.",
    "Homme portant un micro serre-t\xEAte parlant en public, tenant un objet dans ses mains, en tenue noire \xE0 manches longues, sur un fond sombre.": "Man wearing a headset microphone speaking in public, holding an object in his hands, dressed in black long sleeves, against a dark background.",
    "Illustration de logos d'entreprises dispos\xE9s en cercle sur un fond textur\xE9 vert et gris, avec un logo central marqu\xE9 d'un R blanc sur fond vert fonc\xE9. Autour, on voit des logos circulaires rouges et blancs, un logo de Generali rouge, un logo avec le texte CNP, un logo compos\xE9 de formes g\xE9om\xE9triques, un logo avec un blason \xE0 quatre parties, et un cercle noir avec le mot TRAIL blanc.": "Illustration of company logos arranged in a circle on a textured green and grey background, with a central logo showing a white R on a dark green background. Around it are red and white circular logos, a red Generali logo, a logo with the text CNP, a logo made of geometric shapes, a logo with a four-part coat of arms, and a black circle with the word TRAIL in white.",
    "Interface utilisateur d'un tableau de bord d'application affichant un message de bienvenue personnalis\xE9 \xE0 Christophe avec une barre de recherche pour aider. La section Rendez-vous montre deux r\xE9unions programm\xE9es pour vendredi 2 octobre : Melchior Liam de 10h00 \xE0 10h45 avec option de pr\xE9paration, et Catherine Murat de 14h00 \xE0 14h30. Une section actualit\xE9s march\xE9s pr\xE9sente trois articles avec ic\xF4nes et titres li\xE9s \xE0 la g\xE9opolitique et l'\xE9nergie. Le menu de navigation lat\xE9ral \xE0 gauche liste des sections : Home, AuM (Clients, Liquidity, Structured products), Business (Operations, Meeting notes, Tools), et Conversations (Portfolio analysis, Meeting preparation, See all).": "App dashboard interface showing a personalised welcome message for Christophe with a search bar. The Meetings section shows two meetings scheduled for Friday 2 October: Melchior Liam from 10:00 to 10:45 with a preparation option, and Catherine Murat from 14:00 to 14:30. A market news section shows three articles on geopolitics and energy. The left-hand navigation lists: Home, AuM (Clients, Liquidity, Structured products), Business (Operations, Meeting notes, Tools) and Conversations (Portfolio analysis, Meeting preparation, See all).",
    "La lumi\xE8re \xE9claire partiellement les coussins en tissu beige d'un canap\xE9, cr\xE9ant un contraste marqu\xE9 avec l'obscurit\xE9 environnante.": "Light partly illuminates the beige fabric cushions of a sofa, creating a strong contrast with the surrounding darkness.",
    "Lumi\xE8re chaude \xE9clairant partiellement un canap\xE9 en tissu beige avec un angle form\xE9 par deux coussins.": "Warm light partly illuminating a beige fabric sofa, with a corner formed by two cushions.",
    "Pierre Marin, Directeur G\xE9n\xE9ral, parle en gesticulant dans un bureau moderne avec une lampe \xE0 ampoules allum\xE9es \xE0 gauche et une grande fen\xEAtre avec un balcon et des plantes \xE0 droite.": "Pierre Marin, CEO, speaking and gesturing in a modern office, with a lit bulb lamp on the left and a large window with a balcony and plants on the right.",
    "Plante en pot blanc \xE0 c\xF4t\xE9 de grandes fen\xEAtres dans une pi\xE8ce avec des fauteuils noirs et un tapis vert, avec des b\xE2timents en verre refl\xE9t\xE9s \xE0 l'ext\xE9rieur.": "White potted plant next to large windows in a room with black armchairs and a green rug, with glass buildings reflected outside.",
    "Portrait d'un homme blanc avec une barbe, cheveux boucl\xE9s bruns fonc\xE9s, portant une chemise ray\xE9e claire et une veste noire, regardant vers la droite.": "Portrait of a man with a beard and dark brown curly hair, wearing a light striped shirt and a black jacket, looking to the right.",
    "Portrait d'un homme d'\xE2ge moyen avec des cheveux ch\xE2tains, une barbe l\xE9g\xE8re, portant un costume sombre, une chemise blanche et une cravate, avec un fond bleu uni.": "Portrait of a middle-aged man with brown hair and a light beard, wearing a dark suit, a white shirt and a tie, against a plain blue background.",
    "Portrait d'un homme d'\xE2ge moyen avec une barbe grise et des yeux bleus portant un costume bleu et une chemise blanche, souriant l\xE9g\xE8rement devant un fond int\xE9rieur flou.": "Portrait of a middle-aged man with a grey beard and blue eyes, wearing a blue suit and a white shirt, smiling slightly against a blurred indoor background.",
    "Profil d'une femme aux cheveux boucl\xE9s noirs regardant vers la gauche, avec un homme flou au premier plan \xE0 droite sur fond beige.": "Profile of a woman with black curly hair looking to the left, with a blurred man in the foreground on the right against a beige background.",
    "Profil de Fabien C., propri\xE9taire d'entreprise de 52 ans, planifiant la vente de son entreprise dans deux ans avec pour objectif principal de s\xE9curiser les recettes de la vente et secondaire de transmettre la richesse \xE0 ses enfants. Options envisag\xE9es : assurance-vie luxembourgeoise, private equity, apport-cession 150-0 B ter, et d\xE9membrement de propri\xE9t\xE9 et donation.": "Profile of Fabien C., a 52-year-old business owner planning to sell his company in two years, with the main goal of securing the sale proceeds and the secondary goal of passing on wealth to his children. Options considered: Luxembourg life insurance, private equity, 150-0 B ter contribution-sale and split ownership with gifting.",
    "Smartphone pos\xE9 sur une surface marron textur\xE9e affichant une application de portefeuille financier en fran\xE7ais, montrant une valeur totale de 1 483 269 \u20AC au 21 avril 2026 avec une augmentation de 62 %, un graphique en barres et courbe de janvier 2022 \xE0 avril 2026, et une section de r\xE9partition des actifs indiquant 48 % en immobilier.": "Smartphone on a textured brown surface showing a portfolio app with a total value of \u20AC1,483,269 on 21 April 2026, up 62%, a bar and line chart from January 2022 to April 2026, and an asset allocation section showing 48% in real estate.",
    "Trois personnes regardant vers la droite, un homme au centre avec des lunettes et une veste sombre, une femme blonde \xE0 l'avant avec une veste bleue, et une autre personne partiellement visible \xE0 gauche.": "Three people looking to the right: a man in the centre with glasses and a dark jacket, a blonde woman in front with a blue jacket, and another person partly visible on the left.",
    "Un cadenas noir transparent suspendu au centre devant un graphique de donn\xE9es flou avec des barres blanches croissantes sur un fond vert d\xE9grad\xE9, symbolisant la s\xE9curit\xE9 des donn\xE9es.": "A transparent black padlock in the centre in front of a blurred data chart with rising white bars on a green gradient background, symbolising data security.",
    "Un couple souriant pose avec des verres de vin sur un bateau avec la Tour Eiffel illumin\xE9e en arri\xE8re-plan au cr\xE9puscule, au bord de la Seine \xE0 Paris.": "A smiling couple posing with glasses of wine on a boat, with the illuminated Eiffel Tower in the background at dusk, on the Seine in Paris.",
    'Un groupe de personnes discutant et socialisant lors d\'un \xE9v\xE9nement ext\xE9rieur en journ\xE9e dans un jardin entour\xE9 de palmiers, avec un ballon blanc marqu\xE9 "RockFi" flottant au centre.': 'A group of people chatting at a daytime outdoor event in a garden surrounded by palm trees, with a white "RockFi" balloon floating in the centre.',
    "Un homme de dos sur un terrain de golf, portant un polo blanc, un pantalon noir \xE0 motifs blancs, des chaussures blanches, tenant un club de golf sur son \xE9paule gauche, avec un paysage d'arbres et un ciel nuageux en arri\xE8re-plan.": "A man seen from behind on a golf course, wearing a white polo shirt, black trousers with white patterns and white shoes, holding a golf club on his left shoulder, with trees and a cloudy sky in the background.",
    "Un homme et une femme assis sur un canap\xE9 dans un environnement int\xE9rieur moderne avec de grandes fen\xEAtres, souriant et semblant engag\xE9s dans une conversation agr\xE9able.": "A man and a woman sitting on a sofa in a modern interior with large windows, smiling and enjoying a pleasant conversation.",
    "Un homme et une femme souriants assis sur un canap\xE9 dans une pi\xE8ce bien \xE9clair\xE9e, avec des fen\xEAtres en arri\xE8re-plan.": "A smiling man and woman sitting on a sofa in a bright room, with windows in the background.",
    "Un homme portant un micro \xE0 boucle arri\xE8re, habill\xE9 d'un pull noir, donnant une pr\xE9sentation ou un discours sur sc\xE8ne, avec une expression concentr\xE9e et tenant un objet dans ses mains.": "A man wearing a headset microphone and a black jumper, giving a presentation on stage with a focused expression and holding an object in his hands.",
    "Un smartphone pos\xE9 sur une surface en bois contre un mur textur\xE9, affichant une application de portefeuille d'investissement en fran\xE7ais, montrant la valeur totale 1 483 269 \u20AC au 21 avril 2026 avec un graphique de performance en hausse et une r\xE9partition des actifs indiquant 48% en immobilier (1 450 280 \u20AC).": "A smartphone on a wooden surface against a textured wall, showing an investment portfolio app with a total value of \u20AC1,483,269 on 21 April 2026, a rising performance chart and an asset allocation showing 48% in real estate (\u20AC1,450,280).",
    "Un smartphone pos\xE9 sur une surface marron affiche une application de portefeuille financier en mode sombre, montrant un solde total de 1 483 269 \u20AC au 21 avril 2026 avec une augmentation de 62 % (+568 000 \u20AC). Un graphique lin\xE9aire et \xE0 barres illustre l'\xE9volution patrimoniale de janvier 2022 \xE0 avril 2026. La r\xE9partition des actifs indique 48 % en immobilier avec une valeur de 1 450 280 \u20AC et une hausse de 1,3 %.": "A smartphone on a brown surface showing a portfolio app in dark mode, with a total balance of \u20AC1,483,269 on 21 April 2026, up 62% (+\u20AC568,000). A line and bar chart shows wealth growth from January 2022 to April 2026. The asset allocation shows 48% in real estate worth \u20AC1,450,280, up 1.3%.",
    "Une femme en robe claire prend la parole devant un groupe de personnes habill\xE9es formellement sur les marches d'un grand b\xE2timent en pierre, avec fen\xEAtres et balustrades classiques, ensoleill\xE9.": "A woman in a light dress speaking to a group of formally dressed people on the steps of a large stone building with classic windows and balustrades, in the sunshine.",
    "Une femme souriante aux longs cheveux bruns, assise avec les bras crois\xE9s, regardant vers la droite, \xE0 c\xF4t\xE9 d'un homme souriant en chemise bleue.": "A smiling woman with long brown hair, sitting with her arms crossed and looking to the right, next to a smiling man in a blue shirt.",
    "Une foule de personnes en costumes dans une salle \xE9l\xE9gante avec un grand ballon \xE9clair\xE9 affichant le texte 'RockFi'.": "A crowd of people in suits in an elegant room with a large illuminated balloon showing the word 'RockFi'.",
    "Une main tenant un crayon qui repose sur un livre ouvert sur une table en bois, avec une personne en chemise vert olive en arri\xE8re-plan.": "A hand holding a pencil resting on an open book on a wooden table, with a person in an olive green shirt in the background.",
    "Une main tenant un petit tournevis et manipulant les composants internes d'une montre m\xE9canique pour des r\xE9parations ou un assemblage pr\xE9cis.": "A hand holding a small screwdriver and working on the internal components of a mechanical watch for precise repair or assembly.",
    "Une salle \xE9l\xE9gante avec une grande biblioth\xE8que en bois remplie de livres, une table de billard au centre avec des boules dispos\xE9es dessus et une personne floue en mouvement pr\xE8s de la table.": "An elegant room with a large wooden bookcase full of books, a billiard table in the centre with balls on it and a blurred person moving near the table.",
    "\xC9cran de smartphone affichant une application de portefeuille financier en mode sombre, montrant une valeur de 1 483 269 euros au 21 avril 2026 avec une hausse de 62% (+568 000 \u20AC), un graphique de performance croissante de janvier 2022 \xE0 avril 2026, et des onglets pour patrimoine total et capital investi.": "Smartphone screen showing a portfolio app in dark mode, with a value of \u20AC1,483,269 on 21 April 2026, up 62% (+\u20AC568,000), a rising performance chart from January 2022 to April 2026, and tabs for total wealth and invested capital.",
    // Boutons d'envoi de formulaire : non traduisibles dans Webflow Localization
    "T\xE9l\xE9charger la ressource": "Download the resource",
    "En attente ...": "Please wait..."
  };
  var ATTRS = ["alt", "aria-label", "title", "placeholder", "data-wait"];
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT)$/;
  function translate(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node2) {
        if (node2.parentNode && SKIP.test(node2.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
        return DICT2[node2.nodeValue.trim()] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    let node;
    while (node = walker.nextNode()) {
      const raw = node.nodeValue;
      const key = raw.trim();
      node.nodeValue = raw.replace(key, DICT2[key]);
    }
    const selector = ATTRS.map((attr) => `[${attr}]`).join(",");
    root.querySelectorAll(selector).forEach((el) => {
      ATTRS.forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && DICT2[value.trim()]) el.setAttribute(attr, DICT2[value.trim()]);
      });
    });
    root.querySelectorAll('input[type="submit"]').forEach((btn) => {
      const label = DICT2[btn.value.trim()];
      if (label) btn.value = label;
    });
  }
  function initEmbedI18n() {
    if (getLang() !== "en") return;
    translate(document.body);
    let timer2;
    new MutationObserver(() => {
      clearTimeout(timer2);
      timer2 = setTimeout(() => translate(document.body), 150);
    }).observe(document.body, { childList: true, subtree: true });
  }

  // src/email-guard.js
  var LIST_URL = "https://cdn.jsdelivr.net/gh/disposable-email-domains/disposable-email-domains@main/disposable_email_blocklist.conf";
  var FALLBACK_DISPOSABLE = [
    "yopmail.com",
    "yopmail.fr",
    "yopmail.net",
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "temp-mail.org",
    "tempmail.com",
    "trashmail.com",
    "jetable.org",
    "throwawaymail.com",
    "getnada.com",
    "maildrop.cc",
    "sharklasers.com",
    "dispostable.com",
    "mailnesia.com",
    "mohmal.com",
    "emailondeck.com",
    "fakeinbox.com",
    "tempr.email"
  ];
  var COMMON_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "hotmail.fr",
    "outlook.com",
    "outlook.fr",
    "live.com",
    "live.fr",
    "msn.com",
    "yahoo.com",
    "yahoo.fr",
    "icloud.com",
    "me.com",
    "orange.fr",
    "wanadoo.fr",
    "free.fr",
    "sfr.fr",
    "neuf.fr",
    "laposte.net",
    "bbox.fr",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "gmx.fr",
    "gmx.com"
  ];
  var TLD_FIX = {
    gmail: "gmail.com",
    googlemail: "googlemail.com",
    icloud: "icloud.com",
    laposte: "laposte.net",
    orange: "orange.fr",
    wanadoo: "wanadoo.fr",
    free: "free.fr",
    sfr: "sfr.fr",
    neuf: "neuf.fr",
    bbox: "bbox.fr",
    protonmail: "protonmail.com"
  };
  var FAKE_DOMAINS = /* @__PURE__ */ new Set([
    "example.com",
    "example.fr",
    "example.org",
    "exemple.com",
    "exemple.fr",
    "test.com",
    "test.fr",
    "test.test",
    "domain.com",
    "domaine.com",
    "domaine.fr",
    "email.test",
    "fake.com",
    "localhost"
  ]);
  var FAKE_LOCALS = /* @__PURE__ */ new Set([
    "test",
    "tests",
    "testing",
    "toto",
    "titi",
    "tata",
    "azerty",
    "qwerty",
    "asdf",
    "fake",
    "faux",
    "spam",
    "nope",
    "non",
    "aucun",
    "none",
    "null",
    "xxx"
  ]);
  var FORMAT = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
  var disposable = new Set(FALLBACK_DISPOSABLE);
  var listPromise = null;
  function loadList() {
    if (!listPromise) {
      listPromise = fetch(LIST_URL).then((r) => r.ok ? r.text() : Promise.reject(r.status)).then((text2) => {
        const set = new Set(FALLBACK_DISPOSABLE);
        text2.split("\n").forEach((line) => {
          const d = line.trim().toLowerCase();
          if (d && !d.startsWith("#")) set.add(d);
        });
        disposable = set;
      }).catch(() => {
      });
    }
    return listPromise;
  }
  function isDisposable(domain) {
    const parts = domain.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      if (disposable.has(parts.slice(i).join("."))) return true;
    }
    return false;
  }
  var isRepeated = (s) => s.length > 1 && /^(.)\1+$/.test(s);
  function isFake(local, domain, placeholder) {
    const name = domain.split(".")[0];
    return FAKE_DOMAINS.has(domain) || FAKE_LOCALS.has(local) || isRepeated(local) || isRepeated(name) || placeholder && `${local}@${domain}` === placeholder.trim().toLowerCase();
  }
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestDomain(domain, strict = false) {
    if (COMMON_DOMAINS.includes(domain)) return null;
    let best = null;
    let bestScore = Infinity;
    for (const candidate of COMMON_DOMAINS) {
      const score = distance(domain, candidate);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    const max = strict || domain.length < 8 ? 1 : 2;
    if (bestScore > 0 && bestScore <= max) return best;
    const fix = TLD_FIX[domain.split(".")[0]];
    return fix && fix !== domain ? fix : null;
  }
  function checkEmail(value, placeholder = "") {
    const email = value.trim().toLowerCase();
    if (!email) return { error: null, suggestion: null };
    if (!FORMAT.test(email)) return { error: "email.invalid", suggestion: null };
    const at = email.lastIndexOf("@");
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const toEmail = (d) => d ? `${local}@${d}` : null;
    if (isDisposable(domain)) {
      const suggestion = toEmail(suggestDomain(domain, true));
      return { error: suggestion ? "email.invalid" : "email.disposable", suggestion };
    }
    if (isFake(local, domain, placeholder)) return { error: "email.fake", suggestion: null };
    return { error: null, suggestion: toEmail(suggestDomain(domain)) };
  }
  function isTarget(el) {
    return el instanceof HTMLInputElement && el.type === "email" && el.form && el.dataset.emailGuard !== "off";
  }
  function messageFor(input) {
    let msg = input._emailGuardMsg;
    if (!msg) {
      msg = document.createElement("div");
      msg.className = "email-guard_msg";
      msg.id = `email-guard-${Math.random().toString(36).slice(2, 8)}`;
      msg.setAttribute("aria-live", "polite");
      msg.hidden = true;
      input.insertAdjacentElement("afterend", msg);
      const described = input.getAttribute("aria-describedby");
      input.setAttribute("aria-describedby", described ? `${described} ${msg.id}` : msg.id);
      input._emailGuardMsg = msg;
    }
    return msg;
  }
  function validate(input, show) {
    const { error, suggestion } = checkEmail(input.value, input.placeholder);
    input.setCustomValidity(error ? t(error) : "");
    if (!show && !(input._emailGuardMsg && !input._emailGuardMsg.hidden)) return !error;
    const msg = messageFor(input);
    msg.textContent = "";
    msg.classList.remove("is-error", "is-suggestion");
    input.classList.toggle("is-email-error", Boolean(error));
    if (error) {
      const text2 = document.createElement("span");
      text2.textContent = `${t(error)} `;
      msg.appendChild(text2);
      msg.classList.add("is-error");
      msg.hidden = false;
    }
    if (suggestion) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "email-guard_suggest";
      btn.textContent = t("email.suggest", { email: suggestion });
      btn.addEventListener("click", () => {
        input.value = suggestion;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
      });
      msg.appendChild(btn);
      msg.classList.add("is-suggestion");
      msg.hidden = false;
    }
    if (!error && !suggestion) msg.hidden = true;
    return !error;
  }
  function revalidateAll() {
    document.querySelectorAll('form input[type="email"]').forEach((input) => {
      if (!isTarget(input) || !input.value) return;
      const before = input.validationMessage;
      validate(input, input._emailGuardTouched);
      if (input.validationMessage !== before) {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }
  function initEmailGuard() {
    document.addEventListener(
      "focusin",
      (e) => {
        if (isTarget(e.target)) loadList().then(revalidateAll);
      },
      true
    );
    document.addEventListener(
      "input",
      (e) => {
        if (isTarget(e.target)) validate(e.target, false);
      },
      true
    );
    document.addEventListener(
      "focusout",
      (e) => {
        if (!isTarget(e.target) || !e.target.value) return;
        e.target._emailGuardTouched = true;
        validate(e.target, true);
      },
      true
    );
    document.addEventListener(
      "submit",
      (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        const inputs = Array.from(form.querySelectorAll('input[type="email"]')).filter(isTarget);
        const bad = inputs.filter((input) => !validate(input, true));
        if (!bad.length) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        bad[0].focus();
      },
      true
    );
  }

  // src/resource-file-link.js
  function initResourceFileLink() {
    document.querySelectorAll("[data-resource-file-link]").forEach((link) => {
      const scope = link.closest(".w-form") || document;
      const form = scope.querySelector("form[data-form-download-url]");
      const url = form && form.getAttribute("data-form-download-url").trim();
      if (!url) return;
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
    });
  }

  // src/localize-links.js
  var PAGES_READY = false;
  var PAGES_EN = {
    "a-propos": "about",
    conseil: "advice",
    "architecture-ouverte": "open-architecture",
    "contact-conseiller": "contact-an-advisor",
    "contact-demo": "book-a-demo",
    "contact-team": "contact-our-team",
    "devenir-partner": "become-a-partner",
    evenements: "events",
    "kit-presse": "press-kit",
    "livre-blancs": "white-papers",
    "mentions-legales": "legal-notice",
    "nos-conseillers": "our-advisors",
    "politique-de-confidentialite": "privacy-policy",
    presse: "press",
    produit: "product",
    tarification: "pricing"
  };
  var PAGES = PAGES_READY ? PAGES_EN : {};
  var ITEMS = {
    "blog-post": {
      "rockfi-intelligence-lia-au-service-de-la-gestion-privee": "rockfi-intelligence-ai-for-private-wealth-management",
      "rockfi-accueille-laurent-garret-ex-directeur-general-de-neuflize-obc": "laurent-garret-former-ceo-of-neuflize-obc-joins-rockfi",
      // Philanthropy (blog) : le slug EN n'est pas publié, l'URL EN garde le slug FR.
      // Le jour où la version EN est publiée, remettre :
      // "rockfi-lance-rockfi-philanthropy-son-fonds-de-dotation-pour-soutenir-des-associations-dinteret-general": "rockfi-launches-rockfi-philanthropy-endowment-fund",
      "banque-privee-ou-rockfi-difference-majeure": "private-banking-or-rockfi-the-major-difference",
      "investir-dans-le-non-cote-les-quatre-portes-d-entree": "investing-in-unlisted-assets-four-entry-points",
      "gestion-de-patrimoine-comparatif": "wealth-management-comparison-2026",
      "frais-banque-privee-cout-reel": "private-banking-fees-real-cost",
      "rockfi-dote-ses-conseillers-prives-dun-agent-ia-pour-un-suivi-patrimonial-sur-mesure-et-proactif": "rockfi-ai-agent-for-private-wealth-advisors",
      "rockfi-et-blackrock-sassocient-pour-placer-les-projets-de-vie-au-coeur-de-la-gestion-patrimoniale": "rockfi-and-blackrock-partner-on-goal-based-wealth-management",
      "spotlight-sur-maxime-durand": "spotlight-on-maxime-durand",
      "spotlight-sur-marie-bedu": "spotlight-on-marie-bedu",
      "rockfi-leve-18-millions-deuros-en-serie-a-et-deploie-son-espace-client-dedie": "rockfi-raises-18-million-in-series-a-and-launches-client-portal",
      "rockfi-accelere-son-developpement-avec-louverture-de-trois-nouveaux-bureaux-et-le-lancement-de-son-application-privee": "rockfi-opens-three-new-offices-and-launches-private-app",
      "comment-est-calculee-votre-performance-methode-rockfi": "how-your-performance-is-calculated-rockfi-method"
    },
    "landing-posts": {
      "rockfi-lance-rockfi-philanthropy-son-fonds-de-dotation-pour-soutenir-des-associations-dinteret-general": "rockfi-launches-rockfi-philanthropy-endowment-fund",
      "comment-est-calculee-votre-performance": "how-your-performance-is-calculated",
      "rockfi-accelere-son-developpement-avec-louverture-de-trois-nouveaux-bureaux-et-le-lancement-de-son-application-privee": "rockfi-opens-three-new-offices-and-launches-private-app",
      "rockfi-leve-18-millions-deuros-en-serie-a-et-deploie-son-espace-client-dedie": "rockfi-raises-18-million-in-series-a-and-launches-client-portal",
      "spotlight-sur-marie-bedu": "spotlight-on-marie-bedu",
      "rockfi-et-blackrock-sassocient-pour-placer-les-projets-de-vie-au-coeur-de-la-gestion-patrimoniale": "rockfi-and-blackrock-partner-on-goal-based-wealth-management",
      "rockfi-dote-ses-conseillers-prives-dun-agent-ia-pour-un-suivi-patrimonial-sur-mesure-et-proactif": "rockfi-ai-agent-for-private-wealth-advisors",
      "investir-dans-le-non-cote-les-quatre-portes-d-entree": "investing-in-unlisted-assets-four-entry-points",
      "frais-banque-privee-cout-reel": "private-banking-fees-real-cost",
      "gestion-de-patrimoine-comparatif": "wealth-management-comparison-2026",
      "banque-privee-ou-rockfi-difference-majeure": "private-banking-or-rockfi-the-major-difference",
      "spotlight-sur-maxime-durand": "spotlight-on-maxime-durand"
    },
    ressources: {
      "les-differentes-strategies-en-private-equity": "private-equity-strategies",
      "retraite-diversifier-son-patrimoine-et-ses-revenus-grace-aux-etf": "retirees-diversify-wealth-and-income-with-etfs",
      "private-equity-3-profils-dinvestisseurs-3-strategies-concretes": "private-equity-3-investor-profiles-3-strategies",
      "comprendre-et-construire-un-portefeuille-sur-mesure-avec-les-etf": "understanding-and-building-a-tailored-etf-portfolio",
      "entrepreneur-securiser-et-diversifier-son-patrimoine-apres-une-cession-avec-les-etf": "entrepreneurs-secure-and-diversify-wealth-after-a-business-sale",
      "comment-choisir-des-etf-les-criteres-de-selection": "how-to-choose-etfs-selection-criteria",
      "chef-dentreprise-optimiser-sa-tresorerie-grace-a-une-strategie-detf": "business-owners-optimise-company-cash-with-etfs",
      "cadre-dirigeant-preparer-sa-retraite-avec-un-portefeuille-detf-sur-mesure": "senior-executives-prepare-retirement-with-etfs",
      "kit-de-presse": "press-kit"
    },
    evenements: {
      "rockfi-summit-mars-2025": "rockfi-summit-march-2025",
      "summit-rentree-25": "autumn-summit-25",
      "partner-day-juin-2026": "partner-day-june-2026",
      "soirees-exclusives-ritz-paris": "exclusive-evenings-ritz-paris",
      "rockfi-acte-i": "rockfi-act-i"
    }
  };
  function toEnglishPath(path) {
    var _a;
    const match = path.match(/^\/([^?#]*)([?#].*)?$/);
    if (!match) return null;
    const [, rawPath, suffix = ""] = match;
    const parts = rawPath.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "en") return null;
    if (!parts.length) return `/en${suffix}`;
    if (parts.length === 1) {
      return `/en/${PAGES[parts[0]] || parts[0]}${suffix}`;
    }
    const [folder, slug, ...rest] = parts;
    const enSlug = ((_a = ITEMS[folder]) == null ? void 0 : _a[slug]) || slug;
    return `/en/${[folder, enSlug, ...rest].join("/")}${suffix}`;
  }
  function initLocalizeLinks() {
    if (getLang() !== "en") return;
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      if (link.hasAttribute("hreflang") || link.closest(".w-locales-list")) return;
      if (link.hasAttribute("data-no-localize")) return;
      const href = link.getAttribute("href");
      if (href.startsWith("//")) return;
      const localized = toEnglishPath(href);
      if (localized && localized !== href) link.setAttribute("href", localized);
    });
  }

  // src/locale-links-a11y.js
  function initLocaleLinksA11y() {
    document.querySelectorAll(".link_locale[href]").forEach((el) => el.removeAttribute("href"));
  }

  // src/list-pagination-canonical.js
  var PAGE_PARAM = /^[0-9a-f]+_page$/;
  function initListPaginationCanonical() {
    if (!document.querySelector('[fs-list-load="more"]')) return;
    const url = new URL(window.location.href);
    const keys = [...url.searchParams.keys()].filter((k) => PAGE_PARAM.test(k));
    if (!keys.length) return;
    keys.forEach((k) => url.searchParams.delete(k));
    const clean2 = url.pathname + (url.search || "") + url.hash;
    window.history.replaceState(window.history.state, "", clean2);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url.origin + url.pathname + (url.search || ""));
  }

  // src/swiper-trackpad.js
  var SNAP_DELAY = 140;
  var SNAP_SPEED = 500;
  var EDGE_RESISTANCE = 3;
  var EDGE_MAX = 80;
  var done = /* @__PURE__ */ new WeakSet();
  function attach(swiper) {
    const el = swiper.el;
    let timer2;
    let active = false;
    el.addEventListener(
      "wheel",
      (e) => {
        if (swiper.destroyed || !swiper.enabled) return;
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
        if (!active) {
          active = true;
          swiper.setTransition(0);
        }
        const start = swiper.minTranslate();
        const end = swiper.maxTranslate();
        let t2 = swiper.getTranslate() - dx;
        if (t2 > start) t2 = Math.min(start + EDGE_MAX, start + (t2 - start) / EDGE_RESISTANCE);
        if (t2 < end) t2 = Math.max(end - EDGE_MAX, end + (t2 - end) / EDGE_RESISTANCE);
        swiper.setTranslate(t2);
        swiper.updateProgress(t2);
        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
        clearTimeout(timer2);
        timer2 = setTimeout(() => {
          active = false;
          if (!swiper.destroyed) swiper.slideToClosest(SNAP_SPEED);
        }, SNAP_DELAY);
      },
      { passive: false }
    );
  }
  function enable(el) {
    const swiper = el.swiper;
    if (!swiper || swiper.destroyed) return;
    if (done.has(swiper)) return;
    done.add(swiper);
    attach(swiper);
  }
  function scan() {
    document.querySelectorAll(".swiper").forEach(enable);
  }
  function initSwiperTrackpad() {
    if (!document.querySelector(".swiper")) return;
    let tries = 0;
    const early = () => {
      scan();
      if (++tries < 12) setTimeout(early, 250);
    };
    early();
    let timer2;
    window.addEventListener("resize", () => {
      clearTimeout(timer2);
      timer2 = setTimeout(scan, 300);
    });
  }

  // src/steps-timeline.js
  var ANCHOR = 0.6;
  function setupList(list) {
    const progress = list.querySelector("[data-steps-progress]");
    const items = Array.from(list.querySelectorAll(".steps_item"));
    if (!progress || !items.length) return;
    list.classList.add("is-ready");
    let ticking = false;
    function update() {
      ticking = false;
      const rect = list.getBoundingClientRect();
      const lastDot = items[items.length - 1].querySelector(".steps_dot");
      const max = lastDot ? lastDot.offsetTop + items[items.length - 1].offsetTop + lastDot.offsetHeight / 2 : rect.height;
      const reached = Math.min(Math.max(window.innerHeight * ANCHOR - rect.top, 0), max);
      progress.style.height = `${reached}px`;
      items.forEach((item) => {
        const dot = item.querySelector(".steps_dot");
        const dotCenter = item.offsetTop + (dot ? dot.offsetTop + dot.offsetHeight / 2 : 0);
        item.classList.toggle("is-active", reached >= dotCenter);
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
  function initStepsTimeline(root = document) {
    root.querySelectorAll("[data-steps]").forEach(setupList);
  }

  // src/projects-carousel.js
  var DEFAULT_DELAY = 7e3;
  function setup2(el) {
    const section = el.closest("section") || el.parentElement;
    const tabs = Array.from(section.querySelectorAll("[data-project-tab]"));
    const fills = tabs.map((tab) => tab.querySelector(".projects_bar-fill"));
    const delay = parseInt(el.dataset.projectsDelay, 10) || DEFAULT_DELAY;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const setFill = (i, ratio) => {
      if (fills[i]) fills[i].style.width = `${Math.round(ratio * 1e3) / 10}%`;
    };
    const markActive = (active) => {
      tabs.forEach((tab, i) => {
        tab.classList.toggle("is-active", i === active);
        tab.setAttribute("aria-selected", String(i === active));
        if (i !== active) setFill(i, i < active ? 1 : 0);
      });
      if (reduced) setFill(active, 1);
    };
    const swiper = new window.Swiper(el, {
      wrapperClass: "projects_track",
      slideClass: "projects_card",
      slidesPerView: 1,
      spaceBetween: 24,
      speed: 900,
      rewind: true,
      grabCursor: true,
      autoplay: reduced ? false : { delay, disableOnInteraction: false, pauseOnMouseEnter: true },
      a11y: { enabled: true },
      on: {
        init(s) {
          markActive(s.activeIndex);
        },
        slideChange(s) {
          markActive(s.activeIndex);
        },
        autoplayTimeLeft(s, timeLeft, progress) {
          setFill(s.activeIndex, 1 - progress);
        }
      }
    });
    enable(el);
    tabs.forEach((tab, i) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("tabindex", "0");
      const go = () => {
        swiper.slideTo(i);
        if (swiper.autoplay && swiper.autoplay.running) swiper.autoplay.start();
      };
      tab.addEventListener("click", go);
      tab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
    if (swiper.autoplay && "IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) swiper.autoplay.resume();
        else swiper.autoplay.pause();
      }).observe(el);
    }
  }
  function initProjectsCarousel(root = document) {
    if (typeof window.Swiper === "undefined") return;
    root.querySelectorAll("[data-projects]:not([data-projects-ready])").forEach((el) => {
      el.setAttribute("data-projects-ready", "");
      setup2(el);
    });
  }

  // src/overscroll-edges.js
  var FOOTER_SELECTOR = "footer, .footer_component";
  var FOOTER_PIN_SELECTOR = "[data-overscroll-pin], .footer_accent";
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
  var PIN_STYLES = ["position", "left", "right", "bottom", "top", "width", "zIndex"];
  var HERO_EXTRA = 160;
  var HERO_SELECTOR = "[data-nav-hero]";
  var HERO_MEDIA_SELECTOR = "[data-overscroll-stretch], .img_wrapper";
  function initHeroFreeze() {
    const hero = document.querySelector(HERO_SELECTOR);
    if (!hero) return;
    const media = hero.querySelector(HERO_MEDIA_SELECTOR);
    if (!media || getComputedStyle(media).position !== "absolute") return;
    hero.style.clipPath = `inset(-100vh 0 0 0)`;
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
          bottom: "auto"
        });
      } else {
        Object.assign(media.style, {
          position: "",
          top: "",
          left: "",
          width: "",
          height: "",
          bottom: `-${HERO_EXTRA}px`
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
    window.addEventListener(
      "resize",
      () => {
        setFrozen(false);
        onScroll();
      },
      { passive: true }
    );
    update();
  }
  function initOverscrollEdges() {
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
          zIndex: "1"
        });
      } else {
        PIN_STYLES.forEach((p) => pin.style[p] = "");
      }
      pinned = on;
    }
    function update() {
      ticking = false;
      const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
      const y = window.scrollY;
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

  // src/index.js
  var BUILD_VERSION = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  console.log(
    `%c[RockFi] main.js \u2014 build v1.0.2 ${BUILD_VERSION}`,
    "color:#7dd3fc"
  );
  onReady(() => {
    init();
    initLocaleLinksA11y();
    initListPaginationCanonical();
    initSpeakersSlot();
    initCollapses();
    initBlogAccordion();
    initBlogFaq();
    initShareToast();
    initEmbeds();
    initLocalizeLinks();
    initCompareTable();
    init2();
    initAnimations();
    initSwitch();
    initSchema();
    initSvgTrace();
    initParallax();
    initHeroParallax();
    initListLenisSync();
    initFocusStories();
    initVideoSection();
    initDotArrow();
    initTagReveal();
    initNameTokens();
    initNavHero();
    initNavMenuLabel();
    initNavScroll();
    initHeroBgParallax();
    initStackCards();
    initNavDropdownHover();
    initFitScale();
    initEmbedI18n();
    initEmailGuard();
    initResourceFileLink();
    initSwiperTrackpad();
    initStepsTimeline();
    initProjectsCarousel();
    initOverscrollEdges();
  });
})();
//# sourceMappingURL=main.js.map
