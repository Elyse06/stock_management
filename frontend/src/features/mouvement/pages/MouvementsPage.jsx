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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { MouvementFormModal } from "../components/MouvementFormModal";

export function MouvementsPage() {
  const { hasAction, hasAnyAction } = useAuth();
  
  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('MVT_CREATE');
  // Exemple: const canView = hasAction('MVT_VIEW');
  // Pour l'instant, tous les utilisateurs connectés peuvent éditer
  const canEdit = true;

  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);

  // Filtres
  const [filterType, setFilterType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // Modal détails
  const [selectedMouvement, setSelectedMouvement] = useState(null);

  // Modal création
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
      };
      
      // Ajouter le filtre par type si sélectionné
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

  // Filtrage côté client pour les dates (l'API ne supporte pas le filtrage par date)
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
      renderCell: (params) => {
        const mouvement = params.row;
        const isManual = ["ENTREE", "TRANSFERT"].includes(mouvement.type_mouvement);

        return (
          <Tooltip title="Voir les détails">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setSelectedMouvement(mouvement)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Box>
      {/* Header */}
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

      {/* Toolbar avec filtres */}
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
          <Button
            variant="outlined"
            size="small"
            onClick={reinitialiserFiltres}
          >
            Réinitialiser
          </Button>
        )}
      </Box>

      {/* Erreur */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
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

      {/* Modal Détails */}
      <Dialog
        open={Boolean(selectedMouvement)}
        onClose={() => setSelectedMouvement(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#FFF8E1",
            borderBottom: "2px solid",
            borderColor: "primary.main",
          }}
        >
          <Typography variant="h3">
            Mouvement #{selectedMouvement?.mouvement_id}
          </Typography>
          <IconButton onClick={() => setSelectedMouvement(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedMouvement && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Type
                </Typography>
                <Chip
                  label={getTypeLabel(selectedMouvement.type_mouvement)}
                  color={getTypeColor(selectedMouvement.type_mouvement)}
                  size="small"
                />
              </Box>

              {selectedMouvement.magasin_source_nom && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {selectedMouvement.magasin_source_nom}
                  </Typography>
                </Box>
              )}

              {selectedMouvement.magasin_destination_nom && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="body1">
                    {selectedMouvement.magasin_destination_nom}
                  </Typography>
                </Box>
              )}

              {selectedMouvement.origine && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Origine / Provenance
                  </Typography>
                  <Typography variant="body1">
                    {selectedMouvement.origine}
                  </Typography>
                </Box>
              )}

              {selectedMouvement.motif && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Motif
                  </Typography>
                  <Typography variant="body1">
                    {selectedMouvement.motif}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedMouvement.date).toLocaleString("fr-FR")}
                </Typography>
              </Box>

              <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
                Articles ({selectedMouvement.details?.length ?? 0})
              </Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={selectedMouvement.details ?? []}
                  columns={[
                    { field: "article_designation", headerName: "Article", flex: 1 },
                    {
                      field: "quantite",
                      headerName: "Quantité",
                      width: 100,
                      headerAlign: "center",
                      align: "center",
                    },
                  ]}
                  disableRowSelectionOnClick
                  getRowId={(row) => row.id}
                  localeText={{ noRowsLabel: "Aucun article" }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedMouvement(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Création */}
      <MouvementFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={charger}
      />
    </Box>
  );
}