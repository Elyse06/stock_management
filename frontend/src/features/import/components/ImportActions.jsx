import { Stack, Button, CircularProgress } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ReplayIcon from "@mui/icons-material/Replay";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";

export function ImportActions({
  etape,
  ETAPES,
  loading,
  fichier,
  lignesOk,
  onPrevisualiser,
  onConfirmer,
  onRecommencer,
  onAnnuler,
}) {
  return (
    <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
      {/* Étape CHOIX : Prévisualiser */}
      {etape === ETAPES.CHOIX && (
        <Button
          variant="contained"
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : <VisibilityIcon />
          }
          onClick={onPrevisualiser}
          disabled={!fichier || loading}
        >
          {loading ? "Analyse…" : "Prévisualiser"}
        </Button>
      )}

      {/* Étape APERCU : Confirmer / Recommencer / Annuler */}
      {etape === ETAPES.APERCU && (
        <>
          {loading && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={onAnnuler}
            >
              Annuler
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ReplayIcon />}
            onClick={onRecommencer}
            disabled={loading}
          >
            Choisir un autre fichier
          </Button>
          <Button
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />
            }
            onClick={onConfirmer}
            disabled={loading || lignesOk === 0}
            sx={{
              bgcolor: "#1A7F37",
              "&:hover": { bgcolor: "#14602B" },
              "&.Mui-disabled": { bgcolor: "#C8E6C9", color: "#fff" },
            }}
          >
            {loading ? "Enregistrement…" : "Confirmer l'import"}
          </Button>
        </>
      )}

      {/* Étape CONFIRME : Recommencer */}
      {etape === ETAPES.CONFIRME && (
        <Button
          variant="contained"
          startIcon={<ReplayIcon />}
          onClick={onRecommencer}
        >
          Importer un autre fichier
        </Button>
      )}
    </Stack>
  );
}