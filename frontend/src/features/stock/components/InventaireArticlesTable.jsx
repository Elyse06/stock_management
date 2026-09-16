import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";

export function InventaireArticlesTable({ lignes }) {
  const columns = [
    { field: "article", headerName: "Code", width: 120, renderCell: (params) => <CodeChip value={params.value} /> },
    { field: "article_designation", headerName: "Article", flex: 1, minWidth: 200 },
    {
      field: "quantite_theorique", headerName: "Théorique", width: 120, headerAlign: "center", align: "center",
      renderCell: (params) => <Typography variant="body2" fontFamily="monospace">{params.value}</Typography>,
    },
    {
      field: "quantite_physique", headerName: "Physique", width: 120, headerAlign: "center", align: "center",
      renderCell: (params) => <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{params.value}</Typography>,
    },
    {
      field: "ecart", headerName: "Écart", width: 120, headerAlign: "center", align: "center",
      renderCell: (params) => {
        const ecart = Number(params.value);
        return (
          <Typography variant="body2" fontFamily="monospace" fontWeight={700} sx={{ color: ecart === 0 ? "success.main" : "error.main" }}>
            {ecart > 0 ? `+${ecart}` : ecart}
          </Typography>
        );
      },
    },
    { field: "commentaire", headerName: "Commentaire", flex: 1, minWidth: 180, renderCell: (params) => <EmptyValue value={params.value} /> },
  ];

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 1 }}>Articles inventoriés ({lignes.length})</Typography>
      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={lignes}
          columns={columns}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          localeText={{ noRowsLabel: "Aucun article dans cet inventaire." }}
        />
      </Box>
    </Box>
  );
}