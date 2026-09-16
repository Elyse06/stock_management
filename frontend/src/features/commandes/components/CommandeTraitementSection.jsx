import { Box, Typography, TextField, Divider, CircularProgress } from "@mui/material";
import { Store as StoreIcon } from "@mui/icons-material";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { ArticleUniteSelector } from "./ArticleUniteSelector";

export function CommandeTraitementSection({
  commande,
  articles,
  magasinSource,
  onMagasinSourceChange,
  magasinOptions,
  unitesDisponibles,
  loadingUnites,
  unitesSelectionnees,
  onToggleUnite,
  commentaire,
  onCommentaireChange,
  isAgentPrincipal,
}) {
  const getArticle = (codeArticle) =>
    articles.find((a) => a.code_article === codeArticle);

  return (
    <Box>
      <Divider sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "text.secondary",
          }}
        >
          <StoreIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            Traitement de la commande
          </Typography>
        </Box>
      </Divider>

      {isAgentPrincipal && commande.statut === "EN_COURS" && (
        <>
          <SelectFilter
            label="Magasin source pour la sortie de stock"
            value={magasinSource}
            onChange={onMagasinSourceChange}
            options={magasinOptions}
            required
          />

          {magasinSource && loadingUnites && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Chargement des unités disponibles...
              </Typography>
            </Box>
          )}

          {magasinSource &&
            !loadingUnites &&
            Object.keys(unitesDisponibles).length > 0 && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                  Sélection des unités à attribuer
                </Typography>
                {commande.details.map((detail) => {
                  const article = getArticle(detail.article);
                  if (article?.mode_suivi !== "NUMERO_SERIE") return null;
                  return (
                    <ArticleUniteSelector
                      key={detail.id}
                      article={article}
                      detailId={detail.id}
                      unitesDisponibles={unitesDisponibles[detail.article] || []}
                      unitesSelectionnees={unitesSelectionnees[detail.id] || []}
                      quantiteRequise={Number(detail.quantite)}
                      onToggleUnite={onToggleUnite}
                    />
                  );
                })}
              </Box>
            )}
        </>
      )}

      <TextField
        label="Commentaire (optionnel)"
        value={commentaire}
        onChange={onCommentaireChange}
        fullWidth
        margin="normal"
        multiline
        rows={2}
        inputProps={{ maxLength: 255 }}
      />
    </Box>
  );
}