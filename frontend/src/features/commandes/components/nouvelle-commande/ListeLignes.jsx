import { Box, Button, Chip, CircularProgress, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { DeleteOutlined as RetirerIcon, PlaylistAdd as VideIcon, Save as EnregistrerIcon } from "@mui/icons-material";

import { TypeArticleChip } from "@/components/data-display/TypeArticleChip";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

import { OBJET_MAX } from "../../constants/commande";
import { libelleBeneficiaire } from "../../utils/attributions";
import { attributionsCompletes, MODE_EXISTANT } from "../../utils/nouvelleCommande";

function Beneficiaires({ ligne, demandeur }) {
  const attributions = attributionsCompletes(ligne, demandeur);
  if (!attributions.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        Pour le demandeur{demandeur ? ` : ${demandeur.emp_nom}` : ""}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {attributions.map((a) => {
        const { Icon, color } = getBeneficiaireMeta(a.type);
        return (
          <Chip
            key={`${a.type}-${libelleBeneficiaire(a.type, a.beneficiaire)}`}
            size="small"
            variant="outlined"
            color={color}
            icon={<Icon />}
            label={`${libelleBeneficiaire(a.type, a.beneficiaire)} × ${a.quantite}`}
            sx={{ maxWidth: "100%" }}
          />
        );
      })}
    </Box>
  );
}

function Ligne({ ligne, numero, active, onEditer, onRetirer, demandeur }) {
  const existant = ligne.mode === MODE_EXISTANT;
  return (
    <Paper
      variant="outlined"
      role="button"
      tabIndex={0}
      aria-label={`Modifier la ligne ${numero}`}
      aria-current={active || undefined}
      onClick={onEditer}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEditer();
        }
      }}
      sx={{
        p: 1.5,
        cursor: "pointer",
        borderLeft: "4px solid",
        borderLeftColor: active ? "warning.main" : existant ? "primary.main" : "secondary.main",
        bgcolor: active ? "#FFF8E6" : "#FFFFFF",
        transition: "background-color .15s, box-shadow .15s",
        "&:hover": { boxShadow: "0 2px 8px rgba(16,24,40,0.08)", bgcolor: active ? "#FFF8E6" : "tint.light" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", minWidth: 18, pt: 0.25 }}>{numero}.</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.5 }}>
            {existant ? (
              <TypeArticleChip immobilisation={ligne.article.is_immobilisation} />
            ) : (
              <Chip size="small" color="warning" label="Nouvel article" sx={{ fontWeight: 600 }} />
            )}
            {active && <Chip size="small" variant="outlined" color="warning" label="En modification" />}
          </Box>
          <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word", fontStyle: existant ? "normal" : "italic" }}>
            {existant ? ligne.article.designation : `« ${ligne.specification} »`}
          </Typography>
          {existant && (
            <Typography variant="caption" color="text.secondary">
              {ligne.article.code_article}
            </Typography>
          )}
          <Box sx={{ mt: 1 }}>
            <Beneficiaires ligne={ligne} demandeur={demandeur} />
          </Box>
        </Box>
        <Box sx={{ textAlign: "center", flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">Qté</Typography>
          <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 20, lineHeight: 1.1, color: "primary.main" }}>{ligne.quantite}</Typography>
        </Box>
        <Tooltip title="Retirer de la liste">
          <IconButton
            size="small"
            color="error"
            aria-label={`Retirer la ligne ${numero}`}
            onClick={(e) => {
              e.stopPropagation();
              onRetirer();
            }}
          >
            <RetirerIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
}

/** Partie droite de la page « Nouvelle commande » : objet, articles ajoutés et enregistrement. */
export function ListeLignes({ commande }) {
  const { lignes } = commande;
  const total = lignes.reduce((somme, l) => somme + Number(l.quantite), 0);
  const nbNouveaux = lignes.filter((l) => l.mode !== MODE_EXISTANT).length;

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Articles de la commande"
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, bgcolor: "tint.light", position: { lg: "sticky" }, top: { lg: 16 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h3" sx={{ flex: 1 }}>Articles de la commande</Typography>
        <Chip size="small" variant="outlined" label={`${lignes.length} ligne(s)`} />
        <Chip size="small" variant="outlined" color="primary" label={`${total} unité(s)`} />
      </Box>

      <TextField
        label="Objet de la demande"
        value={commande.objet}
        onChange={(e) => commande.setObjet(e.target.value)}
        required
        fullWidth
        size="small"
        error={Boolean(commande.erreurObjet)}
        slotProps={{ htmlInput: { maxLength: OBJET_MAX } }}
        sx={{ mb: 2, "& .MuiInputBase-root": { bgcolor: "#FFFFFF" } }}
      />

      {lignes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5, px: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2, bgcolor: "#FFFFFF" }}>
          <VideIcon sx={{ fontSize: 36, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Aucun article pour l'instant.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: { lg: "calc(100vh - 330px)" }, overflowY: { lg: "auto" }, pr: { lg: 0.5 } }}>
          {lignes.map((ligne, i) => (
            <Ligne
              key={ligne.cle}
              ligne={ligne}
              numero={i + 1}
              active={ligne.cle === commande.enEdition}
              onEditer={() => commande.editerLigne(ligne)}
              onRetirer={() => commande.retirerLigne(ligne.cle)}
              demandeur={commande.demandeur}
            />
          ))}
        </Box>
      )}

      <Button
        fullWidth
        variant="contained"
        size="large"
        disableElevation
        startIcon={commande.enregistrement ? <CircularProgress size={18} color="inherit" /> : <EnregistrerIcon />}
        onClick={commande.enregistrer}
        disabled={lignes.length === 0 || commande.enregistrement || commande.demandeurIntrouvable}
        sx={{ mt: 2, fontWeight: 700 }}
      >
        Enregistrer la commande
      </Button>
    </Paper>
  );
}
