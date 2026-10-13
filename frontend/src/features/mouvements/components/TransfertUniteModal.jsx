import { useEffect, useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { BeneficiairePicker } from "@/components/forms/BeneficiairePicker";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { toOptions, useMagasins } from "@/hooks/useReferenceData";
import { beneficiairePayload, CHAMPS_TRANSFERT } from "@/utils/beneficiaire";

import { transfererUnite } from "../api/mouvementsApi";
import { useUniteAction } from "../hooks/useUniteAction";

import { UniteResume } from "./UniteResume";

const VIDE = { type: "EMPLOYE", item: null };

/** Transfert d'une unité attribuée vers un nouveau bénéficiaire. */
export function TransfertUniteModal({ unite, isOpen, onClose, onSuccess }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: magasins = [] } = useMagasins({ enabled: isOpen });
  const [beneficiaire, setBeneficiaire] = useState(VIDE);
  const [magasinSource, setMagasinSource] = useState("");
  const [motif, setMotif] = useState("");
  const transfert = useUniteAction((payload) => transfererUnite(unite.unite_id, payload), "Unité transférée avec succès.", onSuccess);

  useEffect(() => {
    if (!isOpen) return;
    setBeneficiaire(VIDE);
    setMagasinSource("");
    setMotif("");
  }, [isOpen]);

  if (!unite) return null;

  const valide = magasinSource && beneficiaire.item;

  const confirmer = () =>
    transfert.mutate({
      magasin_source: Number(magasinSource),
      motif: motif.trim(),
      ...beneficiairePayload(beneficiaire, CHAMPS_TRANSFERT),
    });

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}>
        <Typography variant="h6" component="span" sx={{ display: "block" }}>
          Transfert d'unité
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Unité #{unite.unite_id}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <UniteResume unite={unite} />
        <SelectFilter
          label="Magasin source"
          value={magasinSource}
          onChange={setMagasinSource}
          options={toOptions(magasins, (m) => m.magasin_id, (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`, "Sélectionner un magasin...")}
          required
          size="medium"
          fullWidth
          sx={{ mb: 2 }}
        />
        <BeneficiairePicker value={beneficiaire} onChange={setBeneficiaire} required />
        <TextField
          label="Motif du transfert (optionnel)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 255 } }}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={transfert.isPending}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={confirmer}
          disabled={transfert.isPending || !valide}
          startIcon={transfert.isPending ? <CircularProgress size={16} /> : null}
        >
          Confirmer le transfert
        </Button>
      </DialogActions>
    </Dialog>
  );
}
