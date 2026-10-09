import { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Close as CloseIcon,
  QrCode as QrCodeIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  Straighten as StraightenIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";

export function ArticleModal({ article, isOpen, onClose }) {

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!article) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          bgcolor: "tint.main",
          borderBottom: "2px solid",
          borderColor: "secondary.main",
        }}
      >
        <Box>
          {article.categorie_nom && (
            <Chip
              label={article.categorie_nom}
              size="small"
              sx={{ mb: 1, fontWeight: 600 }}
            />
          )}
          <Typography variant="h3" sx={{ lineHeight: 1.3 }}>
            {article.designation}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <QrCodeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Code article
              </Typography>
            </Box>
            <Typography
              variant="body1"
              fontFamily="monospace"
              fontWeight={600}
              sx={{
                bgcolor: "#FAFAFA",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                display: "inline-block",
              }}
            >
              {article.code_article}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <CategoryIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Catégorie
              </Typography>
            </Box>
            <Typography variant="body1">
              {article.categorie_nom || "—"}
            </Typography>
          </Grid>

          {/** 
          {article.code_barre && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <QrCodeIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Code-barre
                </Typography>
              </Box>
              <Typography variant="body1" fontFamily="monospace">
                {article.code_barre}
              </Typography>
            </Grid>
          )}
          */}

          {article.unite && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <StraightenIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Unité
                </Typography>
              </Box>
              <Typography variant="body1">{article.unite}</Typography>
            </Grid>
          )}

          {article.modele && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <LabelIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Modèle
                </Typography>
              </Box>
              <Typography variant="body1">{article.modele}</Typography>
            </Grid>
          )}

          {article.description && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <DescriptionIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Description
                </Typography>
              </Box>
              <Box
                sx={{
                  bgcolor: "#FAFAFA",
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px solid #E0E0E0",
                }}
              >
                <Typography variant="body2">{article.description}</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}