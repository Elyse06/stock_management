import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Button,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

export function ArticleFournisseurEditor({ lignes, setLignes, fournisseurs }) {
  const [fournisseurId, setFournisseurId] = useState("");
  const [prix, setPrix] = useState("");

  const fournisseursDisponibles = fournisseurs.filter(
    (f) => !lignes.some((l) => String(l.fournisseur) === String(f.fournisseur_id))
  );

  const ajouterLigne = () => {
    if (!fournisseurId || !prix) return;
    const fournisseur = fournisseurs.find(
      (f) => String(f.fournisseur_id) === String(fournisseurId)
    );
    setLignes([
      ...lignes,
      {
        fournisseur: Number(fournisseurId),
        fournisseur_nom: fournisseur?.nom,
        prix_achat: prix,
      },
    ]);
    setFournisseurId("");
    setPrix("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  return (
    <Box>
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
            <TableCell>Fournisseur</TableCell>
            <TableCell align="right" sx={{ width: 150 }}>
              Prix d'achat
            </TableCell>
            <TableCell align="center" sx={{ width: 60 }}>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun fournisseur associé
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            lignes.map((ligne, index) => (
              <TableRow
                key={ligne.id ?? `new-${index}`}
                sx={{
                  "&:hover": { bgcolor: "#FFFDE7" },
                }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {ligne.fournisseur_nom}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontFamily="monospace">
                    {Number(ligne.prix_achat).toLocaleString("fr-FR")} Ar
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Retirer">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => retirerLigne(index)}
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
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          p: 2,
          bgcolor: "#FAFAFA",
          borderRadius: 1,
          border: "1px dashed #E0E0E0",
        }}
      >
        <FormControl size="small" sx={{ flex: 2 }}>
          <InputLabel>Fournisseur</InputLabel>
          <Select
            value={fournisseurId}
            label="Fournisseur"
            onChange={(e) => setFournisseurId(e.target.value)}
            disabled={fournisseursDisponibles.length === 0}
          >
            <MenuItem value="" disabled>
              {fournisseursDisponibles.length === 0
                ? "Tous les fournisseurs sont associés"
                : "Choisir un fournisseur..."}
            </MenuItem>
            {fournisseursDisponibles.map((f) => (
              <MenuItem key={f.fournisseur_id} value={f.fournisseur_id}>
                {f.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Prix d'achat"
          type="number"
          size="small"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          inputProps={{ min: 0, step: "0.01" }}
          sx={{ flex: 1 }}
          placeholder="0.00"
        />

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterLigne}
          disabled={!fournisseurId || !prix}
          sx={{ minWidth: 120 }}
        >
          Ajouter
        </Button>
      </Box>
    </Box>
  );
}