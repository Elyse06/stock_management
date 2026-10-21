import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  TableRow,
  TableCell,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { CodeChip } from "@/components/data-display/CodeChip";
import { EmptyValue } from "@/components/data-display/EmptyValue";
import { StyledTable } from "@/components/table/StyledTable";

const COLUMNS = [
  { label: "Article" },
  { label: "Théorique", align: "center" },
  { label: "Physique", align: "center" },
  { label: "Écart", align: "center" },
  { label: "Commentaire" },
];

const isNumeroSerie = (ligne) => ligne.article_mode_suivi === "NUMERO_SERIE";

export function InventaireArticlesTable({ lignes }) {
  const [seulementEcarts, setSeulementEcarts] = useState(false);

  const lignesAvecEcart = lignes.filter((l) => Number(l.ecart) !== 0);
  const affichees = seulementEcarts ? lignesAvecEcart : lignes;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="h3">Articles inventoriés</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={seulementEcarts ? "ecarts" : "tous"}
          onChange={(_, value) => value && setSeulementEcarts(value === "ecarts")}
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              px: 1.5,
              "&.Mui-selected": {
                bgcolor: "tint.main",
                color: "primary.main",
                borderColor: "primary.main",
                fontWeight: 600,
              },
            },
          }}
        >
          <ToggleButton value="tous">Tous ({lignes.length})</ToggleButton>
          <ToggleButton value="ecarts">Écarts ({lignesAvecEcart.length})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <StyledTable
        columns={COLUMNS}
        emptyMessage={
          seulementEcarts ? "Aucun article avec écart." : "Aucun article dans cet inventaire."
        }
      >
        {affichees.map((ligne) => {
          const ns = isNumeroSerie(ligne);
          const ecart = Number(ligne.ecart);

          return (
            <TableRow key={ligne.id}>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {ligne.article_designation}
                </Typography>
                {ligne.article && <CodeChip value={ligne.article} />}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontFamily="monospace">
                  {ligne.quantite_theorique}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  fontWeight={600}
                  sx={{ color: ns ? "text.disabled" : "inherit" }}
                >
                  {ns ? "—" : ligne.quantite_physique}
                </Typography>
              </TableCell>
              <TableCell align="center">
                {ns ? (
                  <Typography variant="body2" sx={{ color: "text.disabled" }}>
                    —
                  </Typography>
                ) : (
                  <Chip
                    label={ecart > 0 ? `+${ecart}` : ecart}
                    size="small"
                    color={ecart === 0 ? "success" : "error"}
                    variant={ecart === 0 ? "outlined" : "filled"}
                    sx={{ fontFamily: "monospace", fontWeight: 700, minWidth: 48 }}
                  />
                )}
              </TableCell>
              <TableCell sx={{ minWidth: 160 }}>
                <EmptyValue value={ligne.commentaire} />
              </TableCell>
            </TableRow>
          );
        })}
      </StyledTable>
    </Box>
  );
}
