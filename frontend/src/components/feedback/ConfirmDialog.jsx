import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirmer", color = "error" }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText sx={{ mt: 2 }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Annuler</Button>
        <Button onClick={onConfirm} variant="contained" color={color} autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
