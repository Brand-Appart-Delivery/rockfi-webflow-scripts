// src/embeds/table-enhance.js
// Code court [table] … [/table] dans le rich text d'un article → vrai tableau.
//
// Syntaxe (dans un embed du rich text, ou en simples paragraphes) :
//   [table]                      ou [table split] (1re colonne en en-tête de ligne)
//   Poste | Fourchette | Note    ← 1re ligne = en-têtes
//   Gestion | 0,6 % à 1,5 % | …
//   [/table]
//
// Séparateur : « | ». Les anciennes tables séparées par des virgules restent
// lues tant qu'aucune ligne ne contient « | » (les virgules décimales
// françaises imposent « | » pour les nouveaux tableaux).
// **texte** dans une cellule → texte en gras.
// Cellule vide : rien entre deux « | » (ex. « | Marie | Paul » pour un coin vide).

const TABLE_BLOCK_REGEX =
  /(?:<p(?:\s[^>]*)?>)?\[table(\s+split)?\](?:<\/p>)?([\s\S]*?)(?:<p(?:\s[^>]*)?>)?\[\/table\](?:<\/p>)?/gi;

function decodeEntities(str) {
  return str.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function formatCell(cell) {
  return cell.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function transformTable(html) {
  return html.replace(TABLE_BLOCK_REGEX, (match, splitFlag, body) => {
    const useSplit = Boolean(splitFlag);

    const lines = body
      .replace(/<\/p>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((line) => decodeEntities(line).trim())
      // Lignes vides et caractère invisible que Webflow insère dans les paragraphes vides
      .filter((line) => line && line !== "‍");

    const separator = lines.some((line) => line.includes("|")) ? "|" : ",";
    // « | Marie | Paul » : la première cellule (vide) est conservée
    const rows = lines.map((line) =>
      line.split(separator).map((cell) => formatCell(cell.trim())),
    );

    if (!rows.length) return match;

    const [headerRow, ...bodyRows] = rows;

    const theadHTML = `<tr>${headerRow
      .map((cell) => `<th scope="col">${cell}</th>`)
      .join("")}</tr>`;

    const tbodyHTML = bodyRows
      .map((row) => {
        if (!useSplit) {
          return `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
        }

        const [rowHeader, ...rest] = row;
        const cellsHTML = rest.map((cell) => `<td>${cell}</td>`).join("");

        return `<tr><th scope="row">${rowHeader}</th>${cellsHTML}</tr>`;
      })
      .join("");

    return `
      <div class="rt-table-wrap blog-embed_wrapper">
        <table class="rt-table${useSplit ? " rt-table--split" : ""}">
          <thead>${theadHTML}</thead>
          <tbody>${tbodyHTML}</tbody>
        </table>
      </div>
    `;
  });
}
