import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

export function FormDialog({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Enregistrer",
  saving = false,
  disabled = false,
  maxWidth = "sm",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={onSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#FFF8E1",
            borderBottom: "2px solid",
            borderColor: "primary.main",
          }}
        >
          <Typography variant="h3">{title}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>{children}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || disabled}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Enregistrement..." : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}