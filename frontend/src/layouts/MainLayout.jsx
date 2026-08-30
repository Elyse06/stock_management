import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// MUI Components
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  IconButton,
  Avatar,
  Typography,
  Breadcrumbs,
  Link,
} from "@mui/material";

// MUI Icons
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Assignment as AssignmentIcon,
  ExpandLess,
  ExpandMore,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Category as CategoryIcon,
  LocalOffer as LocalOfferIcon,
  People as PeopleIcon,
  SwapHoriz as SwapHorizIcon,
  ListAlt as ListAltIcon,
} from "@mui/icons-material";

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const MENU_ITEMS = [
  {
    path: "/",
    label: "Tableau de bord",
    icon: <DashboardIcon />,
  },
  {
    path: "/catalogue",
    label: "Catalogue",
    icon: <InventoryIcon />,
    children: [
      { path: "/catalogue/articles", label: "Articles", icon: <ListAltIcon /> },
      { path: "/catalogue/categories", label: "Catégories", icon: <CategoryIcon /> },
      { path: "/catalogue/marques", label: "Marques", icon: <LocalOfferIcon /> },
      { path: "/catalogue/fournisseurs", label: "Fournisseurs", icon: <PeopleIcon /> },
    ],
  },
  {
    path: "/commandes",
    label: "Commandes",
    icon: <ShoppingCartIcon />,
  },
  {
    path: "/inventaire",
    label: "Inventaire",
    icon: <AssignmentIcon />,
    children: [
      { path: "/inventaire/mouvements", label: "Mouvements", icon: <SwapHorizIcon /> },
      { path: "/inventaire/sessions", label: "Inventaires", icon: <AssignmentIcon /> },
    ],
  },
];

export function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMenu = (path) => setOpenMenus((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Vérifier si un sous-menu est actif
  const isChildActive = (children) =>
    children?.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/"));

  // Générer le breadcrumb
  const getBreadcrumbs = () => {
    const currentPath = location.pathname;
    const crumbs = [{ label: "Accueil", path: "/" }];
    
    MENU_ITEMS.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          if (currentPath === child.path) {
            crumbs.push({ label: item.label, path: item.path });
            crumbs.push({ label: child.label, path: child.path });
          }
        });
      } else if (currentPath === item.path && item.path !== "/") {
        crumbs.push({ label: item.label, path: item.path });
      }
    });
    
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* ====== SIDEBAR ====== */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#FFFFFF",
            borderRight: "1px solid #E0E0E0",
            transition: "width 0.3s",
            overflowX: "hidden",
          },
        }}
      >
        {/* Header de la sidebar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            px: 2,
            py: 2,
            borderBottom: "1px solid #E0E0E0",
            minHeight: 64,
          }}
        >
          {!collapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  Paositra
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Gestion de Stock
                </Typography>
              </Box>
            </Box>
          )}
          <IconButton onClick={toggleSidebar} size="small">
            <MenuIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Menu de navigation */}
        <List sx={{ flex: 1, px: 1, py: 2 }}>
          {MENU_ITEMS.map((item) => (
            <div key={item.path}>
              {item.children ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => toggleMenu(item.path)}
                      selected={isChildActive(item.children)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        "&.Mui-selected": {
                          bgcolor: "primary.light",
                          "&:hover": { bgcolor: "primary.light" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: "text.primary" }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                          />
                          {openMenus[item.path] || isChildActive(item.children) ? (
                            <ExpandLess fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={openMenus[item.path] || isChildActive(item.children)} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 3 }}>
                      {item.children.map((child) => (
                        <ListItem key={child.path} disablePadding>
                          <ListItemButton
                            component={NavLink}
                            to={child.path}
                            sx={{
                              borderRadius: 1,
                              mb: 0.5,
                              "&.Mui-selected": {
                                bgcolor: "primary.main",
                                color: "white",
                                "&:hover": { bgcolor: "primary.main" },
                                "& .MuiListItemIcon-root": { color: "white" },
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32, color: "text.secondary" }}>
                              {child.icon}
                            </ListItemIcon>
                            {!collapsed && (
                              <ListItemText
                                primary={child.label}
                                primaryTypographyProps={{ fontSize: 13 }}
                              />
                            )}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to={item.path}
                    end={item.path === "/"}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.main" },
                        "& .MuiListItemIcon-root": { color: "white" },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: "text.primary" }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              )}
            </div>
          ))}
        </List>

        {/* Footer : User + Logout */}
        <Divider />
        <Box sx={{ p: 2 }}>
          {!collapsed ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {user?.utilisateur_mail?.charAt(0).toUpperCase() || "U"}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user?.utilisateur_mail || "Utilisateur"}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {user?.utilisateur_mail?.charAt(0).toUpperCase() || "U"}
              </Avatar>
            </Box>
          )}
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Déconnexion"
                primaryTypographyProps={{ fontSize: 13 }}
              />
            )}
          </ListItemButton>
        </Box>
      </Drawer>

      {/* ====== MAIN CONTENT ====== */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: "#FFFFFF",
            borderBottom: "1px solid #E0E0E0",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            <Breadcrumbs separator="›" sx={{ "& a": { color: "text.secondary" } }}>
              {breadcrumbs.map((crumb, index) =>
                index === breadcrumbs.length - 1 ? (
                  <Typography key={crumb.path} color="text.primary" fontWeight={500}>
                    {crumb.label}
                  </Typography>
                ) : (
                  <Link key={crumb.path} underline="hover" color="inherit" href={crumb.path}>
                    {crumb.label}
                  </Link>
                )
              )}
            </Breadcrumbs>
          </Toolbar>
        </AppBar>

        {/* Contenu principal */}
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
    </Box>
  );
}