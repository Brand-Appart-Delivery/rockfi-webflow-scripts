// src/embeds/button-enhance.js
import { parseAttrs } from "../utils/parse-attrs.js";

const BUTTON_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[button([^\]]*)\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/button\](?:<\/p>)?/gi;

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

  return raw
    .split("27936_9718")
    .join(idSuffix)
    .split('fill="white"')
    .join('fill="currentColor"');
}

let buttonInstanceCounter = 0;

export function transformButton(html) {
  return html.replace(BUTTON_BLOCK_REGEX, (match, attrString, body) => {
    const attrs = parseAttrs(attrString);
    const href = attrs.href || "#";
    const label = body.replace(/<[^>]+>/g, "").trim();
    if (!label) return match;

    const showIcon = attrs.icon !== "false";

    buttonInstanceCounter += 1;
    const iconHTML = showIcon
      ? `<div class="rt-button-icon">${buildIconSVG(`rtbtn${buttonInstanceCounter}`)}</div>`
      : "";

    return `<div class="blog-embed_wrapper"><a href="${href}" class="rt-button">${iconHTML}<div>${label}</div></a></div>`;
  });
}