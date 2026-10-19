import { useMemo, useState } from "react";
import { Box, Button, Grid, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import {
  AccountBalance as AccountBalanceIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  AutoAwesome as AutoAwesomeIcon,
  Inventory2 as InventoryIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { PageLoader } from "@/components/feedback/PageLoader";
import { useAssistant } from "@/features/ai-assistant/context/assistantContext";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { CategoriesDonut } from "../components/charts/CategoriesDonut";
import { FluxMensuelsChart } from "../components/charts/FluxMensuelsChart";
import { StockEvolutionChart } from "../components/charts/StockEvolutionChart";
import { AlertesStock } from "../components/AlertesStock";
import { ProduitsDormants, RepartitionMagasins, TopConsommes } from "../components/Classements";
import { KPIDetailModal } from "../components/KPIDetailModal";
import { KpiCard } from "../components/KpiCard";
import { PointsCles } from "../components/PointsCles";
import { BLEU, BLEU_CLAIR, ORANGE } from "../constants/couleurs";
import { useDashboardData } from "../hooks/useDashboardData";
import { dateDuJour, formatNombre, pointsCles, prenom, salutation, variation } from "../utils/dashboard";

/** Accueil pour un utilisateur sans accès aux statistiques (le backend exige CAT_LIRE ou MOV_LIRE). */
function Bienvenue({ nom }) {
  const { ouvrir, disponible } = useAssistant();
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", maxWidth: 640, mx: "auto", mt: 4, borderRadius: 3 }}>
      <Typography variant="h2" gutterBottom>
        {salutation()}{nom ? `, ${nom}` : ""}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Utilisez le menu pour accéder aux fonctionnalités de votre profil{disponible ? ", ou demandez à l'assistant" : ""}.
      </Typography>
      {disponible && (
        <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => ouvrir("Que puis-je faire dans l'application ?")}>
          Que puis-je faire ?
        </Button>
      )}
    </Paper>
  );
}

export function DashboardPage() {
  const { canSeeDashboard, user } = usePermission();
  const queryClient = useQueryClient();
  const { ouvrir, disponible: assistantDisponible } = useAssistant();
  const d = useDashboardData(canSeeDashboard);
  const [modalKPI, setModalKPI] = useState(null);
  const nom = prenom(user?.employe?.emp_nom);
  const points = useMemo(() => pointsCles(d), [d]);

  if (!canSeeDashboard) return <Bienvenue nom={nom} />;
  if (d.loading && !d.kpis) return <PageLoader />;

  const k = d.kpis ?? {};
  const evolutionStock = d.evolutionStock;
  const stockPrecedent = evolutionStock.length > 1 ? evolutionStock[evolutionStock.length - 2].stock_total : null;

  return (
    <Box sx={{ m: -3, p: { xs: 2, sm: 3 }, bgcolor: "#F5F7FB", minHeight: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" },
        flexDirection: { xs: "column", md: "row" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 700, color: "#101828", letterSpacing: "-0.01em" }}>
            {salutation()}{nom ? `, ${nom}` : ""}
          </Typography>
          <Typography sx={{ color: "#667085", fontSize: 14 }}>{dateDuJour()} · voici l'état de vos stocks</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Actualiser">
            <IconButton aria-label="Actualiser le tableau de bord" onClick={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
              sx={{ border: "1px solid #E8EDF3", bgcolor: "#FFFFFF" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {assistantDisponible && (
            <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => ouvrir()}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, boxShadow: "none" }}>
              Demander à l'assistant
            </Button>
          )}
        </Box>
      </Box>

      <ErrorAlert error={d.enErreur ? "Certaines données du tableau de bord n'ont pas pu être chargées." : null} />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard icone={<AccountBalanceIcon fontSize="small" />} libelle="Quantité en stock" valeur={k.total_stock}
            evolution={variation(k.total_stock, stockPrecedent)} legende="vs fin du mois dernier"
            serie={evolutionStock} cleSerie="stock_total" couleur={ORANGE} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard icone={<ArrowDownwardIcon fontSize="small" />} libelle="Entrées et retours" valeur={k.entrees_du_mois}
            evolution={variation(k.entrees_du_mois, k.entrees_mois_precedent)} legende="vs mois dernier"
            serie={d.consommationMensuelle} cleSerie="quantite_entree" couleur={BLEU} onClick={() => setModalKPI("entrees_du_mois")} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard icone={<ArrowUpwardIcon fontSize="small" />} libelle="Sorties du mois" valeur={k.sorties_du_mois}
            evolution={variation(k.sorties_du_mois, k.sorties_mois_precedent)} legende="vs mois dernier"
            serie={d.consommationMensuelle} cleSerie="quantite_sortie" couleur={BLEU_CLAIR} onClick={() => setModalKPI("sorties_du_mois")} />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
          <KpiCard icone={<InventoryIcon fontSize="small" />} libelle="Articles au catalogue" valeur={k.total_articles}
            legende={`${formatNombre(k.produits_en_rupture)} en rupture · ${formatNombre(k.produits_sous_seuil)} sous le seuil`}
            couleur="#B58900" onClick={() => setModalKPI("total_articles")} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}><FluxMensuelsChart data={d.consommationMensuelle} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><PointsCles points={points} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 6 }}><StockEvolutionChart data={evolutionStock} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CategoriesDonut data={d.repartitionCategorie} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><RepartitionMagasins data={d.repartitionMagasin} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}><AlertesStock kpis={d.kpis} alertes={d.alertes} onDetail={setModalKPI} /></Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}><TopConsommes data={d.topConsommes} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><ProduitsDormants data={d.produitsDormants} /></Grid>
      </Grid>

      <KPIDetailModal kpiType={modalKPI} isOpen={modalKPI !== null} onClose={() => setModalKPI(null)} />
    </Box>
  );
}
