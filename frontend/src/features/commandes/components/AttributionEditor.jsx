import { useMemo } from "react";
import { IconButton, TextField, Tooltip } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";

import { StyledTable } from "@/components/table/StyledTable";

import { directionDuDemandeur, optionsBeneficiaire, sommeAttribuee, TYPES_ATTRIBUTION } from "../utils/attributions";

import { BeneficiaireSelect, TypeSelect } from "./attribution/BeneficiaireSelect";
import { NouvelleAttributionRow } from "./attribution/NouvelleAttributionRow";

const COLONNES = [
  { label: "Type", width: 140 },
  { label: "Bénéficiaire" },
  { label: "Quantité", align: "center", width: 120 },
  { label: "", align: "center", width: 120 },
];

/** Répartition de la quantité d'une ligne de commande entre bénéficiaires. */
export function AttributionEditor({
  quantiteTotale,
  attributions,
  setAttributions,
  employees = [],
  directions = [],
  sites = [],
  salles = [],
  demandeurParDefaut,
}) {
  const direction = useMemo(() => directionDuDemandeur(directions, demandeurParDefaut), [directions, demandeurParDefaut]);
  const contexte = { attributions, employees, sites, salles, direction };
  const getOptions = (type, index = -1) => optionsBeneficiaire(type, contexte, index);
  const restante = Number(quantiteTotale) - sommeAttribuee(attributions);

  const modifier = (index, changes) => setAttributions(attributions.map((a, i) => (i === index ? { ...a, ...changes } : a)));

  const modifierQuantite = (index, valeur) => {
    const qte = Number(valeur);
    const max = Number(quantiteTotale) - sommeAttribuee(attributions, index);
    if (qte > 0 && Number.isInteger(qte) && qte <= max) modifier(index, { quantite: qte });
  };

  return (
    <StyledTable columns={COLONNES} emptyMessage="Aucune attribution. Vous recevrez toute la quantité.">
      {attributions.map((attr, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td>
            <TypeSelect
              value={attr.type}
              onChange={(type) => modifier(index, { type, beneficiaire: null })}
              types={TYPES_ATTRIBUTION}
            />
          </td>
          <td>
            <BeneficiaireSelect
              type={attr.type}
              value={attr.beneficiaire}
              options={getOptions(attr.type, index)}
              onChange={(beneficiaire) => beneficiaire && modifier(index, { beneficiaire })}
            />
          </td>
          <td align="center">
            <TextField
              type="number"
              size="small"
              value={attr.quantite}
              onChange={(e) => modifierQuantite(index, e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: quantiteTotale, step: 1 } }}
              sx={{ width: 90 }}
            />
          </td>
          <td align="center">
            <Tooltip title="Retirer">
              <IconButton size="small" color="error" onClick={() => setAttributions(attributions.filter((_, i) => i !== index))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </td>
        </tr>
      ))}
      <NouvelleAttributionRow
        quantiteRestante={restante}
        getOptions={getOptions}
        direction={direction}
        onAdd={(attribution) => setAttributions([...attributions, attribution])}
      />
    </StyledTable>
  );
}
