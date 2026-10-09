import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "tint.main",
            borderBottom: "2px solid",
            borderColor: "secondary.main",
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