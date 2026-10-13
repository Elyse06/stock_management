import { useLayoutEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Popover, Tooltip } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import { useNavMode } from "./useNavMode";

/** ``densite`` : "large" (icône + libellé), "serre" (espacement réduit) ou "icone". */
const styleBouton = (actif, densite) => ({
  textTransform: "none",
  whiteSpace: "nowrap",
  flexShrink: 0, // un bouton ne se comprime jamais : c'est ce qui faisait chevaucher les libellés
  minWidth: densite === "icone" ? 44 : 64,
  px: { large: 2, serre: 1, icone: 1.25 }[densite],
  color: actif ? "primary.main" : "text.secondary",
  fontWeight: actif ? 600 : 500,
  borderBottom: "2px solid",
  borderColor: actif ? "secondary.main" : "transparent",
  borderRadius: 0,
  "& .MuiButton-startIcon": densite === "icone" ? { m: 0 } : {},
  "&:hover": { bgcolor: "tint.main", borderColor: "secondary.main" },
});

/** Une rubrique : lien direct, ou bouton ouvrant ses sous-pages. */
function RubriqueBouton({ item, actif, densite = "large", onOuvrir, mesure = false }) {
  const { Icon } = item;
  const compact = densite === "icone";
  const lien = !item.children && !mesure ? { component: NavLink, to: item.path, end: item.path === "/" } : {};
  const bouton = (
    <Button
      {...lien}
      onClick={item.children && !mesure ? (e) => onOuvrir(item, e) : undefined}
      startIcon={<Icon fontSize="small" />}
      endIcon={item.children && !compact ? <ExpandMoreIcon fontSize="small" /> : null}
      aria-label={compact ? item.label : undefined}
      aria-haspopup={item.children ? "menu" : undefined}
      aria-current={actif && item.path ? "page" : undefined}
      tabIndex={mesure ? -1 : undefined}
      sx={styleBouton(actif, densite)}
    >
      {compact ? null : item.label}
    </Button>
  );
  return compact && !mesure ? (
    <Tooltip title={item.label} enterDelay={300}>
      {bouton}
    </Tooltip>
  ) : (
    bouton
  );
}

const rangee = { display: "flex", gap: 0.5 };
const rangeeMesure = { ...rangee, position: "absolute", top: 0, left: 0, width: "max-content", visibility: "hidden", pointerEvents: "none" };

/**
 * Navigation principale. Elle passe d'elle-même en icônes seules puis en mode
 * « tiroir » (signalé par ``onModeChange``) quand la place manque.
 */
export function AppNavBar({ items, isActive, forceTiroir, onModeChange }) {
  const [ancre, setAncre] = useState(null);
  const [rubrique, setRubrique] = useState(null);
  const cleItems = items.map((item) => item.label).join("|");
  const { mode, conteneurRef, mesureCompletRef, mesureSerreRef, mesureIconesRef } = useNavMode({
    forceTiroir,
    deps: [cleItems],
  });
  const densite = { complet: "large", serre: "serre", icones: "icone" }[mode];

  useLayoutEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const ouvrir = (item, event) => {
    setAncre(event.currentTarget);
    setRubrique(item);
  };
  const fermer = () => setAncre(null);

  return (
    <Box ref={conteneurRef} sx={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
      {/* Rangées invisibles servant uniquement à mesurer la place nécessaire à chaque mode. */}
      <Box aria-hidden sx={{ height: 0, overflow: "hidden" }}>
        <Box ref={mesureCompletRef} sx={rangeeMesure}>
          {items.map((item) => (
            <RubriqueBouton key={item.path || item.key} item={item} mesure />
          ))}
        </Box>
        <Box ref={mesureSerreRef} sx={rangeeMesure}>
          {items.map((item) => (
            <RubriqueBouton key={item.path || item.key} item={item} densite="serre" mesure />
          ))}
        </Box>
        <Box ref={mesureIconesRef} sx={rangeeMesure}>
          {items.map((item) => (
            <RubriqueBouton key={item.path || item.key} item={item} densite="icone" mesure />
          ))}
        </Box>
      </Box>

      {mode !== "tiroir" && (
        <Box component="nav" aria-label="Navigation principale" sx={rangee}>
          {items.map((item) => (
            <RubriqueBouton
              key={item.path || item.key}
              item={item}
              actif={isActive(item)}
              densite={densite}
              onOuvrir={ouvrir}
            />
          ))}
        </Box>
      )}

      <Popover
        open={Boolean(ancre) && mode !== "tiroir"}
        anchorEl={ancre}
        onClose={fermer}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { sx: { mt: 0.5, border: "1px solid #E0E0E0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minWidth: 200 } },
        }}
      >
        <List dense aria-label={rubrique?.label}>
          {rubrique?.children.map(({ path, label, Icon }) => (
            <ListItemButton key={path} component={NavLink} to={path} onClick={fermer} sx={{ "&:hover": { bgcolor: "tint.main" } }}>
              <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} slotProps={{ primary: { fontSize: 14 } }} />
            </ListItemButton>
          ))}
        </List>
      </Popover>
    </Box>
  );
}
