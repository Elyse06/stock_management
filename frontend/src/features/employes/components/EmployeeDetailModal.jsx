import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Avatar,
  Chip,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import {
  Close as CloseIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  AccountTree as AccountTreeIcon,
  LocationOn as LocationOnIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

export function EmployeeDetailModal({ employee, isOpen, onClose, onEdit }) {
  if (!employee) return null;

  const initials = employee.emp_nom
    ? employee.emp_nom
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "EP";

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Fiche Collaborateur
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {/* En-tête profil */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "primary.main",
              color: "#000000",
              fontWeight: 800,
              fontSize: 22,
              border: "2px solid #FFD54F",
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {employee.emp_nom}
            </Typography>
            <Typography variant="body2" color="primary.dark" fontWeight={600} sx={{ mb: 0.5 }}>
              {employee.emp_fonction || "Collaborateur"}
            </Typography>
            <Chip
              label={`Matricule: ${employee.emp_matricule}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
          </Box>
        </Box>

        {/* Coordonnées */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 1.5, bgcolor: "#FAFAFA" }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
            Coordonnées Professionnelles
          </Typography>
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PhoneIcon fontSize="small" sx={{ color: "primary.dark" }} />
              <Typography variant="body2" fontWeight={500}>
                {employee.emp_contact || "Non renseigné"}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Structure hiérarchique */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
            Rattachement Organisationnel
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <LocationOnIcon fontSize="small" sx={{ color: "#E65100", mt: 0.2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Site / Établissement
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {employee.site_nom || "Non affecté"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <BusinessIcon fontSize="small" sx={{ color: "#0288D1", mt: 0.2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Direction
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {employee.direction_libelle || "Non affectée"}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <AccountTreeIcon fontSize="small" sx={{ color: "#7B1FA2", mt: 0.2 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Service Opérationnel
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {employee.service_libelle || "Non affecté"}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button
          startIcon={<EditIcon />}
          onClick={() => {
            onClose();
            if (onEdit) onEdit(employee);
          }}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        >
          Modifier
        </Button>
        <Button onClick={onClose} variant="contained" color="inherit">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}