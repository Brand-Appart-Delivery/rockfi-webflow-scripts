// src/schema/registry.js
// Quel constructeur pour quelle page. Le premier test qui passe gagne.

import { buildTeamSchema, buildPressSchema } from "./builders.js";
import { pathnameIs } from "./utils.js";

export const PAGE_BUILDERS = [
  { test: () => pathnameIs("/a-propos"), build: buildTeamSchema },
  { test: () => pathnameIs("/presse"), build: buildPressSchema },
];
