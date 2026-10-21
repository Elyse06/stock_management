import { apiClient } from "@/lib/api/client";

export async function telechargerFichier(url, nomParDefaut) {
  const reponse = await apiClient.get(url, { responseType: "blob" });
  const entete = reponse.headers?.["content-disposition"] || "";
  const nom = /filename="?([^";]+)"?/.exec(entete)?.[1] || nomParDefaut;
  const lien = URL.createObjectURL(reponse.data);
  const ancre = document.createElement("a");
  ancre.href = lien;
  ancre.download = nom;
  document.body.appendChild(ancre);
  ancre.click();
  ancre.remove();
  setTimeout(() => URL.revokeObjectURL(lien), 1000);
}
