import { Box, Typography, Chip } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";

export function EmployeLocation({ employe, showService = true }) {
  if (!employe) return null;

  const service = employe.emp_serv_id;
  const direction = service?.serv_dir_id;
  const site = direction?.site;

  if (!direction && !site) {
    return (
      <Typography variant="caption" color="text.secondary">
        Non localisé
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
      {site && (
        <Chip
          label={`${site.site_type === "SIEGE" ? "Siège" : "Agence"}: ${site.site_nom}`}
          size="small"
          color={site.site_type === "SIEGE" ? "primary" : "default"}
          variant="outlined"
          sx={{ height: 20, fontSize: 10 }}
        />
      )}
      {direction && (
        <Typography variant="caption" color="text.secondary">
          {direction.dir_libelle}
        </Typography>
      )}
      {showService && service && (
        <Typography variant="caption" color="text.secondary">
          {service.serv_libelle}
        </Typography>
      )}
    </Box>
  );
}

export function getEmployeLocation(employe) {
  if (!employe) return null;
  const service = employe.emp_serv_id;
  const direction = service?.serv_dir_id;
  const site = direction?.site;
  return {
    service: service?.serv_libelle,
    direction: direction?.dir_libelle,
    site: site?.site_nom,
    siteType: site?.site_type,
  };
}