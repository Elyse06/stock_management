import { useState } from "react";
import { Button, TextField } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

import { TYPES_ATTRIBUTION } from "../../utils/attributions";

import { BeneficiaireSelect, TypeSelect } from "./BeneficiaireSelect";

/** Dernière ligne de l'éditeur : ajout d'une attribution. */
export function NouvelleAttributionRow({ quantiteRestante, getOptions, direction, onAdd }) {
  const [type, setType] = useState("EMPLOYE");
  const [beneficiaire, setBeneficiaire] = useState(null);
  const [quantite, setQuantite] = useState("");

  const choisi = type === "DIRECTION" ? beneficiaire ?? direction : beneficiaire;
  const qte = Number(quantite);
  const valide = choisi && qte > 0 && Number.isInteger(qte) && qte <= quantiteRestante;

  const ajouter = () => {
    if (!valide) return;
    onAdd({ type, beneficiaire: choisi, quantite: qte });
    setBeneficiaire(null);
    setQuantite("");
  };

  return (
    <tr>
      <td>
        <TypeSelect
          value={type}
          onChange={(t) => {
            setType(t);
            setBeneficiaire(null);
          }}
          types={TYPES_ATTRIBUTION}
        />
      </td>
      <td>
        <BeneficiaireSelect type={type} value={choisi} options={getOptions(type)} onChange={setBeneficiaire} />
      </td>
      <td align="center">
        <TextField
          label="Quantité"
          type="number"
          size="small"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          slotProps={{ htmlInput: { min: 1, max: quantiteRestante, step: 1 } }}
          placeholder={`Max: ${Math.max(quantiteRestante, 0)}`}
          sx={{ width: 100 }}
        />
      </td>
      <td align="center">
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={ajouter} disabled={quantiteRestante <= 0 || !valide}>
          Ajouter
        </Button>
      </td>
    </tr>
  );
}
