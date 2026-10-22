import { requestScrollRefresh } from "./utils/scroll-refresh.js";

const TAG = /\[\s*speakers_list\s*\/?\s*\]/i;
const clean = (s) => s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ");

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

  // batch regroupe les items qui entrent en même temps : ceux d'une même
  // ligne partagent la même position, donc une ligne = un batch.
  ScrollTrigger.batch(items, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
      }),
  });
}

export function initSpeakersSlot() {
  const section = document.querySelector(".section_event_speakers");
  if (!section) return;

  const textNode = findTagNode();

  // Pas de tag : on supprime la section, elle ne s'affiche pas
  if (!textNode) {
    section.remove();
    return;
  }

  const block = textNode.parentElement.closest("p, li, div");
  const onlyTag =
    block &&
    !block.classList.contains("w-richtext") &&
    block.textContent.replace(TAG, "").trim() === "";

  if (onlyTag) {
    block.replaceWith(section);
  } else {
    textNode.nodeValue = clean(textNode.nodeValue).replace(TAG, "");
    textNode.after(section);
  }

  section.classList.add("is-placed"); // display: block (voir CSS)
  revealRowByRow(section);

  requestScrollRefresh();
}