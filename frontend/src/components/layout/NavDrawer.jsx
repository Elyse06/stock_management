import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Box, Collapse, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Close as CloseIcon, ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import logo from "@/assets/tahiry-logo.png";

import { NAV_DRAWER_ID } from "./useNavMode";

const styleLigne = (actif) => ({
  borderLeft: "3px solid",
  borderColor: actif ? "secondary.main" : "transparent",
  bgcolor: actif ? "tint.main" : "transparent",
  "&:hover": { bgcolor: "tint.main" },
  "& .MuiListItemIcon-root": { minWidth: 40, color: actif ? "primary.main" : "text.secondary" },
  "& .MuiListItemText-primary": { fontWeight: actif ? 600 : 500, color: actif ? "primary.main" : "text.primary" },
});

/** Lien de navigation : ferme le panneau après le clic. */
function Lien({ item, actif, onNaviguer, retrait = 2 }) {
  const { Icon } = item;
  return (
    <ListItemButton
      component={NavLink}
      to={item.path}
      end={item.path === "/"}
      onClick={onNaviguer}
      aria-current={actif ? "page" : undefined}
      sx={{ ...styleLigne(actif), pl: retrait }}
    >
      <ListItemIcon>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

/**
 * Navigation en panneau latéral (petits écrans) : liste verticale, sous-rubriques
 * dépliables, rubrique de la page courante dépliée d'office.
 */
export function NavDrawer({ open, onClose, items, isActive, activeParent, activeChild }) {
  const [deplies, setDeplies] = useState(() => new Set(activeParent ? [activeParent.key] : []));

  // À chaque ouverture, la rubrique de la page courante est dépliée.
  useEffect(() => {
    if (open && activeParent) setDeplies((avant) => new Set(avant).add(activeParent.key));
  }, [open, activeParent]);

  const basculer = (cle) =>
    setDeplies((avant) => {
      const suivant = new Set(avant);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });

  return (
    <Drawer
      id={NAV_DRAWER_ID}
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 300, maxWidth: "85vw" } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
        <Box component="img" src={logo} alt="Tahiry" sx={{ height: 28, width: "auto" }} />
        <IconButton onClick={onClose} aria-label="Fermer le menu">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <Box component="nav" aria-label="Navigation principale">
        <List sx={{ py: 1 }}>
          {items.map((item) => {
            if (!item.children) {
              return <Lien key={item.path} item={item} actif={isActive(item)} onNaviguer={onClose} />;
            }
            const { Icon } = item;
            const ouvert = deplies.has(item.key);
            const idSousMenu = `${NAV_DRAWER_ID}-${item.key}`;
            return (
              <Box key={item.key}>
                <ListItemButton
                  onClick={() => basculer(item.key)}
                  aria-expanded={ouvert}
                  aria-controls={idSousMenu}
                  sx={styleLigne(item === activeParent && !ouvert)}
                >
                  <ListItemIcon>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {ouvert ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemButton>
                <Collapse in={ouvert} timeout="auto" unmountOnExit>
                  <List id={idSousMenu} disablePadding dense>
                    {item.children.map((enfant) => (
                      <Lien key={enfant.path} item={enfant} actif={enfant === activeChild} onNaviguer={onClose} retrait={4} />
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
