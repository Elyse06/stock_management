import { Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Close as CloseIcon } from "@mui/icons-material";

import { CodeChip } from "@/components/data-display/CodeChip";
import { StatusChip } from "@/components/data-display/StatusChip";
import { BoutonPdf } from "@/components/table/BoutonPdf";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { toOptions, useMagasins } from "@/hooks/useReferenceData";

import { useTraitementCommande } from "../hooks/useTraitementCommande";
import { peutTelechargerFiche } from "../utils/fiche";

import { CommandeActions } from "./CommandeActions";
import { CommandeArticlesTable } from "./CommandeArticlesTable";
import { CommandeInfoSection } from "./CommandeInfoSection";
import { CommandeProgress } from "./CommandeProgress";
import { CommandeTraitementSection } from "./CommandeTraitementSection";

/** Détail d'une commande ; affiche le traitement si l'utilisateur peut statuer. */
export function CommandeDetailModal({ commande, isOpen, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const t = useTraitementCommande({ commande, isOpen, onDone: onClose });
  const droits = usePermission();
  const peutTraiter = t.peutTraiter(commande);
  const { data: magasins = [] } = useMagasins({ enabled: Boolean(isOpen && peutTraiter) });

  if (!commande) return null;

  const preValidation = t.isAgentSecondaire && commande.statut === "EN_ATTENTE";
  const magasinOptions = toOptions(magasins, (m) => m.magasin_id, (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`, "Sélectionner un magasin");

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 2 } } }}>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h3" component="span">
              {peutTraiter ? "Traitement de la commande" : "Détail de la commande"}
            </Typography>
            <CodeChip value={`#${commande.commande_id}`} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
            <StatusChip status={commande.statut} />
            {peutTraiter && (
              <Chip
                label={preValidation ? "Pré-validation" : "Validation finale"}
                size="small"
                color={preValidation ? "info" : "success"}
                sx={{ fontWeight: 600, fontSize: 11 }}
              />
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {peutTelechargerFiche(droits, commande) && (
            <BoutonPdf url={`${API_ENDPOINTS.COMMANDES}${commande.commande_id}/pdf/`} nomFichier={`commande_${commande.commande_id}.pdf`} />
          )}
          <IconButton onClick={onClose} size="small" aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
        <CommandeProgress statut={commande.statut} />
        <CommandeInfoSection commande={commande} />
        <CommandeArticlesTable commande={commande} articles={t.articles} />
        {peutTraiter && (
          <CommandeTraitementSection
            commande={commande}
            articles={t.articles}
            magasinSource={t.magasinSource}
            onMagasinSourceChange={t.setMagasinSource}
            magasinOptions={magasinOptions}
            unitesDisponibles={t.unitesDisponibles}
            loadingUnites={t.loadingUnites}
            unitesSelectionnees={t.unitesSelectionnees}
            onToggleUnite={t.toggleUnite}
            commentaire={t.commentaire}
            onCommentaireChange={(e) => t.setCommentaire(e.target.value)}
            isAgentPrincipal={t.isAgentPrincipal}
            isAgentSecondaire={t.isAgentSecondaire}
            validations={t.validations}
            setValidations={t.setValidations}
          />
        )}
      </DialogContent>
      <CommandeActions
        onClose={onClose}
        onTraiter={t.traiter}
        peutTraiter={peutTraiter}
        isAgentPrincipal={t.isAgentPrincipal}
        isAgentSecondaire={t.isAgentSecondaire}
        statut={commande.statut}
        traitement={t.traitement}
        magasinSource={t.magasinSource}
        validations={t.validations}
      />
    </Dialog>
  );
}
