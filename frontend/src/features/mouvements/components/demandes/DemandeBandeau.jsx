import { Alert, Typography } from "@mui/material";

export function DemandeBandeau({ demande }) {
  if (!demande) return null;
  return (
    <Alert severity="info" icon={false} sx={{ mb: 2 }}>
      <Typography variant="body2" fontWeight={600}>
        Demande de {demande.demandeur_nom || "—"}
      </Typography>
      <Typography variant="body2">{demande.motif ? `Motif : ${demande.motif}` : "Sans motif."}</Typography>
    </Alert>
  );
}
