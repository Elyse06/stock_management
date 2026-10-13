import { useMemo, useState } from "react";
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import {
  Business as BusinessIcon,
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
  Save as SaveIcon,
  Store as StoreIcon,
} from "@mui/icons-material";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { StyledTable } from "@/components/table/StyledTable";
import { InfoBox } from "@/components/wizard/InfoBox";
import { useArticles } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { LieuSelector } from "../components/realisation/LieuSelector";
import { LigneInventaireRow } from "../components/realisation/LigneInventaireRow";
import { RealisationToolbar } from "../components/realisation/RealisationToolbar";
import { useLieuInventaire } from "../hooks/useLieuInventaire";
import { useSaisiesInventaire } from "../hooks/useSaisiesInventaire";
import { SAISIE_VIDE } from "../utils/saisieInventaire";

const COLONNES = [
  { label: "Article" },
  { label: "Qté théorique", align: "center", width: 130 },
  { label: "Qté physique", align: "center", width: 130 },
  { label: "Écart", align: "center", width: 90 },
  { label: "Commentaire", width: 220 },
  { label: "Ajustement", align: "center", width: 140 },
];
const ICONES = { magasin: StoreIcon, site: LocationCityIcon, direction: BusinessIcon, salle: MeetingRoomIcon };
const LIBELLES = { magasin: "Magasin", site: "Agence", direction: "Direction", salle: "Salle" };

export function RealisationTousInventairePage() {
  const { data: articles = [], isLoading: loadingArticles } = useArticles();
  const lieu = useLieuInventaire();
  const saisie = useSaisiesInventaire({ lieu, articles });
  const [recherche, setRecherche] = useState("");
  const [affichage, setAffichage] = useState("tous");

  const articlesAffiches = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return articles.filter((article) => {
      const code = article.code_article;
      if (!(code in lieu.stocksTheoriques)) return false;
      if (terme && !`${article.designation} ${code}`.toLowerCase().includes(terme)) return false;
      if (affichage === "tous") return true;
      const s = saisie.saisies[code];
      const saisi = Boolean(s) && s.quantite_physique !== "";
      return affichage === "saisis" ? saisi : saisi && Number(s.quantite_physique) !== saisie.stockTheorique(code);
    });
  }, [articles, lieu.stocksTheoriques, recherche, affichage, saisie]);

  const Icone = lieu.cible ? ICONES[lieu.cible.type] : null;

  return (
    <Box sx={{ p: { xs: 0, md: 3 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
        <Typography variant="h3" fontWeight={600} sx={{ mb: 2.5 }}>
          Réalisation d'un inventaire
        </Typography>
        <LieuSelector lieu={lieu} />
        {lieu.cible && <InfoBox icon={<Icone fontSize="small" />} title={lieu.nom} subtitle={LIBELLES[lieu.cible.type]} />}
        {lieu.loadingStocks && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="caption" color="text.secondary">
              Calcul des stocks théoriques en cours...
            </Typography>
          </Box>
        )}
        <ErrorAlert error={lieu.stocksError && getErrorMessage(lieu.stocksError, "Impossible de charger les articles présents dans ce lieu.")} />
      </Paper>

      {lieu.cible && (
        <>
          <RealisationToolbar
            recherche={recherche}
            onRecherche={setRecherche}
            affichage={affichage}
            onAffichage={setAffichage}
            compteurs={{ tous: Object.keys(lieu.stocksTheoriques).length, saisis: saisie.nbSaisies, ecarts: saisie.nbEcarts }}
          />

          {loadingArticles ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <StyledTable columns={COLONNES} emptyMessage="Aucun article ne correspond aux filtres actuels.">
              {articlesAffiches.map((article) => (
                <LigneInventaireRow
                  key={article.code_article}
                  article={article}
                  saisie={saisie.saisies[article.code_article] ?? SAISIE_VIDE}
                  theorique={saisie.stockTheorique(article.code_article)}
                  ouverte={saisie.ligneOuverte === article.code_article}
                  unites={saisie.unites[article.code_article] || []}
                  chargementUnites={Boolean(saisie.chargementUnites[article.code_article])}
                  onChange={saisie.updateSaisie}
                  onToggle={saisie.basculerLigne}
                />
              ))}
            </StyledTable>
          )}

          <Box
            sx={{
              position: "sticky",
              bottom: 0,
              zIndex: 2,
              mt: 3,
              py: 1.5,
              display: "flex",
              justifyContent: "flex-end",
              bgcolor: "background.paper",
              borderTop: "1px solid #E0E0E0",
            }}
          >
            <Button
              variant="contained"
              size="large"
              sx={{ width: { xs: "100%", sm: "auto" } }}
              startIcon={saisie.saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={saisie.enregistrer}
              disabled={saisie.saving || saisie.nbSaisies === 0}
            >
              Enregistrer l'inventaire ({saisie.nbSaisies})
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
