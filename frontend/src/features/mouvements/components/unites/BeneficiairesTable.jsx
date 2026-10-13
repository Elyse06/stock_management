import { Box, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

import { BeneficiaireTag } from "@/components/data-display/BeneficiaireTag";
import { PaginationBar } from "@/components/table/PaginationBar";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

const ENTETE = { bgcolor: "tint.main", fontWeight: 600, borderBottom: "2px solid", borderColor: "secondary.main" };

/**
 * 1er tableau : bénéficiaires et nombre d'unités attribuées.
 * Une ligne se sélectionne au clic ou au clavier (Entrée / Espace).
 */
export function BeneficiairesTable({ list, selectionId, onSelect }) {
  const { rows, loading, rowCount, paginationModel, setPaginationModel } = list;

  const choisir = (groupe) => onSelect(groupe.affectation_id);

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3">Bénéficiaires</Typography>
        <Chip label={rowCount} size="small" color="primary" variant="outlined" />
      </Box>
      <Box sx={{ height: 3 }}>{loading && <LinearProgress />}</Box>
      <TableContainer sx={{ maxHeight: { xs: 360, lg: "clamp(340px, calc(100dvh - 380px), 700px)" } }}>
        <Table size="small" stickyHeader aria-label="Bénéficiaires">
          <TableHead>
            <TableRow>
              <TableCell sx={ENTETE}>Bénéficiaire</TableCell>
              <TableCell sx={ENTETE} align="right">
                Articles
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Aucun bénéficiaire
                </TableCell>
              </TableRow>
            )}
            {rows.map((groupe) => {
              const selectionne = groupe.affectation_id === selectionId;
              return (
                <TableRow
                  key={groupe.affectation_id}
                  hover
                  selected={selectionne}
                  aria-selected={selectionne}
                  tabIndex={0}
                  onClick={() => choisir(groupe)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choisir(groupe);
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    "& td": { borderLeft: 0 },
                    "& td:first-of-type": { boxShadow: selectionne ? "inset 3px 0 0 #FECA05" : "none" },
                    "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "tint.main" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                  }}
                >
                  <TableCell sx={{ py: 1 }}>
                    <BeneficiaireTag type={groupe.beneficiaire_type} nom={groupe.beneficiaire_nom} showType={false} />
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ ml: 3.5, lineHeight: 1.2 }}>
                      {getBeneficiaireMeta(groupe.beneficiaire_type).label}
                      {groupe.matricule && ` · ${groupe.matricule}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={groupe.nb_unites}
                      size="small"
                      color={selectionne ? "primary" : "default"}
                      sx={{ fontWeight: 700, minWidth: 36 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ px: 1.5, borderTop: "1px solid", borderColor: "divider", mt: "auto" }}>
        <PaginationBar count={rowCount} paginationModel={paginationModel} onPaginationModelChange={setPaginationModel} compact />
      </Box>
    </Paper>
  );
}
