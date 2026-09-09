import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Grid,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Person as PersonIcon,
  Store as StoreIcon,
  QrCode as QrCodeIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

// ✅ Helper pour parser le payload QR code
const parseQrPayload = (qrData) => {
  if (!qrData) return null;
  try {
    return typeof qrData === "string" ? JSON.parse(qrData) : qrData;
  } catch {
    return null;
  }
};

export function CommandeDetailModal({ commande, isOpen, onClose, onSuccess }) {
  const { hasAction, hasAnyAction } = useAuth();
  const isAgentPrincipal = hasAction("CAT_GERE") && hasAction("COM_VAL");
  const isAgentSecondaire = !hasAction("CAT_GERE") && hasAction("COM_VAL");

  const [magasins, setMagasins] = useState([]);
  const [magasinSource, setMagasinSource] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [traitement, setTraitement] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get("/api/stock/magasins/", { params: { page_size: 100 } })
        .then((res) => setMagasins(res.data.results ?? res.data))
        .catch(() => setError("Impossible de charger les magasins."));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMagasinSource("");
      setCommentaire("");
      setError("");
      setSuccess("");
    }
  }, [isOpen, commande]);

  if (!commande) return null;

  const getStatusColor = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return "warning";
      case "EN_COURS": return "info";
      case "VALIDEE": return "success";
      case "REJETEE": return "error";
      default: return "default";
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return "En attente";
      case "EN_COURS": return "En cours";
      case "VALIDEE": return "Validée";
      case "REJETEE": return "Rejetée";
      default: return statut;
    }
  };

  const getStatusIcon = (statut) => {
    switch (statut) {
      case "EN_ATTENTE": return <HourglassEmptyIcon fontSize="small" />;
      case "EN_COURS": return <HourglassEmptyIcon fontSize="small" />;
      case "VALIDEE": return <CheckCircleIcon fontSize="small" />;
      case "REJETEE": return <CancelIcon fontSize="small" />;
      default: return null;
    }
  };

  const peutTraiter =
    (isAgentPrincipal && commande.statut === "EN_COURS") ||
    (isAgentSecondaire && commande.statut === "EN_ATTENTE");

  const traiter = async (statut) => {
    if (statut === "VALIDEE" && isAgentPrincipal && !magasinSource) {
      setError("Veuillez sélectionner un magasin source pour la sortie de stock.");
      return;
    }
    setTraitement(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        statut,
        commentaire_agent: commentaire.trim(),
      };
      if (statut === "VALIDEE" && magasinSource) {
        payload.magasin_source = Number(magasinSource);
      }
      await apiClient.post(
        `/api/commandes/commandes/${commande.commande_id}/traiter/`,
        payload
      );
      const messages = {
        EN_COURS: "Commande pré-validée avec succès.",
        VALIDEE: "Commande validée définitivement.",
        REJETEE: "Commande rejetée.",
      };
      setSuccess(messages[statut]);
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors du traitement de la commande.");
      }
    } finally {
      setTraitement(false);
    }
  };

  // ✅ Helper pour formater la date d'acquisition
  const formatAcquisition = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return {
      mois: d.toLocaleString("fr-FR", { month: "long" }),
      annee: d.getFullYear(),
    };
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h3">Commande #{commande.commande_id}</Typography>
          <Chip
            icon={getStatusIcon(commande.statut)}
            label={getStatusLabel(commande.statut)}
            color={getStatusColor(commande.statut)}
            size="small"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* INFOS GÉNÉRALES */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>Informations générales</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">Objet</Typography>
              <Typography variant="body1" fontWeight={500}>
                {commande.objet || "—"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Demandeur</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body1">
                  {commande.demandeur?.nom || commande.employe_demandeur}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Date de demande</Typography>
              <Typography variant="body1">
                {new Date(commande.date_commande).toLocaleString("fr-FR")}
              </Typography>
            </Box>
            {commande.traitant && (
              <Box>
                <Typography variant="body2" color="text.secondary">Traité par</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body1">{commande.traitant.nom}</Typography>
                </Box>
              </Box>
            )}
            {commande.date_traitement && (
              <Box>
                <Typography variant="body2" color="text.secondary">Date de traitement</Typography>
                <Typography variant="body1">
                  {new Date(commande.date_traitement).toLocaleString("fr-FR")}
                </Typography>
              </Box>
            )}
            {commande.commentaire_agent && (
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Typography variant="body2" color="text.secondary">Commentaire</Typography>
                <Box sx={{ bgcolor: "#FAFAFA", p: 1.5, borderRadius: 1, border: "1px solid #E0E0E0" }}>
                  <Typography variant="body2">{commande.commentaire_agent}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* ARTICLES DEMANDÉS */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            Articles demandés ({commande.details?.length ?? 0})
          </Typography>
          <Table
            size="small"
            sx={{
              border: "1px solid #E0E0E0",
              "& .MuiTableCell-root": { borderColor: "#E0E0E0", py: 1, px: 1.5 },
              "& .MuiTableHead-root .MuiTableCell-root": {
                bgcolor: "#FFF8E1",
                fontWeight: 600,
                fontSize: 13,
                borderBottom: "2px solid #F9A825",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Article</TableCell>
                <TableCell align="center" sx={{ width: 120 }}>Quantité</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Attributions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {commande.details?.length > 0 ? (
                commande.details.map((detail) => (
                  <TableRow key={detail.id} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{detail.article}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {detail.article_designation}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {detail.quantite}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {detail.attributions?.length > 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {detail.attributions.map((attr) => (
                            <Chip
                              key={attr.id}
                              label={`${attr.beneficiaire_nom} (${attr.quantite})`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<PersonIcon />}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Chip
                          label={commande.demandeur?.nom || commande.employe_demandeur}
                          size="small"
                          variant="outlined"
                          color="default"
                          sx={{ fontStyle: "italic", opacity: 0.7 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun article dans cette commande
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        {/* ✅ NOUVEAU : QR Codes des attributions (uniquement si commande validée) */}
        {commande.statut === "VALIDEE" && commande.details?.some((d) => d.attributions?.length > 0) && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <QrCodeIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  QR Codes de traçabilité
                </Typography>
              </Box>
            </Divider>
            <Grid container spacing={2}>
              {commande.details.flatMap((detail) =>
                (detail.attributions || []).map((attr) => {
                  const qrPayload = parseQrPayload(attr.qr_code_data);
                  if (!qrPayload) return null;
                  const acquisition = formatAcquisition(attr.date_acquisition);
                  return (
                    <Grid item xs={12} sm={6} key={`${detail.id}-${attr.id}`}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "#FAFAFA",
                          borderRadius: 1,
                          border: "1px solid #E0E0E0",
                          height: "100%",
                        }}
                      >
                        {/* QR Code */}
                        <Box sx={{ textAlign: "center", mb: 2 }}>
                          <QRCodeSVG
                            value={attr.qr_code_data}
                            size={120}
                            level="M"
                            includeMargin={true}
                          />
                        </Box>

                        {/* Infos bénéficiaire */}
                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                            <PersonIcon fontSize="small" color="primary" />
                            <Typography variant="body2" fontWeight={600}>
                              {qrPayload.beneficiaire?.emp_nom || attr.beneficiaire_nom}
                            </Typography>
                          </Box>
                          {qrPayload.beneficiaire?.emp_matricule && (
                            <Typography variant="caption" color="text.secondary">
                              Matricule : {qrPayload.beneficiaire.emp_matricule}
                            </Typography>
                          )}
                        </Box>

                        {/* ✅ Infos Agence/Site */}
                        {qrPayload.agence && (
                          <Box sx={{ mb: 1.5, p: 1, bgcolor: "#FFF8E1", borderRadius: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                              <BusinessIcon fontSize="small" color="primary" />
                              <Typography variant="caption" fontWeight={600}>
                                {qrPayload.agence.site_type === "SIEGE" ? "Siège" : "Agence"}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={500}>
                              {qrPayload.agence.site_nom}
                            </Typography>
                            {qrPayload.agence.direction && (
                              <Typography variant="caption" color="text.secondary">
                                {qrPayload.agence.direction}
                              </Typography>
                            )}
                            {qrPayload.agence.service && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {qrPayload.agence.service}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {/* ✅ Infos Acquisition */}
                        {acquisition && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              Acquis en{" "}
                              <strong>
                                {acquisition.mois} {acquisition.annee}
                              </strong>
                            </Typography>
                          </Box>
                        )}

                        {/* Article & Quantité */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" color="text.secondary">
                            {qrPayload.article?.designation || detail.article_designation}
                          </Typography>
                          <Chip
                            label={`×${qrPayload.quantite ?? attr.quantite}`}
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        </Box>

                        {/* Code unique */}
                        <Typography
                          variant="caption"
                          fontFamily="monospace"
                          color="text.secondary"
                          sx={{ mt: 1, display: "block", textAlign: "center" }}
                        >
                          {qrPayload.code_unique?.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })
              )}
            </Grid>
          </Box>
        )}

        {/* FORMULAIRE DE TRAITEMENT */}
        {peutTraiter && (
          <Box>
            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <StoreIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Traitement de la commande
                </Typography>
              </Box>
            </Divider>
            {isAgentPrincipal && commande.statut === "EN_COURS" && (
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Magasin source pour la sortie de stock</InputLabel>
                <Select
                  value={magasinSource}
                  label="Magasin source pour la sortie de stock"
                  onChange={(e) => setMagasinSource(e.target.value)}
                >
                  <MenuItem value="">Sélectionner un magasin</MenuItem>
                  {magasins.map((m) => (
                    <MenuItem key={m.magasin_id} value={m.magasin_id}>
                      {m.magasin_nom}
                      {m.localite_nom ? ` (${m.localite_nom})` : m.localite ? ` (${m.localite})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
              inputProps={{ maxLength: 255 }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={traitement}>Fermer</Button>
        {peutTraiter && (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={() => traiter("REJETEE")}
              disabled={traitement}
              startIcon={traitement ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              Rejeter
            </Button>
            {isAgentSecondaire && commande.statut === "EN_ATTENTE" && (
              <Button
                variant="outlined"
                color="info"
                onClick={() => traiter("EN_COURS")}
                disabled={traitement}
                startIcon={traitement ? <CircularProgress size={16} /> : <HourglassEmptyIcon />}
              >
                Pré-valider
              </Button>
            )}
            {isAgentPrincipal && commande.statut === "EN_COURS" && (
              <Button
                variant="contained"
                color="success"
                onClick={() => traiter("VALIDEE")}
                disabled={traitement || !magasinSource}
                startIcon={traitement ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                Valider
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}