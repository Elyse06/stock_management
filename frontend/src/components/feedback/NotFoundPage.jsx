import { ResultPage } from "./ResultPage";

export function NotFoundPage() {
  return <ResultPage code="404" title="Page introuvable" message="La page demandée n'existe pas." />;
}
