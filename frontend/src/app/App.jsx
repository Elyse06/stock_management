import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./router/routes";

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
