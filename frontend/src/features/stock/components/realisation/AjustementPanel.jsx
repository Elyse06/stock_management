import { Box, Checkbox, CircularProgress, FormControlLabel, Typography } from "@mui/material";
import { SwapHoriz as SwapHorizIcon } from "@mui/icons-material";

import { PropositionsSeriesEditor } from "../PropositionsSeriesEditor";

/** Panneau dépliable : propositions d'écart et changements d'état des unités. */
export function AjustementPanel({ article, saisie, ecart, unites, chargement, besoinPropositions, onChange }) {
  if (chargement) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Chargement des unités en stock...
        </Typography>
      </Box>
    );
  }

  const basculerChangementEtat = (checked) => {
    const propositions = { ...saisie.propositions_series };
    if (!checked) delete propositions.changements_etat;
    onChange({ showChangementEtat: checked, propositions_series: propositions });
  };

  return (
    <>
      {besoinPropositions && (
        <PropositionsSeriesEditor
          type="ECART"
          ecart={ecart}
          modeSuivi={article.mode_suivi}
          unitesExistantes={unites}
          value={saisie.propositions_series}
          onChange={(propositions) => onChange({ propositions_series: propositions })}
        />
      )}
      <Box sx={{ mt: besoinPropositions ? 2 : 0, p: 1.5, bgcolor: "tint.main", borderRadius: 1, border: "1px solid", borderColor: "primary.light" }}>
        <FormControlLabel
          control={<Checkbox checked={saisie.showChangementEtat} onChange={(e) => basculerChangementEtat(e.target.checked)} />}
          label={
            <Typography variant="body2" fontWeight={600}>
              <SwapHorizIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
              Signaler un changement d'état sur des unités existantes
            </Typography>
          }
        />
        {saisie.showChangementEtat && (
          <Box sx={{ mt: 1 }}>
            <PropositionsSeriesEditor
              type="CHANGEMENT_ETAT"
              modeSuivi={article.mode_suivi}
              unitesExistantes={unites}
              value={saisie.propositions_series}
              onChange={(propositions) => onChange({ propositions_series: propositions })}
            />
          </Box>
        )}
      </Box>
    </>
  );
}
