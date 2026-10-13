import { Box, Button, LinearProgress, Typography } from "@mui/material";

import { formatNombre } from "../utils/dashboard";

import { AucuneDonnee, DashboardCard } from "./ui/DashboardCard";

const URGENCE = {
  critique: { libelle: "Critique", couleur: "#F04438", fond: "#FEF3F2" },
  urgent: { libelle: "Urgent", couleur: "#F99813", fond: "#FFF6E5" },
  attention: { libelle: "Attention", couleur: "#B54708", fond: "#FFFAEB" },
};

function Compteur({ valeur, libelle, couleur, onClick }) {
  return (
    <Box component="button" type="button" onClick={onClick}
      sx={{ flex: 1, p: 1.5, border: "1px solid #E8EDF3", borderRadius: 2, bgcolor: "#FFFFFF", textAlign: "left",
        cursor: "pointer", font: "inherit", "&:hover": { borderColor: couleur } }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: valeur > 0 ? couleur : "#101828" }}>{formatNombre(valeur)}</Typography>
      <Typography variant="caption" sx={{ color: "#667085" }}>{libelle}</Typography>
    </Box>
  );
}

/** Ruptures et articles sous le seuil, avec niveau de stock par rapport au seuil. */
export function AlertesStock({ kpis, alertes, onDetail }) {
  return (
    <DashboardCard
      titre="À surveiller"
      sousTitre="Articles sous leur seuil d'alerte"
      action={alertes.length > 0 && (
        <Button size="small" onClick={() => onDetail("produits_sous_seuil")} sx={{ textTransform: "none" }}>Tout voir</Button>
      )}
    >
      <Box sx={{ display: "flex", gap: 1.25, mb: 2 }}>
        <Compteur valeur={kpis?.produits_en_rupture ?? 0} libelle="En rupture" couleur="#F04438" onClick={() => onDetail("produits_en_rupture")} />
        <Compteur valeur={kpis?.produits_sous_seuil ?? 0} libelle="Sous le seuil" couleur="#F99813" onClick={() => onDetail("produits_sous_seuil")} />
      </Box>
      {alertes.length === 0 ? (
        <AucuneDonnee texte="Tous les articles sont au-dessus de leur seuil." />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {alertes.map((article) => {
            const urgence = URGENCE[article.niveau_urgence] ?? URGENCE.attention;
            const niveau = article.seuil ? Math.min(100, Math.round((article.stock_calcule / article.seuil) * 100)) : 0;
            return (
              <Box key={article.code_article}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: "#344054", minWidth: 0 }}>
                    {article.designation}
                  </Typography>
                  <Box component="span" sx={{ flexShrink: 0, px: 0.75, borderRadius: 10, fontSize: 11, fontWeight: 600,
                    color: urgence.couleur, bgcolor: urgence.fond }}>
                    {urgence.libelle}
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={niveau} aria-label={`Stock de ${article.designation}`}
                  sx={{ height: 6, borderRadius: 3, bgcolor: "#F2F4F7", "& .MuiLinearProgress-bar": { bgcolor: urgence.couleur, borderRadius: 3 } }} />
                <Typography variant="caption" sx={{ color: "#667085" }}>
                  {formatNombre(article.stock_calcule)} en stock · seuil {formatNombre(article.seuil)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </DashboardCard>
  );
}
