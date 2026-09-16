// src/features/mouvement/components/MouvementDetailModal.jsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { CodeChip } from "../../../components/common/CodeChip";
import { MouvementInfoSection } from "./MouvementInfoSection";
import { MouvementBeneficiairesSection } from "./MouvementBeneficiairesSection";
import { MouvementFournisseursSection } from "./MouvementFournisseursSection";
import { MouvementArticlesTable } from "./MouvementArticlesTable";

export function MouvementDetailModal({ mouvement, isOpen, onClose }) {
  if (!mouvement) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#FFF8E1", borderBottom: "2px solid", borderColor: "primary.main" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h3">Mouvement <CodeChip value={`#${mouvement.mouvement_id}`} /></Typography>
          <StatusChip status={mouvement.type_mouvement} />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <MouvementInfoSection mouvement={mouvement} />
        
        {mouvement.type_mouvement === "SORTIE" && (
          <MouvementBeneficiairesSection details={mouvement.details} />
        )}
        
        {mouvement.type_mouvement === "ENTREE" && (
          <MouvementFournisseursSection details={mouvement.details} />
        )}
        
        <MouvementArticlesTable mouvement={mouvement} />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}