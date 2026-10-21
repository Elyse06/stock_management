import { Fragment, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import { Close as CloseIcon, Print as PrintIcon } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { printElement } from "@/utils/print";

import { codeEtiquette, CSS_IMPRESSION, getContenuQR, siteParDefaut, verifierEtiquette } from "../utils/etiquette";

const champsInitiaux = (unite) => ({
  beneficiaire: unite?.employe_attribue_nom || (unite?.statut === "EN_STOCK" ? "En stock" : ""),
  site: siteParDefaut(unite),
  categorie: unite?.article_categorie ?? "",
  designation: unite?.article_designation ?? "",
  date: unite?.date_etiquette ?? "",
  numero: unite?.numero_immobilisation ?? "",
});

function ApercuEtiquette({ champs, refEtiquette }) {
  const morceaux = codeEtiquette(champs).split("/");
  return (
    <Box ref={refEtiquette} className="etiquette"
      sx={{ display: "inline-flex", maxWidth: "100%", boxSizing: "border-box", gap: { xs: 2, sm: 3 }, alignItems: "center", px: 2, py: 1.5,
        bgcolor: "#FFF", border: "1px dashed #98A2B3", borderRadius: 1, fontFamily: "Arial, Helvetica, sans-serif", color: "#000",
        // QR code plus petit sur téléphone pour laisser la place au texte (à l'impression : 30 mm).
        "& svg": { width: { xs: 84, sm: 112 }, height: { xs: 84, sm: 112 } } }}>
      <Box className="code" sx={{ flex: "0 1 auto", fontSize: { xs: 14, sm: 16 }, lineHeight: 1.3 }}>
        {morceaux.map((morceau, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={i}>
            {morceau}
            {i < morceaux.length - 1 && <>/<wbr /></>}
          </Fragment>
        ))}
      </Box>
      <QRCodeSVG value={getContenuQR(champs)} size={112} level="M" marginSize={1} style={{ flexShrink: 0 }} />
    </Box>
  );
}

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
    const manquants = verifierEtiquette(champs);
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
      printElement(etiquetteRef.current, { title: `Étiquette ${codeEtiquette(champs)}`, css: CSS_IMPRESSION });
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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {champ("beneficiaire", "Bénéficiaire", { required: true })}
            {champ("site", "Site", { required: true})}
            {champ("categorie", "Catégorie", { required: true})}
            {champ("designation", "Désignation")}
            {champ("date", "Date", { type: "date", required: true, slotProps: { inputLabel: { shrink: true } } })}
            {champ("numero", "N° immobilisation", { required: true, slotProps: { htmlInput: { maxLength: 50 } } })}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>Aperçu</Typography>
            <ApercuEtiquette champs={champs} refEtiquette={etiquetteRef} />
            <Box component="pre" aria-label="Contenu du QR code"
              sx={{ m: 0, p: 1.25, bgcolor: "#F5F7FA", border: "1px solid #E3E9F1", borderRadius: 1, fontSize: 12, lineHeight: 1.5,
                fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", maxWidth: 440 }}>
              {getContenuQR(champs)}
            </Box>
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
