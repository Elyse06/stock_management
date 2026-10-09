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
  People as PeopleIcon,
  Store as StoreIcon,
  SwapHoriz as SwapHorizIcon,
  ListAlt as ListAltIcon,
  ExpandMore as ExpandMoreIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
  Public as PublicIcon,
  LocationOn as LocationOnIcon,
  Article as ArticleIcon,
  UploadFile as UploadFileIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Badge as BadgeIcon,
  AccountTree as AccountTreeIcon,
  Business as BusinessIcon,
  MeetingRoom as MeetingRoomIcon,
  AutoAwesome as MagicIcon,
} from "@mui/icons-material";
import logo from "../assets/tahiry-logo.png";
import { AIChatDrawer } from "../components/AIChatDrawer";

const MENU_STRUCTURE = [
  {
    path: "/",
    label: "Tableau de bord",
    icon: <DashboardIcon fontSize="small" />,
    actions: [],
  },
  {
    path: "/utilisateurs",
    label: "Utilisateurs & Rôles",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    actions: ["USR_GERE", "CAT_GERE"],
  },
  {
    key: "employes",
    label: "Employés",
    icon: <BadgeIcon fontSize="small" />,
    actions: [],
    children: [
      {
        path: "/employes",
        label: "Employé",
        icon: <BadgeIcon fontSize="small" />,
        actions: [],
      },
      {
        path: "/employes/services",
        label: "Service",
        icon: <AccountTreeIcon fontSize="small" />,
        actions: [],
      },
      {
        path: "/employes/directions",
        label: "Direction",
        icon: <BusinessIcon fontSize="small" />,
        actions: [],
      },
      {
        path: "/employes/sites",
        label: "Site",
        icon: <LocationOnIcon fontSize="small" />,
        actions: [],
      },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: <InventoryIcon fontSize="small" />,
    actions: [],
    children: [
      {
        path: "/catalogue/articles",
        label: "Articles",
        icon: <ListAltIcon fontSize="small" />,
        actions: ["CAT_LIRE"],
      },
      {
        path: "/catalogue/categories",
        label: "Catégories",
        icon: <CategoryIcon fontSize="small" />,
        actions: ["CAT_GERE"],
      },
      /*
      {
        path: "/catalogue/marques",
        label: "Marques",
        icon: <LocalOfferIcon fontSize="small" />,
        actions: ["CAT_GERE"],
      },
      */
      {
        path: "/catalogue/fournisseurs",
        label: "Fournisseurs",
        icon: <PeopleIcon fontSize="small" />,
        actions: ["CAT_GERE"],
      },
    ],
  },
  {
    key: "inventaire",
    label: "Inventaire",
    icon: <AssignmentIcon fontSize="small" />,
    actions: [],
    children: [
      {
        path: "/inventaire/mouvements",
        label: "Mouvements",
        icon: <SwapHorizIcon fontSize="small" />,
        actions: ["MOV_LIRE"],
      },
      {
        path: "/inventaire/sessions",
        label: "Inventaires",
        icon: <AssignmentIcon fontSize="small" />,
        actions: ["INV_LIRE"],
      },
      {
        path: "/inventaire/unites",
        label: "Unités Attribués",
        icon: <ListAltIcon fontSize="small" />,
        actions: ["CAT_LIRE"],
      },
      {
        path: "/magasins",
        label: "Magasins",
        icon: <StoreIcon fontSize="small" />,
        actions: ["INV_GERE"],
      },
      {
        path: "/salles",
        label: "Salles",
        icon: <MeetingRoomIcon fontSize="small" />,
        actions: ["CAT_LIRE", "INV_GERE"],
      },
      {
        path: "/import/immobilisations",
        label: "Import immobilisations",
        icon: <UploadFileIcon fontSize="small" />,
        actions: ["CAT_GERE"],
      },
      {
        path: "/import/fournitures",
        label: "Import fournitures",
        icon: <UploadFileIcon fontSize="small" />,
        actions: ["CAT_GERE"],
      }
    ],
  },
  {
    path: "/commandes",
    label: "Commandes",
    icon: <ShoppingCartIcon fontSize="small" />,
    actions: ["COM_DEM", "COM_VAL"],
  },
  {
    key: "historique",
    label: "Historique",
    icon: <HistoryIcon />,
    children: [
      { path: "/historique/globale", label: "Globale", icon: <PublicIcon /> },
      { path: "/historique/localisation", label: "Localisation", icon: <LocationOnIcon /> },
      { path: "/historique/article", label: "Article", icon: <ArticleIcon /> },
    ],
  },
];

export function MainLayout() {
  const { user, logout, hasAnyAction } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [activePopoverKey, setActivePopoverKey] = useState(null);

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const canSeeItem = (item) => {
    if (!item.actions || item.actions.length === 0) {
      if (item.children) {
        return item.children.some((child) => canSeeItem(child));
      }
      return true;
    }

    return hasAnyAction(...item.actions);
  };

  const matchesPath = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const activeParent = MENU_STRUCTURE.find(
    (item) => {
      const visibleChildren = item.children?.filter(canSeeItem) || [];
      return visibleChildren.some((child) => matchesPath(child.path));
    },
  );

  const visibleActiveChildren = activeParent
    ? activeParent.children
        .filter(canSeeItem)
        .filter((child) => matchesPath(child.path))
    : [];
  const activeChild = visibleActiveChildren.reduce(
    (mostSpecific, child) =>
      !mostSpecific || child.path.length > mostSpecific.path.length
        ? child
        : mostSpecific,
    null,
  );
  const activeChildIndex = activeParent
    ? activeParent.children.filter(canSeeItem).indexOf(activeChild)
    : -1;

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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E0E0E0",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ minHeight: 56, gap: 1 }}>
          <Box
            component="img"
            src={logo}
            alt="Tahiry"
            onClick={() => navigate("/")}
            sx={{
              height: 30,
              width: "auto",
              mr: 3,
              cursor: "pointer",
              userSelect: "none",
            }}
          />

          {/* Barre de navigation */}
          <Box sx={{ display: "flex", gap: 0.5, flex: 1 }}>
            {MENU_STRUCTURE.filter(canSeeItem).map((item) => {
              const isActive = item.path
                ? matchesPath(item.path)
                : item.children.some((child) => matchesPath(child.path));

              return (
                <Button
                  key={item.path || item.key}
                  onClick={(e) => handleMenuClick(item, e)}
                  startIcon={item.icon}
                  endIcon={
                    item.children ? <ExpandMoreIcon fontSize="small" /> : null
                  }
                  sx={{
                    textTransform: "none",
                    color: isActive ? "primary.main" : "text.secondary",
                    fontWeight: isActive ? 600 : 500,
                    borderBottom: isActive
                      ? "2px solid"
                      : "2px solid transparent",
                    borderColor: isActive ? "secondary.main" : "transparent",
                    borderRadius: 0,
                    px: 2,
                    "&:hover": {
                      bgcolor: "tint.main",
                      borderColor: "secondary.main",
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* User menu */}
          <IconButton
            onClick={() => setAiDrawerOpen(true)}
            title="Assistant IA"
            sx={{
              ml: 1,
              bgcolor: "#FFF8E1",
              border: "1px solid #FFE082",
              "&:hover": {
                bgcolor: "#FFECB3",
                borderColor: "#FFC107",
              },
            }}
          >
            <MagicIcon sx={{ color: "#FFC107", fontSize: 22 }} />
          </IconButton>

          <IconButton
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{ ml: 2 }}
          >
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
              <Typography variant="body2">
                {user?.utilisateur_mail || "Utilisateur"}
              </Typography>
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

        {activeParent && (
          <Box
            sx={{
              bgcolor: "#FAFAFA",
              borderBottom: "1px solid #E0E0E0",
              px: 2,
            }}
          >
            <Tabs
              value={activeChildIndex}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                "& .MuiTabs-indicator": {
                  backgroundColor: "secondary.main",
                  height: 3,
                },
              }}
            >
              {activeParent.children.filter(canSeeItem).map((child) => (
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
          {MENU_STRUCTURE.find((m) => m.key === activePopoverKey)
            ?.children.filter(canSeeItem)
            .map((child) => (
              <ListItemButton
                key={child.path}
                onClick={() => handleChildClick(child.path)}
                sx={{
                  "&:hover": { bgcolor: "tint.main" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
                  {child.icon}
                </ListItemIcon>
                <ListItemText
                  primary={child.label}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            ))}
        </List>
      </Popover>

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

      <AIChatDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />

    </Box>
  );
}