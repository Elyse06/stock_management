import { useRef } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon, Print as PrintIcon } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";

import { printElement } from "@/utils/print";

import { CSS_IMPRESSION, genererCodeEtiquette, getContenuQR } from "../utils/etiquette";

/** Aperçu et impression de l'étiquette QR d'une unité. */
export function EtiquetteModal({ unite, isOpen, onClose }) {
  const etiquetteRef = useRef(null);
  if (!unite) return null;

  const code = genererCodeEtiquette(unite);
  const contenuQR = getContenuQR(unite);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="span">
          Étiquette - Unité #{unite.unite_id}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Fermer">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box ref={etiquetteRef} className="etiquette" sx={{ p: 3, border: "2px solid #000", borderRadius: 1, bgcolor: "#FFF", textAlign: "center" }}>
          <QRCodeSVG value={contenuQR} size={150} level="M" marginSize={4} style={{ display: "inline-block" }} />
          <Typography className="code-etiquette" variant="body2" sx={{ mt: 2, fontWeight: 700, fontSize: 13, wordBreak: "break-all", fontFamily: "monospace" }}>
            {code}
          </Typography>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Contenu du QR Code :
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "pre-line" }}>
            {contenuQR}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => printElement(etiquetteRef.current, { title: `Étiquette ${code}`, css: CSS_IMPRESSION })}
        >
          Imprimer l'étiquette
        </Button>
      </DialogActions>
    </Dialog>
  );
}
