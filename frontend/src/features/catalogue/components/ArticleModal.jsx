import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Grid,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  QrCode as QrCodeIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  Straighten as StraightenIcon,
  Description as DescriptionIcon,
  People as PeopleIcon,
} from "@mui/icons-material";

/**
 * Modal d'affichage des détails d'un article (lecture seule).
 */
export function ArticleModal({ article, isOpen, onClose, onEdit }) {
  const navigate = useNavigate();

  // Fermer avec Échap (géré automatiquement par MUI Dialog)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!article) return null;

  const handleEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(article);
    } else {
      navigate(`/catalogue/${article.code_article}/modifier`);
    }
  };

  // Couleur du chip catégorie selon le libellé
  const getCategorieColor = (cat) => {
    if (!cat) return "default";
    const c = cat.toLowerCase();
    if (c.includes("info")) return "info";
    if (c.includes("bureau")) return "primary";
    if (c.includes("consommable")) return "warning";
    return "default";
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* ====== HEADER ====== */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Box>
          {article.categorie_nom && (
            <Chip
              label={article.categorie_nom}
              color={getCategorieColor(article.categorie_nom)}
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

      {/* ====== BODY ====== */}
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          {/* Code article */}
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

          {/* Catégorie */}
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

          {/* Marque */}
          {article.marque_libelle && (
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <LabelIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Marque
                </Typography>
              </Box>
              <Typography variant="body1">{article.marque_libelle}</Typography>
            </Grid>
          )}

          {/* Code-barre */}
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

          {/* Unité */}
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

          {/* Modèle */}
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

          {/* Description */}
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

        {/* ====== FOURNISSEURS ====== */}
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
              <PeopleIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>
                Fournisseurs & Prix d'achat
              </Typography>
            </Box>
          </Divider>

          {article.fournisseurs && article.fournisseurs.length > 0 ? (
            <List dense disablePadding>
              {article.fournisseurs.map((f) => (
                <ListItem
                  key={f.id}
                  sx={{
                    bgcolor: "#FAFAFA",
                    mb: 0.5,
                    borderRadius: 1,
                    border: "1px solid #E0E0E0",
                  }}
                >
                  <ListItemText
                    primary={f.fournisseur_nom}
                    secondary={
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        color="primary.main"
                        fontWeight={600}
                      >
                        {Number(f.prix_achat).toLocaleString("fr-FR")} Ar
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box
              sx={{
                textAlign: "center",
                py: 3,
                color: "text.secondary",
                bgcolor: "#FAFAFA",
                borderRadius: 1,
              }}
            >
              <PeopleIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Aucun fournisseur associé</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* ====== FOOTER ====== */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          Modifier
        </Button>
        <Button variant="contained" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}