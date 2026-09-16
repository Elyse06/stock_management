import { Box, Typography, Grid } from "@mui/material";
import { Person as PersonIcon, QrCode as QrCodeIcon } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";

export function MouvementBeneficiairesSection({ details }) {
  const beneficiaires = details?.filter((d) => d.employe_beneficiaire_nom) || [];

  if (beneficiaires.length === 0) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>Bénéficiaires & QR Codes</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1 }}>
          Aucun bénéficiaire spécifié pour cette sortie.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>Bénéficiaires & QR Codes</Typography>
      <Grid container spacing={2}>
        {beneficiaires.map((detail, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", height: "100%" }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PersonIcon fontSize="small" color="primary" />
                  <Typography variant="body1" fontWeight={600}>{detail.employe_beneficiaire_nom}</Typography>
                </Box>
                {detail.employe_beneficiaire_matricule && (
                  <Typography variant="body2" color="text.secondary">Matricule : {detail.employe_beneficiaire_matricule}</Typography>
                )}
                {detail.employe_beneficiaire_fonction && (
                  <Typography variant="body2" color="text.secondary">Fonction : {detail.employe_beneficiaire_fonction}</Typography>
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
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>QR Code de traçabilité</Typography>
                  </Box>
                  <QRCodeSVG value={detail.qr_code_data} size={150} level="M" includeMargin={true} />
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}