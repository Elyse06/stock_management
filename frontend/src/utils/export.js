/** Export de données côté navigateur (CSV compatible Excel, JSON). */

// Une cellule commençant par l'un de ces caractères est interprétée comme une
// formule par Excel / LibreOffice (injection CSV) : on la neutralise.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function csvCell(value) {
  let texte = String(value ?? "");
  if (FORMULA_PREFIX.test(texte)) texte = `'${texte}`;
  return `"${texte.replace(/"/g, '""')}"`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** ``columns`` : ``[{label, field}]`` ou ``[{label, getValue(row)}]``. */
export function exportToCSV(rows, filename, columns) {
  const entete = columns.map((col) => csvCell(col.label)).join(";");
  const lignes = rows.map((row) =>
    columns.map((col) => csvCell(col.getValue ? col.getValue(row) : row[col.field])).join(";"),
  );
  // BOM UTF-8 + séparateur « ; » : ouverture directe correcte dans Excel français.
  const contenu = `\uFEFF${[entete, ...lignes].join("\r\n")}`;
  downloadBlob(new Blob([contenu], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportToJSON(data, filename) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${filename}.json`);
}

/** Nom de fichier sûr (sans séparateurs de chemin ni caractères spéciaux). */
export const safeFilename = (name) => String(name).replace(/[^\w.-]+/g, "_").slice(0, 120);
