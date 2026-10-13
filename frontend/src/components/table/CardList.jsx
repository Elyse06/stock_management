import { Box, Divider, LinearProgress, Typography } from "@mui/material";

import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

import { PaginationBar } from "./PaginationBar";

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
export function CardList({
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
  const pageSize = paginationModel?.pageSize ?? DEFAULT_PAGE_SIZE;
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

