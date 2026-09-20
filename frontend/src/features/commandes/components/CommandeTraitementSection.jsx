import { useState } from "react";
import { Box, Typography, TextField, Divider, CircularProgress, Radio, RadioGroup, FormControlLabel, Paper } from "@mui/material";
import { Store as StoreIcon } from "@mui/icons-material";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { StatutAttributionBadge } from "../../../components/common/StatutAttributionBadge";
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
  validations,
  setValidations,
}) {
  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);

  // Handler pour mettre à jour une décision
  const handleValidationChange = (attributionId, field, value) => {
    setValidations((prev) => ({
      ...prev,
      [attributionId]: {
        ...prev[attributionId],
        [field]: value,
      },
    }));
  };

  return (
    <Box>
      <Divider sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
          <StoreIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>Traitement de la commande</Typography>
        </Box>
      </Divider>

      {/* SECTION 1 : Validation des attributions — agent principal uniquement */}
      {isAgentPrincipal && commande.details?.map((detail) => {
        const article = getArticle(detail.article);
        if (!detail.attributions || detail.attributions.length === 0) return null;

        return (
          <Box key={detail.id} sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              {article?.designation} ({article?.code_article})
            </Typography>
            
            {detail.attributions.map((attr) => {
              const decision = validations[attr.id] || { statut: attr.statut || "EN_ATTENTE" };
              
              return (
                <Paper key={attr.id} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: "#FAFAFA" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {attr.beneficiaire_nom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attr.beneficiaire_type} • Qté demandée : {attr.quantite_demandee || attr.quantite}
                      </Typography>
                    </Box>
                    <StatutAttributionBadge statut={decision.statut} />
                  </Box>

                  {/* Choix du statut */}
                  <RadioGroup
                    row
                    value={decision.statut}
                    onChange={(e) => handleValidationChange(attr.id, "statut", e.target.value)}
                    sx={{ mb: 1 }}
                  >
                    <FormControlLabel value="VALIDEE" control={<Radio size="small" />} label="Valider" />
                    <FormControlLabel value="REFUSEE" control={<Radio size="small" />} label="Refuser" />
                  </RadioGroup>

                  {/* Champs conditionnels */}
                  {decision.statut === "VALIDEE" && (
                    <TextField
                      label="Quantité validée"
                      type="number"
                      size="small"
                      value={decision.quantite_validee || attr.quantite_demandee || attr.quantite}
                      onChange={(e) => handleValidationChange(attr.id, "quantite_validee", e.target.value)}
                      inputProps={{ min: 1, max: attr.quantite_demandee || attr.quantite }}
                      sx={{ width: 140 }}
                    />
                  )}

                  {decision.statut === "REFUSEE" && (
                    <TextField
                      label="Motif de refus"
                      size="small"
                      value={decision.motif_refus || ""}
                      onChange={(e) => handleValidationChange(attr.id, "motif_refus", e.target.value)}
                      fullWidth
                      required
                    />
                  )}
                </Paper>
              );
            })}
          </Box>
        );
      })}

      {/* SECTION 2 : Magasin et Unités (Existant) */}
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
              <Typography variant="body2" color="text.secondary">Chargement des unités...</Typography>
            </Box>
          )}

          {magasinSource && !loadingUnites && Object.keys(unitesDisponibles).length > 0 && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>Sélection des unités physiques</Typography>
              
              {commande.details.map((detail) => {
                const article = getArticle(detail.article);
                
                // 🆕 CORRECTION : Calculer la somme des quantités VALIDÉES pour ce détail
                const quantiteValideeTotale = detail.attributions.reduce((sum, attr) => {
                  const decision = validations[attr.id] || { statut: attr.statut || "EN_ATTENTE" };
                  if (decision.statut === "VALIDEE") {
                    return sum + Number(decision.quantite_validee || attr.quantite_demandee || attr.quantite);
                  }
                  return sum;
                }, 0);

                // Ne montrer le sélecteur que si c'est du NUMERO_SERIE ET qu'il y a au moins 1 unité validée
                if (article?.mode_suivi !== "NUMERO_SERIE" || quantiteValideeTotale === 0) {
                  return null;
                }

                return (
                  <ArticleUniteSelector
                    key={detail.id}
                    article={article}
                    detailId={detail.id}
                    unitesDisponibles={unitesDisponibles[detail.article] || []}
                    unitesSelectionnees={unitesSelectionnees[detail.id] || []}
                    quantiteRequise={quantiteValideeTotale} // 🆕 On passe la quantité validée, pas la quantité demandée
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
      />
    </Box>
  );
}