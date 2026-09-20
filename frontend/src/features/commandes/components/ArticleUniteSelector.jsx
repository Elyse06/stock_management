import { Box, Typography, Chip, Checkbox, FormControlLabel } from "@mui/material";
import { QrCode as QrCodeIcon } from "@mui/icons-material";
import { EtatBadge } from "../../../components/common/EtatBadge"; // 🆕 Import

export function ArticleUniteSelector({
  article,
  detailId,
  unitesDisponibles,
  unitesSelectionnees,
  quantiteRequise,
  onToggleUnite,
}) {
  const estComplet = unitesSelectionnees.length === quantiteRequise;
  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: `1px solid ${estComplet ? "#4CAF50" : "#E0E0E0"}` }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" fontWeight={600}>{article.designation} ({article.code_article})</Typography>
        <Chip label={`${unitesSelectionnees.length} / ${quantiteRequise}`} size="small" color={estComplet ? "success" : "warning"} variant={estComplet ? "filled" : "outlined"} />
      </Box>
      {unitesDisponibles.length === 0 ? (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>Aucune unité EN_STOCK disponible.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 200, overflow: "auto" }}>
          {unitesDisponibles.map((unite) => {
            const isSelected = unitesSelectionnees.includes(unite.unite_id);
            return (
              <FormControlLabel
                key={unite.unite_id}
                control={<Checkbox checked={isSelected} onChange={() => onToggleUnite(detailId, unite.unite_id)} size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <QrCodeIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontFamily="monospace" fontWeight={isSelected ? 600 : 400}>
                      {unite.numero_de_serie}
                    </Typography>
                    {/* 🆕 Affichage de l'état */}
                    {unite.etat && <EtatBadge etat={unite.etat} size="small" />}
                  </Box>
                }
                sx={{ ml: 0.5 }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}