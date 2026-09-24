import { Box, Typography, Chip } from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { CodeChip } from "../../../components/common/CodeChip";
import { EmptyValue } from "../../../components/common/EmptyValue";

export function InventaireArticlesTable({ lignes }) {
  const renderPropositions = (propositions) => {
    if (!propositions || Object.keys(propositions).length === 0) {
      return <EmptyValue value={null} />;
    }

    const ajouts = propositions.ajouts || [];
    const retraits = propositions.retraits || [];
    const changements = propositions.changements_etat || [];

    return (
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {ajouts.length > 0 && (
          <Chip
            icon={<AddIcon sx={{ fontSize: 14 }} />}
            label={`+${ajouts.length}`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
            title={`${ajouts.length} ajout(s) de n° de série`}
          />
        )}
        {retraits.length > 0 && (
          <Chip
            icon={<RemoveIcon sx={{ fontSize: 14 }} />}
            label={`-${retraits.length}`}
            size="small"
            color="error"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
            title={`${retraits.length} retrait(s) (perdu/hors usage)`}
          />
        )}
        {changements.length > 0 && (
          <Chip
            icon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
            label={`~${changements.length}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
            title={`${changements.length} changement(s) d'état`}
          />
        )}
      </Box>
    );
  };

  const columns = [
    {
      field: "article_designation",
      headerName: "Article",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "quantite_theorique",
      headerName: "Théorique",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: "quantite_physique",
      headerName: "Physique",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const isNS = params.row.article_mode_suivi === "NUMERO_SERIE";
        return (
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontWeight={600}
            sx={{ color: isNS ? "text.disabled" : "inherit" }}
          >
            {isNS ? "—" : params.value}
          </Typography>
        );
      },
    },
    {
      field: "ecart",
      headerName: "Écart",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const isNS = params.row.article_mode_suivi === "NUMERO_SERIE";
        if (isNS) {
          return (
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{ color: "text.disabled" }}
            >
              —
            </Typography>
          );
        }
        const ecart = Number(params.value);
        return (
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontWeight={700}
            sx={{ color: ecart === 0 ? "success.main" : "error.main" }}
          >
            {ecart > 0 ? `+${ecart}` : ecart}
          </Typography>
        );
      },
    },
    /* Utiliser pour l'implementation de numero de série
    {
      field: "propositions_series",
      headerName: "Propositions",
      width: 180,
      renderCell: (params) => renderPropositions(params.value),
    },
   */
    {
      field: "commentaire",
      headerName: "Commentaire",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => <EmptyValue value={params.value} />,
    },
  ];

  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Articles inventoriés ({lignes.length})
      </Typography>
      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={lignes}
          columns={columns}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          localeText={{ noRowsLabel: "Aucun article dans cet inventaire." }}
        />
      </Box>
    </Box>
  );
}