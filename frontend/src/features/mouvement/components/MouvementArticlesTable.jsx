import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { EmptyValue } from "../../../components/common/EmptyValue";

export function MouvementArticlesTable({ mouvement }) {
  const columns = [
    { field: "article_designation", headerName: "Article", flex: 1 },
    { field: "quantite", headerName: "Quantité", width: 100, headerAlign: "center", align: "center" },
    ...(mouvement.type_mouvement === "ENTREE"
      ? [
        { field: "fournisseur_nom", headerName: "Fournisseur", flex: 1, renderCell: (params) => <EmptyValue value={params.value} /> },
        { field: "prix_achat", headerName: "Prix d'achat (MGA)", flex: 1, renderCell: (params) => <EmptyValue value={params.value} /> }
      ]
      : []),
    ...(mouvement.type_mouvement === "SORTIE"
      ? [{ field: "employe_beneficiaire_nom", headerName: "Bénéficiaire", flex: 1, renderCell: (params) => <EmptyValue value={params.value} /> }]
      : []),
  ];

  return (
    <Box>
      <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
        Articles ({mouvement.details?.length ?? 0})
      </Typography>
      <Box sx={{ height: 300 }}>
        <DataGrid
          rows={mouvement.details ?? []}
          columns={columns}
          disableRowSelectionOnClick
          getRowId={(row, index) => row.id ?? row.article_code ?? `article-${index}`}
          localeText={{ noRowsLabel: "Aucun article" }}
        />
      </Box>
    </Box>
  );
}