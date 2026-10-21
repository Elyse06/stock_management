import { ResultPage } from "./ResultPage";

export function ForbiddenPage() {
  return (
    <ResultPage
      code="403"
      title="Accès refusé"
      message="Vous n'avez pas les droits nécessaires pour consulter cette page."
    />
  );
}
