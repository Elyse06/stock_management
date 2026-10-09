import {
  Box,
  Typography,
  TextField,
  Divider,
  CircularProgress,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Store as StoreIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { ArticleUniteSelector } from "./ArticleUniteSelector";
import { getBeneficiaireMeta } from "./beneficiaireMeta";

const DECIDED = ["VALIDEE", "REFUSEE"];

const toggleSx = (selectedColor) => ({
  px: 1.5,
  "&.Mui-selected": {
    bgcolor: `${selectedColor}.main`,
    color: "#fff",
    "&:hover": { bgcolor: `${selectedColor}.dark` },
  },
});

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
  isAgentSecondaire,
  validations,
  setValidations,
}) {
  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);

  const isPreValidation = isAgentSecondaire && commande.statut === "EN_ATTENTE";
  const isFinalValidation = isAgentPrincipal && commande.statut === "EN_COURS";

  const getDecision = (attr) =>
    validations[attr.id] || {
      statut: attr.statut || "EN_ATTENTE",
      quantite_validee: attr.quantite_demandee || attr.quantite,
    };

  const toutesAttributions = (commande.details || []).flatMap((d) => d.attributions || []);
  const nbDecidees = toutesAttributions.filter((a) =>
    DECIDED.includes(getDecision(a).statut)
  ).length;

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
          <Typography variant="body2" fontWeight={600}>
            {isPreValidation
              ? "Pré-validation (ajustement des quantités)"
              : "Traitement de la commande"}
          </Typography>
        </Box>
      </Divider>

      {/* SECTION 1 : décision sur chaque attribution (les deux agents) */}
      {toutesAttributions.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
          <Chip
            label={`${nbDecidees} / ${toutesAttributions.length} attribution(s) traitée(s)`}
            size="small"
            color={nbDecidees === toutesAttributions.length ? "success" : "default"}
            variant="outlined"
          />
        </Box>
      )}

      {(isAgentPrincipal || isAgentSecondaire) &&
        commande.details?.map((detail) => {
          const article = getArticle(detail.article);
          if (!detail.attributions || detail.attributions.length === 0) return null;

          return (
            <Box key={detail.id} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {article?.designation || detail.article_designation} ({detail.article})
              </Typography>

              {detail.attributions.map((attr) => {
                const decision = getDecision(attr);
                const meta = getBeneficiaireMeta(attr.beneficiaire_type);
                const { Icon } = meta;
                const qteDemandee = attr.quantite_demandee || attr.quantite;

                return (
                  <Paper
                    key={attr.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      mb: 1,
                      bgcolor: "#FAFAFA",
                      borderColor:
                        decision.statut === "VALIDEE"
                          ? "success.light"
                          : decision.statut === "REFUSEE"
                            ? "error.light"
                            : "#E0E0E0",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Icon
                          fontSize="small"
                          color={meta.color === "default" ? "action" : meta.color}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {attr.beneficiaire_nom}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meta.label} • Qté demandée : {qteDemandee}
                          </Typography>
                        </Box>
                      </Box>

                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={DECIDED.includes(decision.statut) ? decision.statut : null}
                        onChange={(_, value) =>
                          value && handleValidationChange(attr.id, "statut", value)
                        }
                      >
                        <ToggleButton value="VALIDEE" sx={toggleSx("success")}>
                          <CheckIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Valider
                        </ToggleButton>
                        <ToggleButton value="REFUSEE" sx={toggleSx("error")}>
                          <CloseIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Refuser
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    {decision.statut === "VALIDEE" && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5 }}>
                        <EditIcon fontSize="small" color="action" />
                        <TextField
                          label={isPreValidation ? "Qté ajustée" : "Quantité validée"}
                          type="number"
                          size="small"
                          value={decision.quantite_validee || qteDemandee}
                          onChange={(e) =>
                            handleValidationChange(attr.id, "quantite_validee", e.target.value)
                          }
                          inputProps={{ min: 1, max: qteDemandee }}
                          sx={{ width: 150 }}
                          helperText={
                            isPreValidation ? "Modifiable pour la pré-validation" : undefined
                          }
                        />
                      </Box>
                    )}

                    {decision.statut === "REFUSEE" && (
                      <TextField
                        label="Motif de refus"
                        size="small"
                        value={decision.motif_refus || ""}
                        onChange={(e) =>
                          handleValidationChange(attr.id, "motif_refus", e.target.value)
                        }
                        fullWidth
                        required
                        sx={{ mt: 1.5 }}
                      />
                    )}
                  </Paper>
                );
              })}
            </Box>
          );
        })}

      {/* SECTION 2 : magasin et unités (validation finale uniquement) */}
      {isFinalValidation && (
        <>
          <Box sx={{ "& .MuiFormControl-root": { width: "100%" } }}>
            <SelectFilter
              label="Magasin source pour la sortie de stock"
              value={magasinSource}
              onChange={onMagasinSourceChange}
              options={magasinOptions}
              required
            />
          </Box>

          {magasinSource && loadingUnites && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Chargement des unités...
              </Typography>
            </Box>
          )}

          {magasinSource && !loadingUnites && Object.keys(unitesDisponibles).length > 0 && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                Sélection des unités physiques
              </Typography>

              {(commande.details || []).map((detail) => {
                const article = getArticle(detail.article);
                const quantiteValideeTotale = (detail.attributions || []).reduce((sum, attr) => {
                  const decision = getDecision(attr);
                  if (decision.statut === "VALIDEE") {
                    return sum + Number(decision.quantite_validee || attr.quantite_demandee || attr.quantite);
                  }
                  return sum;
                }, 0);

                if (
                  !article?.is_immobilisation ||
                  article?.mode_suivi !== "NUMERO_SERIE" ||
                  quantiteValideeTotale === 0
                ) {
                  return null;
                }

                return (
                  <ArticleUniteSelector
                    key={detail.id}
                    article={article}
                    detailId={detail.id}
                    unitesDisponibles={unitesDisponibles[detail.article] || []}
                    unitesSelectionnees={unitesSelectionnees[detail.id] || []}
                    quantiteRequise={quantiteValideeTotale}
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
