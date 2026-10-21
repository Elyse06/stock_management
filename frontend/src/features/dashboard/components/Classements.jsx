import { Box, Typography } from "@mui/material";

import { BLEU, BLEU_CLAIR } from "../constants/couleurs";
import { formatNombre, joursDepuis, libellePourcentage } from "../utils/dashboard";

import { ListeBarres } from "./ui/ListeBarres";
import { AucuneDonnee, DashboardCard } from "./ui/DashboardCard";

/** Stock par magasin, avec la part de chacun. */
export function RepartitionMagasins({ data }) {
  const total = data.reduce((somme, m) => somme + m.stock, 0);
  const elements = [...data].sort((a, b) => b.stock - a.stock)
    .map((m) => ({ cle: m.magasin, libelle: m.magasin, valeur: m.stock, detail: `· ${libellePourcentage(m.stock, total)}` }));
  return (
    <DashboardCard titre="Par magasin" sousTitre="Quantité en stock dans chaque magasin">
      {elements.length ? <ListeBarres elements={elements} couleur={BLEU} /> : <AucuneDonnee />}
    </DashboardCard>
  );
}

/** Articles les plus sortis sur 20 jours. */
export function TopConsommes({ data }) {
  const elements = data.slice(0, 6).map((a) => ({ cle: a.article_code, libelle: a.designation, valeur: a.quantite_consomme }));
  return (
    <DashboardCard titre="Les plus demandés" sousTitre="Quantités sorties sur 20 jours">
      {elements.length ? <ListeBarres elements={elements} couleur={BLEU_CLAIR} rang /> : <AucuneDonnee texte="Aucune sortie sur 20 jours." />}
    </DashboardCard>
  );
}

/** Articles sans mouvement depuis plus de 3 mois. */
export function ProduitsDormants({ data }) {
  return (
    <DashboardCard titre="Articles dormants" sousTitre="Sans mouvement depuis plus de 3 mois">
      {data.length === 0 ? (
        <AucuneDonnee texte="Aucun article dormant." />
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {data.slice(0, 6).map((article) => {
            const jours = joursDepuis(article.dernier_mouvement);
            return (
              <Box component="li" key={article.article_code}
                sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderBottom: "1px solid #F2F4F7", "&:last-of-type": { borderBottom: 0 } }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 500, color: "#344054" }}>{article.designation}</Typography>
                  <Typography variant="caption" sx={{ color: "#98A2B3", fontFamily: "monospace" }}>{article.article_code}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#667085", flexShrink: 0 }}>
                  {jours === null ? "Jamais utilisé" : `il y a ${formatNombre(jours)} j`}
                </Typography>
              </Box>
            );
          })}
          {data.length > 6 && (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#667085" }}>
              et {data.length >= 50 ? "au moins " : ""}{formatNombre(data.length - 6)} autre(s)
            </Typography>
          )}
        </Box>
      )}
    </DashboardCard>
  );
}
