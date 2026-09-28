import { Grid, Card, CardContent, Typography, Box, Chip } from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  Store as StoreIcon,
  AssignmentTurnedIn as ValidationIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { THEME } from "./theme";

const ROLE_ICONS = {
  ADMIN: AdminIcon,
  GESTIONNAIRE: StoreIcon,
  VALIDATEUR_INV: ValidationIcon,
  VALIDATEUR_CMD: ValidationIcon,
  STANDARD: CartIcon,
};

export function RoleCard({ role }) {
  const Icon = ROLE_ICONS[role.id] || PersonIcon;
  return (
    <Grid item xs={12} sm={6} md={2.4}>
      <Card
        variant="outlined"
        sx={{ height: "100%", borderRadius: 2, borderTop: `4px solid ${role.badgeColor}`, bgcolor: THEME.white }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Icon fontSize="small" sx={{ color: THEME.primaryDark }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
              {role.label}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, minHeight: 36 }}>
            {role.description}
          </Typography>
          <Chip
            size="small"
            label={`${role.actions.length} permission${role.actions.length > 1 ? "s" : ""}`}
            sx={{
              fontWeight: 600,
              fontSize: "0.7rem",
              bgcolor: THEME.primaryVeryLight,
              color: THEME.textStrong,
              border: `1px solid ${THEME.primaryBorder}`,
            }}
          />
        </CardContent>
      </Card>
    </Grid>
  );
}