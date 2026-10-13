/**
 * Impression d'un élément du DOM dans une iframe isolée.
 *
 * Le contenu est COPIÉ (cloneNode) et le titre est affecté via textContent :
 * aucune donnée n'est interpolée dans du HTML, ce qui écarte toute injection
 * (l'ancienne version construisait le document par document.write avec des
 * valeurs issues de la base).
 */
export function printElement(element, { title = "Impression", css = "" } = {}) {
  if (!element) return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.close();
  doc.title = title;
  const style = doc.createElement("style");
  style.textContent = css;
  doc.head.appendChild(style);
  doc.body.appendChild(doc.importNode(element, true));

  const nettoyer = () => setTimeout(() => iframe.remove(), 500);
  iframe.contentWindow.addEventListener("afterprint", nettoyer, { once: true });
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  // Certains navigateurs n'émettent pas « afterprint » : filet de sécurité.
  setTimeout(nettoyer, 60000);
}
