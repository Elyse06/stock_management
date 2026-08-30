// src/layouts/MainLayout.jsx
import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Assignment as AssignmentIcon,
  Category as CategoryIcon,
  LocalOffer as LocalOfferIcon,
  People as PeopleIcon,
  Store as StoreIcon,
  SwapHoriz as SwapHorizIcon,
  ListAlt as ListAltIcon,
  ExpandMore as ExpandMoreIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";

// Structure du menu horizontal
const MENU_STRUCTURE = [
  { path: "/", label: "Tableau de bord", icon: <DashboardIcon fontSize="small" /> },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: <InventoryIcon fontSize="small" />,
    children: [
      { path: "/catalogue/articles", label: "Articles", icon: <ListAltIcon fontSize="small" /> },
      { path: "/catalogue/categories", label: "Catégories", icon: <CategoryIcon fontSize="small" /> },
      { path: "/catalogue/marques", label: "Marques", icon: <LocalOfferIcon fontSize="small" /> },
      { path: "/catalogue/fournisseurs", label: "Fournisseurs", icon: <PeopleIcon fontSize="small" /> },
    ],
  },
  {
    key: "inventaire",
    label: "Inventaire",
    icon: <AssignmentIcon fontSize="small" />,
    children: [
      { path: "/magasins", label: "Magasins", icon: <StoreIcon fontSize="small" /> },
      { path: "/inventaire/mouvements", label: "Mouvements", icon: <SwapHorizIcon fontSize="small" /> },
      { path: "/inventaire/sessions", label: "Inventaires", icon: <AssignmentIcon fontSize="small" /> },
    ],
  },
  { path: "/commandes", label: "Commandes", icon: <ShoppingCartIcon fontSize="small" /> },
];

export function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [activePopoverKey, setActivePopoverKey] = useState(null);

  // Trouver l'item parent actif (pour afficher les sous-onglets)
  const activeParent = MENU_STRUCTURE.find(
    (item) => item.children && item.children.some((c) => location.pathname.startsWith(c.path))
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuClick = (item, event) => {
    if (item.children) {
      setPopoverAnchor(event.currentTarget);
      setActivePopoverKey(item.key);
    } else {
      navigate(item.path);
    }
  };

  const handleChildClick = (path) => {
    setPopoverAnchor(null);
    navigate(path);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* ====== TOP BAR (style Google Sheets) ====== */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E0E0E0",
          color: "text.primary",
        }}
      >
        {/* Ligne 1 : Logo + Menu principal + User */}
        <Toolbar sx={{ minHeight: 56, gap: 1 }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: "primary.main",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              P
            </Box>
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              Paositra
            </Typography>
          </Box>

          {/* Menu principal horizontal */}
          <Box sx={{ display: "flex", gap: 0.5, flex: 1 }}>
            {MENU_STRUCTURE.map((item) => {
              const isActive = item.path
                ? location.pathname === item.path
                : item.children.some((c) => location.pathname.startsWith(c.path));

              return (
                <Button
                  key={item.path || item.key}
                  onClick={(e) => handleMenuClick(item, e)}
                  startIcon={item.icon}
                  endIcon={item.children ? <ExpandMoreIcon fontSize="small" /> : null}
                  sx={{
                    textTransform: "none",
                    color: isActive ? "primary.main" : "text.secondary",
                    fontWeight: isActive ? 600 : 500,
                    borderBottom: isActive ? "2px solid" : "2px solid transparent",
                    borderColor: isActive ? "primary.main" : "transparent",
                    borderRadius: 0,
                    px: 2,
                    "&:hover": {
                      bgcolor: "#FFF8E1",
                      borderColor: "primary.light",
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* User menu */}
          <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ ml: 2 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "primary.main",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {user?.utilisateur_mail?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.utilisateur_mail || "Utilisateur"}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null);
                handleLogout();
              }}
            >
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Déconnexion
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Ligne 2 : Sous-onglets (si un menu parent est actif) */}
        {activeParent && (
          <Box
            sx={{
              bgcolor: "#FAFAFA",
              borderBottom: "1px solid #E0E0E0",
              px: 2,
            }}
          >
            <Tabs
              value={activeParent.children.findIndex((c) => location.pathname.startsWith(c.path))}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                "& .MuiTabs-indicator": {
                  backgroundColor: "primary.main",
                  height: 3,
                },
              }}
            >
              {activeParent.children.map((child) => (
                <Tab
                  key={child.path}
                  component={NavLink}
                  to={child.path}
                  icon={child.icon}
                  iconPosition="start"
                  label={child.label}
                  sx={{
                    minHeight: 40,
                    textTransform: "none",
                    color: "text.secondary",
                    fontSize: 13,
                    fontWeight: 500,
                    px: 2,
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
        )}
      </AppBar>

      {/* Popover pour les sous-menus */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              border: "1px solid #E0E0E0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              minWidth: 200,
            },
          },
        }}
      >
        <List dense>
          {MENU_STRUCTURE.find((m) => m.key === activePopoverKey)?.children.map((child) => (
            <ListItemButton
              key={child.path}
              onClick={() => handleChildClick(child.path)}
              sx={{
                "&:hover": { bgcolor: "#FFF8E1" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
                {child.icon}
              </ListItemIcon>
              <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          ))}
        </List>
      </Popover>

      {/* ====== CONTENU PRINCIPAL ====== */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          bgcolor: "#FFFFFF",
          overflow: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}