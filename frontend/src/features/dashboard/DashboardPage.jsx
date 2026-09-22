import { useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import {
  Inventory as InventoryIcon,
  AccountBalance as AccountBalanceIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
} from "@mui/icons-material";
import { useDashboardData } from "./hooks/useDashboardData";
import { StatCard } from "./components/StatCard";
import { KPIDetailModal } from "./components/KPIDetailModal";
import { TopConsommesTable } from "./components/TopConsommesTable";
import { ProduitsDormantsTable } from "./components/ProduitsDormantsTable";
import { StockEvolutionChart } from "./components/charts/StockEvolutionChart";
import { ConsommationMensuelleChart } from "./components/charts/ConsommationMensuelleChart";
import { CategorieDistributionChart } from "./components/charts/CategorieDistributionChart";
import { MagasinDistributionChart } from "./components/charts/MagasinDistributionChart";
import { PageHeader } from "../../components/common/PageHeader";
import { ErrorAlert } from "../../components/common/ErrorAlert";

export function DashboardPage() {
  const {
    kpis,
    topConsommes,
    produitsDormants,
    evolutionStock,
    consommationMensuelle,
    repartitionCategorie,
    repartitionMagasin,
    loading,
    error,
  } = useDashboardData();

  const [modalKPI, setModalKPI] = useState(null);

  const refreshDashboard = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Typography variant="h3" color="text.secondary">
          Chargement du tableau de bord...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Tableau de bord" />
      <ErrorAlert error={error} />

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<InventoryIcon />}
            label="Total articles"
            value={kpis?.total_articles ?? 0}
            onClick={() => setModalKPI("total_articles")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<AccountBalanceIcon />}
            label="Quantité totale en stock"
            value={kpis?.total_stock ?? 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<ErrorIcon />}
            label="Produits en rupture"
            value={kpis?.produits_en_rupture ?? 0}
            onClick={() => setModalKPI("produits_en_rupture")}
            badge={kpis?.produits_en_rupture > 0 ? { label: "CRITIQUE", color: "#F9A825" } : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<WarningIcon />}
            label="Produits sous seuil"
            value={kpis?.produits_sous_seuil ?? 0}
            onClick={() => setModalKPI("produits_sous_seuil")}
            badge={kpis?.produits_sous_seuil > 0 ? { label: "ATTENTION", color: "#F9A825" } : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<ArrowDownwardIcon />}
            label="Entrées et retours du mois"
            value={kpis?.entrees_du_mois ?? 0}
            onClick={() => setModalKPI("entrees_du_mois")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<ArrowUpwardIcon />}
            label="Sorties du mois"
            value={kpis?.sorties_du_mois ?? 0}
            onClick={() => setModalKPI("sorties_du_mois")}
          />
        </Grid>
      </Grid>

      {/* Graphiques */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <StockEvolutionChart data={evolutionStock} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ConsommationMensuelleChart data={consommationMensuelle} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CategorieDistributionChart data={repartitionCategorie} />
        </Grid>
        <Grid item xs={12} md={6}>
          <MagasinDistributionChart data={repartitionMagasin} />
        </Grid>
      </Grid>

      {/* Tableaux */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TopConsommesTable data={topConsommes} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProduitsDormantsTable data={produitsDormants} />
        </Grid>
      </Grid>

      <KPIDetailModal
        kpiType={modalKPI}
        isOpen={modalKPI !== null}
        onClose={() => setModalKPI(null)}
        onDashboardRefresh={refreshDashboard}
      />
    </Box>
  );
}