import { useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import {
  AccountBalance as AccountBalanceIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Error as ErrorIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { PageLoader } from "@/components/feedback/PageLoader";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { CategorieDistributionChart } from "../components/charts/CategorieDistributionChart";
import { ConsommationMensuelleChart } from "../components/charts/ConsommationMensuelleChart";
import { MagasinDistributionChart } from "../components/charts/MagasinDistributionChart";
import { StockEvolutionChart } from "../components/charts/StockEvolutionChart";
import { KPIDetailModal } from "../components/KPIDetailModal";
import { ProduitsDormantsTable } from "../components/ProduitsDormantsTable";
import { StatCard } from "../components/StatCard";
import { TopConsommesTable } from "../components/TopConsommesTable";
import { useDashboardData } from "../hooks/useDashboardData";

const CARTES = [
  { key: "total_articles", Icon: InventoryIcon, label: "Total articles", detail: true },
  { key: "total_stock", Icon: AccountBalanceIcon, label: "Quantité totale en stock" },
  { key: "produits_en_rupture", Icon: ErrorIcon, label: "Produits en rupture", detail: true, badge: "CRITIQUE" },
  { key: "produits_sous_seuil", Icon: WarningIcon, label: "Produits sous seuil", detail: true, badge: "ATTENTION" },
  { key: "entrees_du_mois", Icon: ArrowDownwardIcon, label: "Entrées et retours du mois", detail: true },
  { key: "sorties_du_mois", Icon: ArrowUpwardIcon, label: "Sorties du mois", detail: true },
];
const DEMI = { xs: 12, md: 6 };

/** Accueil pour un utilisateur sans accès aux statistiques (le backend exige CAT_LIRE ou MOV_LIRE). */
function Bienvenue({ email }) {
  return (
    <Paper variant="outlined" sx={{ p: 4, textAlign: "center", maxWidth: 640, mx: "auto", mt: 4 }}>
      <Typography variant="h2" gutterBottom>
        Bienvenue
      </Typography>
      <Typography color="text.secondary">
        Connecté en tant que <strong>{email}</strong>. Utilisez le menu pour accéder aux fonctionnalités de votre profil.
      </Typography>
    </Paper>
  );
}

export function DashboardPage() {
  const { canSeeDashboard, user } = usePermission();
  const d = useDashboardData(canSeeDashboard);
  const [modalKPI, setModalKPI] = useState(null);

  if (!canSeeDashboard) return <Bienvenue email={user?.utilisateur_mail} />;
  if (d.loading && !d.kpis) return <PageLoader />;

  return (
    <Box>
      <ErrorAlert error={d.enErreur ? "Certaines données du tableau de bord n'ont pas pu être chargées." : null} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {CARTES.map(({ key, Icon, label, detail, badge }) => {
          const valeur = d.kpis?.[key] ?? 0;
          return (
            <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
              <StatCard
                icon={<Icon />}
                label={label}
                value={valeur}
                onClick={detail ? () => setModalKPI(key) : undefined}
                badge={badge && valeur > 0 ? { label: badge, color: "#F9A825" } : null}
              />
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={DEMI}>
          <StockEvolutionChart data={d.evolutionStock} />
        </Grid>
        <Grid size={DEMI}>
          <ConsommationMensuelleChart data={d.consommationMensuelle} />
        </Grid>
        <Grid size={DEMI}>
          <CategorieDistributionChart data={d.repartitionCategorie} />
        </Grid>
        <Grid size={DEMI}>
          <MagasinDistributionChart data={d.repartitionMagasin} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={DEMI}>
          <TopConsommesTable data={d.topConsommes} />
        </Grid>
        <Grid size={DEMI}>
          <ProduitsDormantsTable data={d.produitsDormants} />
        </Grid>
      </Grid>

      <KPIDetailModal kpiType={modalKPI} isOpen={modalKPI !== null} onClose={() => setModalKPI(null)} />
    </Box>
  );
}
