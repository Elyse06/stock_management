/**
 * Calcule la largeur des colonnes d'un DataGrid à partir de la longueur réelle
 * des données (mesure du texte avec un canvas, sans dépendre d'une version de MUI X).
 *
 * Props personnalisées reconnues sur une colonne (toutes optionnelles) :
 *  - getText(row)     : texte réellement affiché (utile si renderCell/format diffère de row[field])
 *  - autoMinWidth     : largeur minimale (défaut 80)
 *  - autoMaxWidth     : largeur maximale (défaut 420) ; au-delà le texte est tronqué avec "…"
 *  - autoExtraWidth   : marge ajoutée (ex. 32 pour une colonne affichant des Chip)
 *  - autoGrow={false} : empêche la colonne d'absorber l'espace restant
 *  - fixedWidth       : garde `width` tel quel (la colonne "actions" l'est toujours)
 *  - hideOnMobile     : masque la colonne dans la vue cartes (mobile)
 */

const FONT_FAMILY = '"Roboto", "Helvetica", "Arial", sans-serif';
const BODY_FONT = `400 13px ${FONT_FAMILY}`;
const HEAD_FONT = `500 13px ${FONT_FAMILY}`;
const CELL_PADDING = 28; // padding horizontal des cellules + marge de sécurité
const HEADER_EXTRA = 52; // icônes de tri et de menu dans l'en-tête
const SAMPLE_LIMIT = 200;

let ctx = null;
const cache = new Map();

function measure(text, font) {
  if (!text) return 0;
  if (!ctx && typeof document !== "undefined") {
    ctx = document.createElement("canvas").getContext("2d");
  }
  if (!ctx) return text.length * 8; // SSR / tests : estimation

  const key = `${font}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  ctx.font = font;
  const width = ctx.measureText(text).width;
  if (cache.size > 5000) cache.clear();
  cache.set(key, width);
  return width;
}

function cellText(col, row) {
  const raw = col.getText ? col.getText(row) : row?.[col.field];
  if (raw === null || raw === undefined || raw === "") return "—";
  if (typeof raw === "object") return "";
  return String(raw);
}

export function computeColumnWidths(columns, rows = []) {
  const sample = rows.slice(0, SAMPLE_LIMIT);
  let growIndex = -1;
  let growWidth = 0;

  const result = columns.map((column, index) => {
    const {
      getText,
      autoMinWidth,
      autoMaxWidth,
      autoExtraWidth,
      autoGrow,
      fixedWidth,
      hideOnMobile,
      ...col
    } = column;

    if (column.field === "actions" || fixedWidth) return col;

    const min = autoMinWidth ?? 80;
    const max = autoMaxWidth ?? 420;

    let width = measure(String(col.headerName ?? col.field), HEAD_FONT) + HEADER_EXTRA;
    for (const row of sample) {
      const text = cellText(column, row);
      if (text) {
        width = Math.max(
          width,
          measure(text, BODY_FONT) + CELL_PADDING + (autoExtraWidth ?? 0),
        );
      }
    }
    width = Math.ceil(Math.min(Math.max(width, min), max));

    // Les paramètres de largeur définis dans la page sont remplacés par la mesure
    delete col.flex;
    col.width = width;
    col.minWidth = width;

    if (autoGrow !== false && width > growWidth) {
      growWidth = width;
      growIndex = index;
    }
    return col;
  });

  // La colonne la plus large absorbe l'espace restant : plus de vide à droite du tableau
  if (growIndex >= 0) {
    const grow = result[growIndex];
    delete grow.width;
    grow.flex = 1;
  }

  return result;
}
