import { Alert, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

/** Comptes créés par l'import : chacun reçoit par e-mail un lien d'activation pour choisir son mot de passe. */
export function IdentifiantsCrees({ identifiants }) {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {identifiants.length} compte(s) créé(s). Chaque employé reçoit à son adresse un lien d'activation personnel,
        valable quelques jours, pour choisir son mot de passe. Le suivi des envois et le renvoi d'un lien se font depuis
        la page Utilisateurs.
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
    </Box>
  );
}
