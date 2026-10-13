import { Box, Typography } from "@mui/material";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXE, BLEU, ORANGE, STYLE_INFOBULLE } from "../../constants/couleurs";
import { formatNombre, moisCourt } from "../../utils/dashboard";
import { AucuneDonnee, DashboardCard } from "../ui/DashboardCard";

const SERIES = [
  { cle: "quantite_entree", libelle: "Entrées", couleur: BLEU },
  { cle: "quantite_sortie", libelle: "Sorties", couleur: ORANGE },
];

/** Entrées et sorties des 12 derniers mois (aires dégradées). */
export function FluxMensuelsChart({ data }) {
  const vide = !data.some((d) => d.quantite_entree || d.quantite_sortie);
  const totaux = SERIES.map((s) => data.reduce((somme, d) => somme + (d[s.cle] || 0), 0));
  return (
    <DashboardCard
      titre="Flux de stock"
      sousTitre="Entrées et sorties sur 12 mois"
      action={
        <Box sx={{ display: "flex", gap: 2 }}>
          {SERIES.map((s, i) => (
            <Box key={s.cle} sx={{ textAlign: "right" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.couleur }} />
                <Typography variant="caption" sx={{ color: "#667085" }}>{s.libelle}</Typography>
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{formatNombre(totaux[i])}</Typography>
            </Box>
          ))}
        </Box>
      }
    >
      {vide ? (
        <AucuneDonnee />
      ) : (
        <Box sx={{ flex: 1, minHeight: 260 }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.cle} id={`flux-${s.cle}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.couleur} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={s.couleur} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="#EEF2F6" />
              <XAxis dataKey="mois" tickFormatter={(m) => moisCourt(m)} {...AXE} />
              <YAxis allowDecimals={false} tickFormatter={formatNombre} {...AXE} width={48} />
              <Tooltip {...STYLE_INFOBULLE} labelFormatter={(m) => moisCourt(m, true)} formatter={(v, nom) => [formatNombre(v), nom]} />
              {SERIES.map((s) => (
                <Area key={s.cle} type="monotone" dataKey={s.cle} name={s.libelle} stroke={s.couleur} strokeWidth={2.5}
                  fill={`url(#flux-${s.cle})`} activeDot={{ r: 5, strokeWidth: 0 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </DashboardCard>
  );
}
