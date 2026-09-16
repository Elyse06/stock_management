import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "#FFF8E1", borderBottom: "2px solid", borderColor: "primary.main" }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Annuler</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}