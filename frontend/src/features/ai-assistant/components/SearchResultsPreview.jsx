import { Box, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { OpenInNew as OpenIcon, Search as SearchIcon } from "@mui/icons-material";

const CELLULE = { fontSize: 10, py: 0.3 };
const ENTETE = { fontSize: 10, fontWeight: 600, bgcolor: "#FFF8E1", py: 0.5 };
const APERCU = 3;

/** Résultats d'une recherche d'articles faite par l'assistant (3 premiers + lien). */
export function SearchResultsPreview({ resultats, onVoirTout }) {
  const filtres = Object.entries(resultats.filters_applied || {});
  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
        <SearchIcon sx={{ fontSize: 14, color: "#FFC107" }} />
        <Typography variant="caption" fontWeight={600}>
          {resultats.count} article(s) trouvé(s)
        </Typography>
      </Box>
      {filtres.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
          {filtres.map(([cle, valeur]) => (
            <Chip key={cle} label={`${cle}: ${valeur}`} size="small" sx={{ bgcolor: "#FFF8E1", border: "1px solid #FFE082", fontSize: 10, height: 20 }} />
          ))}
        </Box>
      )}
      <TableContainer sx={{ maxHeight: 150, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={ENTETE}>Code</TableCell>
              <TableCell sx={ENTETE}>Désignation</TableCell>
              <TableCell align="right" sx={ENTETE}>
                Stock
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(resultats.articles || []).slice(0, APERCU).map((article) => (
              <TableRow key={article.code_article}>
                <TableCell sx={CELLULE}>{article.code_article}</TableCell>
                <TableCell sx={CELLULE}>{article.designation}</TableCell>
                <TableCell align="right" sx={CELLULE}>
                  {article.stock_calcule}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {resultats.count > APERCU && (
        <Button size="small" onClick={onVoirTout} endIcon={<OpenIcon fontSize="small" />} sx={{ mt: 1, textTransform: "none", fontSize: 11 }}>
          Voir les {resultats.count} articles
        </Button>
      )}
    </Box>
  );
}
