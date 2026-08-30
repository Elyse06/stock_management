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
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";

export function MouvementFormModal({ isOpen, onClose, onSuccess }) {
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);
  const [typeMouvement, setTypeMouvement] = useState("ENTREE");
  const [origine, setOrigine] = useState("");
  const [motif, setMotif] = useState("");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([{ article: "", quantite: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setTypeMouvement("ENTREE");
      setOrigine("");
      setMotif("");
      setMagasinSource("");
      setMagasinDestination("");
      setDetails([{ article: "", quantite: 1 }]);
      setError("");

      // Charger les données initiales
      Promise.all([
        apiClient.get("/api/stock/magasins/"),
        apiClient.get("/api/catalogue/articles/"),
      ])
        .then(([magasinsRes, articlesRes]) => {
          setMagasins(magasinsRes.data.results ?? magasinsRes.data);
          setArticles(articlesRes.data.results ?? articlesRes.data);
        })
        .catch(() => setError("Impossible de charger les données initiales."));
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validations
    const hasInvalidArticle = details.some(
      (d) => !d.article || String(d.article).trim() === ""
    );
    if (hasInvalidArticle) {
      return setError("Veuillez sélectionner un article valide pour chaque ligne.");
    }

    if (typeMouvement === "ENTREE" && !magasinDestination) {
      return setError("Le magasin destination est requis.");
    }

    if (typeMouvement === "SORTIE" && !magasinSource) {
      return setError("Le magasin source est requis.");
    }

    if (typeMouvement === "TRANSFERT") {
      if (!magasinSource) return setError("Le magasin source est requis.");
      if (!magasinDestination) return setError("Le magasin destination est requis.");
      if (magasinSource === magasinDestination) {
        return setError("Le magasin source et destination doivent être différents.");
      }
    }

    // Construire le payload
    const payload = {
      type_mouvement: typeMouvement,
      details: details.map((d) => ({
        article: String(d.article),
        quantite: parseInt(d.quantite, 10),
      })),
    };

    if (typeMouvement === "ENTREE") {
      payload.magasin_destination = Number(magasinDestination);
      payload.origine = origine.trim();
    } else if (typeMouvement === "SORTIE") {
      payload.magasin_source = Number(magasinSource);
      payload.motif = motif.trim();
    } else if (typeMouvement === "TRANSFERT") {
      payload.magasin_source = Number(magasinSource);
      payload.magasin_destination = Number(magasinDestination);
    }

    setLoading(true);
    try {
      await apiClient.post("/api/stock/mouvements/", payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || "Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
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
          <Typography variant="h3">Nouveau mouvement de stock</Typography>
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

          {/* Type de mouvement */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Type de mouvement</InputLabel>
            <Select
              value={typeMouvement}
              label="Type de mouvement"
              onChange={(e) => setTypeMouvement(e.target.value)}
            >
              <MenuItem value="ENTREE">Entrée</MenuItem>
              <MenuItem value="SORTIE">Sortie</MenuItem>
              <MenuItem value="TRANSFERT">Transfert</MenuItem>
            </Select>
          </FormControl>

          {/* Origine (ENTREE) */}
          {typeMouvement === "ENTREE" && (
            <TextField
              label="Origine / Provenance"
              value={origine}
              onChange={(e) => setOrigine(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Ex: Fournisseur XYZ, Achat direct..."
              inputProps={{ maxLength: 100 }}
            />
          )}

          {/* Magasin Source (SORTIE / TRANSFERT) */}
          {(typeMouvement === "SORTIE" || typeMouvement === "TRANSFERT") && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Magasin source *</InputLabel>
              <Select
                value={magasinSource}
                label="Magasin source *"
                onChange={(e) => setMagasinSource(e.target.value)}
                required
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
          {(typeMouvement === "ENTREE" || typeMouvement === "TRANSFERT") && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Magasin destination *</InputLabel>
              <Select
                value={magasinDestination}
                label="Magasin destination *"
                onChange={(e) => setMagasinDestination(e.target.value)}
                required
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

          {/* Motif (SORTIE) */}
          {typeMouvement === "SORTIE" && (
            <TextField
              label="Motif de la sortie"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Ex: Affectation agent, Panne, Perte..."
              inputProps={{ maxLength: 255 }}
            />
          )}

          {/* Liste des Articles */}
          <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
            Articles concernés
          </Typography>

          {details.map((row, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                gap: 1,
                mb: 1,
                alignItems: "center",
              }}
            >
              <FormControl sx={{ flex: 3 }}>
                <InputLabel>Article</InputLabel>
                <Select
                  value={row.article}
                  label="Article"
                  onChange={(e) => handleDetailChange(index, "article", e.target.value)}
                  required
                >
                  <MenuItem value="">-- Sélectionner un article --</MenuItem>
                  {articles.map((a) => (
                    <MenuItem key={a.code_article} value={a.code_article}>
                      {a.code_article} - {a.designation}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Qté"
                type="number"
                value={row.quantite}
                onChange={(e) => handleDetailChange(index, "quantite", e.target.value)}
                required
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />

              {details.length > 1 && (
                <IconButton
                  onClick={() => removeDetailRow(index)}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addDetailRow}
            sx={{ mt: 1 }}
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
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}