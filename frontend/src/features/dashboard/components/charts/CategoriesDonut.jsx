import { Box, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { PALETTE, STYLE_INFOBULLE } from "../../constants/couleurs";
import { formatNombre, libellePourcentage } from "../../utils/dashboard";
import { AucuneDonnee, DashboardCard } from "../ui/DashboardCard";

const MAX_PARTS = 6;

/** Répartition du stock par catégorie : anneau avec total au centre et légende chiffrée. */
export function CategoriesDonut({ data }) {
  // Libellé lisible : la famille (description) plutôt que le code court de la catégorie.
  const tri = [...data].map((c) => ({ ...c, nom: c.description || c.categorie })).sort((a, b) => b.stock - a.stock);
  const parts = tri.length > MAX_PARTS
    ? [...tri.slice(0, MAX_PARTS - 1), { categorie: "Autres", nom: "Autres", stock: tri.slice(MAX_PARTS - 1).reduce((s, c) => s + c.stock, 0) }]
    : tri;
  const total = parts.reduce((somme, c) => somme + c.stock, 0);

  return (
    <DashboardCard titre="Par catégorie" sousTitre="Répartition de la quantité en stock">
      {total === 0 ? (
        <AucuneDonnee />
      ) : (
        <>
          <Box sx={{ position: "relative", height: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={parts} dataKey="stock" nameKey="nom" innerRadius={58} outerRadius={82} paddingAngle={2}
                  stroke="none" startAngle={90} endAngle={-270}>
                  {parts.map((part, i) => <Cell key={part.categorie} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip {...STYLE_INFOBULLE} formatter={(v, nom) => [`${formatNombre(v)} (${libellePourcentage(v, total)})`, nom]} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{formatNombre(total)}</Typography>
                <Typography variant="caption" sx={{ color: "#667085" }}>en stock</Typography>
              </Box>
            </Box>
          </Box>
          <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
            {parts.map((part, i) => (
              <Box component="li" key={part.categorie} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.75, flexShrink: 0, bgcolor: PALETTE[i % PALETTE.length] }} />
                <Typography noWrap title={part.nom} sx={{ flex: 1, fontSize: 13, color: "#344054", minWidth: 0 }}>{part.nom}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{libellePourcentage(part.stock, total)}</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </DashboardCard>
  );
}
