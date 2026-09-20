import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { CodeChip } from "../../../components/common/CodeChip";
import { EtatBadge } from "../../../components/common/EtatBadge";
import { StatusChip } from "../../../components/common/StatusChip";
import { Person as PersonIcon, Business as BusinessIcon } from "@mui/icons-material";

export function RetourStockModal({ unite, isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const [magasins, setMagasins] = useState([]);
  const [magasinDestination, setMagasinDestination] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMagasinDestination("");
    setMotif("");
    apiClient
      .get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } })
      .then((res) => setMagasins(res.data.results ?? res.data))
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED));
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!magasinDestination) {
      notify.error("Veuillez sélectionner un magasin destination.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(
        `${API_ENDPOINTS.UNITES_ARTICLE}${unite.unite_id}/retourner-stock/`,
        {
          magasin_destination: Number(magasinDestination),
          motif: motif.trim(),
        }
      );
      notify.success("Unité retournée au stock avec succès.");
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

  if (!unite) return null;

  const beneficiaireNom = unite.employe_attribue_nom || "—";
  const beneficiaireType = unite.beneficiaire_type;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Typography variant="h6">Retour au stock</Typography>
        <Typography variant="caption" color="text.secondary">
          Unité #{unite.unite_id}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 2, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Article</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <CodeChip value={unite.article_code} />
                <Typography variant="body2">{unite.article_designation}</Typography>
              </Box>
            </Box>
            {unite.numero_de_serie && (
              <Box>
                <Typography variant="caption" color="text.secondary">N° Série</Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                  {unite.numero_de_serie}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">État</Typography>
              <Box sx={{ mt: 0.5 }}>
                <EtatBadge etat={unite.etat} />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Bénéficiaire</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                {beneficiaireType === "EMPLOYE" ? (
                  <PersonIcon fontSize="small" color="primary" />
                ) : (
                  <BusinessIcon fontSize="small" color="secondary" />
                )}
                <Typography variant="body2">{beneficiaireNom}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }} required>
          <InputLabel>Magasin destination</InputLabel>
          <Select
            value={magasinDestination}
            label="Magasin destination"
            onChange={(e) => setMagasinDestination(e.target.value)}
          >
            <MenuItem value="" disabled>
              Sélectionner un magasin...
            </MenuItem>
            {magasins.map((m) => (
              <MenuItem key={m.magasin_id} value={m.magasin_id}>
                {m.magasin_nom}
                {m.localite_nom ? ` (${m.localite_nom})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Motif du retour (optionnel)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          fullWidth
          multiline
          rows={2}
          inputProps={{ maxLength: 255 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !magasinDestination}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          Confirmer le retour
        </Button>
      </DialogActions>
    </Dialog>
  );
}