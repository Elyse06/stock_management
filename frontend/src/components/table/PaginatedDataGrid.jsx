import { useMemo, useRef } from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";

import { CardList } from "./CardList";
import { computeColumnWidths } from "./columnWidths";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";

import { PaginationBar } from "./PaginationBar";

/**
 * Tableau paginé : DataGrid sur bureau, liste de cartes sur mobile.
 * Les props de ``usePaginatedList().gridProps`` peuvent être passées telles quelles.
 */
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
