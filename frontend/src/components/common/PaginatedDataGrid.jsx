import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

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
  return (
    <Box sx={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        rowCount={rowCount}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        getRowId={getRowId}
        localeText={{
          noRowsLabel,
          loadingOverlay: "Chargement...",
        }}
        {...props}
      />
    </Box>
  );
}