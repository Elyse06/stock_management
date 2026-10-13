/** Vrai si tous les champs obligatoires sont renseignés. */
export const requiredFilled = (fields, form) =>
  fields.every((field) => !field.required || String(form[field.name] ?? "").trim() !== "");

/** Copie les valeurs texte en retirant les espaces superflus. */
export const trimValues = (form) =>
  Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
