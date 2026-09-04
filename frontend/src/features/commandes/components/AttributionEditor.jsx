import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  IconButton,
  Button,
  Tooltip,
  Autocomplete,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

export function AttributionEditor({
  quantiteTotale,
  attributions,
  setAttributions,
  employees,
  demandeurParDefaut,
}) {
  const [employeSelectionne, setEmployeSelectionne] = useState(null);
  const [quantiteAttribution, setQuantiteAttribution] = useState("");

  const sommeAttribuee = attributions.reduce(
    (sum, a) => sum + (Number(a.quantite) || 0),
    0,
  );
  const quantiteRestante = Number(quantiteTotale) - sommeAttribuee;
  const pourcentage =
    Number(quantiteTotale) > 0
      ? (sommeAttribuee / Number(quantiteTotale)) * 100
      : 0;

  const employesDisponibles = employees.filter((e) => {
    const dejaAttribue = attributions.some((a) => a.employe?.emp_id === e.emp_id);
    if (dejaAttribue) return false;

    if (demandeurParDefaut?.emp_serv_id) {
      return String(e.emp_serv_id) === String(demandeurParDefaut.emp_serv_id);
    }

    return true;
  });

  const ajouterAttribution = () => {
    if (!employeSelectionne) return;
    const qte = Number(quantiteAttribution);
    if (!qte || qte <= 0) return;
    if (qte > quantiteRestante) return;

    setAttributions([
      ...attributions,
      {
        employe: employeSelectionne,
        quantite: qte,
      },
    ]);
    setEmployeSelectionne(null);
    setQuantiteAttribution("");
  };

  const retirerAttribution = (index) => {
    setAttributions(attributions.filter((_, i) => i !== index));
  };

  const modifierQuantite = (index, nouvelleQuantite) => {
    const qte = Number(nouvelleQuantite);
    if (!qte || qte <= 0) return;

    const updated = [...attributions];
    updated[index] = { ...updated[index], quantite: qte };
    setAttributions(updated);
  };

  return (
    <Box>
      {/* INDICATEUR DE PROGRESSION */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Quantité totale :{" "}
            <Typography
              component="span"
              variant="body2"
              fontFamily="monospace"
              fontWeight={700}
              color="primary.main"
            >
              {quantiteTotale}
            </Typography>
          </Typography>
          <Typography variant="body2">
            <Typography
              component="span"
              variant="body2"
              fontFamily="monospace"
              fontWeight={700}
              sx={{
                color:
                  quantiteRestante === 0
                    ? "success.main"
                    : quantiteRestante < 0
                      ? "error.main"
                      : "warning.main",
              }}
            >
              {sommeAttribuee}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {" "}
              / {quantiteTotale} attribués
            </Typography>
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(pourcentage, 100)}
          color={
            quantiteRestante === 0
              ? "success"
              : quantiteRestante < 0
                ? "error"
                : "primary"
          }
          sx={{ height: 8, borderRadius: 1 }}
        />
        {quantiteRestante === 0 && (
          <Typography
            variant="caption"
            color="success.main"
            sx={{ mt: 0.5, display: "block", fontWeight: 600 }}
          >
            ✅Toute la quantité a été attribuée.
          </Typography>
        )}
        {quantiteRestante < 0 && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ mt: 0.5, display: "block", fontWeight: 600 }}
          >
            ❌La somme des attributions dépasse la quantité totale.
          </Typography>
        )}
      </Box>

      <Table
        size="small"
        sx={{
          mb: 2,
          border: "1px solid #E0E0E0",
          "& .MuiTableCell-root": {
            borderColor: "#E0E0E0",
            py: 1,
            px: 1.5,
          },
          "& .MuiTableHead-root .MuiTableCell-root": {
            bgcolor: "#FFF8E1",
            fontWeight: 600,
            fontSize: 13,
            borderBottom: "2px solid #F9A825",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Bénéficiaire</TableCell>
            <TableCell align="center" sx={{ width: 120 }}>
              Quantité
            </TableCell>
            <TableCell align="center" sx={{ width: 60 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attributions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune attribution. Vous recevrez toute la quantité.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            attributions.map((attr, index) => (
              <TableRow key={index} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {attr.employe.emp_nom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attr.employe.emp_matricule}
                        {attr.employe.emp_fonction
                          ? ` • ${attr.employe.emp_fonction}`
                          : ""}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={attr.quantite}
                    onChange={(e) => modifierQuantite(index, e.target.value)}
                    inputProps={{ min: 1, max: quantiteTotale }}
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Retirer">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => retirerAttribution(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr auto" },
          gap: 1.5,
          p: 2,
          bgcolor: "#FAFAFA",
          borderRadius: 1,
          border: "1px dashed #E0E0E0",
          alignItems: "center",
        }}
      >
        <Autocomplete
          size="small"
          options={employesDisponibles}
          getOptionLabel={(option) =>
            option?.emp_nom ? `${option.emp_nom} (${option.emp_matricule})` : ""
          }
          isOptionEqualToValue={(option, value) =>
            option?.emp_id === value?.emp_id
          }
          value={employeSelectionne}
          onChange={(_, newValue) => setEmployeSelectionne(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Bénéficiaire"
              placeholder="Rechercher un employé..."
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.emp_id}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {option.emp_nom}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.emp_matricule}
                  {option.emp_fonction ? ` • ${option.emp_fonction}` : ""}
                  {option.emp_contact ? ` • ${option.emp_contact}` : ""}
                </Typography>
              </Box>
            </li>
          )}
          noOptionsText="Aucun employé disponible"
        />

        <TextField
          label="Quantité"
          type="number"
          size="small"
          value={quantiteAttribution}
          onChange={(e) => setQuantiteAttribution(e.target.value)}
          inputProps={{
            min: 1,
            max: quantiteRestante,
          }}
          placeholder={`Max: ${quantiteRestante}`}
        />

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterAttribution}
          disabled={
            !employeSelectionne ||
            !quantiteAttribution ||
            Number(quantiteAttribution) <= 0 ||
            Number(quantiteAttribution) > quantiteRestante
          }
          sx={{ minWidth: 110, height: 40 }}
        >
          Ajouter
        </Button>
      </Box>
    </Box>
  );
}
