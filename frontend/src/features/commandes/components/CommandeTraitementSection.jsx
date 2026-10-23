import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  ShoppingCartOutlined as AchatIcon,
  Store as StoreIcon,
} from "@mui/icons-material";

import { SelectFilter } from "@/components/forms/SelectFilter";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

import { aDesLivraisons, attributionsATraiter, DECIDEES, estSuiviParSerie, quantiteValidee } from "../utils/traitementCommande";

import { ArticleUniteSelector } from "./ArticleUniteSelector";
import { NouveauxArticlesTraitement } from "./NouveauxArticlesTraitement";

const toggleSx = (couleur) => ({
  px: 1.25,
  gap: 0.5,
  "&.Mui-selected": { bgcolor: `${couleur}.main`, color: "#fff", "&:hover": { bgcolor: `${couleur}.dark` } },
});

const BORDURE = { VALIDEE: "success.light", REFUSEE: "error.light", EN_ATTENTE: "warning.light" };

/** Choix du chef (pré-validation) : valider ou refuser. */
function ChoixPreValidation({ valeur, onChange }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={valeur} onChange={(_, v) => v && onChange(v)}>
      <ToggleButton value="VALIDEE" sx={toggleSx("success")}><CheckIcon fontSize="small" /> Valider</ToggleButton>
      <ToggleButton value="REFUSEE" sx={toggleSx("error")}><CloseIcon fontSize="small" /> Refuser</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** Choix du gestionnaire (validation finale) : livrer maintenant, en attente d'achat, refuser. */
function ChoixValidationFinale({ valeur, onChange }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={valeur} onChange={(_, v) => v && onChange(v)} sx={{ flexWrap: "wrap" }}>
      <ToggleButton value="VALIDEE" sx={toggleSx("success")}><CheckIcon fontSize="small" /> Valider </ToggleButton>
      <ToggleButton value="EN_ATTENTE" sx={toggleSx("warning")}><AchatIcon fontSize="small" /> En attente </ToggleButton>
      <ToggleButton value="REFUSEE" sx={toggleSx("error")}><CloseIcon fontSize="small" /> Refuser</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** Une ligne à décider : bénéficiaire, quantité demandée, décision et ses précisions. */
function LigneDecision({ attr, decision, finale, onChange }) {
  const meta = getBeneficiaireMeta(attr.beneficiaire_type);
  const { Icon } = meta;
  const demandee = Number(attr.quantite_demandee ?? attr.quantite);
  const livree = Number(decision.quantite_validee);
  const reste = finale && decision.statut === "VALIDEE" && Number.isInteger(livree) && livree > 0 ? demandee - livree : 0;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: "#FAFAFA", borderColor: BORDURE[decision.statut] || "#E0E0E0" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Icon fontSize="small" color={meta.color === "default" ? "action" : meta.color} />
          <Box>
            <Typography variant="body2" fontWeight={600}>{attr.beneficiaire_nom}</Typography>
            <Typography variant="caption" color="text.secondary">{meta.label} • Qté demandée : {demandee}</Typography>
          </Box>
        </Box>
        {finale ? (
          <ChoixValidationFinale valeur={decision.statut} onChange={(v) => onChange({ statut: v })} />
        ) : (
          <ChoixPreValidation valeur={decision.statut} onChange={(v) => onChange({ statut: v })} />
        )}
      </Box>

      {decision.statut === "VALIDEE" && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
          <EditIcon fontSize="small" color="action" sx={{ mt: 1 }} />
          <TextField
            label={finale ? "Quantité livrée maintenant" : "Qté ajustée"}
            type="number"
            size="small"
            value={decision.quantite_validee}
            onChange={(e) => onChange({ quantite_validee: e.target.value })}
            slotProps={{ htmlInput: { min: 1, max: demandee, step: 1 } }}
            sx={{ width: 190 }}
          />
          {reste > 0 && (
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Reste ({reste}) :
              </Typography>
              <ToggleButtonGroup exclusive size="small" value={decision.reste || "EN_ATTENTE"} onChange={(_, v) => v && onChange({ reste: v })}>
                <ToggleButton value="EN_ATTENTE" sx={toggleSx("warning")}><AchatIcon fontSize="small" /> En attente </ToggleButton>
                <ToggleButton value="REFUSEE" sx={toggleSx("error")}><CloseIcon fontSize="small" /> Refusé </ToggleButton>
              </ToggleButtonGroup>
              {decision.reste === "REFUSEE" && (
                <TextField label="Motif (reste refusé)" size="small" fullWidth value={decision.motif_reste || ""}
                  onChange={(e) => onChange({ motif_reste: e.target.value })} sx={{ mt: 1 }} />
              )}
            </Box>
          )}
        </Box>
      )}

      {decision.statut === "REFUSEE" && (
        <TextField label="Motif de refus" size="small" value={decision.motif_refus || ""} onChange={(e) => onChange({ motif_refus: e.target.value })}
          fullWidth required sx={{ mt: 1.5 }} />
      )}
    </Paper>
  );
}

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
  specifications,
  onSpecification,
  onAssocier,
  association,
}) {
  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);
  const isPreValidation = isAgentSecondaire && commande.statut === "EN_ATTENTE";
  const isFinalValidation = isAgentPrincipal && commande.statut === "EN_COURS";

  const aTraiter = (commande.details || []).flatMap(attributionsATraiter);
  const nbDecidees = aTraiter.filter((a) => DECIDEES.includes(validations[a.id]?.statut)).length;
  const livraison = aDesLivraisons(validations);

  const modifier = (attributionId, changements) =>
    setValidations((prev) => ({ ...prev, [attributionId]: { ...prev[attributionId], ...changements } }));

  return (
    <Box>
      <Divider sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
          <StoreIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            {isPreValidation ? "Pré-validation (ajustement des quantités)" : "Traitement de la commande"}
          </Typography>
        </Box>
      </Divider>

      <NouveauxArticlesTraitement
        commande={commande}
        articles={articles}
        preValidation={isPreValidation}
        validationFinale={isFinalValidation}
        specifications={specifications}
        onSpecification={onSpecification}
        onAssocier={onAssocier}
        association={association}
      />

      {isFinalValidation && commande.livree_partiellement && (
        <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
          Commande déjà livrée en partie.
        </Alert>
      )}

      {aTraiter.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
          <Chip label={`${nbDecidees} / ${aTraiter.length} ligne(s) décidée(s)`} size="small"
            color={nbDecidees === aTraiter.length ? "success" : "default"} variant="outlined" />
        </Box>
      )}

      {(isAgentPrincipal || isAgentSecondaire) &&
        commande.details?.map((detail) => {
          const lignes = attributionsATraiter(detail);
          if (!lignes.length) return null;
          const article = getArticle(detail.article);
          return (
            <Box key={detail.id} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {article?.designation || detail.libelle || detail.article_designation}
                {detail.article ? ` (${detail.article})` : ""}
                {article && isFinalValidation && (
                  <Typography component="span" variant="caption" color="text.secondary"> · Stock : {article.stock_calcule ?? 0}</Typography>
                )}
              </Typography>
              {lignes.map((attr) => (
                <LigneDecision key={attr.id} attr={attr} decision={validations[attr.id] || { statut: "VALIDEE", quantite_validee: attr.quantite_demandee }}
                  finale={isFinalValidation} onChange={(changements) => modifier(attr.id, changements)} />
              ))}
            </Box>
          );
        })}

      {/* Magasin et unités : seulement s'il y a quelque chose à livrer maintenant. */}
      {isFinalValidation && livraison && (
        <>
          <Box sx={{ "& .MuiFormControl-root": { width: "100%" } }}>
            <SelectFilter label="Magasin source pour la sortie de stock" value={magasinSource} onChange={onMagasinSourceChange} options={magasinOptions} required />
          </Box>

          {magasinSource && loadingUnites && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Chargement des unités...</Typography>
            </Box>
          )}

          {magasinSource && !loadingUnites && Object.keys(unitesDisponibles).length > 0 && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>Sélection des unités physiques</Typography>
              {(commande.details || []).map((detail) => {
                const article = getArticle(detail.article);
                const total = quantiteValidee(detail, validations);
                if (!estSuiviParSerie(article) || total === 0) return null;
                return (
                  <ArticleUniteSelector
                    key={detail.id}
                    article={article}
                    detailId={detail.id}
                    unitesDisponibles={unitesDisponibles[detail.article] || []}
                    unitesSelectionnees={unitesSelectionnees[detail.id] || []}
                    quantiteRequise={total}
                    onToggleUnite={onToggleUnite}
                  />
                );
              })}
            </Box>
          )}
        </>
      )}

      <TextField label="Commentaire (optionnel)" value={commentaire} onChange={onCommentaireChange} fullWidth margin="normal" multiline rows={2} />
    </Box>
  );
}
