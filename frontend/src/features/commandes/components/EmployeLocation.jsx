import { Box, Typography, Chip } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";

export function EmployeLocation({ employe, showService = true }) {
  if (!employe) return null;

  const serviceLibelle =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_libelle
      : employe.service_libelle;

  const directionLibelle =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.dir_libelle
      : employe.direction_libelle;

  const siteNom =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.site?.site_nom
      : employe.site_nom;

  const siteType =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.site?.site_type
      : employe.site_type;

  if (!directionLibelle && !siteNom) {
    return (
      <Typography variant="caption" color="text.secondary">
        Non localisé
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
      {siteNom && (
        <Chip
          label={`${siteType === "SIEGE" ? "Siège" : "Agence"}: ${siteNom}`}
          size="small"
          color={siteType === "SIEGE" ? "primary" : "default"}
          variant="outlined"
          sx={{ height: 20, fontSize: 10 }}
        />
      )}
      {directionLibelle && (
        <Typography variant="caption" color="text.secondary">
          {directionLibelle}
        </Typography>
      )}
      {showService && serviceLibelle && (
        <Typography variant="caption" color="text.secondary">
          {serviceLibelle}
        </Typography>
      )}
    </Box>
  );
}

export function getEmployeLocation(employe) {
  if (!employe) return null;
  const serviceLibelle =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_libelle
      : employe.service_libelle;

  const directionLibelle =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.dir_libelle
      : employe.direction_libelle;

  const siteNom =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.site?.site_nom
      : employe.site_nom;

  const siteType =
    typeof employe.emp_serv_id === "object"
      ? employe.emp_serv_id?.serv_dir_id?.site?.site_type
      : employe.site_type;

  return {
    service: serviceLibelle,
    direction: directionLibelle,
    site: siteNom,
    siteType: siteType,
  };
}