import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Skeleton,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Close as CloseIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { mouvementsApi } from "../api/mouvementsApi";
import { StatusChip } from "@/components/data-display/StatusChip";
import { CodeChip } from "@/components/data-display/CodeChip";
import { BoutonPdf } from "@/components/table/BoutonPdf";
import { API_ENDPOINTS } from "@/config/endpoints";
import { MouvementInfoSection } from "./MouvementInfoSection";
import { MouvementArticlesTable } from "./MouvementArticlesTable";

function ArticlesSkeleton({ count }) {
  return (
    <Box>
      <Skeleton width={160} height={32} sx={{ mb: 1 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {Array.from({ length: Math.min(Math.max(count, 1), 4) }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={88} />
        ))}
      </Box>
    </Box>
  );
}

const titrePdf = (m) =>
  m.type_mouvement === "RETOUR" || (m.type_mouvement === "SORTIE" && m.origine?.startsWith("Transfert unité"))
    ? "Télécharger l'accusé (PDF)"
    : "Télécharger la fiche du mouvement (PDF)";

export function MouvementDetailModal({ mouvement, isOpen, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const id = mouvement?.mouvement_id;

  // La liste n'envoie pas les détails : ils sont chargés ici, à l'ouverture
  const { data: complet, isLoading, error, refetch } = useQuery({
    queryKey: ["mouvement", id],
    queryFn: ({ signal }) => mouvementsApi.get(id, { signal }),
    enabled: Boolean(isOpen && id),
    staleTime: 1000 * 60,
  });

  if (!mouvement) return null;

  // Les infos de la ligne s'affichent tout de suite, les articles arrivent ensuite
  const courant = complet ?? mouvement;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
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
              Mouvement
            </Typography>
            <CodeChip value={`#${mouvement.mouvement_id}`} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <StatusChip status={mouvement.type_mouvement} />
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          {/* Retour : accusé de retour ; transfert d'une unité : accusé de retour et de réception ; sinon fiche. */}
          <BoutonPdf url={`${API_ENDPOINTS.MOUVEMENTS}${mouvement.mouvement_id}/pdf/`} nomFichier={`mouvement_${mouvement.mouvement_id}.pdf`}
            titre={titrePdf(mouvement)} />
          <IconButton onClick={onClose} size="small" aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
        <MouvementInfoSection mouvement={courant} resume={mouvement} />

        {isLoading && <ArticlesSkeleton count={mouvement.nb_articles ?? 1} />}

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
            Impossible de charger les articles de ce mouvement.
          </Alert>
        )}

        {complet && <MouvementArticlesTable mouvement={complet} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: "1px solid #E0E0E0", bgcolor: "#FAFAFA" }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
