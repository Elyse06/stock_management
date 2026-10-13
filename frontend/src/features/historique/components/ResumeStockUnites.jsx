import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { CodeChip } from "@/components/data-display/CodeChip";
import { API_ENDPOINTS } from "@/config/endpoints";
import { ETATS_UNITE } from "@/constants/unites";
import { apiClient } from "@/lib/api/client";

const ligneMessage = (texte) => (
  <TableRow>
    <TableCell colSpan={ETATS_UNITE.length + 2} align="center">
      {texte}
    </TableCell>
  </TableRow>
);

/**
 * Unités actuellement EN STOCK, par article et par état (situation du jour).
 * Les unités ne sont pas suivies par magasin : le résumé porte sur l'ensemble du stock.
 */
export function ResumeStockUnites() {
  const { data: resume = [], isLoading, error } = useQuery({
    queryKey: ["unites", "resume"],
    queryFn: ({ signal }) => apiClient.get(API_ENDPOINTS.RESUME_STOCK_UNITES, { signal }).then((r) => r.data),
  });

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", minWidth: 0 }}>
      <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3">Résumé des unités en stock</Typography>
        <Typography variant="body2" color="text.secondary">
          Situation actuelle, tous magasins confondus : répartition par état et par article
        </Typography>
      </Box>
      {error ? (
        <Typography color="error" sx={{ p: 2 }}>
          Impossible de charger le résumé.
        </Typography>
      ) : (
        <TableContainer sx={{ maxHeight: { xs: 420, lg: 600 } }}>
          <Table
            size="small"
            stickyHeader
            sx={{
              "& .MuiTableCell-head": { bgcolor: "tint.main", fontWeight: 600, borderBottom: "2px solid", borderColor: "secondary.main" },
              "& .MuiTableBody-root .MuiTableRow-root:hover": { bgcolor: "tint.light" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Article</TableCell>
                <TableCell align="right">Unités</TableCell>
                {ETATS_UNITE.map(({ value, label }) => (
                  <TableCell key={value} align="right">
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && ligneMessage("Chargement...")}
              {!isLoading && resume.length === 0 && ligneMessage("Aucune unité en stock")}
              {resume.map((r) => (
                <TableRow key={r.article_code}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.article_designation}
                    </Typography>
                    <CodeChip value={r.article_code} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {r.total}
                  </TableCell>
                  {ETATS_UNITE.map(({ value }) => (
                    <TableCell key={value} align="right">
                      {r.etats?.[value] ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
