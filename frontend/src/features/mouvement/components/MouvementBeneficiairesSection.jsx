import { Box, Typography, Grid, Chip } from "@mui/material";
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  QrCode as QrCodeIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";

export function MouvementBeneficiairesSection({ details }) {
  const beneficiaires = details?.filter((d) => d.employe_beneficiaire_nom || d.direction_beneficiaire) || [];

  if (beneficiaires.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>
          Bénéficiaires & QR Codes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1 }}>
          Aucun bénéficiaire spécifié pour cette sortie.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Bénéficiaires & QR Codes
      </Typography>
      <Grid container spacing={2}>
        {beneficiaires.map((detail, index) => {
          const isEmploye = detail.beneficiaire_type === "EMPLOYE";
          const nom = isEmploye ? detail.employe_beneficiaire_nom : detail.direction_beneficiaire;
          const matricule = isEmploye ? detail.employe_beneficiaire_matricule : null;
          const fonction = isEmploye ? detail.employe_beneficiaire_fonction : null;

          return (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", height: "100%" }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    {isEmploye ? (
                      <PersonIcon fontSize="small" color="primary" />
                    ) : (
                      <BusinessIcon fontSize="small" color="secondary" />
                    )}
                    <Typography variant="body1" fontWeight={600}>
                      {nom}
                    </Typography>
                    <Chip
                      label={isEmploye ? "Employé" : "Direction"}
                      size="small"
                      color={isEmploye ? "primary" : "secondary"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </Box>
                  {matricule && (
                    <Typography variant="body2" color="text.secondary">
                      Matricule : {matricule}
                    </Typography>
                  )}
                  {fonction && (
                    <Typography variant="body2" color="text.secondary">
                      Fonction : {fonction}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Article : </strong>{detail.article_designation}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Quantité : </strong>
                    <Typography component="span" variant="body2" fontWeight={700} fontFamily="monospace" color="primary.main">
                      {detail.quantite}
                    </Typography>
                  </Typography>
                </Box>
                {detail.qr_code_data && (
                  <Box sx={{ p: 1.5, bgcolor: "#FFFFFF", borderRadius: 1, border: "1px solid #E0E0E0", textAlign: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 1 }}>
                      <QrCodeIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        QR Code de traçabilité
                      </Typography>
                    </Box>
                    <QRCodeSVG value={detail.qr_code_data} size={150} level="M" includeMargin={true} />
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}