import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, Box, IconButton, Toolbar, Tooltip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AutoAwesome as MagicIcon, Menu as MenuIcon } from "@mui/icons-material";

import logo from "@/assets/tahiry-logo.png";
import { PageLoader } from "@/components/feedback/PageLoader";
import { AssistantContext } from "@/features/ai-assistant/context/assistantContext";
import { useAuth } from "@/features/auth/context/AuthContext";

import { AppNavBar } from "./AppNavBar";
import { NavDrawer } from "./NavDrawer";
import { SubNavTabs } from "./SubNavTabs";
import { NAV_DRAWER_ID } from "./useNavMode";
import { useNavigation } from "./useNavigation";
import { UserMenu } from "./UserMenu";

// L'assistant IA (et ses dépendances) n'est téléchargé qu'à sa première ouverture.
const AIChatDrawer = lazy(() =>
  import("@/features/ai-assistant/components/AIChatDrawer").then((m) => ({ default: m.AIChatDrawer })),
);

export function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { items, activeParent, activeChild, isActive } = useNavigation();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [question, setQuestion] = useState(null);
  const [navMode, setNavMode] = useState("complet");
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  // Sur téléphone, toujours le bouton menu : des icônes seules y seraient trop serrées.
  const theme = useTheme();
  const telephone = useMediaQuery(theme.breakpoints.down("sm"));
  const enTiroir = navMode === "tiroir";

  // Ouvert à tous : l'aide à la navigation sert à chacun, et l'API ne fournit que les données autorisées.
  const openAssistant = useCallback((texte) => {
    setAiLoaded(true);
    setAiOpen(true);
    if (typeof texte === "string" && texte.trim()) setQuestion({ texte, id: Date.now() });
  }, []);
  const assistant = useMemo(() => ({ ouvrir: openAssistant }), [openAssistant]);

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

            <Tooltip title="Assistant IA">
              <IconButton
                onClick={() => openAssistant()}
                aria-label="Ouvrir l'assistant IA"
                sx={{
                  ml: { xs: 0, sm: 1 },
                  flexShrink: 0,
                  bgcolor: "tint.main",
                  border: "1px solid",
                  borderColor: "secondary.main",
                  "&:hover": { bgcolor: "tint.light", borderColor: "secondary.dark" },
                }}
              >
                <MagicIcon sx={{ color: "secondary.dark", fontSize: 22 }} />
              </IconButton>
            </Tooltip>
            <UserMenu user={user} onLogout={handleLogout} />
          </Toolbar>
          {activeParent && <SubNavTabs parent={activeParent} activeChild={activeChild} />}
        </AppBar>

        <NavDrawer
          open={enTiroir && tiroirOuvert}
          onClose={() => setTiroirOuvert(false)}
          items={items}
          isActive={isActive}
          activeParent={activeParent}
          activeChild={activeChild}
        />

        {/* overflowX "clip" (et non "auto") : sinon les éléments sticky des pages ne collent jamais */}
        <Box component="main" sx={{ flex: 1, p: 3, bgcolor: "#FFFFFF", overflowX: "clip" }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Box>

        {aiLoaded && (
          <Suspense fallback={null}>
            <AIChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} question={question} />
          </Suspense>
        )}
      </Box>
    </AssistantContext.Provider>
  );
}
