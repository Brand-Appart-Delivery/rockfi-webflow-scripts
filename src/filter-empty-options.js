// src/filter-empty-options.js
// Filtres Finsweet List en <select> (ex. villes sur /nos-conseillers) :
// les options viennent d'une liste CMS de toutes les villes, y compris celles
// sans aucun conseiller. Choisir l'une d'elles affichait « Aucun résultat ».
//
// Une fois la liste chargée, on retire du <select> les options qui ne
// correspondent à aucun item. Finsweet garde en mémoire tous les items, même
// ceux des lots pas encore affichés (« Afficher plus »), donc le calcul porte
// sur toute la liste. Automatique : une ville réapparaît dès qu'un conseiller
// y est rattaché dans le CMS.

const SELECT_SELECTOR = '[fs-list-element="filters"] select[fs-list-field]';

function itemsOf(instance) {
  const items = instance.items;
  if (Array.isArray(items)) return items;
  if (items && Array.isArray(items.value)) return items.value;
  return [];
}

function collectValues(instances, fieldKey) {
  const values = new Set();
  instances.forEach((instance) => {
    itemsOf(instance).forEach((item) => {
      const field = item.fields && item.fields[fieldKey];
      if (!field) return;
      const value = field.value ?? field.rawValue;
      (Array.isArray(value) ? value : [value]).forEach((v) => {
        if (v != null && v !== "") values.add(String(v).trim());
      });
    });
  });
  return values;
}

function pruneSelect(select, values) {
  select.querySelectorAll("option").forEach((option) => {
    if (option.value === "") return; // option « Ville » (aucun filtre)
    if (values.has(option.value.trim())) return;
    // Les options sont rendues dans un item de liste CMS : on retire l'item entier
    const wrapper = option.closest(".w-dyn-item");
    (wrapper && select.contains(wrapper) ? wrapper : option).remove();
  });
}

async function prune(instances) {
  // Attend le chargement de tous les lots paginés
  await Promise.all(
    instances.map((instance) => Promise.resolve(instance.loadingPaginatedItems).catch(() => {})),
  );
  document.querySelectorAll(SELECT_SELECTOR).forEach((select) => {
    const fieldKey = select.getAttribute("fs-list-field");
    const values = collectValues(instances, fieldKey);
    // Aucune valeur trouvée = API Finsweet inattendue : on ne touche à rien
    if (!values.size) return;
    pruneSelect(select, values);
  });
}

export function initFilterEmptyOptions() {
  if (!document.querySelector(SELECT_SELECTOR)) return;

  const loading = window.FinsweetAttributes?.modules?.list?.loading;
  if (loading) {
    loading.then(prune);
    return;
  }
  // Script Finsweet pas encore initialisé : on passe par sa file d'attente
  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push(["list", (instances) => prune(instances)]);
}
