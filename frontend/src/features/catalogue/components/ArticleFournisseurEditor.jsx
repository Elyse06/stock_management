import { useState } from "react";
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography, Tooltip, IconButton } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, People as PeopleIcon } from "@mui/icons-material";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { FormSection } from "../../../components/wizard/FormSection";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatCurrency } from "../../../utils/formatters";

export function ArticleFournisseurEditor({ lignes, setLignes, fournisseurs }) {
  const [fournisseurId, setFournisseurId] = useState("");
  const [prix, setPrix] = useState("");

  const fournisseursDisponibles = fournisseurs.filter(
    (f) => !lignes.some((l) => String(l.fournisseur) === String(f.fournisseur_id))
  );

  const ajouterLigne = () => {
    if (!fournisseurId || !prix) return;
    const fournisseur = fournisseurs.find((f) => String(f.fournisseur_id) === String(fournisseurId));
    setLignes([
      ...lignes,
      {
        fournisseur: Number(fournisseurId),
        fournisseur_nom: fournisseur?.nom,
        prix_achat: prix,
      },
    ]);
    setFournisseurId("");
    setPrix("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <StyledTable
        columns={[
          { label: "Fournisseur" },
          { label: "Prix d'achat", align: "right", width: 150 },
          { label: "", align: "center", width: 60 },
        ]}
        emptyMessage="Aucun fournisseur associé"
        emptyIcon={<PeopleIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />}
      >
        {lignes.map((ligne, index) => (
          <tr key={ligne.id ?? `new-${index}`}>
            <td>
              <Typography variant="body2" fontWeight={500}>
                {ligne.fournisseur_nom}
              </Typography>
            </td>
            <td align="right">
              <Typography variant="body2" fontFamily="monospace">
                {formatCurrency(ligne.prix_achat)}
              </Typography>
            </td>
            <td align="center">
              <Tooltip title="Retirer">
                <IconButton size="small" color="error" onClick={() => retirerLigne(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </td>
          </tr>
        ))}
      </StyledTable>

      <FormSection>
        <FormControl size="small" sx={{ flex: 2 }}>
          <InputLabel>Fournisseur</InputLabel>
          <Select
            value={fournisseurId}
            label="Fournisseur"
            onChange={(e) => setFournisseurId(e.target.value)}
            disabled={fournisseursDisponibles.length === 0}
          >
            <MenuItem value="" disabled>
              {fournisseursDisponibles.length === 0
                ? "Tous les fournisseurs sont associés"
                : "Choisir un fournisseur..."}
            </MenuItem>
            {fournisseursDisponibles.map((f) => (
              <MenuItem key={f.fournisseur_id} value={f.fournisseur_id}>
                {f.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Prix d'achat"
          type="number"
          size="small"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          inputProps={{ min: 0, step: "0.01" }}
          sx={{ flex: 1 }}
          placeholder="0.00"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterLigne}
          disabled={!fournisseurId || !prix}
          sx={{ minWidth: 120 }}
        >
          Ajouter
        </Button>
      </FormSection>
    </Box>
  );
}