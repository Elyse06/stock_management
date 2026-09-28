import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Chip } from "@mui/material";
import { Security as SecurityIcon } from "@mui/icons-material";
import { THEME, codeChipSx } from "./theme";

export function UserPermissionsModal({ user, onClose, onEdit }) {
  if (!user) return null;

  return (
    <Dialog open={Boolean(user)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${THEME.gray200}` }}>
        <SecurityIcon sx={{ color: THEME.primary }} />
        <span>Permissions accordées à {user.utilisateur_mail}</span>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Rôle principal : <strong>{user.role_nom || user.role_id}</strong></Typography>
          {user.emp_nom && <Typography variant="body2" color="text.secondary">Employé rattaché : <strong>{user.emp_nom}</strong></Typography>}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Actions autorisées ({user.actions?.length || 0}) :</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {user.actions && user.actions.length > 0 ? (
            user.actions.map((act) => (
              <Chip key={act} label={act} sx={codeChipSx} />
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">Aucune permission accordée.</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ borderTop: `1px solid ${THEME.gray200}`, px: 3, py: 2 }}>
        <Button onClick={() => { const u = user; onClose(); onEdit(u); }} variant="outlined" sx={{ textTransform: "none", borderColor: THEME.primary, color: THEME.primaryDark, "&:hover": { borderColor: THEME.primaryDark, bgcolor: THEME.primaryVeryLight } }}>
          Modifier les permissions
        </Button>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}