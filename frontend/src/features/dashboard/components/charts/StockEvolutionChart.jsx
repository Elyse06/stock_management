import { Box } from "@mui/material";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AXE, JAUNE, STYLE_INFOBULLE } from "../../constants/couleurs";
import { formatNombre, moisCourt } from "../../utils/dashboard";
import { AucuneDonnee, DashboardCard } from "../ui/DashboardCard";

/** Stock total en fin de mois sur 12 mois. */
export function StockEvolutionChart({ data }) {
  const vide = !data.some((d) => d.stock_total);
  return (
    <DashboardCard titre="Évolution du stock" sousTitre="Quantité totale en fin de mois">
      {vide ? (
        <AucuneDonnee />
      ) : (
        <Box sx={{ flex: 1, minHeight: 240 }}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="evolution-stock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={JAUNE} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={JAUNE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EEF2F6" />
              <XAxis dataKey="mois" tickFormatter={(m) => moisCourt(m)} {...AXE} />
              <YAxis allowDecimals={false} tickFormatter={formatNombre} {...AXE} width={48} />
              <Tooltip {...STYLE_INFOBULLE} labelFormatter={(m) => moisCourt(m, true)} formatter={(v) => [formatNombre(v), "Stock"]} />
              <Area type="monotone" dataKey="stock_total" stroke="#F99813" strokeWidth={2.5} fill="url(#evolution-stock)"
                activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </DashboardCard>
  );
}
