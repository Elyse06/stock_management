import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, Box, IconButton, Toolbar, Tooltip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AutoAwesome as MagicIcon, Menu as MenuIcon } from "@mui/icons-material";

import logo from "@/assets/tahiry-logo.png";
import { PageLoader } from "@/components/feedback/PageLoader";
import { AssistantContext } from "@/features/ai-assistant/context/assistantContext";
import { MotDePasseDrawer } from "@/features/auth/components/MotDePasseDrawer";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCompteurDemandesUnites } from "@/hooks/useCompteurDemandesUnites";

import { AppNavBar } from "./AppNavBar";
import { NavDrawer } from "./NavDrawer";
import { SubNavTabs } from "./SubNavTabs";
import { NAV_DRAWER_ID } from "./useNavMode";
import { useNavigation } from "./useNavigation";
import { UserMenu } from "./UserMenu";

const AIChatDrawer = lazy(() =>
  import("@/features/ai-assistant/components/AIChatDrawer").then((m) => ({ default: m.AIChatDrawer })),
);

export function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canManageInventaire, isGestionnaire } = usePermission();
  const demandesEnAttente = useCompteurDemandesUnites(canManageInventaire);
  const { items, activeParent, activeChild, isActive } = useNavigation();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [question, setQuestion] = useState(null);
  const [motDePasseOuvert, setMotDePasseOuvert] = useState(false);
  const [navMode, setNavMode] = useState("complet");
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const theme = useTheme();
  const telephone = useMediaQuery(theme.breakpoints.down("sm"));
  const enTiroir = navMode === "tiroir";

  const openAssistant = useCallback((texte) => {
    if (!isGestionnaire) return;
    setAiLoaded(true);
    setAiOpen(true);
    if (typeof texte === "string" && texte.trim()) setQuestion({ texte, id: Date.now() });
  }, [isGestionnaire]);
  const assistant = useMemo(() => ({ ouvrir: openAssistant, disponible: isGestionnaire }), [openAssistant, isGestionnaire]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AssistantContext.Provider value={assistant}>
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default" }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", color: "text.primary" }}>
          <Toolbar sx={{ minHeight: 56, gap: 1, px: { xs: 1, sm: 2 } }}>
            {enTiroir && (
              <IconButton
                onClick={() => setTiroirOuvert(true)}
                aria-label="Ouvrir le menu"
                aria-controls={NAV_DRAWER_ID}
                aria-expanded={tiroirOuvert}
                edge="start"
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box
              component="img"
              src={logo}
              alt="Tahiry - accueil"
              onClick={() => navigate("/")}
              sx={{ height: 30, width: "auto", mr: { xs: 1, md: 3 }, cursor: "pointer", userSelect: "none", flexShrink: 0 }}
            />
            <AppNavBar items={items} isActive={isActive} forceTiroir={telephone} onModeChange={setNavMode} />

            {isGestionnaire && (
              <Tooltip title="Assistant IA">
                <IconButton
                  onClick={() => openAssistant()}
                  aria-label="Ouvrir l'assistant IA"
                  sx={{
                    ml: { xs: 0, sm: 1 },
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    bgcolor: "primary.main",
                    boxShadow: (t) => `0 0 0 2px ${t.palette.secondary.main}`,
                    transition: "background-color .15s, transform .15s",
                    "&:hover": { bgcolor: "primary.dark", transform: "translateY(-1px)" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.light", outlineOffset: 3 },
                  }}
                >
                  <MagicIcon sx={{ color: "secondary.main", fontSize: 21 }} />
                </IconButton>
              </Tooltip>
            )}
            <UserMenu user={user} onLogout={handleLogout} />
          </Toolbar>
          {activeParent && (
            <SubNavTabs parent={activeParent} activeChild={activeChild} badges={{ "/inventaire/unites": demandesEnAttente }} />
          )}
        </AppBar>

        <NavDrawer
          open={enTiroir && tiroirOuvert}
          onClose={() => setTiroirOuvert(false)}
          items={items}
          isActive={isActive}
          activeParent={activeParent}
          activeChild={activeChild}
        />

        <Box component="main" sx={{ flex: 1, p: 3, bgcolor: "#FFFFFF", overflowX: "clip" }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Box>

        <MotDePasseDrawer open={motDePasseOuvert} onClose={() => setMotDePasseOuvert(false)} />

        {isGestionnaire && aiLoaded && (
          <Suspense fallback={null}>
            <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} question={question} />
          </Suspense>
        )}
      </Box>
    </AssistantContext.Provider>
  );
}
