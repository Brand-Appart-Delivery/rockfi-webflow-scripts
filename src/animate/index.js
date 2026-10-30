import { prefersReducedMotion } from "../utils/motion-preference.js";
import { setupGsap } from "./setup.js";
import { scanAnimations } from "./scan.js";
import { initParallax } from "./parallax.js";
import { initHeroParallax } from "./hero-parallax.js";
import { initBlurPlaceholders } from "./blur-placeholder.js";
import { initTextProgress } from "./text-progress.js";
import { initCalliReveal } from "./calli-reveal.js";

export function initAnimations(root = document) {
  initBlurPlaceholders(root);

  if (prefersReducedMotion()) return;

  setupGsap();
  scanAnimations(root);
  initParallax(root);
  initHeroParallax(root);
  initTextProgress(root);
  initCalliReveal(root);
}