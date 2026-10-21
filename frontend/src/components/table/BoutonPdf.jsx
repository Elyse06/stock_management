import { useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { PictureAsPdf as PdfIcon } from "@mui/icons-material";

import { useNotification } from "@/hooks/useNotification";
import { getErrorMessage } from "@/lib/api/errors";
import { telechargerFichier } from "@/utils/telechargement";

/** Bouton de téléchargement d'une fiche PDF générée par l'API. */
export function BoutonPdf({ url, nomFichier, titre = "Télécharger la fiche PDF" }) {
  const notify = useNotification();
  const [encours, setEncours] = useState(false);
  const telecharger = async (e) => {
    e.stopPropagation();
    setEncours(true);
    try {
      await telechargerFichier(url, nomFichier);
    } catch (err) {
      notify.error(getErrorMessage(err, "Impossible de télécharger la fiche."));
    } finally {
      setEncours(false);
    }
  };
  return (
    <Tooltip title={titre}>
      <span>
        <IconButton size="small" aria-label={titre} onClick={telecharger} disabled={encours} sx={{ color: "#B42318" }}>
          {encours ? <CircularProgress size={16} /> : <PdfIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
