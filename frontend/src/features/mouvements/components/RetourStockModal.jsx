import { useEffect, useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { SelectFilter } from "@/components/forms/SelectFilter";
import { toOptions, useMagasins } from "@/hooks/useReferenceData";

import { retournerUnite } from "../api/mouvementsApi";
import { useUniteAction } from "../hooks/useUniteAction";

import { UniteResume } from "./UniteResume";

/** Retour d'une unité attribuée vers un magasin. */
export function RetourStockModal({ unite, isOpen, onClose, onSuccess }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: magasins = [] } = useMagasins({ enabled: isOpen });
  const [magasin, setMagasin] = useState("");
  const [motif, setMotif] = useState("");
  const retour = useUniteAction((payload) => retournerUnite(unite.unite_id, payload), "Unité retournée au stock avec succès.", onSuccess);

  useEffect(() => {
    if (!isOpen) return;
    setMagasin("");
    setMotif("");
  }, [isOpen]);

  if (!unite) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}>
        <Typography variant="h6" component="span" sx={{ display: "block" }}>
          Retour au stock
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Unité #{unite.unite_id}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <UniteResume unite={unite} />
        <SelectFilter
          label="Magasin destination"
          value={magasin}
          onChange={setMagasin}
          options={toOptions(magasins, (m) => m.magasin_id, (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`, "Sélectionner un magasin...")}
          required
          size="medium"
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Motif du retour (optionnel)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={retour.isPending}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => retour.mutate({ magasin_destination: Number(magasin), motif: motif.trim() })}
          disabled={retour.isPending || !magasin}
          startIcon={retour.isPending ? <CircularProgress size={16} /> : null}
        >
          Confirmer le retour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
