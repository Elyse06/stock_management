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
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const TYPES_MANUELS = [
  { value: "ENTREE", label: "Entrée de stock", icon: <LoginIcon fontSize="small" /> },
  { value: "TRANSFERT", label: "Transfert entre magasins", icon: <SwapHorizIcon fontSize="small" /> },
];

export function MouvementFormModal({ isOpen, onClose, onSuccess }) {
  const { hasAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('INV_GERE');
  const canCreate = true;

  // ====== DONNÉES DE RÉFÉRENCE ======
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);

  // ====== FORMULAIRE ======
  const [typeMouvement, setTypeMouvement] = useState("ENTREE");
  const [origine, setOrigine] = useState("");
  const [motif, setMotif] = useState(""); // Non utilisé actuellement mais conservé pour extension future
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([{ article: "", quantite: 1 }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ====== CHARGEMENT DES DONNÉES ======
  useEffect(() => {
    if (!isOpen) return;

    // Reset du formulaire
    setTypeMouvement("ENTREE");
    setOrigine("");
    setMotif("");
    setMagasinSource("");
    setMagasinDestination("");
    setDetails([{ article: "", quantite: 1 }]);
    setError("");

    Promise.all([
      apiClient.get("/api/stock/magasins/", { params: { page_size: 100 } }),
      apiClient.get("/api/catalogue/articles/", { params: { page_size: 500 } }),
    ])
      .then(([magasinsRes, articlesRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setArticles(articlesRes.data.results ?? articlesRes.data);
      })
      .catch(() => setError("Impossible de charger les données initiales."));
  }, [isOpen]);

  // ====== GESTION DES LIGNES ======
  const handleDetailChange = (index, field, value) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  const addDetailRow = () => {
    setDetails([...details, { article: "", quantite: 1 }]);
  };

  const removeDetailRow = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

  // ====== VALIDATION ======
  const valider = () => {
    const hasInvalidArticle = details.some(
      (d) => !d.article || String(d.article).trim() === ""
    );
    if (hasInvalidArticle) {
      return "Veuillez sélectionner un article valide pour chaque ligne.";
    }

    const hasInvalidQuantite = details.some(
      (d) => !d.quantite || Number(d.quantite) <= 0
    );
    if (hasInvalidQuantite) {
      return "Veuillez saisir une quantité valide pour chaque ligne.";
    }

    if (typeMouvement === "ENTREE" && !magasinDestination) {
      return "Le magasin destination est requis pour une entrée.";
    }

    if (typeMouvement === "TRANSFERT") {
      if (!magasinSource) return "Le magasin source est requis pour un transfert.";
      if (!magasinDestination) return "Le magasin destination est requis pour un transfert.";
      if (magasinSource === magasinDestination) {
        return "Le magasin source et destination doivent être différents.";
      }
    }

    return null;
  };

  // ====== ENREGISTREMENT ======
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
      details: details.map((d) => ({
        article: String(d.article),
        quantite: parseInt(d.quantite, 10),
      })),
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
            .join(" | ")
        );
      } else {
        setError("Erreur lors de l'enregistrement du mouvement.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== TITRE DYNAMIQUE ======
  const titre =
    typeMouvement === "ENTREE" ? "Nouvelle entrée de stock" : "Nouveau transfert";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
        {/* ====== HEADER ====== */}
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

        {/* ====== BODY ====== */}
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Type de mouvement */}
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

          {/* Origine (ENTREE uniquement) */}
          {typeMouvement === "ENTREE" && (
            <TextField
              label="Origine / Provenance (optionnel)"
              value={origine}
              onChange={(e) => setOrigine(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Ex: Fournisseur XYZ, Achat direct..."
              inputProps={{ maxLength: 100 }}
            />
          )}

          {/* Magasin Source (TRANSFERT uniquement) */}
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
                    {m.magasin_nom} {m.localite ? `(${m.localite})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Magasin Destination (ENTREE / TRANSFERT) */}
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
                  {m.magasin_nom} {m.localite ? `(${m.localite})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ====== LISTE DES ARTICLES ====== */}
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
                <TableCell align="center" sx={{ width: 60 }}>
                  {/* Actions */}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map((row, index) => (
                <TableRow key={index} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
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
                          <MenuItem key={a.code_article} value={a.code_article}>
                            {a.code_article} - {a.designation} (stock:{" "}
                            {a.stock_calcule ?? 0})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
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
                  </TableCell>
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
              ))}
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

        {/* ====== FOOTER ====== */}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !canCreate}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
            }
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}