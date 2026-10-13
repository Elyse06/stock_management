import { Alert, Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, Person as PersonIcon } from "@mui/icons-material";

import { StyledTable } from "@/components/table/StyledTable";
import { InfoBox } from "@/components/wizard/InfoBox";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

import { OBJETS_DEMANDE } from "../../constants/commande";
import { libelleBeneficiaire } from "../../utils/attributions";

const COLONNES = [
  { label: "Article" },
  { label: "Quantité", align: "center", width: 50 },
  { label: "Bénéficiaire", width: 220 },
  { label: "Actions", align: "center", width: 90 },
];

function Beneficiaires({ ligne, demandeur }) {
  if (!ligne.attributions.length) {
    return (
      <Chip
        label={demandeur ? `${demandeur.emp_nom} (${ligne.quantite})` : "Demandeur"}
        size="small"
        variant="outlined"
        sx={{ fontStyle: "italic", opacity: 0.7 }}
      />
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {ligne.attributions.map((attr, i) => {
        const { Icon, color, label } = getBeneficiaireMeta(attr.type);
        return (
          <Chip
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            label={`${libelleBeneficiaire(attr.type, attr.beneficiaire) || label} (${attr.quantite})`}
            size="small"
            color={color}
            variant="outlined"
            icon={<Icon />}
            sx={{ alignSelf: "flex-start" }}
          />
        );
      })}
    </Box>
  );
}

/** Étape 2 : objet de la demande et récapitulatif. */
export function RecapStep({ form }) {
  const { demandeur } = form;
  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Récapitulatif de la commande
      </Typography>
      {demandeur && (
        <InfoBox
          icon={<PersonIcon fontSize="small" color="primary" />}
          title={`Demandeur : ${demandeur.emp_nom}${demandeur.emp_matricule ? ` (${demandeur.emp_matricule})` : ""}`}
        />
      )}
      <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
        <InputLabel>Objet de la demande</InputLabel>
        <Select value={form.objet} label="Objet de la demande" onChange={(e) => form.setObjet(e.target.value)} inputProps={{ "aria-label": "Objet de la demande" }}>
          {OBJETS_DEMANDE.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        Articles commandés ({form.lignesValides.length})
      </Typography>
      {form.lignesValides.length === 0 ? (
        <Alert severity="info" variant="outlined">
          Aucun article ajouté. Veuillez revenir en arrière pour en ajouter.
        </Alert>
      ) : (
        <StyledTable columns={COLONNES}>
          {form.lignesValides.map((ligne) => {
            const index = form.lignes.indexOf(ligne);
            return (
              <tr key={index}>
                <td>
                  <Typography variant="caption" color="text.secondary">
                    {ligne.article_designation}
                  </Typography>
                </td>
                <td align="center">
                  <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                    {ligne.quantite}
                  </Typography>
                </td>
                <td>
                  <Beneficiaires ligne={ligne} demandeur={demandeur} />
                </td>
                <td align="center">
                  <Tooltip title="Modifier dans la table">
                    <IconButton size="small" color="primary" onClick={() => form.setEtape(0)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Retirer">
                    <IconButton size="small" color="error" onClick={() => form.retirerLigne(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </StyledTable>
      )}
    </Box>
  );
}
