import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { MouvementFormModal } from "../components/MouvementFormModal";
import { MouvementDetailModal } from "../components/MouvementDetailModal";

export function MouvementsPage() {
  const { hasAction, hasAnyAction } = useAuth();

  //const canEdit = true;
  const canEdit = hasAnyAction("CAT_GERE", "INV_GERE");

  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  const [filterType, setFilterType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [selectedMouvement, setSelectedMouvement] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      if (filterType) {
        params.type_mouvement = filterType;
      }

      const { data } = await apiClient.get("/api/stock/mouvements/", { params });
      setMouvements(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError("Impossible de charger les mouvements.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, filterType]);

  useEffect(() => {
    charger();
  }, [charger]);

  const mouvementsFiltres = mouvements.filter((mouvement) => {
    if (!dateDebut && !dateFin) return true;
    const mouvementDate = new Date(mouvement.date);
    mouvementDate.setHours(0, 0, 0, 0);

    if (dateDebut) {
      const debut = new Date(dateDebut);
      debut.setHours(0, 0, 0, 0);
      if (mouvementDate < debut) return false;
    }

    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      if (mouvementDate > fin) return false;
    }

    return true;
  });

  const reinitialiserFiltres = () => {
    setFilterType("");
    setDateDebut("");
    setDateFin("");
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "ENTREE":
        return "success";
      case "SORTIE":
        return "error";
      case "TRANSFERT":
        return "info";
      case "AJUSTEMENT":
        return "warning";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "ENTREE":
        return "Entrée";
      case "SORTIE":
        return "Sortie";
      case "TRANSFERT":
        return "Transfert";
      case "AJUSTEMENT":
        return "Ajustement";
      default:
        return type;
    }
  };

  const columns = [
    {
      field: "mouvement_id",
      headerName: "ID",
      width: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "type_mouvement",
      headerName: "Type",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={getTypeLabel(params.value)}
          color={getTypeColor(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "magasin_source_nom",
      headerName: "Source",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "magasin_destination_nom",
      headerName: "Destination",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "date",
      headerName: "Date",
      width: 180,
      renderCell: (params) => new Date(params.value).toLocaleString("fr-FR"),
    },
    {
      field: "nb_articles",
      headerName: "Articles",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.row.details?.length ?? 0,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Tooltip title="Voir les détails">
          <IconButton
            size="small"
            color="primary"
            onClick={() => setSelectedMouvement(params.row)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h2">Mouvements de stock</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Nouveau mouvement
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 2,
          p: 2,
          bgcolor: "#FAFAFA",
          borderRadius: 1,
          border: "1px solid #E0E0E0",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="ENTREE">Entrées</MenuItem>
            <MenuItem value="SORTIE">Sorties</MenuItem>
            <MenuItem value="TRANSFERT">Transferts</MenuItem>
            <MenuItem value="AJUSTEMENT">Ajustements</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Du"
          type="date"
          size="small"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        <TextField
          label="Au"
          type="date"
          size="small"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        {(filterType || dateDebut || dateFin) && (
          <Button variant="outlined" size="small" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={mouvementsFiltres}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          getRowId={(row) => row.mouvement_id}
          localeText={{
            noRowsLabel: "Aucun mouvement",
            loadingOverlay: "Chargement...",
          }}
        />
      </Box>

      <MouvementDetailModal
        mouvement={selectedMouvement}
        isOpen={Boolean(selectedMouvement)}
        onClose={() => setSelectedMouvement(null)}
      />

      <MouvementFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={charger}
      />
    </Box>
  );
}