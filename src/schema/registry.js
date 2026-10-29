// src/schema/registry.js
// Quel constructeur pour quelle page. Le premier test qui passe gagne.

import { buildTeamSchema, buildPressSchema, buildArticleFaqSchema } from "./builders.js";
import { pathnameIs } from "./utils.js";

export const PAGE_BUILDERS = [
  // Articles (FR et EN) : FAQ rédigée dans le texte de l'article
  {
    test: () => /\/(blog-post|landing-posts)\//.test(window.location.pathname),
    build: buildArticleFaqSchema,
  },
  { test: () => pathnameIs("/a-propos") || pathnameIs("/about"), build: buildTeamSchema },
  // FR : /presse, EN : /en/press
  { test: () => pathnameIs("/presse") || pathnameIs("/press"), build: buildPressSchema },
];
