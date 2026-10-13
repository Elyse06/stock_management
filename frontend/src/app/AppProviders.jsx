import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClientProvider } from "@tanstack/react-query";

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { NotificationProvider } from "@/components/feedback/NotificationProvider";
import { IS_DEV } from "@/config/env";
import { queryClient } from "@/config/queryClient";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import theme from "@/styles/theme";

// Outils de débogage React Query : chargés uniquement en développement (absents du bundle de production).
const ReactQueryDevtools = IS_DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })))
  : () => null;

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider>
            <AuthProvider>
              <BrowserRouter>{children}</BrowserRouter>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
