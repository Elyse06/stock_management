import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  QrCode as QrCodeIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { QRCodeSVG } from "qrcode.react";

// ====== HELPERS LOCAUX ======
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

/**
 * Modal d'affichage des détails d'un mouvement.
 *
 * Props :
 * - mouvement : objet mouvement à afficher (ou null)
 * - isOpen : boolean
 * - onClose : function
 */
export function MouvementDetailModal({ mouvement, isOpen, onClose }) {
  if (!mouvement) return null;

  // ====== COLONNES DU DATAGRID ARTICLES ======
  const articlesColumns = [
    { field: "article_designation", headerName: "Article", flex: 1 },
    {
      field: "quantite",
      headerName: "Quantité",
      width: 100,
      headerAlign: "center",
      align: "center",
    },
    ...(mouvement.type_mouvement === "SORTIE"
      ? [
          {
            field: "employe_beneficiaire_nom",
            headerName: "Bénéficiaire",
            flex: 1,
            renderCell: (params) =>
              params.value || <Chip label="—" size="small" variant="outlined" />,
          },
        ]
      : []),
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* ====== HEADER ====== */}
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
          Mouvement #{mouvement.mouvement_id}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ====== BODY ====== */}
      <DialogContent sx={{ pt: 3 }}>
        {/* ====== INFOS GÉNÉRALES ====== */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            Informations générales
          </Typography>

          <Grid container spacing={2}>
            {/* Type */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Type
              </Typography>
              <Chip
                label={getTypeLabel(mouvement.type_mouvement)}
                color={getTypeColor(mouvement.type_mouvement)}
                size="small"
              />
            </Grid>

            {/* Source */}
            {mouvement.magasin_source_nom && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Source
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {mouvement.magasin_source_nom}
                </Typography>
              </Grid>
            )}

            {/* Destination */}
            {mouvement.magasin_destination_nom && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Destination
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {mouvement.magasin_destination_nom}
                </Typography>
              </Grid>
            )}

            {/* Date */}
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body1">
                {new Date(mouvement.date).toLocaleString("fr-FR")}
              </Typography>
            </Grid>

            {/* Origine */}
            {mouvement.origine && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Origine / Provenance
                </Typography>
                <Typography variant="body1">{mouvement.origine}</Typography>
              </Grid>
            )}

            {/* Motif */}
            {mouvement.motif && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Motif
                </Typography>
                <Typography variant="body1">{mouvement.motif}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* ====== BÉNÉFICIAIRES AVEC QR CODE (SORTIE uniquement) ====== */}
        {mouvement.type_mouvement === "SORTIE" && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h3" sx={{ mb: 1.5 }}>
              Bénéficiaires & QR Codes
            </Typography>

            {mouvement.details?.some((d) => d.employe_beneficiaire_nom) ? (
              <Grid container spacing={2}>
                {mouvement.details
                  .filter((d) => d.employe_beneficiaire_nom)
                  .map((detail, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "#FAFAFA",
                          borderRadius: 1,
                          border: "1px solid #E0E0E0",
                          height: "100%",
                        }}
                      >
                        {/* Infos bénéficiaire */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <PersonIcon fontSize="small" color="primary" />
                            <Typography variant="body1" fontWeight={600}>
                              {detail.employe_beneficiaire_nom}
                            </Typography>
                          </Box>
                          {detail.employe_beneficiaire_matricule && (
                            <Typography variant="body2" color="text.secondary">
                              Matricule : {detail.employe_beneficiaire_matricule}
                            </Typography>
                          )}
                          {detail.employe_beneficiaire_fonction && (
                            <Typography variant="body2" color="text.secondary">
                              Fonction : {detail.employe_beneficiaire_fonction}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Article :</strong> {detail.article_designation}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Quantité :</strong>{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              fontWeight={700}
                              fontFamily="monospace"
                              color="primary.main"
                            >
                              {detail.quantite}
                            </Typography>
                          </Typography>
                        </Box>

                        {/* ✅ QR Code visuel */}
                        {detail.qr_code_data && (
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: "#FFFFFF",
                              borderRadius: 1,
                              border: "1px solid #E0E0E0",
                              textAlign: "center",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 0.5,
                                mb: 1,
                              }}
                            >
                              <QrCodeIcon fontSize="small" color="primary" />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                              >
                                QR Code de traçabilité
                              </Typography>
                            </Box>
                            <QRCodeSVG
                              value={detail.qr_code_data}
                              size={150}
                              level="M"
                              includeMargin={true}
                            />
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <Alert severity="info">
                Aucun bénéficiaire spécifié pour cette sortie.
              </Alert>
            )}
          </Box>
        )}

        {/* ====== ARTICLES ====== */}
        <Box>
          <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
            Articles ({mouvement.details?.length ?? 0})
          </Typography>
          <Box sx={{ height: 300 }}>
            <DataGrid
              rows={mouvement.details ?? []}
              columns={articlesColumns}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              localeText={{ noRowsLabel: "Aucun article" }}
            />
          </Box>
        </Box>
      </DialogContent>

      {/* ====== FOOTER ====== */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}