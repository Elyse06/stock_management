import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Box, Tab, Tabs, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { TypeArticleFilter } from "@/components/forms/TypeArticleFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { API_ENDPOINTS } from "@/config/endpoints";
import { ETATS_UNITE } from "@/constants/unites";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useCompteurDemandesUnites } from "@/hooks/useCompteurDemandesUnites";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";

import { BeneficiaireTypeChips } from "../components/BeneficiaireTypeChips";
import { EtiquetteModal } from "../components/EtiquetteModal";
import { RetourStockModal } from "../components/RetourStockModal";
import { TransfertUniteModal } from "../components/TransfertUniteModal";
import { DemandesATraiter } from "../components/demandes/DemandesATraiter";
import { BeneficiairesTable } from "../components/unites/BeneficiairesTable";
import { DetailBeneficiaire } from "../components/unites/DetailBeneficiaire";

const OPTIONS_ETAT = [{ value: "", label: "Tous les états" }, ...ETATS_UNITE];

/**
 * Unités attribuées : à gauche les bénéficiaires et leur nombre d'articles, à droite
 * le détail du bénéficiaire sélectionné (le premier de la liste par défaut).
 */
export function UnitesArticlePage() {
  const { canManageInventaire } = usePermission();
  const [params, setParams] = useSearchParams();
  const onglet = canManageInventaire && params.get("onglet") === "demandes" ? "demandes" : "unites";
  const enAttente = useCompteurDemandesUnites(canManageInventaire);
  const theme = useTheme();
  const empile = useMediaQuery(theme.breakpoints.down("lg"));
  const detailRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("");
  const [etat, setEtat] = useState("");
  const [typeArticle, setTypeArticle] = useState("");
  const [selectionId, setSelectionId] = useState(null);
  const [modal, setModal] = useState({ type: null, unite: null });
  const search = useDebouncedValue(searchInput.trim());

  // Mêmes filtres pour les deux tableaux : le nombre affiché correspond au détail.
  const filtres = { search, beneficiaire_type: type, etat, is_immobilisation: typeArticle };
  const groupes = usePaginatedList(["unites", "par-beneficiaire"], API_ENDPOINTS.UNITES_PAR_BENEFICIAIRE, filtres);
  // Sélection absente de la page affichée (filtre, dernier article retourné...) : le premier bénéficiaire.
  const beneficiaire = groupes.rows.find((g) => g.affectation_id === selectionId) ?? groupes.rows[0] ?? null;
  const detail = usePaginatedList(
    ["unites", "detail"],
    API_ENDPOINTS.UNITES_ARTICLE,
    { ...filtres, statut: "ATTRIBUE", affectation: beneficiaire?.affectation_id },
    { enabled: Boolean(beneficiaire) },
  );

  const choisir = (affectationId) => {
    setSelectionId(affectationId);
    // Tableaux l'un sous l'autre : on amène le détail à l'écran.
    if (empile) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const fermer = () => setModal({ type: null, unite: null });
  const reset = () => {
    setSearchInput("");
    setType("");
    setEtat("");
    setTypeArticle("");
  };

  const onglets = canManageInventaire && (
    <Tabs value={onglet} onChange={(_, v) => setParams(v === "demandes" ? { onglet: "demandes" } : {}, { replace: true })} sx={{ mb: 2 }}>
      <Tab value="unites" label="Unités attribuées" sx={{ textTransform: "none" }} />
      <Tab value="demandes" sx={{ textTransform: "none" }}
        label={<Badge color="warning" badgeContent={enAttente} sx={{ "& .MuiBadge-badge": { right: -14 } }}>Demandes</Badge>} />
    </Tabs>
  );

  if (onglet === "demandes") {
    return (
      <Box>
        {onglets}
        <DemandesATraiter />
      </Box>
    );
  }

  return (
    <Box>
      {onglets}
      <PageHeader onReset={reset} hasFilters={Boolean(searchInput || type || etat || typeArticle)}>
        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Bénéficiaire, article, n° de série..." minWidth={260} />
        <TypeArticleFilter value={typeArticle} onChange={setTypeArticle} />
        <SelectFilter label="État" value={etat} onChange={setEtat} options={OPTIONS_ETAT} minWidth={160} />
        <BeneficiaireTypeChips value={type} onChange={setType} />
      </PageHeader>
      <ErrorAlert error={(groupes.error || detail.error) && getErrorMessage(groupes.error || detail.error)} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(300px, 0.8fr) minmax(0, 1.7fr)" }, gap: 2, alignItems: "start" }}>
        <BeneficiairesTable list={groupes} selectionId={beneficiaire?.affectation_id ?? null} onSelect={choisir} />
        <Box ref={detailRef} sx={{ minWidth: 0, scrollMarginTop: 120 }}>
          <DetailBeneficiaire beneficiaire={beneficiaire} list={detail} canManage={canManageInventaire}
            onAction={(typeAction, unite) => setModal({ type: typeAction, unite })} />
        </Box>
      </Box>

      {modal.unite && (
        <>
          <RetourStockModal unite={modal.unite} isOpen={modal.type === "retour"} onClose={fermer} onSuccess={fermer} />
          <TransfertUniteModal unite={modal.unite} isOpen={modal.type === "transfert"} onClose={fermer} onSuccess={fermer} />
          <EtiquetteModal unite={modal.unite} isOpen={modal.type === "etiquette"} onClose={fermer} />
        </>
      )}
    </Box>
  );
}
