import { useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { AddCircleOutlined as CreerIcon, Link as AssocierIcon, NewReleasesOutlined as NouveauIcon } from "@mui/icons-material";

import { CodeChip } from "@/components/data-display/CodeChip";
import { groupeTypeArticle, trierParType } from "@/constants/articles";
import { ArticleFormModal } from "@/features/catalogue/components/ArticleFormModal";

const DESIGNATION_MAX = 50;
const SPECIFICATION_MAX = 255;

/** Rattachement d'une demande de nouvel article : création de l'article ou choix d'un article existant. */
function Rattachement({ detail, options, onAssocier, association, onCreer }) {
  const [choix, setChoix] = useState(null);
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mt: 1.25 }}>
      <Button size="small" variant="contained" disableElevation startIcon={<CreerIcon />} onClick={onCreer} disabled={association}>
        Créer l'article
      </Button>
      <Typography variant="caption" color="text.secondary">ou</Typography>
      <Autocomplete
        size="small"
        options={options}
        groupBy={groupeTypeArticle}
        value={choix}
        onChange={(_, valeur) => setChoix(valeur)}
        getOptionLabel={(a) => `${a.designation} (${a.code_article})`}
        isOptionEqualToValue={(o, v) => o?.code_article === v?.code_article}
        renderInput={(params) => <TextField {...params} label="Article existant" placeholder="Rechercher..." />}
        noOptionsText="Aucun article trouvé"
        sx={{ flex: 1, minWidth: 220, bgcolor: "#FFFFFF" }}
      />
      <Button
        size="small"
        variant="outlined"
        startIcon={association ? <CircularProgress size={14} /> : <AssocierIcon />}
        disabled={!choix || association}
        onClick={() => onAssocier(detail.id, choix.code_article)}
      >
        Associer
      </Button>
    </Box>
  );
}

/**
 * Lignes « nouvel article » d'une commande en traitement.
 * - Pré-validation (chef hiérarchique) : la spécification est modifiable.
 * - Validation finale (gestionnaire) : chaque demande est rattachée à un article (créé ou existant)
 *   avant de pouvoir être accordée ; l'article reste modifiable tant que la commande n'est pas validée.
 */
export function NouveauxArticlesTraitement({ commande, articles, preValidation, validationFinale, specifications, onSpecification, onAssocier, association }) {
  const [aCreer, setACreer] = useState(null);
  const [aChanger, setAChanger] = useState({});
  const options = useMemo(() => trierParType(articles), [articles]);
  const lignes = (commande.details || []).filter((d) => d.est_nouvel_article);
  if (!lignes.length || !(preValidation || validationFinale)) return null;

  const valeursInitiales = aCreer
    ? { designation: aCreer.specification.slice(0, DESIGNATION_MAX), description: aCreer.specification }
    : null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
        <NouveauIcon fontSize="small" color="warning" /> Nouveaux articles demandés ({lignes.length})
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {lignes.map((detail) => {
          const article = detail.article ? articles.find((a) => a.code_article === detail.article) : null;
          const changer = aChanger[detail.id];
          return (
            <Paper key={detail.id} variant="outlined" sx={{ p: 1.5, bgcolor: detail.article ? "#FFFFFF" : "#FFF8E6", borderLeft: "4px solid", borderLeftColor: detail.article ? "success.main" : "warning.main" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="warning" label="Nouvel article" sx={{ fontWeight: 600 }} />
                <Typography variant="caption" color="text.secondary">Quantité demandée : {Number(detail.quantite)}</Typography>
              </Box>
              {preValidation ? (
                <TextField
                  label="Spécification"
                  value={specifications[detail.id] ?? detail.specification}
                  onChange={(e) => onSpecification(detail.id, e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { maxLength: SPECIFICATION_MAX } }}
                  sx={{ mt: 1.25, bgcolor: "#FFFFFF" }}
                />
              ) : (
                <Typography variant="body2" sx={{ mt: 0.75, fontStyle: "italic", wordBreak: "break-word" }}>« {detail.specification} »</Typography>
              )}
              {validationFinale && detail.article && !changer && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  <Typography variant="caption" color="success.main" fontWeight={700}>Rattaché à :</Typography>
                  <CodeChip value={detail.article} />
                  <Typography variant="body2" fontWeight={600}>{detail.article_designation || article?.designation}</Typography>
                  {article && <Typography variant="caption" color="text.secondary">· Stock : {article.stock_calcule ?? 0}</Typography>}
                  <Button size="small" onClick={() => setAChanger((p) => ({ ...p, [detail.id]: true }))} sx={{ ml: "auto" }}>
                    Changer
                  </Button>
                </Box>
              )}
              {validationFinale && (!detail.article || changer) && (
                <Rattachement
                  detail={detail}
                  options={options}
                  association={association}
                  onCreer={() => setACreer(detail)}
                  onAssocier={(id, code) => {
                    onAssocier(id, code);
                    setAChanger((p) => ({ ...p, [id]: false }));
                  }}
                />
              )}
            </Paper>
          );
        })}
      </Box>
      <ArticleFormModal
        isOpen={Boolean(aCreer)}
        onClose={() => setACreer(null)}
        valeursInitiales={valeursInitiales}
        onCree={(nouvel) => aCreer && onAssocier(aCreer.id, nouvel.code_article)}
      />
    </Box>
  );
}
