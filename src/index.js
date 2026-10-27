import { onReady } from "./utils/on-ready.js";

import { init as initCore } from "./core.js";
import { initCollapses } from "./collapse.js";
import { initTagReveal } from "./tag-reveal.js";
import { initBlogAccordion } from "./blog-accordion.js";
import { initShareToast } from "./share-toast.js";
import { init as initBlogToc } from "./blog-toc.js";
import { initEmbeds } from "./embeds/index.js";
import { initCompareTable } from "./compare-table.js";
import { initBlogFaq } from "./blog-faq.js";
import { initSchema } from "./schema/index.js";
import { initAnimations } from "./animate/index.js";
import { initSvgTrace } from "./animate/svg-trace.js";
import { initDotArrow } from "./animate/dot-arrow.js";
import { initParallax } from "./animate/parallax.js";
import { initHeroParallax } from "./animate/hero-parallax.js";
import { initListLenisSync } from "./list-lenis-sync.js";
import { initFocusStories } from "./focus-stories.js";
import { initVideoSection } from "./video-section.js";
import { initSwitch } from "./switch.js";
import { initNameTokens } from "./name-tokens.js";
import { initNavHero } from "./nav-hero.js";
import { initHeroBgParallax } from "./animate/hero-bg-parallax.js";
import { initStackCards } from "./animate/stack-cards.js";
import { initSpeakersSlot } from "./speakers-slot.js";
import { initNavDropdownHover } from "./nav-dropdown-hover";
import { initFitScale } from "./fit-scale.js";
import { initNavMenuLabel } from "./nav-menu-label.js";
import { initNavScroll } from "./nav-scroll.js";
import { initEmbedI18n } from "./embed-i18n.js";
import { initEmailGuard } from "./email-guard.js";
import { initResourceFileLink } from "./resource-file-link.js";

const BUILD_VERSION = new Date().toISOString().slice(0, 10);
console.log(
  `%c[RockFi] main.js — build v1.0.2 ${BUILD_VERSION}`,
  "color:#7dd3fc",
);

onReady(() => {
  initCore();
  initSpeakersSlot();
  initCollapses();
  initBlogAccordion();
  initBlogFaq();
  initShareToast();
  initEmbeds();
  initCompareTable();
  initBlogToc();
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
});