import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";

import { exportToCSV } from "@/utils/export";

/** Comptes créés par l'import : mot de passe temporaire commun, à changer à la première connexion. */
export function IdentifiantsCrees({ identifiants, motDePasse }) {
  const telecharger = () =>
    exportToCSV(identifiants.map((i) => ({ ...i, mot_de_passe: motDePasse })), "comptes_crees", [
      { label: "Matricule", field: "matricule" },
      { label: "Employé", field: "nom" },
      { label: "Adresse électronique", field: "email" },
      { label: "Mot de passe temporaire", field: "mot_de_passe" },
    ]);
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {identifiants.length} compte(s) créé(s) avec le mot de passe temporaire <strong>{motDePasse}</strong>. Chaque employé
        devra le changer à sa première connexion : tant que ce n'est pas fait, le compte n'a accès à rien d'autre.
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
        <Table size="small" stickyHeader aria-label="Comptes créés">
          <TableHead>
            <TableRow>
              {["Matricule", "Employé", "Adresse électronique"].map((t) => (
                <TableCell key={t} sx={{ fontWeight: 700 }}>{t}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {identifiants.map((i) => (
              <TableRow key={i.email}>
                <TableCell>{i.matricule}</TableCell>
                <TableCell>{i.nom}</TableCell>
                <TableCell>{i.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="outlined" startIcon={<DownloadIcon />} onClick={telecharger} sx={{ mt: 1.5 }}>
        Télécharger la liste des comptes (CSV)
      </Button>
    </Box>
  );
}
