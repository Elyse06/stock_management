import { useState } from "react";
import { Avatar, Divider, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";

export function UserMenu({ user, onLogout }) {
  const [anchor, setAnchor] = useState(null);
  const email = user?.utilisateur_mail || "Utilisateur";

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ ml: { xs: 0, sm: 2 }, flexShrink: 0 }} aria-label="Menu utilisateur">
        <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14, fontWeight: 600 }}>
          {email.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem disabled>
          <Typography variant="body2">{email}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onLogout();
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Déconnexion
        </MenuItem>
      </Menu>
    </>
  );
}
