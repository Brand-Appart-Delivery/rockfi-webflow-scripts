// src/embeds/quote-large-enhance.js

const QUOTE_LARGE_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[quote-large\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/quote-large\](?:<\/p>)?/gi;

export function transformQuoteLarge(html) {
  return html.replace(QUOTE_LARGE_BLOCK_REGEX, (match, body) => {
    const text = body
      .replace(/<\/p>|<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) return match;

    return `
      <div class="blog-embed_wrapper">
        <blockquote class="rt-quote-large" data-text-reveal data-anim-stagger="0.06">&ldquo;${text}&rdquo;</blockquote>
      </div>
    `;
  });
}