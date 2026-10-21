import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Typography } from "@mui/material";
import { ArrowBack as RetourIcon } from "@mui/icons-material";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import { FormulaireLigne } from "../components/nouvelle-commande/FormulaireLigne";
import { ListeLignes } from "../components/nouvelle-commande/ListeLignes";
import { useNouvelleCommande } from "../hooks/useNouvelleCommande";

/**
 * Page « Nouvelle commande » : formulaire d'un article à gauche, liste des articles ajoutés à droite
 * (un clic sur une ligne la recharge dans le formulaire), puis enregistrement de la commande.
 */
export function NouvelleCommandePage() {
  const navigate = useNavigate();
  const { confirm, dialogProps } = useConfirmDialog();
  const commande = useNouvelleCommande({ onEnregistree: () => navigate("/commandes") });

  const retour = () => {
    if (commande.lignes.length === 0) return navigate("/commandes");
    confirm("Abandonner la commande", "Les articles ajoutés à la liste seront perdus. Revenir aux commandes ?", () => navigate("/commandes"));
  };

  return (
    <Box>
      <Button startIcon={<RetourIcon />} onClick={retour} color="inherit" sx={{ mb: 1.5 }}>
        Retour aux commandes
      </Button>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h2">Nouvelle commande</Typography>
        <Typography variant="body2" color="text.secondary">
          Demandeur : {commande.demandeur ? `${commande.demandeur.emp_nom}${commande.demandeur.emp_matricule ? ` (${commande.demandeur.emp_matricule})` : ""}` : "—"}
        </Typography>
      </Box>
      {commande.demandeurIntrouvable && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Votre compte utilisateur n'est pas lié à un employé. Vous ne pourrez pas créer de commande tant que ce n'est pas fait.
        </Alert>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 7fr) minmax(0, 5fr)" }, gap: 2.5, alignItems: "start" }}>
        <FormulaireLigne commande={commande} />
        <ListeLignes commande={commande} />
      </Box>
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
