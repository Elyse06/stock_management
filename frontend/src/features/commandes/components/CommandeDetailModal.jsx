import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  QrCode as QrCodeIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

export function CommandeDetailModal({ commande, isOpen, onClose, onSuccess }) {
  const { hasAction, hasAnyAction } = useAuth();
  const isAgentPrincipal = hasAction("CAT_GERE") && hasAction("COM_VAL");
  const isAgentSecondaire = !hasAction("CAT_GERE") && hasAction("COM_VAL");

  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]); // ✅ Pour connaître le mode_suivi
  const [magasinSource, setMagasinSource] = useState("");
  const [unitesParArticle, setUnitesParArticle] = useState({}); // ✅ { code_article: [unites] }
  const [unitesSelectionnees, setUnitesSelectionnees] = useState({}); // ✅ { detail_id: [unite_id] }
  const [commentaire, setCommentaire] = useState("");
  const [traitement, setTraitement] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingUnites, setLoadingUnites] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
        apiClient.get("/api/catalogue/articles/", { params: { page_size: 500 } }),
      ])
        .then(([magasinsRes, articlesRes]) => {
          setMagasins(magasinsRes.data.results ?? magasinsRes.data);
          setArticles(articlesRes.data.results ?? articlesRes.data);
        })
        .catch(() => setError("Impossible de charger les données."));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMagasinSource("");
      setUnitesParArticle({});
      setUnitesSelectionnees({});
      setCommentaire("");
      setError("");
      setSuccess("");
    }
  }, [isOpen, commande]);

  // ✅ Charger les unités EN_STOCK quand le magasin source change
  useEffect(() => {
    if (!magasinSource || !commande?.details?.length) {
      setUnitesParArticle({});
      return;
    }
    setLoadingUnites(true);
    setError("");

    // Récupérer les codes articles des détails en mode NUMERO_SERIE
    const articlesNS = commande.details
      .map((d) => {
        const article = articles.find((a) => a.code_article === d.article);
        return article?.mode_suivi === "NUMERO_SERIE" ? d.article : null;
      })
      .filter(Boolean);

    if (articlesNS.length === 0) {
      setLoadingUnites(false);
      return;
    }

    // Charger les unités EN_STOCK pour chaque article
    Promise.all(
      articlesNS.map((codeArticle) =>
        apiClient.get("/api/stock/unites-article/", {
          params: {
            article: codeArticle,
            statut: "EN_STOCK",
            page_size: 100,
          },
        })
      )
    )
      .then((responses) => {
        const newUnites = {};
        responses.forEach((res, idx) => {
          const codeArticle = articlesNS[idx];
          newUnites[codeArticle] = res.data.results ?? res.data;
        });
        setUnitesParArticle(newUnites);
      })
      .catch(() => {
        setError("Impossible de charger les unités disponibles.");
      })
      .finally(() => setLoadingUnites(false));
  }, [magasinSource, commande, articles]);

  if (!commande) return null;

  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);

  const getStatusColor = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return "warning";
      case "EN_COURS": return "info";
      case "VALIDEE": return "success";
      case "REJETEE": return "error";
      default: return "default";
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return "En attente";
      case "EN_COURS": return "En cours";
      case "VALIDEE": return "Validée";
      case "REJETEE": return "Rejetée";
      default: return statut;
    }
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return <HourglassEmptyIcon fontSize="small" />;
      case "EN_COURS": return <HourglassEmptyIcon fontSize="small" />;
      case "VALIDEE": return <CheckCircleIcon fontSize="small" />;
      case "REJETEE": return <CancelIcon fontSize="small" />;
      default: return null;
    }
  };

  const peutTraiter =
    (isAgentPrincipal && commande.statut === "EN_COURS") ||
    (isAgentSecondaire && commande.statut === "EN_ATTENTE");

  // ✅ Handler : toggle une unité pour un détail
  const toggleUnite = (detailId, uniteId) => {
    setUnitesSelectionnees((prev) => {
      const current = prev[detailId] || [];
      const updated = current.includes(uniteId)
        ? current.filter((id) => id !== uniteId)
        : [...current, uniteId];
      return { ...prev, [detailId]: updated };
    });
  };

  // ✅ Validation avant traitement
  const validerAvantTraitement = () => {
    if (commande.statut === "VALIDEE" && isAgentPrincipal && !magasinSource) {
      return "Veuillez sélectionner un magasin source pour la sortie de stock.";
    }

    // ✅ Vérifier que toutes les unités requises sont sélectionnées
    for (const detail of commande.details || []) {
      const article = getArticle(detail.article);
      if (article?.mode_suivi === "NUMERO_SERIE") {
        const unitesSel = unitesSelectionnees[detail.id] || [];
        const quantiteRequise = Number(detail.quantite);
        if (unitesSel.length !== quantiteRequise) {
          return `Pour "${article.designation}", veuillez sélectionner exactement ${quantiteRequise} unité(s) (actuellement ${unitesSel.length}).`;
        }
      }
    }
    return null;
  };

  const traiter = async (statut) => {
    const erreur = validerAvantTraitement();
    if (erreur) {
      setError(erreur);
      return;
    }

    setTraitement(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        statut,
        commentaire_agent: commentaire.trim(),
      };
      if (statut === "VALIDEE" && magasinSource) {
        payload.magasin_source = Number(magasinSource);
        // ✅ Ajouter les unités à attribuer par détail
        const detailsPayload = (commande.details || []).map((detail) => {
          const article = getArticle(detail.article);
          if (article?.mode_suivi === "NUMERO_SERIE") {
            return {
              detail_id: detail.id,
              unites_a_attribuer: unitesSelectionnees[detail.id] || [],
            };
          }
          return { detail_id: detail.id, unites_a_attribuer: [] };
        });
        payload.details = detailsPayload;
      }
      await apiClient.post(
        `/api/commandes/commandes/${commande.commande_id}/traiter/`,
        payload
      );
      const messages = {
        EN_COURS: "Commande pré-validée avec succès.",
        VALIDEE: "Commande validée définitivement.",
        REJETEE: "Commande rejetée.",
      };
      setSuccess(messages[statut]);
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors du traitement de la commande.");
      }
    } finally {
      setTraitement(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h3">Commande #{commande.commande_id}</Typography>
          <Chip
            icon={getStatusIcon(commande.statut)}
            label={getStatusLabel(commande.statut)}
            color={getStatusColor(commande.statut)}
            size="small"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* INFOS GÉNÉRALES */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>Informations générales</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Objet</Typography>
              <Typography variant="body1" fontWeight={500}>{commande.objet || "—"}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Demandeur</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body1">
                  {commande.demandeur?.nom || commande.employe_demandeur}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Date de demande</Typography>
              <Typography variant="body1">
                {new Date(commande.date_commande).toLocaleString("fr-FR")}
              </Typography>
            </Box>
            {commande.commentaire_agent && (
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Typography variant="body2" color="text.secondary">Commentaire</Typography>
                <Box sx={{ bgcolor: "#FAFAFA", p: 1.5, borderRadius: 1, border: "1px solid #E0E0E0" }}>
                  <Typography variant="body2">{commande.commentaire_agent}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* ARTICLES DEMANDÉS */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            Articles demandés ({commande.details?.length ?? 0})
          </Typography>
          <Table
            size="small"
            sx={{
              border: "1px solid #E0E0E0",
              "& .MuiTableCell-root": { borderColor: "#E0E0E0", py: 1, px: 1.5 },
              "& .MuiTableHead-root .MuiTableCell-root": {
                bgcolor: "#FFF8E1",
                fontWeight: 600,
                fontSize: 13,
                borderBottom: "2px solid #F9A825",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Article</TableCell>
                <TableCell align="center" sx={{ width: 100 }}>Quantité</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Attributions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {commande.details?.length > 0 ? (
                commande.details.map((detail) => {
                  const article = getArticle(detail.article);
                  const isNS = article?.mode_suivi === "NUMERO_SERIE";
                  return (
                    <TableRow key={detail.id} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {detail.article}
                          </Typography>
                          {isNS && (
                            <Chip
                              label="N° Série"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ height: 18, fontSize: 10 }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {detail.article_designation}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {detail.quantite}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {detail.attributions?.length > 0 ? (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {detail.attributions.map((attr) => (
                              <Chip
                                key={attr.id}
                                label={`${attr.beneficiaire_nom} (${attr.quantite})`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                icon={<PersonIcon />}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Chip
                            label={commande.demandeur?.nom || commande.employe_demandeur}
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ fontStyle: "italic", opacity: 0.7 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun article dans cette commande
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* FORMULAIRE DE TRAITEMENT */}
        {peutTraiter && (
          <Box>
            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <StoreIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Traitement de la commande
                </Typography>
              </Box>
            </Divider>

            {isAgentPrincipal && commande.statut === "EN_COURS" && (
              <>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Magasin source pour la sortie de stock</InputLabel>
                  <Select
                    value={magasinSource}
                    label="Magasin source pour la sortie de stock"
                    onChange={(e) => setMagasinSource(e.target.value)}
                  >
                    <MenuItem value="">Sélectionner un magasin</MenuItem>
                    {magasins.map((m) => (
                      <MenuItem key={m.magasin_id} value={m.magasin_id}>
                        {m.magasin_nom}
                        {m.localite ? ` (${m.localite})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* ✅ SÉLECTION DES UNITÉS ARTICLE */}
                {magasinSource && loadingUnites && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Chargement des unités disponibles...
                    </Typography>
                  </Box>
                )}

                {magasinSource && !loadingUnites && Object.keys(unitesParArticle).length > 0 && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                      <QrCodeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                      Sélection des unités à attribuer
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Sélectionnez exactement le nombre d'unités requis pour chaque article en mode "Numéro de série".
                    </Alert>

                    {commande.details.map((detail) => {
                      const article = getArticle(detail.article);
                      if (article?.mode_suivi !== "NUMERO_SERIE") return null;

                      const unitesDisponibles = unitesParArticle[detail.article] || [];
                      const unitesSel = unitesSelectionnees[detail.id] || [];
                      const quantiteRequise = Number(detail.quantite);
                      const estComplet = unitesSel.length === quantiteRequise;

                      return (
                        <Box
                          key={detail.id}
                          sx={{
                            mb: 2,
                            p: 2,
                            bgcolor: "#FAFAFA",
                            borderRadius: 1,
                            border: `1px solid ${estComplet ? "#4CAF50" : "#E0E0E0"}`,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {article.designation} ({detail.article})
                            </Typography>
                            <Chip
                              label={`${unitesSel.length} / ${quantiteRequise}`}
                              size="small"
                              color={estComplet ? "success" : "warning"}
                              variant={estComplet ? "filled" : "outlined"}
                            />
                          </Box>

                          {unitesDisponibles.length === 0 ? (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              Aucune unité EN_STOCK disponible pour cet article dans ce magasin.
                            </Alert>
                          ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 200, overflow: "auto" }}>
                              {unitesDisponibles.map((unite) => {
                                const isSelected = unitesSel.includes(unite.unite_id);
                                return (
                                  <FormControlLabel
                                    key={unite.unite_id}
                                    control={
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => toggleUnite(detail.id, unite.unite_id)}
                                        size="small"
                                      />
                                    }
                                    label={
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <QrCodeIcon fontSize="small" color="action" />
                                        <Typography
                                          variant="body2"
                                          fontFamily="monospace"
                                          fontWeight={isSelected ? 600 : 400}
                                        >
                                          {unite.numero_de_serie}
                                        </Typography>
                                      </Box>
                                    }
                                    sx={{ ml: 0.5 }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </>
            )}

            <TextField
              label="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
              inputProps={{ maxLength: 255 }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={traitement}>Fermer</Button>
        {peutTraiter && (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={() => traiter("REJETEE")}
              disabled={traitement}
              startIcon={traitement ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              Rejeter
            </Button>
            {isAgentSecondaire && commande.statut === "EN_ATTENTE" && (
              <Button
                variant="outlined"
                color="info"
                onClick={() => traiter("EN_COURS")}
                disabled={traitement}
                startIcon={traitement ? <CircularProgress size={16} /> : <HourglassEmptyIcon />}
              >
                Pré-valider
              </Button>
            )}
            {isAgentPrincipal && commande.statut === "EN_COURS" && (
              <Button
                variant="contained"
                color="success"
                onClick={() => traiter("VALIDEE")}
                disabled={traitement || !magasinSource}
                startIcon={traitement ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                Valider
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}