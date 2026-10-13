import { Box, Typography } from "@mui/material";

import { formatNombre } from "../../utils/dashboard";

/**
 * Classement horizontal : libellé, valeur et barre proportionnelle au maximum.
 * ``elements`` = ``[{cle, libelle, valeur, detail?}]``.
 */
export function ListeBarres({ elements, couleur, rang = false }) {
  const max = Math.max(1, ...elements.map((e) => e.valeur));
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {elements.map((element, i) => (
        <Box component="li" key={element.cle}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.5 }}>
            {rang && (
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#98A2B3", width: 16, flexShrink: 0 }}>{i + 1}</Typography>
            )}
            <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: "#344054" }}>{element.libelle}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#101828" }}>
              {formatNombre(element.valeur)}
              {element.detail && (
                <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, color: "#667085" }}> {element.detail}</Typography>
              )}
            </Typography>
          </Box>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: "#F2F4F7", ml: rang ? 3 : 0, overflow: "hidden" }}>
            <Box sx={{ height: "100%", width: `${Math.max(2, (element.valeur / max) * 100)}%`, borderRadius: 3, bgcolor: couleur }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
