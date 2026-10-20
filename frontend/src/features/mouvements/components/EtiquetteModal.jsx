import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import { Close as CloseIcon, Print as PrintIcon } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { libelleCategorie } from "@/constants/articles";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { printElement } from "@/utils/print";

import { CHAMPS_ETIQUETTE, CSS_IMPRESSION, getContenuQR, valeursImprimees } from "../utils/etiquette";

const champsInitiaux = (unite) => ({
  categorie: libelleCategorie(unite?.article_categorie, unite?.article_categorie_description),
  designation: unite?.article_designation ?? "",
  beneficiaire: unite?.employe_attribue_nom || (unite?.statut === "EN_STOCK" ? "En stock" : ""),
  date: unite?.date_etiquette ?? "",
  numero: unite?.numero_immobilisation ?? "",
});

/** Aperçu de l'étiquette telle qu'elle sera imprimée : QR code et les cinq champs. */
function ApercuEtiquette({ champs, refEtiquette }) {
  const valeurs = valeursImprimees(champs);
  return (
    <Box ref={refEtiquette} className="etiquette"
      sx={{ display: "flex", gap: 1.5, alignItems: "center", p: 1.5, border: "2px solid #000", borderRadius: 1.5, bgcolor: "#FFF", maxWidth: 420 }}>
      <QRCodeSVG value={getContenuQR(champs)} size={112} level="M" marginSize={1} style={{ flexShrink: 0 }} />
      <Box className="champs" sx={{ flex: 1, minWidth: 0 }}>
        {CHAMPS_ETIQUETTE.map(({ cle, libelle }) => (
          <Box key={cle} className="ligne" sx={{ fontSize: 12.5, lineHeight: 1.4 }}>
            <span className="libelle" style={{ color: "#555" }}>{libelle} : </span>
            <span className={`valeur${cle === "numero" ? " numero" : ""}`}
              style={{ fontWeight: 700, fontFamily: cle === "numero" ? "monospace" : undefined, wordBreak: "break-word" }}>
              {valeurs[cle] || "—"}
            </span>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Étiquette d'une unité : catégorie, désignation et bénéficiaire pré-remplis (modifiables pour
 * l'impression), date et n° d'immobilisation à saisir. Ces deux derniers sont enregistrés sur
 * l'unité avant l'impression, et pré-remplis la fois suivante.
 */
export function EtiquetteModal({ unite, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const etiquetteRef = useRef(null);
  const [champs, setChamps] = useState(() => champsInitiaux(unite));
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChamps(champsInitiaux(unite));
      setErreurs({});
      setErreurGenerale("");
    }
  }, [isOpen, unite]);

  if (!unite) return null;

  const modifier = (cle) => (e) => {
    setChamps((c) => ({ ...c, [cle]: e.target.value }));
    setErreurs((er) => ({ ...er, [cle]: undefined }));
  };

  const imprimer = async () => {
    const manquants = {};
    if (!champs.date) manquants.date = "Saisissez la date.";
    if (!champs.numero.trim()) manquants.numero = "Saisissez le n° d'immobilisation.";
    if (Object.keys(manquants).length) return setErreurs(manquants);
    setEnvoi(true);
    setErreurGenerale("");
    try {
      if (champs.date !== (unite.date_etiquette ?? "") || champs.numero.trim() !== (unite.numero_immobilisation ?? "")) {
        await apiClient.post(`${API_ENDPOINTS.UNITES_ARTICLE}${unite.unite_id}/etiquette/`, {
          numero_immobilisation: champs.numero.trim(), date_etiquette: champs.date,
        });
        queryClient.invalidateQueries({ queryKey: ["unites"] });
      }
      printElement(etiquetteRef.current, { title: `Étiquette ${champs.numero.trim()}`, css: CSS_IMPRESSION });
    } catch (err) {
      setErreurGenerale(getErrorMessage(err, "Impossible d'enregistrer les informations de l'étiquette."));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (cle, label, extra = {}) => (
    <TextField fullWidth size="small" label={label} value={champs[cle]} onChange={modifier(cle)}
      error={Boolean(erreurs[cle])} helperText={erreurs[cle]} {...extra} />
  );

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "tint.main",
        borderBottom: "2px solid", borderColor: "secondary.main" }}>
        <Box>
          <Typography variant="h3" component="span">Étiquette</Typography>
          <Typography variant="body2" color="text.secondary">
            {unite.article_designation}{unite.numero_de_serie ? ` · N° de série ${unite.numero_de_serie}` : ""}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Fermer"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "20px !important" }}>
        {erreurGenerale && <Alert severity="error" sx={{ mb: 2 }}>{erreurGenerale}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">Pré-remplis (modifiables pour l'impression)</Typography>
            {champ("categorie", "Catégorie")}
            {champ("designation", "Désignation")}
            {champ("beneficiaire", "Bénéficiaire")}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>À saisir (enregistrés sur l'unité)</Typography>
            {champ("date", "Date", { type: "date", required: true, slotProps: { inputLabel: { shrink: true } } })}
            {champ("numero", "N° immobilisation", { required: true, slotProps: { htmlInput: { maxLength: 50 } } })}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Aperçu</Typography>
            <ApercuEtiquette champs={champs} refEtiquette={etiquetteRef} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Le QR code contient les mêmes informations que le texte.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={envoi}>Fermer</Button>
        <Button variant="contained" startIcon={envoi ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />} onClick={imprimer} disabled={envoi}>
          Imprimer l'étiquette
        </Button>
      </DialogActions>
    </Dialog>
  );
}
