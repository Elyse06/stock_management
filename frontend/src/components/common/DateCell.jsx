export function DateCell({ value, showTime = false }) {
  if (!value) return null;
  
  const date = new Date(value);
  const options = showTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" };
  
  return date.toLocaleString("fr-FR", options);
}