import { Fragment, useEffect, useMemo, useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
  Checkbox,
  Chip,
  Collapse,
  Paper,
} from "@mui/material";
import {
  Store as StoreIcon,
  Business as BusinessIcon,
  SwapHoriz as SwapHorizIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { InfoBox } from "../../../components/wizard/InfoBox";
import { PropositionsSeriesEditor } from "../components/PropositionsSeriesEditor";
import { useQuery } from "@tanstack/react-query";

export function RealisationTousInventairePage({ onSuccess }) {
  const notify = useNotification();

  const { data: magasins = [] } = useQuery({
    queryKey: ["magasins", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });
  const { data: directions = [] } = useQuery({
    queryKey: ["directions", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const [lieuType, setLieuType] = useState("magasin");
  const [lieuId, setLieuId] = useState("");

  const [articles, setArticles] = useState([]);
  const [stocksTheoriques, setStocksTheoriques] = useState({});
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [saisies, setSaisies] = useState({});

  const [unitesParArticle, setUnitesParArticle] = useState({});
  const [loadingUnitesArticle, setLoadingUnitesArticle] = useState({});

  const [ligneOuverte, setLigneOuverte] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingArticles(true);
    apiClient
      .get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } })
      .then((res) => setArticles(res.data.results ?? res.data))
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED))
      .finally(() => setLoadingArticles(false));
  }, []);

  useEffect(() => {
    setSaisies({});
    setUnitesParArticle({});
    setLigneOuverte(null);

    if (!lieuId) {
      setStocksTheoriques({});
      return;
    }

    const fetchStocks = async () => {
      setLoadingStocks(true);
      try {
        const params = {
          date: new Date().toISOString().slice(0, 10),
          [lieuType === "magasin" ? "magasin_id" : "direction_id"]: lieuId,
        };
        const { data } = await apiClient.get(API_ENDPOINTS.HISTORIQUE_LOCALISATION, { params });
        setStocksTheoriques(
          Object.fromEntries((data ?? []).map((stock) => [stock.article_code, { stock_theorique: stock.stock }]))
        );
      } catch {
        notify.error("Impossible de charger les articles présents dans ce lieu.");
        setStocksTheoriques({});
      } finally {
        setLoadingStocks(false);
      }
    };
    fetchStocks();
  }, [lieuId, lieuType]);

  const lieuxDisponibles = lieuType === "magasin" ? magasins : directions;
  const lieuSelectionne = lieuxDisponibles.find((l) =>
    String(lieuType === "magasin" ? l.magasin_id : l.dir_id) === String(lieuId)
  );
  const lieuNom = lieuSelectionne
    ? lieuType === "magasin"
      ? lieuSelectionne.magasin_nom
      : lieuSelectionne.dir_libelle
    : "";

  const getStockTheorique = (articleCode) => stocksTheoriques[articleCode]?.stock_theorique ?? 0;

  const getSaisie = (code) =>
    saisies[code] ?? { quantite_physique: "", commentaire: "", propositions_series: {}, showChangementEtat: false };

  const updateSaisie = (code, patch) => {
    setSaisies((prev) => ({
      ...prev,
      [code]: { ...getSaisie(code), ...patch },
    }));
  };

  const chargerUnites = async (article) => {
    if (unitesParArticle[article.code_article] || loadingUnitesArticle[article.code_article]) return;
    setLoadingUnitesArticle((prev) => ({ ...prev, [article.code_article]: true }));
    try {
      const { data } = await apiClient.get("/api/stock/unites-article/", {
        params: { article: article.code_article, statut: "EN_STOCK", page_size: 500 },
      });
      setUnitesParArticle((prev) => ({ ...prev, [article.code_article]: data.results ?? data }));
    } catch {
      notify.error("Impossible de charger les unités en stock.");
    } finally {
      setLoadingUnitesArticle((prev) => ({ ...prev, [article.code_article]: false }));
    }
  };

  const toggleLigneOuverte = (article) => {
    const code = article.code_article;
    if (ligneOuverte === code) {
      setLigneOuverte(null);
      return;
    }
    setLigneOuverte(code);
    if (article.is_immobilisation) chargerUnites(article);
  };

  const articlesAffiches = useMemo(
    () => articles.filter((article) => stocksTheoriques[article.code_article]),
    [articles, stocksTheoriques]
  );

  const getEcartColor = (ecart) => (ecart === 0 ? "success.main" : "error.main");
  const formatEcart = (ecart) => (ecart > 0 ? `+${ecart}` : String(ecart));

  const nbLignesSaisies = useMemo(() => {
    return Object.entries(saisies).filter(([, s]) => {
      const nbProp =
        (s.propositions_series?.ajouts || []).length +
        (s.propositions_series?.retraits || []).length +
        (s.propositions_series?.changements_etat || []).length;
      return s.quantite_physique !== "" || nbProp > 0;
    }).length;
  }, [saisies]);

  const handleSubmit = async () => {
    if (!lieuId) {
      notify.error("Veuillez sélectionner un lieu.");
      return;
    }
    const lignes = Object.entries(saisies)
      .filter(([, s]) => {
        const nbProp =
          (s.propositions_series?.ajouts || []).length +
          (s.propositions_series?.retraits || []).length +
          (s.propositions_series?.changements_etat || []).length;
        return s.quantite_physique !== "" || nbProp > 0;
      })
      .map(([code, s]) => {
        const article = articles.find((a) => a.code_article === code);
        const lignePayload = {
          article: code,
          quantite_physique: Number(s.quantite_physique) || 0,
          commentaire: s.commentaire?.trim() || null,
        };
        if (article?.is_immobilisation && Object.keys(s.propositions_series || {}).length > 0) {
          lignePayload.propositions_series = s.propositions_series;
        }
        return lignePayload;
      });

    const saisieInvalide = Object.entries(saisies).find(([, s]) => {
      if (s.quantite_physique === "") return false;
      const quantite = Number(s.quantite_physique);
      return !Number.isFinite(quantite) || quantite < 0 || !Number.isInteger(quantite);
    });
    if (saisieInvalide) {
      notify.error(`Article ${saisieInvalide[0]} : veuillez saisir une quantité entière positive ou nulle.`);
      setLigneOuverte(saisieInvalide[0]);
      return;
    }

    if (lignes.length === 0) {
      notify.error("Renseignez au moins un article avant d'enregistrer.");
      return;
    }

    for (const [code, s] of Object.entries(saisies)) {
      const article = articles.find((a) => a.code_article === code);
      if (!article?.is_immobilisation || article.mode_suivi !== "NUMERO_SERIE") continue;
      const ecart = (Number(s.quantite_physique) || 0) - getStockTheorique(code);
      const nbProp =
        (s.propositions_series?.ajouts || []).length +
        (s.propositions_series?.retraits || []).length +
        (s.propositions_series?.changements_etat || []).length;
      if ((ecart !== 0 || s.showChangementEtat) && s.quantite_physique !== "" && nbProp === 0) {
        notify.error(`Article ${code} : veuillez renseigner les propositions (ajouts, retraits ou changements d'état).`);
        setLigneOuverte(code);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { lignes };
      if (lieuType === "magasin") {
        payload.magasin = Number(lieuId);
      } else {
        payload.service = lieuId;
      }
      await apiClient.post(API_ENDPOINTS.INVENTAIRES, payload);
      notify.success("Inventaire enregistré avec succès");
      setSaisies({});
      setLigneOuverte(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        notify.error(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        notify.error(ERROR_MESSAGES.SAVE_FAILED);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: "background.paper",}}
        >
        <Typography
            variant="h6"
            fontWeight="600"
            color="text.primary"
            sx={{ mb: 2.5 }}
        >
            Réalisation d'un inventaire
        </Typography>

        <Box
            sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 3,
            flexWrap: "wrap",
            }}
        >
            <FormControl component="fieldset" size="small">
            <FormLabel
                component="legend"
                sx={{ typography: "caption", fontWeight: "bold", mb: 0.5 }}
            >
                Type de lieu
            </FormLabel>
            <RadioGroup
                row
                value={lieuType}
                onChange={(e) => {
                setLieuType(e.target.value);
                setLieuId("");
                }}
            >
                <FormControlLabel
                value="magasin"
                control={<Radio size="small" color="primary" />}
                label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <StoreIcon fontSize="small" color="action" />
                    <Typography variant="body2">Magasin</Typography>
                    </Box>
                }
                />
                <FormControlLabel
                value="direction"
                control={<Radio size="small" color="primary" />}
                label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2">Direction</Typography>
                    </Box>
                }
                />
            </RadioGroup>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
            <InputLabel>
                {lieuType === "magasin" ? "Magasin" : "Direction"}
            </InputLabel>
            <Select
                value={lieuId}
                label={lieuType === "magasin" ? "Magasin" : "Direction"}
                onChange={(e) => setLieuId(e.target.value)}
            >
                <MenuItem value="">
                <em>
                    Sélectionner {lieuType === "magasin" ? "un magasin" : "une direction"}...
                </em>
                </MenuItem>
                {lieuxDisponibles.map((l) => (
                <MenuItem
                    key={lieuType === "magasin" ? l.magasin_id : l.dir_id}
                    value={lieuType === "magasin" ? l.magasin_id : l.dir_id}
                >
                    {lieuType === "magasin"
                    ? `${l.magasin_nom}${l.localite_nom ? ` (${l.localite_nom})` : ""}`
                    : l.dir_libelle}
                </MenuItem>
                ))}
            </Select>
            </FormControl>
        </Box>

        {loadingStocks && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="caption" color="text.secondary">
                Calcul des stocks théoriques en cours...
            </Typography>
            </Box>
        )}
        </Paper>

      {lieuId && (
        <>
          {loadingArticles ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <StyledTable
              columns={[
                { label: "Article" },
                { label: "Qté théorique", align: "center", width: 130 },
                { label: "Qté physique", align: "center", width: 130 },
                { label: "Écart", align: "center", width: 90 },
                { label: "Commentaire", width: 220 },
                { label: "Ajustement", align: "center", width: 140 },
              ]}
            >
              {articlesAffiches.map((article) => {
                const code = article.code_article;
                const saisie = getSaisie(code);
                const theo = getStockTheorique(code);
                const phys = saisie.quantite_physique === "" ? null : Number(saisie.quantite_physique) || 0;
                const ecart = phys === null ? null : phys - theo;
                const isNumeroSerie = article.mode_suivi === "NUMERO_SERIE" && article.is_immobilisation;
                const isImmo = article.is_immobilisation;
                const nbPropositions =
                  (saisie.propositions_series?.ajouts || []).length +
                  (saisie.propositions_series?.retraits || []).length +
                  (saisie.propositions_series?.changements_etat || []).length;
                const ligneEstOuverte = ligneOuverte === code;
                const besoinPropositions = isNumeroSerie && (ecart !== 0 || saisie.showChangementEtat) && phys !== null;

                return (
                  <Fragment key={code}>
                    <tr>
                      <td>
                        <Typography variant="caption" color="text.secondary">{article.designation}</Typography>
                      </td>
                      <td align="center">
                        <Typography variant="body2" fontFamily="monospace">{theo}</Typography>
                      </td>
                      <td align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={saisie.quantite_physique}
                          onChange={(e) => updateSaisie(code, { quantite_physique: e.target.value })}
                          inputProps={{ min: 0, step: 1, style: { textAlign: "center" } }}
                          placeholder="0"
                          sx={{ width: 100 }}
                        />
                      </td>
                      <td align="center">
                        {ecart === null ? (
                          <Chip label="—" size="small" variant="outlined" />
                        ) : (
                          <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ color: getEcartColor(ecart) }}>
                            {formatEcart(ecart)}
                          </Typography>
                        )}
                      </td>
                      <td>
                        <TextField
                          size="small"
                          fullWidth
                          value={saisie.commentaire}
                          onChange={(e) => updateSaisie(code, { commentaire: e.target.value })}
                          inputProps={{ maxLength: 255 }}
                        />
                      </td>
                      <td align="center">
                        {isImmo ? (
                          <Button
                            size="small"
                            variant={nbPropositions > 0 ? "contained" : "outlined"}
                            color={nbPropositions > 0 ? "primary" : "inherit"}
                            endIcon={ligneEstOuverte ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={() => toggleLigneOuverte(article)}
                            disabled={phys === null}
                          >
                            {nbPropositions > 0 ? `Ajustement (${nbPropositions})` : "Ajustement"}
                          </Button>
                        ) : (
                          <Chip label="—" size="small" variant="outlined" />
                        )}
                      </td>
                    </tr>

                    {isImmo && (
                      <tr key={`${code}-detail`}>
                        <td colSpan={6} style={{ padding: 0, border: 0 }}>
                          <Collapse in={ligneEstOuverte} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderTop: "1px solid #E0E0E0" }}>
                              {loadingUnitesArticle[code] ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <CircularProgress size={16} />
                                  <Typography variant="body2" color="text.secondary">
                                    Chargement des unités en stock...
                                  </Typography>
                                </Box>
                              ) : (
                                <>
                                  {isNumeroSerie && besoinPropositions && (
                                    <PropositionsSeriesEditor
                                      type="ECART"
                                      ecart={ecart}
                                      modeSuivi={article.mode_suivi}
                                      unitesExistantes={unitesParArticle[code] || []}
                                      value={saisie.propositions_series}
                                      onChange={(props) => updateSaisie(code, { propositions_series: props })}
                                    />
                                  )}

                                  <Box sx={{ mt: besoinPropositions ? 2 : 0, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={saisie.showChangementEtat}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            const nextPropositions = { ...saisie.propositions_series };
                                            if (!checked) delete nextPropositions.changements_etat;
                                            updateSaisie(code, {
                                              showChangementEtat: checked,
                                              propositions_series: nextPropositions,
                                            });
                                          }}
                                        />
                                      }
                                      label={
                                        <Typography variant="body2" fontWeight={600}>
                                          <SwapHorizIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                          Signaler un changement d'état sur des unités existantes
                                        </Typography>
                                      }
                                    />
                                    {saisie.showChangementEtat && (
                                      <Box sx={{ mt: 1 }}>
                                        <PropositionsSeriesEditor
                                          type="CHANGEMENT_ETAT"
                                          modeSuivi={article.mode_suivi}
                                          unitesExistantes={unitesParArticle[code] || []}
                                          value={saisie.propositions_series}
                                          onChange={(props) => updateSaisie(code, { propositions_series: props })}
                                        />
                                      </Box>
                                    )}
                                  </Box>

                                </>
                              )}
                            </Box>
                          </Collapse>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </StyledTable>
          )}

          {articlesAffiches.length === 0 && !loadingArticles && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Aucun article ne correspond aux filtres actuels.
              </Typography>
            </Box>
          )}

          {/* --- Action d'enregistrement --- */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving || nbLignesSaisies === 0 || !lieuId}
            >
              Enregistrer l'inventaire ({nbLignesSaisies})
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}