import { Box, Chip } from "@mui/material";

import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

import { FILTRES_BENEFICIAIRE } from "../constants/mouvement";

/** Filtre rapide par type de bénéficiaire. */
export function BeneficiaireTypeChips({ value, onChange }) {
  return (
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", width: { xs: "100%", md: "auto" } }}>
      {FILTRES_BENEFICIAIRE.map(({ value: type, label }) => {
        const selected = value === type;
        const Icon = type ? getBeneficiaireMeta(type).Icon : null;
        return (
          <Chip
            key={type || "tous"}
            label={label}
            size="small"
            icon={Icon ? <Icon /> : undefined}
            clickable
            onClick={() => onChange(type)}
            color={selected ? "primary" : "default"}
            variant={selected ? "filled" : "outlined"}
          />
        );
      })}
    </Box>
  );
}
