import { useState } from "react";
import { Alert, Box, Button, Chip, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

import { FormDialog } from "@/components/forms/FormDialog";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useOptions } from "@/hooks/useOptions";
import { toOptions, useMagasins } from "@/hooks/useReferenceData";

import { useMouvementForm } from "../hooks/useMouvementForm";

import { DetailLigneCard } from "./mouvement-form/DetailLigneCard";
import { MagasinsFields } from "./mouvement-form/MagasinsFields";
import { SaisieRapideNumerosSerie } from "./SaisieRapideNumerosSerie";

/** Saisie manuelle d'une entrée de stock ou d'un transfert entre magasins. */
export function MouvementFormModal({ isOpen, onClose, preselectedArticle = null, preselectedQuantite = null }) {
  // L'écriture des mouvements est réservée à INV_GERE côté backend.
  const { canManageMouvements } = usePermission();
  const { data: magasins = [] } = useMagasins({ enabled: isOpen });
  const { data: fournisseurs = [] } = useOptions("fournisseurs", API_ENDPOINTS.FOURNISSEURS, {}, { enabled: isOpen });
  const form = useMouvementForm({ isOpen, preselectedArticle, preselectedQuantite, onDone: onClose });
  const [saisieRapide, setSaisieRapide] = useState(null);

  const magasinOptions = toOptions(
    magasins,
    (m) => m.magasin_id,
    (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`,
    "Sélectionner un magasin",
  );
  const fournisseurOptions = toOptions(fournisseurs, (f) => f.fournisseur_id, (f) => f.nom, "-- Sélectionner --");
  const ligneRapide = saisieRapide !== null ? form.details[saisieRapide] : null;

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={form.type === "ENTREE" ? "Nouvelle entrée de stock" : "Nouveau transfert"}
      onSubmit={form.enregistrer}
      saving={form.saving}
      disabled={!canManageMouvements}
      maxWidth="md"
    >
      {preselectedArticle && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Article pré-sélectionné : <strong>{preselectedArticle}</strong>
          {preselectedQuantite && ` — Quantité suggérée : ${preselectedQuantite}`}
        </Alert>
      )}

      <MagasinsFields form={form} magasinOptions={magasinOptions} />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: 3, mb: 1.5 }}>
        <Typography variant="h3">Articles concernés</Typography>
        <Chip label={`${form.details.length} ligne(s) • ${form.totalUnites} unité(s)`} size="small" color="primary" variant="outlined" />
      </Box>

      {form.details.map((row, index) => (
        <DetailLigneCard
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          index={index}
          row={row}
          form={form}
          fournisseurOptions={fournisseurOptions}
          canRemove={form.details.length > 1}
          onSaisieRapide={setSaisieRapide}
        />
      ))}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={form.ajouterLigne} size="small">
        Ajouter une ligne
      </Button>

      <SaisieRapideNumerosSerie
        isOpen={saisieRapide !== null}
        onClose={() => setSaisieRapide(null)}
        onSubmit={(numeros) => {
          form.ajouterNumeros(saisieRapide, numeros);
          setSaisieRapide(null);
        }}
        numerosExistant={ligneRapide?.numeros_de_serie ?? []}
        quantiteRequise={ligneRapide?.quantite ?? 0}
        articleDesignation={form.getArticle(ligneRapide?.article)?.designation ?? ""}
      />
    </FormDialog>
  );
}
