import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Skeleton,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { inventairesApi } from "../api/stockApi";
import { useValiderInventaire } from "../hooks/useValiderInventaire";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { StatusChip } from "@/components/data-display/StatusChip";
import { CodeChip } from "@/components/data-display/CodeChip";
import { BoutonPdf } from "@/components/table/BoutonPdf";
import { API_ENDPOINTS } from "@/config/endpoints";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { InventaireInfoSection } from "./InventaireInfoSection";
import { InventaireStatsCards } from "./InventaireStatsCards";
import { InventaireArticlesTable } from "./InventaireArticlesTable";
import { PropositionsSeriesDisplay } from "./PropositionsSeriesDisplay";

const aDesPropositions = (ligne) =>
  ligne.article_mode_suivi === "NUMERO_SERIE" &&
  ligne.propositions_series &&
  Object.keys(ligne.propositions_series).length > 0;

export function InventaireDetailsModal({ session, isOpen, onClose, onSuccess }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { canValidateInventaire } = usePermission();
  const { confirm, dialogProps } = useConfirmDialog();
  const valider = useValiderInventaire();
  const validating = valider.isPending;
  const id = session?.inventaire_id;

  // La liste n'a pas besoin des lignes : on les charge ici, à l'ouverture
  const { data: complet, isLoading, error, refetch } = useQuery({
    queryKey: ["inventaire", id],
    queryFn: ({ signal }) => inventairesApi.get(id, { signal }),
    enabled: Boolean(isOpen && id),
    staleTime: 1000 * 30,
  });

  if (!session) return null;

  // Les infos de la ligne s'affichent tout de suite ; les lignes arrivent ensuite
  const courant = complet ?? session;
  const lignes = complet?.lignes ?? null;
  const nbEcarts = lignes ? lignes.filter((l) => Number(l.ecart) !== 0).length : 0;
  const ecartTotal = lignes ? lignes.reduce((sum, l) => sum + (Number(l.ecart) || 0), 0) : 0;
  const peutValider = canValidateInventaire && courant.statut === "EN_ATTENTE" && Boolean(lignes);

  const handleValider = () => {
    confirm(
      "Valider l'inventaire",
      "Voulez-vous vraiment valider cet inventaire ? Cette action est irréversible. Continuer ?",
      () => valider.mutate(session.inventaire_id, { onSuccess: () => onSuccess?.() })
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 2 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1,
          bgcolor: "tint.main",
          borderBottom: "2px solid",
          borderColor: "secondary.main",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h3" component="span">
              Inventaire
            </Typography>
            {courant.code_reference && <CodeChip value={courant.code_reference} />}
            {courant.statut === "VALIDE" && (
              <BoutonPdf url={`${API_ENDPOINTS.INVENTAIRES}${courant.inventaire_id}/pdf/`}
                nomFichier={`inventaire_${courant.code_reference}.pdf`} titre="Fiche PDF de l'inventaire" />
            )}
          </Box>
          <Box sx={{ mt: 1 }}>
            <StatusChip status={courant.statut} />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
        <InventaireInfoSection session={courant} />

        {isLoading && (
          <Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: 3 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={72} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={220} />
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Réessayer
              </Button>
            }
          >
            Impossible de charger les articles de cet inventaire.
          </Alert>
        )}

        {lignes && (
          <>
            <InventaireStatsCards
              nbArticles={lignes.length}
              nbEcarts={nbEcarts}
              ecartTotal={ecartTotal}
            />

            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <InventoryIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Détails des articles
                </Typography>
              </Box>
            </Divider>

            <InventaireArticlesTable lignes={lignes} />

            {lignes.some(aDesPropositions) && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Détail des propositions de numéros de série
                  </Typography>
                </Divider>
                {lignes.filter(aDesPropositions).map((ligne) => (
                  <Box key={ligne.id} sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {ligne.article} - {ligne.article_designation}
                    </Typography>
                    <PropositionsSeriesDisplay propositions={ligne.propositions_series} />
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: "1px solid #E0E0E0",
          bgcolor: "#FAFAFA",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button onClick={onClose} disabled={validating}>
          Fermer
        </Button>
        {peutValider && (
          <Button
            variant="contained"
            color="success"
            onClick={handleValider}
            disabled={validating}
            startIcon={
              validating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />
            }
          >
            {validating ? "Validation..." : "Valider l'inventaire"}
          </Button>
        )}
      </DialogActions>

      <ConfirmDialog {...dialogProps} />
    </Dialog>
  );
}
