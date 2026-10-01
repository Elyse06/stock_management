import { useState, useMemo } from "react";
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewListIcon from "@mui/icons-material/ViewList";
import { StatusChip } from "./StatusChip";

const FILTRES = {
  TOUS: "tous",
  OK: "ok",
  ERREURS: "erreurs",
  A_TRAITER: "a_traiter",
};

function cleSuggestion(suggestion) {
  return `${suggestion.type}::${suggestion.libelle}`;
}

export function ImportReportTable({
  rapport,
  editable = false,
  clesConfirmees = new Set(),
  onBasculerConfirmationCle,
}) {
  const [filtre, setFiltre] = useState(FILTRES.TOUS);

  const details = useMemo(() => {
    if (!rapport?.details) return [];
    if (filtre === FILTRES.OK) return rapport.details.filter((l) => l.statut === "OK");
    if (filtre === FILTRES.ERREURS) return rapport.details.filter((l) => l.statut === "ERREUR");
    if (filtre === FILTRES.A_TRAITER) return rapport.details.filter((l) => l.statut === "A_TRAITER");
    return rapport.details;
  }, [rapport, filtre]);

  if (!rapport) return null;

  const lignesATraiter = rapport.details?.filter((l) => l.statut === "A_TRAITER") || [];

  return (
    <Box>
      {editable && lignesATraiter.length > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
          Cochez une suggestion pour l'appliquer à la confirmation. Les lignes non
          cochées (ou sans correspondance trouvée) seront mises de côté, à saisir
          manuellement après l'import.
        </Alert>
      )}
      {!editable && lignesATraiter.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
          <strong>{lignesATraiter.length} ligne(s)</strong> mise(s) de côté — aucune
          correspondance confirmée pour leur affectation. À enregistrer manuellement.
        </Alert>
      )}

      {/* Barre de filtre */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {details.length} ligne(s) affichée(s)
        </Typography>
        <ToggleButtonGroup
          value={filtre}
          exclusive
          onChange={(_, v) => v && setFiltre(v)}
          size="small"
        >
          <ToggleButton value={FILTRES.TOUS}>
            <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Tous
          </ToggleButton>
          <ToggleButton value={FILTRES.OK}>
            <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> OK
          </ToggleButton>
          <ToggleButton value={FILTRES.A_TRAITER}>
            À traiter
          </ToggleButton>
          <ToggleButton value={FILTRES.ERREURS}>
            <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} /> Erreurs
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Tableau style Google Sheet */}
      <TableContainer
        sx={{
          maxHeight: 480,
          border: "1px solid #E0E0E0",
          borderRadius: 1,
          bgcolor: "#FFFFFF",
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <HeaderCell width={70}>Ligne</HeaderCell>
              <HeaderCell width={100}>Statut</HeaderCell>
              <HeaderCell>Désignation</HeaderCell>
              <HeaderCell width={160}>Article</HeaderCell>
              <HeaderCell width={260}>Affectation</HeaderCell>
              <HeaderCell>Remarque</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {details.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune ligne à afficher pour ce filtre.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              details.map((ligne) => (
                <TableRow
                  key={ligne.ligne}
                  hover
                  sx={{
                    "&:hover": { bgcolor: "#FFFDE7" },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  <DataCell sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                    {ligne.ligne}
                  </DataCell>
                  <DataCell>
                    <StatusChip statut={ligne.statut} />
                  </DataCell>
                  <DataCell sx={{ fontWeight: 500 }}>
                    {ligne.designation || "—"}
                  </DataCell>
                  <DataCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                    {ligne.article || "—"}
                  </DataCell>
                  <DataCell sx={{ minWidth: 240 }}>
                    {ligne.statut === "A_TRAITER" ? (
                      <SuggestionAffectation
                        ligne={ligne}
                        editable={editable}
                        confirmee={
                          !!ligne.suggestion &&
                          clesConfirmees.has(cleSuggestion(ligne.suggestion))
                        }
                        onChange={(confirmee) =>
                          ligne.suggestion &&
                          onBasculerConfirmationCle?.(
                            cleSuggestion(ligne.suggestion),
                            confirmee
                          )
                        }
                      />
                    ) : (
                      ligne.attribue_a || "—"
                    )}
                  </DataCell>
                  <DataCell
                    sx={{
                      color: ligne.statut === "ERREUR" ? "#C0392B" : "#B8860B",
                      fontStyle: ligne.avertissement || ligne.message ? "italic" : "normal",
                    }}
                  >
                    {ligne.message || ligne.avertissement || ""}
                  </DataCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// Affiche, pour une ligne mise de côté ("A_TRAITER"), soit une case à cocher
// permettant de confirmer la suggestion trouvée (Magasin/Direction/Agence/
// Employé), soit un simple texte indiquant qu'aucune correspondance n'a été
// trouvée. Une fois l'étape d'aperçu passée (editable=false), affiche juste
// l'état final en lecture seule.
function SuggestionAffectation({ ligne, editable, confirmee, onChange }) {
  const { suggestion, affectation_texte } = ligne;

  if (!suggestion) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Aucune correspondance pour « {affectation_texte} »
      </Typography>
    );
  }

  const libelleType = {
    MAGASIN: "Magasin",
    DIRECTION: "Direction",
    SITE: "Agence",
    EMPLOYE: "Employé",
  }[suggestion.type] || suggestion.type;

  if (!editable) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Non confirmée — {libelleType} : {suggestion.libelle}
      </Typography>
    );
  }

  return (
    <FormControlLabel
      sx={{ m: 0 }}
      control={
        <Checkbox
          size="small"
          checked={confirmee}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={
        <Typography variant="caption">
          Confirmer — {libelleType} : {suggestion.libelle}
        </Typography>
      }
    />
  );
}

// Cellules de style Google Sheet
function HeaderCell({ children, width }) {
  return (
    <TableCell
      sx={{
        bgcolor: "#FAFAFA",
        fontWeight: 600,
        fontSize: 13,
        color: "#212121",
        borderBottom: "1px solid #E0E0E0",
        borderRight: "1px solid #E0E0E0",
        py: 1,
        px: 1.5,
        width,
        position: "sticky",
        top: 0,
        zIndex: 1,
        "&:last-child": { borderRight: 0 },
      }}
    >
      {children}
    </TableCell>
  );
}

function DataCell({ children, sx }) {
  return (
    <TableCell
      sx={{
        fontSize: 13,
        py: 0.75,
        px: 1.5,
        borderBottom: "1px solid #F0F0F0",
        borderRight: "1px solid #F0F0F0",
        color: "text.primary",
        "&:last-child": { borderRight: 0 },
        ...sx,
      }}
    >
      {children}
    </TableCell>
  );
}