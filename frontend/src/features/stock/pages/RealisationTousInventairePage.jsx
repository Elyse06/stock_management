import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import {
  ArrowBack as RetourIcon,
  Business as BusinessIcon,
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
  Save as SaveIcon,
  Store as StoreIcon,
} from "@mui/icons-material";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { StyledTable } from "@/components/table/StyledTable";
import { InfoBox } from "@/components/wizard/InfoBox";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useArticles } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { ChoixTypeInventaire } from "../components/realisation/ChoixTypeInventaire";
import { LieuSelector } from "../components/realisation/LieuSelector";
import { LigneInventaireRow } from "../components/realisation/LigneInventaireRow";
import { RealisationToolbar } from "../components/realisation/RealisationToolbar";
import { useLieuInventaire } from "../hooks/useLieuInventaire";
import { useSaisiesInventaire } from "../hooks/useSaisiesInventaire";
import { TYPES_INVENTAIRE } from "../constants/typeInventaire";
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

/**
 * Réalisation d'un inventaire : immobilisations OU fournitures (``?type=`` choisi au départ),
 * pour un lieu ; « Retour » abandonne la saisie et revient à la liste des inventaires.
 */
export function RealisationTousInventairePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const type = TYPES_INVENTAIRE[params.get("type")] ?? null;
  const { confirm, dialogProps } = useConfirmDialog();
  const { data: tousArticles = [], isLoading: loadingArticles } = useArticles();
  // Seuls les articles du type choisi sont proposés au comptage.
  const articles = useMemo(
    () => (type ? tousArticles.filter((a) => Boolean(a.is_immobilisation) === type.immobilisation) : []),
    [tousArticles, type],
  );
  const lieu = useLieuInventaire();
  const saisie = useSaisiesInventaire({
    lieu, articles, typeArticles: type?.valeur, onEnregistre: () => navigate("/inventaire/sessions"),
  });
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

  const retour = () => {
    if (saisie.nbSaisies === 0) return navigate("/inventaire/sessions");
    confirm(
      "Abandonner la réalisation",
      `${saisie.nbSaisies} article(s) déjà saisi(s) seront perdus. Revenir à la liste des inventaires ?`,
      () => navigate("/inventaire/sessions"),
    );
  };

  const boutonRetour = (
    <Button startIcon={<RetourIcon />} onClick={retour} color="inherit" sx={{ mb: 2 }}>
      Retour aux inventaires
    </Button>
  );

  if (!type) {
    return (
      <Box sx={{ p: { xs: 0, md: 3 } }}>
        {boutonRetour}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Typography variant="h3" fontWeight={600} sx={{ mb: 0.5 }}>Réalisation d'un inventaire</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>Que voulez-vous inventorier ?</Typography>
          <ChoixTypeInventaire onChoisir={(cle) => setParams({ type: cle }, { replace: true })} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 0, md: 3 } }}>
      {boutonRetour}
      <ConfirmDialog {...dialogProps} confirmLabel="Abandonner" />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2.5 }}>
          <Typography variant="h3" fontWeight={600}>
            Réalisation d'un inventaire
          </Typography>
          <Chip icon={<type.Icon />} label={type.libelle} color="primary" variant="outlined" />
        </Box>
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
            compteurs={{ tous: articles.filter((x) => x.code_article in lieu.stocksTheoriques).length, saisis: saisie.nbSaisies, ecarts: saisie.nbEcarts }}
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
