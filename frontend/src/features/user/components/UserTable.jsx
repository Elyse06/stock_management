import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Avatar, Chip, IconButton, Tooltip } from "@mui/material";
import { Visibility as VisibilityIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { PRESET_ROLES } from "./permissions";
import { THEME } from "./theme";

export function UserTable({ users, isLoading, onEdit, onDelete, onViewPermissions }) {
  if (isLoading) {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">Chargement des utilisateurs en cours...</Typography>
        </Box>
      </TableContainer>
    );
  }

  if (users.length === 0) {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 5, textAlign: "center" }}>
          <Typography variant="body1" sx={{ fontWeight: 600, color: THEME.gray700, mb: 0.5 }}>Aucun utilisateur trouvé</Typography>
          <Typography variant="body2" color="text.secondary">Ajustez vos filtres ou enregistrez un nouvel utilisateur.</Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead sx={{ bgcolor: THEME.gray100 }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Utilisateur / Email</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Employé rattaché</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Rôle / Profil</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Permissions Accordées</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const actionsCount = Array.isArray(user.actions) ? user.actions.length : 0;
            const preset = PRESET_ROLES.find((r) => r.id === user.role_id);
            const roleColor = preset?.badgeColor || THEME.gray500;

            return (
              <TableRow key={user.utilisateur_id} hover onClick={() => onViewPermissions(user)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700, bgcolor: user.role_id === "ADMIN" ? THEME.primarySoft : THEME.primaryVeryLight, color: user.role_id === "ADMIN" ? THEME.primaryDark : THEME.primary }}>
                      {(user.utilisateur_mail?.[0] || "U").toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.utilisateur_mail}</Typography>
                      <Typography variant="caption" color="text.secondary">ID #{user.utilisateur_id}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {user.emp_nom ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.emp_nom}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.emp_fonction || user.direction_libelle || "Personnel Paositra"}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>Non rattaché</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={user.role_nom || preset?.label || user.role_id} sx={{ bgcolor: `${roleColor}20`, color: roleColor, fontWeight: 700, fontSize: "0.75rem", border: `1px solid ${roleColor}60` }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip size="small" label={`${actionsCount} permission(s)`} sx={{ fontWeight: 600, fontSize: "0.72rem", height: 22, bgcolor: actionsCount > 0 ? THEME.primaryVeryLight : THEME.gray100, color: actionsCount > 0 ? THEME.primaryDark : THEME.gray700, border: `1px solid ${actionsCount > 0 ? THEME.primaryBorder : THEME.gray200}` }} />
                    <Tooltip title="Voir le détail des permissions">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewPermissions(user); }} sx={{ color: THEME.gray700 }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    <Tooltip title="Modifier le compte">
                      <IconButton size="small" sx={{ color: THEME.primary }} onClick={(e) => { e.stopPropagation(); onEdit(user); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.utilisateur_id === 1 ? "Compte admin principal protégé" : "Supprimer cet utilisateur"}>
                      <span>
                        <IconButton size="small" sx={{ color: THEME.primaryDark }} disabled={user.utilisateur_id === 1} onClick={(e) => { e.stopPropagation(); onDelete(user); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}