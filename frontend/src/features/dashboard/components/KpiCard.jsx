import { useId } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { ArrowDownward as ArrowDownwardIcon, ArrowUpward as ArrowUpwardIcon } from "@mui/icons-material";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { BORDURE } from "../constants/couleurs";
import { formatNombre } from "../utils/dashboard";

function Evolution({ valeur }) {
  if (valeur === null || valeur === undefined) return null;
  const hausse = valeur > 0;
  const Icone = hausse ? ArrowUpwardIcon : ArrowDownwardIcon;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        px: 0.75,
        py: 0.25,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        bgcolor: valeur === 0 ? "#F2F4F7" : hausse ? "#E8F0F9" : "#FFF4E5",
        color: valeur === 0 ? "#667085" : hausse ? "#01509B" : "#B54708",
      }}
    >
      {valeur !== 0 && <Icone sx={{ fontSize: 13 }} />}
      {Math.abs(valeur)} %
    </Box>
  );
}

/** Mini-courbe sans axes, remplie d'un dégradé. */
function Sparkline({ donnees, cle, couleur }) {
  const id = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={donnees} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity={0.35} />
            <stop offset="100%" stopColor={couleur} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={cle} stroke={couleur} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Indicateur : icône, libellé, grand chiffre, évolution et mini-courbe. Cliquable s'il a un détail. */
export function KpiCard({ icone, libelle, valeur, evolution, legende, serie, cleSerie, couleur, onClick }) {
  const contenu = (
    <Box sx={{ p: { xs: 1.75, sm: 2.25 }, width: "100%", textAlign: "left", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
        <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: 2, display: { xs: "none", sm: "grid" }, placeItems: "center",
          bgcolor: `${couleur}1A`, color: couleur }}>
          {icone}
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#475467", lineHeight: 1.3 }}>{libelle}</Typography>
      </Box>
      <Typography sx={{ fontSize: { xs: 24, sm: 30 }, fontWeight: 700, lineHeight: 1.1, color: "#101828", letterSpacing: "-0.02em" }}>
        {formatNombre(valeur)}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.75, minHeight: 22, flexWrap: "wrap" }}>
        <Evolution valeur={evolution} />
        {legende && (
          <Typography variant="caption" sx={{ color: "#667085" }}>
            {legende}
          </Typography>
        )}
      </Box>
      {serie?.length > 1 && (
        <Box sx={{ mt: 1, mx: -0.5 }}>
          <Sparkline donnees={serie} cle={cleSerie} couleur={couleur} />
        </Box>
      )}
    </Box>
  );
  const cadre = {
    height: "100%",
    width: "100%",
    borderRadius: 3,
    border: `1px solid ${BORDURE}`,
    bgcolor: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    display: "flex",
    alignItems: "stretch",
    transition: "box-shadow .15s, border-color .15s",
  };
  return onClick ? (
    <ButtonBase onClick={onClick} aria-label={`${libelle} : voir le détail`}
      sx={{ ...cadre, "&:hover": { borderColor: couleur, boxShadow: "0 4px 12px rgba(16,24,40,0.08)" } }}>
      {contenu}
    </ButtonBase>
  ) : (
    <Box sx={cadre}>{contenu}</Box>
  );
}
