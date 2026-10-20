import { Box, ButtonBase, Typography } from "@mui/material";

import { TYPES_INVENTAIRE } from "../../constants/typeInventaire";

/** Deux grandes cartes : inventaire des immobilisations ou des fournitures. */
export function ChoixTypeInventaire({ onChoisir }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
      {Object.entries(TYPES_INVENTAIRE).map(([cle, type]) => (
        <ButtonBase
          key={cle}
          onClick={() => onChoisir(cle)}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, p: 2.5, textAlign: "left",
            border: "1px solid #E3E9F1", borderRadius: 3, bgcolor: "#FFFFFF",
            transition: "border-color .15s, box-shadow .15s",
            "&:hover, &:focus-visible": { borderColor: "primary.main", boxShadow: "0 4px 14px rgba(1,80,155,0.12)" },
          }}
        >
          <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "tint.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <type.Icon sx={{ color: "primary.main" }} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{type.libelle}</Typography>
          <Typography variant="body2" color="text.secondary">{type.description}</Typography>
        </ButtonBase>
      ))}
    </Box>
  );
}
