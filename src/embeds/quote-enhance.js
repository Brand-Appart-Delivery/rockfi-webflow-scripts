// src/embeds/quote-enhance.js
import { parseAttrs } from "../utils/parse-attrs.js";

const QUOTE_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[quote(?=[\s\]])([^\]]*)\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/quote\](?:<\/p>)?/gi;

export function transformQuote(html) {
  return html.replace(QUOTE_BLOCK_REGEX, (match, attrString, body) => {
    const attrs = parseAttrs(attrString);
    const text = body
      .replace(/<\/p>|<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) return match;

    const name = attrs.name || "";
    const role = attrs.role || "";
    const img = attrs.img || "";

    const authorHTML =
      name || img
        ? `
          <div class="rt-quote-author">
            ${img ? `<img src="${img}" alt="${name}" class="rt-quote-avatar">` : ""}
            <div class="rt-quote-author-info">
              ${name ? `<p class="rt-quote-name">${name}</p>` : ""}
              ${role ? `<p class="rt-quote-role">${role}</p>` : ""}
            </div>
          </div>
        `
        : "";

    return `
      <div class="blog-embed_wrapper">
        <div class="rt-quote">
          <p class="rt-quote-text">&ldquo;${text}&rdquo;</p>
          ${authorHTML}
        </div>
      </div>
    `;
  });
}