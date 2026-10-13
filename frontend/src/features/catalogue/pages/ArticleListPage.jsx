import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";

import { EmptyValue } from "@/components/data-display/EmptyValue";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { SearchField } from "@/components/forms/SearchField";
import { SelectFilter } from "@/components/forms/SelectFilter";
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
import { TYPE_ARTICLE_OPTIONS } from "../constants/article";
import { useCategoryOptions } from "../hooks/useCategoryOptions";

const optional = ({ value }) => <EmptyValue value={value} />;

export function ArticleListPage() {
  const navigate = useNavigate();
  const { canManageCatalogue } = usePermission();
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
    () => [{ value: "", label: "Toutes catégories" }, ...categories.map((c) => ({ value: c.categorie_id, label: c.cat_libelle }))],
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
    { field: "categorie_nom", headerName: "Catégorie", renderCell: optional },
    { field: "description", headerName: "Description", renderCell: optional },
    actionsColumn(
      ({ row }) => (
        <ActionButtons
          onView={() => navigate(`/catalogue/articles/${encodeURIComponent(row.code_article)}`)}
          onEdit={canManageCatalogue ? () => setForm({ open: true, article: row }) : null}
          onDelete={canManageCatalogue ? () => askDelete(row) : null}
        />
      ),
      160,
    ),
  ];

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
        <SelectFilter label="Catégorie" value={categorie} onChange={setCategorie} options={categoryOptions} minWidth={200} />
        <SelectFilter label="Type" value={type} onChange={setType} options={TYPE_ARTICLE_OPTIONS} />
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
