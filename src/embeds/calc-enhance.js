// src/embeds/calc-enhance.js

const CALC_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[calc\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/calc\](?:<\/p>)?/gi;

export function transformCalc(html) {
  return html.replace(CALC_BLOCK_REGEX, (match, body) => {
    const lines = body
      .replace(/<\/p>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((line) => line.replace(/&nbsp;/g, " ").trim())
      // Lignes vides et caractère invisible que Webflow insère dans les paragraphes vides
      .filter((line) => line && line !== "‍");

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

    const blocksHTML = blocks
      .map(
        (block) => `
          <div class="rt-calc-block">
            <h4 class="rt-calc-title">${block.title}</h4>
            ${block.lines.map((l) => `<p class="rt-calc-line">${l}</p>`).join("")}
          </div>
        `,
      )
      .join("");

    const footerHTML = noteLines.length
      ? `
        <div class="rt-calc-footer">
          <p class="rt-calc-note">${noteLines.join(" ")}</p>
        </div>
      `
      : "";

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