import { Box, IconButton, Tooltip } from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

export function ActionButtons({ onView, onEdit, onDelete, onValidate, canEdit = true, canDelete = true, canValidate = false }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
      {onView && (
        <Tooltip title="Détails">
          <IconButton size="small" color="primary" onClick={onView}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canValidate && onValidate && (
        <Tooltip title="Valider">
          <IconButton size="small" color="primary" onClick={onValidate}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canEdit && onEdit && (
        <Tooltip title="Modifier">
          <IconButton size="small" color="primary" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && onDelete && (
        <Tooltip title="Supprimer">
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}