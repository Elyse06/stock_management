import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Grid,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  QrCode as QrCodeIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiClient } from "../../../api/client";

export function ArticlePremiumPage() {
  const { code_article } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const charger = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await apiClient.get(
          `/api/catalogue/articles/${code_article}/fiche-complete/`
        );
        setData(data);
      } catch {
        setError("Impossible de charger la fiche article.");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [code_article]);

  const handleTabChange = (_, newValue) => setActiveTab(newValue);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Alert severity="error">{error || "Article non trouvé."}</Alert>
      </Box>
    );
  }

  const { article, stocks_par_magasin, fournisseurs, historique_recents, attributions_actives, commandes_recentes } = data;

  // Calcul du stock total
  const stock_total = Object.values(stocks_par_magasin).reduce((sum, val) => {
    const quantite = typeof val === "object" && val !== null ? val.stock : val;
    return sum + (quantite || 0);
  }, 0);
  const est_en_rupture = stock_total === 0;
  const est_sous_seuil = stock_total > 0 && stock_total < article.seuil;

  // Données pour le graphique d'évolution (basé sur l'historique)
  const evolution_data = [...historique_recents]
    .reverse()
    .map((h, idx) => ({
      date: new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
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
        <Box sx={{ display: "flex", gap: 1 }}>
          {est_en_rupture && (
            <Chip icon={<WarningIcon />} label="En rupture" color="error" />
          )}
          {est_sous_seuil && (
            <Chip icon={<WarningIcon />} label="Sous seuil" color="warning" />
          )}
          {article.numero_de_serie && (
            <Chip
              label={`N° Série: ${article.numero_de_serie}`}
              color="info"
              variant="outlined"
              size="small"
              sx={{ fontFamily: "monospace" }}
            />
          )}
        </Box>
      </Box>

      {/* Layout 2 colonnes */}
      <Grid container spacing={3}>
        {/* Colonne gauche : Carte d'identité */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #E0E0E0",
              borderRadius: 1,
              bgcolor: "#FFFFFF",
              position: "sticky",
              top: 80,
            }}
          >
            {/* Code article */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Code article
              </Typography>
              <Typography
                variant="h3"
                fontFamily="monospace"
                fontWeight={700}
                sx={{
                  bgcolor: "#FFF8E1",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 0.5,
                  border: "1px solid #F9A825",
                  display: "inline-block",
                }}
              >
                {article.code_article}
              </Typography>
            </Box>

            {/* Catégorie */}
            {article.categorie && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <CategoryIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Catégorie
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={500}>
                  {article.categorie}
                </Typography>
              </Box>
            )}

            {/* Marque */}
            {article.marque && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <LabelIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Marque
                  </Typography>
                </Box>
                <Typography variant="body1">{article.marque}</Typography>
              </Box>
            )}

            {/* Unité */}
            {article.unite && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Unité</Typography>
                <Typography variant="body1">{article.unite}</Typography>
              </Box>
            )}

            {/* Seuil */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Seuil de réapprovisionnement
              </Typography>
              <Typography variant="body1" fontWeight={600} fontFamily="monospace">
                {article.seuil}
              </Typography>
            </Box>

            {/* Description */}
            {article.description && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Description
                </Typography>
                <Box
                  sx={{
                    bgcolor: "#FAFAFA",
                    p: 1.5,
                    borderRadius: 1,
                    border: "1px solid #E0E0E0",
                  }}
                >
                  <Typography variant="body2">{article.description}</Typography>
                </Box>
              </Box>
            )}

            {/* Code-barre */}
            {article.code_barre && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Code-barre
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {article.code_barre}
                </Typography>
              </Box>
            )}

            {/** Numero de série */}
            {article.numero_de_serie && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <QrCodeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Numéro de série
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  fontFamily="monospace"
                  fontWeight={600}
                  sx={{
                    bgcolor: "#E3F2FD",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    border: "1px solid #1976D2",
                    display: "inline-block",
                  }}
                >
                  {article.numero_de_serie}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* STOCK TOTAL - KPI principal */}
            <Box
              sx={{
                p: 2,
                bgcolor: "#FFF8E1",
                borderRadius: 1,
                border: "1px solid #F9A825",
                textAlign: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
                <InventoryIcon color="primary" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Stock total
                </Typography>
              </Box>
              <Typography
                variant="h2"
                fontWeight={700}
                fontFamily="monospace"
                color={est_en_rupture ? "error.main" : "primary.main"}
              >
                {stock_total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {article.unite || "unités"}
              </Typography>
            </Box>

            {/* Répartition par magasin */}
            {Object.keys(stocks_par_magasin).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                  Répartition par magasin
                </Typography>
                {Object.entries(stocks_par_magasin).map(([magasin, stockData]) => (
                  <Box
                    key={magasin}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 0.5,
                      borderBottom: "1px solid #E0E0E0",
                    }}
                  >
                    <Typography variant="body2">{magasin}</Typography>
                    <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                      {typeof stockData === 'object' && stockData !== null ? stockData.stock : stockData}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Colonne droite : Onglets */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ border: "1px solid #E0E0E0", borderRadius: 1, bgcolor: "#FFFFFF" }}>
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
              <Tab label="Synthèse" icon={<InventoryIcon />} iconPosition="start" />
              <Tab label="Historique" icon={<HistoryIcon />} iconPosition="start" />
              <Tab label="Traçabilité" icon={<QrCodeIcon />} iconPosition="start" />
              <Tab label="Commandes" icon={<ShoppingCartIcon />} iconPosition="start" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* ====== ONGLET 1 : SYNTHÈSE ====== */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUpIcon color="primary" />
                    Vue d'ensemble
                  </Typography>

                  {/* Mini graphique d'évolution */}
                  {evolution_data.length > 0 && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Évolution récente du stock
                      </Typography>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={evolution_data}>
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="stock"
                            stroke="#F9A825"
                            strokeWidth={2}
                            dot={{ fill: "#F9A825", r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}

                  {/* Fournisseurs */}
                  <Typography variant="h3" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <PeopleIcon color="primary" />
                    Fournisseurs ({fournisseurs.length})
                  </Typography>
                  {fournisseurs.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Fournisseur
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}
                          >
                            Prix d'achat
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fournisseurs.map((f) => (
                          <TableRow key={f.fournisseur_id} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                            <TableCell>{f.fournisseur_nom}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                {Number(f.prix_achat).toLocaleString("fr-FR")} Ar
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity="info">Aucun fournisseur associé</Alert>
                  )}
                </Box>
              )}

              {/* ====== ONGLET 2 : HISTORIQUE ====== */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <HistoryIcon color="primary" />
                    10 derniers mouvements
                  </Typography>
                  {historique_recents.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Date
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Type
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Source / Dest.
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}
                          >
                            Qté
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Origine
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historique_recents.map((h, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                            <TableCell>
                              {new Date(h.date).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={h.type_mouvement}
                                color={
                                  h.type_mouvement === "ENTREE"
                                    ? "success"
                                    : h.type_mouvement === "SORTIE"
                                    ? "error"
                                    : h.type_mouvement === "TRANSFERT"
                                    ? "info"
                                    : "warning"
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {h.magasin_source || "—"} → {h.magasin_destination || "—"}
                              </Typography>
                              {h.beneficiaire && (
                                <Typography variant="caption" color="text.secondary">
                                  Bénéficiaire : {h.beneficiaire}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                                {h.quantite}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }} title={h.origine}>
                                {h.origine || "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity="info">Aucun mouvement enregistré pour cet article.</Alert>
                  )}
                </Box>
              )}

              {/* ====== ONGLET 3 : TRAÇABILITÉ ====== */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <QrCodeIcon color="primary" />
                    Attributions actives
                  </Typography>
                  {attributions_actives.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Bénéficiaire
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Service
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}
                          >
                            Quantité
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}
                          >
                            QR Code
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attributions_actives.map((a, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {a.employe_nom}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.matricule} {a.fonction && `• ${a.fonction}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={a.service || "—"} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                                {a.quantite_attribuee}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                icon={<QrCodeIcon />}
                                label={a.code_unique_qr?.substring(0, 8) + "..."}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity="info">Aucune attribution active pour cet article.</Alert>
                  )}
                </Box>
              )}

              {/* ====== ONGLET 4 : COMMANDES ====== */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h3" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <ShoppingCartIcon color="primary" />
                    10 dernières commandes
                  </Typography>
                  {commandes_recentes.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            N°
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Date
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Objet
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Demandeur
                          </TableCell>
                          <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
                            Statut
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {commandes_recentes.map((c) => (
                          <TableRow key={c.commande_id} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                #{c.commande_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {new Date(c.date_commande).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }} title={c.objet}>
                                {c.objet || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{c.demandeur || "—"}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={c.statut}
                                color={
                                  c.statut === "VALIDEE"
                                    ? "success"
                                    : c.statut === "REJETEE"
                                    ? "error"
                                    : c.statut === "EN_COURS"
                                    ? "info"
                                    : "warning"
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity="info">Aucune commande liée à cet article.</Alert>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}