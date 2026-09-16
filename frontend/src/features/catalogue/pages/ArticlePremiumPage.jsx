import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Tabs, Tab, CircularProgress, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { ArticleIdentityCard } from "../components/ArticleIdentityCard";
import { ArticleSyntheseTab } from "../components/ArticleSyntheseTab";
import { ArticleHistoriqueTab } from "../components/ArticleHistoriqueTab";
import { ArticleTracabiliteTab } from "../components/ArticleTracabiliteTab";
import { ArticleCommandesTab } from "../components/ArticleCommandesTab";

const TABS = [
  { label: "Synthèse", key: "synthese" },
  { label: "Historique", key: "historique" },
  { label: "Traçabilité", key: "tracabilite" },
  { label: "Commandes", key: "commandes" },
];

export function ArticlePremiumPage() {
  const { code_article } = useParams();
  const navigate = useNavigate();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["article", "fiche-complete", code_article],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `${API_ENDPOINTS.ARTICLES}${code_article}/fiche-complete/`
      );
      return data;
    },
    onError: () => {
      notify.error("Impossible de charger la fiche article.");
    },
  });

  const handleTabChange = (_, newValue) => setActiveTab(newValue);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>
        <Box
          sx={{
            p: 2,
            bgcolor: "#FFEBEE",
            borderRadius: 1,
            border: "1px solid #D32F2F",
          }}
        >
          <Typography color="error.main">
            {error?.message || "Article non trouvé."}
          </Typography>
        </Box>
      </Box>
    );
  }

  const {
    article,
    stocks_par_magasin,
    fournisseurs,
    historique_recents,
    attributions_actives,
    commandes_recentes,
  } = data;

  // Données pour le graphique d'évolution
  const stock_total = Object.values(stocks_par_magasin).reduce((sum, val) => {
    const quantite = typeof val === "object" && val !== null ? val.stock : val;
    return sum + (quantite || 0);
  }, 0);

  const evolution_data = [...historique_recents]
    .reverse()
    .map((h) => ({
      date: new Date(h.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      stock: h.stock_cumule || stock_total,
    }));

  return (
    <Box>
      {/* Header avec bouton retour */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/catalogue/articles")}
        >
          Retour à la liste
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2">{article.designation}</Typography>
          <Typography variant="body2" color="text.secondary">
            Code : {article.code_article}
          </Typography>
        </Box>
      </Box>

      {/* Layout 2 colonnes */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, gap: 3 }}>
        {/* Colonne gauche : Carte d'identité */}
        <Box>
          <ArticleIdentityCard
            article={article}
            stocks_par_magasin={stocks_par_magasin}
          />
        </Box>

        {/* Colonne droite : Onglets */}
        <Box
          sx={{
            border: "1px solid #E0E0E0",
            borderRadius: 1,
            bgcolor: "#FFFFFF",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: "1px solid #E0E0E0",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minWidth: 120,
              },
              "& .Mui-selected": {
                color: "primary.main",
              },
            }}
          >
            {TABS.map((tab) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <ArticleSyntheseTab
                evolution_data={evolution_data}
                fournisseurs={fournisseurs}
              />
            )}
            {activeTab === 1 && (
              <ArticleHistoriqueTab
                historique_recents={historique_recents}
              />
            )}
            {activeTab === 2 && (
              <ArticleTracabiliteTab
                attributions_actives={attributions_actives}
              />
            )}
            {activeTab === 3 && (
              <ArticleCommandesTab
                commandes_recentes={commandes_recentes}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}