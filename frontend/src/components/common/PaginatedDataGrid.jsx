import { useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Divider,
  LinearProgress,
  Button,
  Pagination,
  Select,
  MenuItem,
  useMediaQuery,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import { computeColumnWidths } from "../../utils/columnWidths";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Barre de pagination commune au tableau (bureau) et aux cartes (mobile) :
 * gros boutons Précédent / Suivant, numéros de page cliquables, lignes par page.
 */
function PaginationBar({ count, paginationModel, onPaginationModelChange, compact = false }) {
  const page = paginationModel?.page ?? 0;
  const pageSize = paginationModel?.pageSize ?? PAGE_SIZE_OPTIONS[1];
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, count);

  const goTo = (newPage) => {
    if (newPage < 0 || newPage >= pageCount || newPage === page) return;
    onPaginationModelChange?.({ ...paginationModel, page: newPage });
  };

  const prevButton = (
    <Button
      variant="outlined"
      onClick={() => goTo(page - 1)}
      disabled={page <= 0}
      startIcon={<NavigateBeforeIcon />}
      sx={{ minWidth: 120, height: 40, flex: compact ? 1 : "none" }}
    >
      Précédent
    </Button>
  );

  const nextButton = (
    <Button
      variant="outlined"
      onClick={() => goTo(page + 1)}
      disabled={page >= pageCount - 1}
      endIcon={<NavigateNextIcon />}
      sx={{ minWidth: 120, height: 40, flex: compact ? 1 : "none" }}
    >
      Suivant
    </Button>
  );

  const pageSizeSelect = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Lignes
      </Typography>
      <Select
        size="small"
        value={pageSize}
        onChange={(e) =>
          onPaginationModelChange?.({ page: 0, pageSize: Number(e.target.value) })
        }
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <MenuItem key={n} value={n}>
            {n}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const info = (
    <Typography variant="body2" color="text.secondary">
      {from}–{to} sur {count}
    </Typography>
  );

  if (compact) {
    return (
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {prevButton}
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ whiteSpace: "nowrap", px: 0.5 }}
          >
            {page + 1} / {pageCount}
          </Typography>
          {nextButton}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {info}
          {pageSizeSelect}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {pageSizeSelect}
        {info}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {prevButton}
        <Pagination
          count={pageCount}
          page={page + 1}
          onChange={(_, value) => goTo(value - 1)}
          shape="rounded"
          color="primary"
          siblingCount={1}
          boundaryCount={1}
          hidePrevButton
          hideNextButton
        />
        {nextButton}
      </Box>
    </Box>
  );
}

/** Rendu d'une cellule dans la vue cartes (même contrat que renderCell du DataGrid). */
function renderValue(col, row, id) {
  const value = row?.[col.field];
  if (col.renderCell) {
    return col.renderCell({
      id,
      field: col.field,
      row,
      value,
      formattedValue: value,
      colDef: col,
    });
  }
  if (value === null || value === undefined || value === "") {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return <Typography variant="body2">{String(value)}</Typography>;
}

/** Vue mobile : une carte par ligne, au lieu d'un tableau qui défile horizontalement. */
function CardList({
  rows,
  columns,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  getRowId,
  noRowsLabel,
  paginationMode,
}) {
  const dataColumns = columns.filter(
    (c) => c.field !== "actions" && !c.hideOnMobile,
  );
  const actionsColumn = columns.find((c) => c.field === "actions");
  const [titleColumn, ...detailColumns] = dataColumns;

  const page = paginationModel?.page ?? 0;
  const pageSize = paginationModel?.pageSize ?? PAGE_SIZE_OPTIONS[1];
  const visibleRows =
    paginationMode === "client"
      ? rows.slice(page * pageSize, (page + 1) * pageSize)
      : rows;

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {!loading && visibleRows.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 4 }}
        >
          {noRowsLabel}
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {visibleRows.map((row, index) => {
          const id = getRowId ? getRowId(row) : (row.id ?? index);
          return (
            <Box
              key={id}
              sx={{
                p: 1.5,
                border: "1px solid #E0E0E0",
                borderLeft: "3px solid",
                borderLeftColor: "secondary.main",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              {titleColumn && (
                <Box sx={{ fontWeight: 600, mb: detailColumns.length ? 1 : 0 }}>
                  {renderValue(titleColumn, row, id)}
                </Box>
              )}

              {detailColumns.map((col) => (
                <Box
                  key={col.field}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {col.headerName ?? col.field}
                  </Typography>
                  <Box sx={{ minWidth: 0, textAlign: "right", wordBreak: "break-word" }}>
                    {renderValue(col, row, id)}
                  </Box>
                </Box>
              ))}

              {actionsColumn && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    {renderValue(actionsColumn, row, id)}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>

      <PaginationBar
        compact
        count={rowCount ?? rows.length}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
      />
    </Box>
  );
}

export function PaginatedDataGrid({
  rows,
  columns,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  getRowId,
  noRowsLabel = "Aucune donnée",
  paginationMode = "server",
  ...props
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Pendant le chargement d'une page, rowCount peut tomber à 0 : le DataGrid
  // ramènerait alors à la page 1. On garde donc le dernier total connu.
  const lastRowCount = useRef(rowCount ?? 0);
  if (!loading && rowCount !== undefined) lastRowCount.current = rowCount;
  const stableRowCount = loading ? lastRowCount.current : (rowCount ?? rows.length);

  const sizedColumns = useMemo(
    () => computeColumnWidths(columns, rows),
    [columns, rows],
  );

  if (isMobile) {
    return (
      <CardList
        rows={rows}
        columns={columns}
        loading={loading}
        rowCount={stableRowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        getRowId={getRowId}
        noRowsLabel={noRowsLabel}
        paginationMode={paginationMode}
      />
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ height: "clamp(380px, calc(100dvh - 330px), 740px)", width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={sizedColumns}
          loading={loading}
          rowCount={stableRowCount}
          paginationMode={paginationMode}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          disableRowSelectionOnClick
          hideFooter
          getRowId={getRowId}
          localeText={{
            noRowsLabel,
            loadingOverlay: "Chargement...",
          }}
          {...props}
        />
      </Box>
      <PaginationBar
        count={stableRowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
      />
    </Box>
  );
}
