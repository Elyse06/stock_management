import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";

import { EmptyValue } from "@/components/data-display/EmptyValue";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { TypeArticleFilter } from "@/components/forms/TypeArticleFilter";
import { TypeArticleChip } from "@/components/data-display/TypeArticleChip";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionButtons } from "@/components/table/ActionButtons";
import { actionsColumn } from "@/components/table/columns";
import { PaginatedDataGrid } from "@/components/table/PaginatedDataGrid";
import { API_ENDPOINTS } from "@/config/endpoints";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api/errors";

import { articlesApi } from "../api/catalogueApi";
import { ArticleFormModal } from "../components/ArticleFormModal";
import { libelleCategorie } from "@/constants/articles";
import { useCategoryOptions } from "../hooks/useCategoryOptions";

const optional = ({ value }) => <EmptyValue value={value} />;

export function ArticleListPage() {
  const navigate = useNavigate();
  const { canManageCatalogue, canViewArticleDetail } = usePermission();
  const { confirm, dialogProps } = useConfirmDialog();
  const { remove } = useCrudMutations(articlesApi, [["articles"]], { deleted: "Article supprimé avec succès" });
  const { data: categories = [] } = useCategoryOptions();

  // Filtres initiaux lus dans l'URL (ex. lien « Voir les articles » de l'assistant IA).
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [categorie, setCategorie] = useState(() => searchParams.get("categorie") ?? "");
  const [type, setType] = useState(() => searchParams.get("type") ?? "");
  const [form, setForm] = useState({ open: false, article: null });
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList(["articles"], API_ENDPOINTS.ARTICLES, {
    search: debouncedSearch,
    categorie,
    is_immobilisation: type,
  });

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Toutes catégories" },
      ...categories.map((c) => ({ value: c.categorie_id, label: libelleCategorie(c.cat_libelle, c.cat_description) })),
    ],
    [categories],
  );

  const askDelete = (article) =>
    confirm("Supprimer l'article", `Êtes-vous sûr de vouloir supprimer l'article « ${article.designation} » ?`, () =>
      remove.mutate(article.code_article),
    );

  const resetFilters = () => {
    setSearch("");
    setCategorie("");
    setType("");
  };

  const columns = [
    { field: "designation", headerName: "Désignation" },
    {
      field: "is_immobilisation", headerName: "Type", autoGrow: false, autoExtraWidth: 36,
      getText: (r) => (r.is_immobilisation ? "Immobilisation" : "Fourniture"),
      renderCell: ({ value }) => <TypeArticleChip immobilisation={value} />,
    },
    {
      field: "categorie_nom", headerName: "Catégorie", autoMaxWidth: 320,
      getText: (r) => libelleCategorie(r.categorie_nom, r.categorie_description),
      renderCell: ({ row }) => <EmptyValue value={libelleCategorie(row.categorie_nom, row.categorie_description)} />,
    },
    { field: "description", headerName: "Description", renderCell: optional },
    // Profils Standard et Chef hiérarchique : la liste seulement, sans fiche ni action.
    canViewArticleDetail && actionsColumn(
      ({ row }) => (
        <ActionButtons
          onView={() => navigate(`/catalogue/articles/${encodeURIComponent(row.code_article)}`)}
          onEdit={canManageCatalogue ? () => setForm({ open: true, article: row }) : null}
          onDelete={canManageCatalogue ? () => askDelete(row) : null}
        />
      ),
      160,
    ),
  ].filter(Boolean);

  return (
    <Box>
      <PageHeader
        actionLabel="Nouvel article"
        onAction={() => setForm({ open: true, article: null })}
        canAction={canManageCatalogue}
        onReset={resetFilters}
        hasFilters={Boolean(search || categorie || type)}
      >
        <SearchField value={search} onChange={setSearch} />
        <TypeArticleFilter value={type} onChange={setType} />
        <SelectFilter label="Catégorie" value={categorie} onChange={setCategorie} options={categoryOptions} minWidth={240} />
      </PageHeader>
      <ErrorAlert error={list.error && getErrorMessage(list.error)} />

      <PaginatedDataGrid
        {...list.gridProps}
        columns={columns}
        getRowId={(row) => row.code_article}
        noRowsLabel="Aucun article trouvé"
      />

      <ArticleFormModal
        isOpen={form.open}
        articleCode={form.article?.code_article}
        onClose={() => setForm({ open: false, article: null })}
      />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
