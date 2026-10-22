// Vide le cache jsDelivr de main.js / main.css après un push sur main.
// Doit pointer sur le dépôt que charge Webflow (cdn.jsdelivr.net/gh/<repo>@main/...).
const files = ["main.js", "main.css"];
const repo = "Brand-Appart-Delivery/rockfi-webflow-scripts";

Promise.all(
  files.map((file) =>
    fetch(`https://purge.jsdelivr.net/gh/${repo}@main/${file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`✓ Purgé : ${file}`);
      })
      .catch((err) => {
        console.log(`✗ Erreur : ${file} (${err.message})`);
        process.exitCode = 1;
      }),
  ),
);
