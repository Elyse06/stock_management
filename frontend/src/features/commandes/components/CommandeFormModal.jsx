import { Alert, Box, Button } from "@mui/material";
import { ArrowForward as ArrowForwardIcon, Inventory as InventoryIcon, ListAlt as ListAltIcon } from "@mui/icons-material";

import { WizardActions } from "@/components/wizard/WizardActions";
import { WizardDialog } from "@/components/wizard/WizardDialog";

import { useCommandeForm } from "../hooks/useCommandeForm";

import { LignesStep } from "./commande-form/LignesStep";
import { RecapStep } from "./commande-form/RecapStep";

const STEPS = [
  { label: "Articles", icon: <InventoryIcon /> },
  { label: "Récapitulatif", icon: <ListAltIcon /> },
];

/** Création d'une commande en deux étapes (articles puis récapitulatif). */
export function CommandeFormModal({ isOpen, onClose }) {
  const form = useCommandeForm({ isOpen, onDone: onClose });

  const actions =
    form.etape === 0 ? (
      <>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={form.allerAuRecap} endIcon={<ArrowForwardIcon />}>
          Voir le récapitulatif
        </Button>
      </>
    ) : (
      <>
        <Box sx={{ flex: 1 }} />
        <WizardActions
          activeStep={form.etape}
          onBack={() => form.setEtape(0)}
          onSubmit={form.enregistrer}
          isLastStep
          loading={form.saving}
          submitLabel="Enregistrer la commande"
          disabled={form.lignesValides.length === 0 || !form.objet}
        />
      </>
    );

  return (
    <WizardDialog isOpen={isOpen} onClose={onClose} steps={STEPS} activeStep={form.etape} title="Nouvelle commande" mode="CRÉATION" maxWidth="xl" actions={actions}>
      {form.demandeurIntrouvable && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Votre compte utilisateur n'est pas lié à un employé. Vous ne pourrez pas créer de commande tant que ce n'est pas fait.
        </Alert>
      )}
      {form.etape === 0 ? <LignesStep form={form} /> : <RecapStep form={form} />}
    </WizardDialog>
  );
}
