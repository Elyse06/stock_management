export function formatDate(dateString, options = {}) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    dateStyle: "short",
    ...options,
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
  }).format(value);
}

export function formatNumber(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("fr-FR").format(value);
}