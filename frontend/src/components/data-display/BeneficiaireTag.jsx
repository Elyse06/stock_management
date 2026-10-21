import { Box, Typography, ButtonBase, Tooltip } from "@mui/material";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

/**
 * Bénéficiaire avec icône colorée par type (employé, direction, site, salle).
 * Si `onClick` est fourni, le nom devient cliquable (ex. filtrer sur ce bénéficiaire).
 */
export function BeneficiaireTag({ type, nom, onClick, showType = true }) {
  const meta = getBeneficiaireMeta(type);
  const { Icon } = meta;

  const content = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <Icon fontSize="small" color={meta.color === "default" ? "action" : meta.color} />
      <Box sx={{ minWidth: 0, textAlign: "left" }}>
        <Typography variant="body2" fontWeight={500} noWrap>
          {nom || "—"}
        </Typography>
        {showType && (
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ lineHeight: 1.2 }}
          >
            {meta.label}
          </Typography>
        )}
      </Box>
    </Box>
  );

  if (!onClick) return content;

  return (
    <Tooltip title="Voir toutes les unités de ce bénéficiaire">
      <ButtonBase
        onClick={onClick}
        sx={{
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          minWidth: 0,
          maxWidth: "100%",
          "&:hover": { bgcolor: "tint.main" },
        }}
      >
        {content}
      </ButtonBase>
    </Tooltip>
  );
}
