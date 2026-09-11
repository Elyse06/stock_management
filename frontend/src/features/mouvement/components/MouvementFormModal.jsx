import { useState, useEffect } from "react";
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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  SwapHoriz as SwapHorizIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { SaisieRapideNumerosSerie } from "./SaisieRapideNumerosSerie";

const TYPES_MANUELS = [
  {
    value: "ENTREE",
    label: "Entrée de stock",
    icon: <LoginIcon fontSize="small" />,
  },
  {
    value: "TRANSFERT",
    label: "Transfert entre magasins",
    icon: <SwapHorizIcon fontSize="small" />,
  },
];

export function MouvementFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedArticle = null,
  preselectedQuantite = null,
}) {
  const { hasAnyAction } = useAuth();
  const canCreate = hasAnyAction("INV_GERE", "CAT_GERE");

  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]); // ✅ Nouveau
  const [typeMouvement, setTypeMouvement] = useState("ENTREE");
  const [origine, setOrigine] = useState("");
  const [motif, setMotif] = useState("");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([
    { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // États pour la modale de saisie rapide
  const [saisieRapideOpen, setSaisieRapideOpen] = useState(false);
  const [saisieRapideDetailIndex, setSaisieRapideDetailIndex] = useState(null);

  const getArticle = (codeArticle) =>
    articles.find((a) => a.code_article === codeArticle);

  const isModeNumeroSerie = (codeArticle) => {
    const article = getArticle(codeArticle);
    return article?.mode_suivi === "NUMERO_SERIE";
  };

  useEffect(() => {
    if (!isOpen) return;
    setTypeMouvement("ENTREE");
    setOrigine("");
    setMotif("");
    setMagasinSource("");
    setMagasinDestination("");

    if (preselectedArticle) {
      setDetails([
        {
          article: preselectedArticle,
          quantite: preselectedQuantite || 1,
          numeros_de_serie: [],
          fournisseur: "",
        },
      ]);
    } else {
      setDetails([
        { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "" },
      ]);
    }
    setError("");

    Promise.all([
      apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
      apiClient.get("/api/catalogue/articles/", { params: { page_size: 500 } }),
      apiClient.get("/api/catalogue/fournisseurs/", {
        params: { page_size: 100 },
      }), // ✅ Chargement des fournisseurs
    ])
      .then(([magasinsRes, articlesRes, fournisseursRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setFournisseurs(fournisseursRes.data.results ?? fournisseursRes.data);
      })
      .catch(() => setError("Impossible de charger les données initiales."));
  }, [isOpen, preselectedArticle, preselectedQuantite]);

  const handleDetailChange = (index, field, value) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };

    // ✅ Si on change l'article, réinitialiser les numéros de série
    if (field === "article") {
      updated[index].numeros_de_serie = [];
      // Si le nouvel article est en mode NUMERO_SERIE, forcer quantite = nombre de NS saisis
      if (isModeNumeroSerie(value)) {
        updated[index].quantite = updated[index].numeros_de_serie.length || 1;
      }
    }

    setDetails(updated);
  };

  // ✅ Gestion des numéros de série (un par ligne)
  const handleNumeroSerieChange = (detailIndex, nsIndex, value) => {
    const updated = [...details];
    const numeros = [...updated[detailIndex].numeros_de_serie];
    numeros[nsIndex] = value;
    updated[detailIndex].numeros_de_serie = numeros;
    // ✅ La quantité = nombre de numéros de série saisis (non vides)
    updated[detailIndex].quantite = numeros.filter((ns) => ns.trim()).length;
    setDetails(updated);
  };

  const addNumeroSerieRow = (detailIndex) => {
    const updated = [...details];
    updated[detailIndex].numeros_de_serie = [
      ...updated[detailIndex].numeros_de_serie,
      "",
    ];
    setDetails(updated);
  };

  const removeNumeroSerieRow = (detailIndex, nsIndex) => {
    const updated = [...details];
    const numeros = updated[detailIndex].numeros_de_serie.filter(
      (_, i) => i !== nsIndex,
    );
    updated[detailIndex].numeros_de_serie = numeros;
    updated[detailIndex].quantite = numeros.filter((ns) => ns.trim()).length;
    setDetails(updated);
  };

  const ouvrirSaisieRapide = (detailIndex) => {
    setSaisieRapideDetailIndex(detailIndex);
    setSaisieRapideOpen(true);
  };

  const handleSaisieRapideSubmit = (nouveauxNumeros) => {
    if (saisieRapideDetailIndex === null) return;

    const updated = [...details];
    const detail = updated[saisieRapideDetailIndex];

    const existantsSet = new Set(
      detail.numeros_de_serie.map((n) => n.toLowerCase()),
    );
    const nouveauxFiltres = nouveauxNumeros.filter(
      (n) => !existantsSet.has(n.toLowerCase()),
    );

    detail.numeros_de_serie = [...detail.numeros_de_serie, ...nouveauxFiltres];
    // Recalculer la quantité
    detail.quantite = detail.numeros_de_serie.filter((ns) => ns.trim()).length;

    setDetails(updated);
    setSaisieRapideOpen(false);
    setSaisieRapideDetailIndex(null);
  };

  const addDetailRow = () => {
    setDetails([
      ...details,
      { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "" },
    ]);
  };

  const removeDetailRow = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  const valider = () => {
    const hasInvalidArticle = details.some(
      (d) => !d.article || String(d.article).trim() === "",
    );
    if (hasInvalidArticle) {
      return "Veuillez sélectionner un article valide pour chaque ligne.";
    }

    // ✅ Validation des numéros de série
    for (const detail of details) {
      if (isModeNumeroSerie(detail.article)) {
        const numerosValides = detail.numeros_de_serie.filter((ns) =>
          ns.trim(),
        );
        if (numerosValides.length === 0) {
          return `Veuillez saisir au moins un numéro de série pour "${
            getArticle(detail.article)?.designation
          }".`;
        }
        // Vérifier les doublons
        const uniqueNumeros = new Set(
          numerosValides.map((ns) => ns.trim().toLowerCase()),
        );
        if (uniqueNumeros.size !== numerosValides.length) {
          return `Numéros de série en doublon pour "${
            getArticle(detail.article)?.designation
          }".`;
        }
      } else {
        // Mode QUANTITE : validation classique
        if (!detail.quantite || Number(detail.quantite) <= 0) {
          return `Quantité invalide pour "${
            getArticle(detail.article)?.designation
          }".`;
        }
      }
    }

    if (typeMouvement === "ENTREE" && !magasinDestination) {
      return "Le magasin destination est requis pour une entrée.";
    }
    if (typeMouvement === "TRANSFERT") {
      if (!magasinSource)
        return "Le magasin source est requis pour un transfert.";
      if (!magasinDestination)
        return "Le magasin destination est requis pour un transfert.";
      if (magasinSource === magasinDestination) {
        return "Le magasin source et destination doivent être différents.";
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const erreur = valider();
    if (erreur) {
      setError(erreur);
      return;
    }

    const payload = {
      type_mouvement: typeMouvement,
      details: details.map((d) => {
        const detailPayload = {
          article: String(d.article),
          quantite: parseInt(d.quantite, 10),
        };
        // ✅ Ajouter les numéros de série si l'article est en mode NUMERO_SERIE
        if (isModeNumeroSerie(d.article)) {
          detailPayload.numeros_de_serie = d.numeros_de_serie
            .filter((ns) => ns.trim())
            .map((ns) => ns.trim());
        }
        // ✅ Ajouter le fournisseur si renseigné (uniquement pour les entrées)
        if (typeMouvement === "ENTREE" && d.fournisseur) {
          detailPayload.fournisseur = Number(d.fournisseur);
        }
        return detailPayload;
      }),
    };

    if (typeMouvement === "ENTREE") {
      payload.magasin_destination = Number(magasinDestination);
      if (origine.trim()) payload.origine = origine.trim();
    } else if (typeMouvement === "TRANSFERT") {
      payload.magasin_source = Number(magasinSource);
      payload.magasin_destination = Number(magasinDestination);
    }

    setLoading(true);
    try {
      await apiClient.post("/api/stock/mouvements/", payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | "),
        );
      } else {
        setError("Erreur lors de l'enregistrement du mouvement.");
      }
    } finally {
      setLoading(false);
    }
  };

  const titre =
    typeMouvement === "ENTREE"
      ? "Nouvelle entrée de stock"
      : "Nouveau transfert";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
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
          <Typography variant="h3">{titre}</Typography>
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
          {preselectedArticle && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Article pré-sélectionné : <strong>{preselectedArticle}</strong>
              {preselectedQuantite &&
                ` — Quantité suggérée : ${preselectedQuantite}`}
            </Alert>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Type de mouvement</InputLabel>
            <Select
              value={typeMouvement}
              label="Type de mouvement"
              onChange={(e) => setTypeMouvement(e.target.value)}
            >
              {TYPES_MANUELS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {t.icon}
                    <span>{t.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {typeMouvement === "ENTREE" && (
            <TextField
              label="Origine (optionnel)"
              value={origine}
              onChange={(e) => setOrigine(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Ex: Réapprovisionnement, Ajustement..."
              inputProps={{ maxLength: 100 }}
            />
          )}
          {typeMouvement === "TRANSFERT" && (
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Magasin source *</InputLabel>
              <Select
                value={magasinSource}
                label="Magasin source *"
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
          )}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Magasin destination *</InputLabel>
            <Select
              value={magasinDestination}
              label="Magasin destination *"
              onChange={(e) => setMagasinDestination(e.target.value)}
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

          <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
            Articles concernés
          </Typography>
          <Table
            size="small"
            sx={{
              mb: 2,
              border: "1px solid #E0E0E0",
              "& .MuiTableCell-root": {
                borderColor: "#E0E0E0",
                py: 1,
                px: 1.5,
              },
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
                <TableCell align="center" sx={{ width: 120 }}>
                  Quantité
                </TableCell>
                <TableCell sx={{ minWidth: 250 }}>Numéros de série</TableCell>
                {/* ✅ Colonne Fournisseur (uniquement pour les entrées) */}
                {typeMouvement === "ENTREE" && (
                  <TableCell sx={{ minWidth: 180 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <BusinessIcon fontSize="small" />
                      Fournisseur
                    </Box>
                  </TableCell>
                )}
                <TableCell align="center" sx={{ width: 60 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map((row, index) => {
                const article = getArticle(row.article);
                const modeNS = article?.mode_suivi === "NUMERO_SERIE";

                return (
                  <TableRow
                    key={index}
                    sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}
                  >
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={row.article}
                          onChange={(e) =>
                            handleDetailChange(index, "article", e.target.value)
                          }
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            -- Sélectionner un article --
                          </MenuItem>
                          {articles.map((a) => (
                            <MenuItem
                              key={a.code_article}
                              value={a.code_article}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <span>
                                  {a.code_article} - {a.designation}
                                </span>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      {modeNS ? (
                        <Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<QrCodeScannerIcon />}
                            onClick={() => ouvrirSaisieRapide(index)}
                            sx={{ mb: 1, width: "100%" }}
                          >
                            Saisie rapide ({row.numeros_de_serie.length})
                          </Button>
                        </Box>
                      ) : (
                        <TextField
                          type="number"
                          size="small"
                          value={row.quantite}
                          onChange={(e) =>
                            handleDetailChange(index, "quantite", e.target.value)
                          }
                          inputProps={{ min: 1 }}
                          sx={{ width: 100 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {modeNS ? (
                        <Box>
                          {row.numeros_de_serie.map((ns, nsIndex) => (
                            <Box
                              key={nsIndex}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 0.5,
                              }}
                            >
                              <QrCodeIcon fontSize="small" color="action" />
                              <TextField
                                size="small"
                                value={ns}
                                onChange={(e) =>
                                  handleNumeroSerieChange(
                                    index,
                                    nsIndex,
                                    e.target.value,
                                  )
                                }
                                placeholder={`N° série ${nsIndex + 1}`}
                                sx={{ flex: 1 }}
                                inputProps={{ maxLength: 100 }}
                              />
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  removeNumeroSerieRow(index, nsIndex)
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => addNumeroSerieRow(index)}
                            sx={{ mt: 0.5 }}
                          >
                            Ajouter N° série
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    {/* ✅ Cellule Fournisseur (uniquement pour les entrées) */}
                    {typeMouvement === "ENTREE" && (
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={row.fournisseur}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "fournisseur",
                                e.target.value,
                              )
                            }
                            displayEmpty
                          >
                            <MenuItem value="" disabled>
                              -- Sélectionner --
                            </MenuItem>
                            {fournisseurs.map((f) => (
                              <MenuItem
                                key={f.fournisseur_id}
                                value={f.fournisseur_id}
                              >
                                {f.nom}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    )}
                    <TableCell align="center">
                      {details.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeDetailRow(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addDetailRow}
            size="small"
          >
            Ajouter une ligne
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !canCreate}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </form>

      {/* ✅ MODALE DE SAISIE RAPIDE */}
      <SaisieRapideNumerosSerie
        isOpen={saisieRapideOpen}
        onClose={() => {
          setSaisieRapideOpen(false);
          setSaisieRapideDetailIndex(null);
        }}
        onSubmit={handleSaisieRapideSubmit}
        numerosExistant={
          saisieRapideDetailIndex !== null
            ? (details[saisieRapideDetailIndex]?.numeros_de_serie ?? [])
            : []
        }
        quantiteRequise={
          saisieRapideDetailIndex !== null
            ? (details[saisieRapideDetailIndex]?.quantite ?? 0)
            : 0
        }
        articleDesignation={
          saisieRapideDetailIndex !== null
            ? (getArticle(details[saisieRapideDetailIndex]?.article)
                ?.designation ?? "")
            : ""
        }
      />
    </Dialog>
  );
}
