// src/embeds/list-enhance.js

const LIST_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[list\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/list\](?:<\/p>)?/gi;

const BOLD_REGEX = /\[b\](.*?)\[\/b\]/gi;

function applyBold(text) {
  return text.replace(BOLD_REGEX, '<strong class="rt-bold">$1</strong>');
}

export function transformList(html) {
  return html.replace(LIST_BLOCK_REGEX, (match, body) => {
    const items = body
      .replace(/<\/p>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!items.length) return match;

    const itemsHTML = items
      .map(
        (item) => `
          <li class="rt-list-item">
            <span class="rt-list-bullet" aria-hidden="true"></span>
            <span class="rt-list-content">${applyBold(item)}</span>
          </li>
        `,
      )
      .join("");

    return `<div class="blog-embed_wrapper"><ul class="rt-list rt-text" role="list">${itemsHTML}</ul></div>`;
  });
}