import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";

import { BeneficiairePicker } from "@/components/forms/BeneficiairePicker";
import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage } from "@/lib/api/errors";
import { beneficiairePayload, CHAMPS_TRANSFERT } from "@/utils/beneficiaire";

import { creerDemande, DEMANDES_KEY } from "../../api/demandesUnitesApi";

const VIDE = { type: "EMPLOYE", item: null };

export function DemandeUniteModal({ type, unites, isOpen, onClose, onTermine }) {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [motif, setMotif] = useState("");
  const [beneficiaire, setBeneficiaire] = useState(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [echecs, setEchecs] = useState([]);
  const transfert = type === "TRANSFERT";

  useEffect(() => {
    if (!isOpen) return;
    setMotif("");
    setBeneficiaire(VIDE);
    setEchecs([]);
  }, [isOpen]);

  const envoyer = async () => {
    setEnvoi(true);
    const erreurs = [];
    let reussies = 0;
    for (const unite of unites) {
      try {
        await creerDemande({
          unite_id: unite.unite_id, type_demande: type, motif: motif.trim(),
          ...(transfert ? beneficiairePayload(beneficiaire, CHAMPS_TRANSFERT) : {}),
        });
        reussies += 1;
      } catch (err) {
        erreurs.push({ unite, message: getErrorMessage(err, "Demande refusée.") });
      }
    }
    setEnvoi(false);
    queryClient.invalidateQueries({ queryKey: DEMANDES_KEY });
    if (reussies) notify.success(`${reussies} demande(s) envoyée(s) au gestionnaire du stock.`);
    if (erreurs.length) setEchecs(erreurs);
    else onTermine?.();
  };

  return (
    <Dialog open={isOpen} onClose={envoi ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}>
        {transfert ? "Demander un transfert" : "Demander un retour en stock"}
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {unites.length > 1 ? `${unites.length} unités concernées (une demande par unité)` : "Unité concernée"}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2.5 }}>
          {unites.map((u) => (
            <Chip key={u.unite_id} size="small" label={`${u.article_designation}${u.numero_de_serie ? ` · ${u.numero_de_serie}` : ""}`} />
          ))}
        </Box>
        {transfert && (
          <Box sx={{ mb: 2.5 }}>
            <BeneficiairePicker value={beneficiaire} onChange={setBeneficiaire} label="Nouveau bénéficiaire proposé" required />
          </Box>
        )}
        <TextField fullWidth multiline minRows={2} label="Motif" value={motif} onChange={(e) => setMotif(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }} />
        {echecs.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {echecs.map(({ unite, message }) => (
              <div key={unite.unite_id}><strong>{unite.article_designation}</strong>{unite.numero_de_serie ? ` (${unite.numero_de_serie})` : ""} : {message}</div>
            ))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={envoi} color="inherit">{echecs.length ? "Fermer" : "Annuler"}</Button>
        {!echecs.length && (
          <Button variant="contained" onClick={envoyer} disabled={envoi || (transfert && !beneficiaire.item)}>
            {envoi ? <CircularProgress size={20} color="inherit" /> : "Envoyer la demande"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
