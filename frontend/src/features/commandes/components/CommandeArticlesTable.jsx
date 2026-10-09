import { Box, Typography, Chip, Paper, Divider, Alert } from "@mui/material";
import { CodeChip } from "../../../components/common/CodeChip";
import { StatutAttributionBadge } from "../../../components/common/StatutAttributionBadge";
import { getBeneficiaireMeta } from "./beneficiaireMeta";

/** Quantité affichée pour une attribution : "demandé → accordé" si elle a été ajustée. */
function quantiteLabel(attr) {
  const demandee = attr.quantite_demandee ?? attr.quantite;
  const accordee = attr.quantite_validee ?? attr.quantite;
  if (attr.statut === "VALIDEE" && accordee != null && Number(accordee) !== Number(demandee)) {
    return `${demandee} → ${accordee}`;
  }
  return accordee ?? demandee;
}

export function CommandeArticlesTable({ commande, articles }) {
  const details = commande.details ?? [];
  const totalQuantite = details.reduce((sum, d) => sum + (Number(d.quantite) || 0), 0);
  const defaultBeneficiaire =
    commande.demandeur?.nom || commande.employe_demandeur || "—";
  const getArticle = (code) => articles.find((a) => a.code_article === code);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="h3">Articles demandés</Typography>
        <Chip label={`${details.length} article(s)`} size="small" variant="outlined" />
        <Chip
          label={`${totalQuantite} unité(s)`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {details.length === 0 ? (
        <Alert severity="info" variant="outlined">
          Aucun article dans cette commande
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {details.map((detail) => {
            const article = getArticle(detail.article);
            const isNS = article?.mode_suivi === "NUMERO_SERIE";
            const attributions = detail.attributions ?? [];

            return (
              <Paper
                key={detail.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderLeft: "3px solid",
                  borderLeftColor: "secondary.main",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
                    >
                      <CodeChip value={detail.article} />
                      {isNS && (
                        <Chip
                          label="N° Série"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ mt: 0.5, wordBreak: "break-word" }}
                    >
                      {detail.article_designation || article?.designation}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "center", flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Quantité
                    </Typography>
                    <Typography
                      variant="h3"
                      fontFamily="monospace"
                      fontWeight={700}
                      color="primary.main"
                      sx={{ lineHeight: 1.2 }}
                    >
                      {detail.quantite}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.25 }} />

                {attributions.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {attributions.map((attr) => {
                      const meta = getBeneficiaireMeta(attr.beneficiaire_type);
                      const { Icon } = meta;
                      const showStatut = attr.statut && attr.statut !== "EN_ATTENTE";

                      return (
                        <Box
                          key={attr.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1,
                          }}
                        >
                          <Icon
                            fontSize="small"
                            color={meta.color === "default" ? "action" : meta.color}
                          />
                          <Box sx={{ flex: 1, minWidth: 140 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {attr.beneficiaire_nom}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {meta.label}
                              {attr.statut === "REFUSEE" && attr.motif_refus
                                ? ` • Motif : ${attr.motif_refus}`
                                : ""}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                            × {quantiteLabel(attr)}
                          </Typography>
                          {showStatut && <StatutAttributionBadge statut={attr.statut} />}
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Attribué au demandeur : <strong>{defaultBeneficiaire}</strong>
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
