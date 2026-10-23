import { Box, Paper, Typography } from "@mui/material";
import { LocalShipping as LivraisonIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { BoutonPdf } from "@/components/table/BoutonPdf";
import { API_ENDPOINTS } from "@/config/endpoints";
import { formatDateTime } from "@/utils/formatters";

import { livraisonsCommande } from "../api/commandesApi";
import { TITRE_ACCUSE } from "../utils/fiche";

/**
 * Livraisons d'une commande (une sortie de stock par validation, partielle ou finale), chacune avec
 * son accusé de réception. Affiché quand la commande a été livrée au moins en partie.
 */
export function LivraisonsCommande({ commande }) {
  const id = commande.commande_id;
  const { data: livraisons = [] } = useQuery({
    queryKey: ["commandes", "livraisons", id],
    queryFn: ({ signal }) => livraisonsCommande(id, { signal }),
  });
  if (!livraisons.length) return null;
  const plusieurs = livraisons.length > 1;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>Livraisons</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {livraisons.map((lv) => (
          <Paper key={lv.mouvement_id} variant="outlined" sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
            <LivraisonIcon fontSize="small" color="primary" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                Livraison n°{lv.numero} · {formatDateTime(lv.date)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Number(lv.quantite)} unité(s) remise(s){lv.realise_par ? ` · par ${lv.realise_par}` : ""}
              </Typography>
            </Box>
            <BoutonPdf
              url={`${API_ENDPOINTS.COMMANDES}${id}/pdf/?livraison=${lv.mouvement_id}`}
              nomFichier={`accuse_reception_commande_${id}${plusieurs ? `_livraison_${lv.numero}` : ""}.pdf`}
              titre={`${TITRE_ACCUSE} — livraison n°${lv.numero}`}
            />
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
