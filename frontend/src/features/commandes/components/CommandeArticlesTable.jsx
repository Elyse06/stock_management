import { Box, Typography, Chip, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { Person as PersonIcon, Business as BusinessIcon } from "@mui/icons-material";
import { CodeChip } from "../../../components/common/CodeChip";
import { StatutAttributionBadge } from "../../../components/common/StatutAttributionBadge";

export function CommandeArticlesTable({ commande, articles }) {
  const getArticle = (codeArticle) =>
    articles.find((a) => a.code_article === codeArticle);

  const defaultBeneficiaire =
    commande.demandeur?.nom || commande.employe_demandeur || "—";

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Articles demandés ({commande.details?.length ?? 0})
      </Typography>
      <Table
        size="small"
        sx={{
          border: "1px solid #E0E0E0",
          "& .MuiTableCell-root": { borderColor: "#E0E0E0", py: 1, px: 1.5 },
          "& .MuiTableHead-root .MuiTableCell-root": {
            bgcolor: "#FFF8E1",
            fontWeight: 600,
            fontSize: 13,
            borderBottom: "2px solid #F9A825",
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Article</TableCell>
            <TableCell align="center" sx={{ width: 100 }}>
              Demandée
            </TableCell>
            <TableCell align="center" sx={{ width: 110 }}>Validée</TableCell>
            <TableCell sx={{ minWidth: 200 }}>Attributions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {commande.details?.length > 0 ? (
            commande.details.map((detail) => {
              const article = getArticle(detail.article);
              const isNS = article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE";
              return (
                <TableRow
                  key={detail.id}
                  sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CodeChip value={detail.article} />
                      {isNS && (
                        <Chip
                          label="N° Série"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {detail.article_designation}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      fontFamily="monospace"
                    >
                      {detail.quantite}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                      {detail.attributions?.reduce(
                        (total, attribution) => total + (
                          attribution.statut === "VALIDEE"
                            ? Number(attribution.quantite_validee ?? 0)
                            : 0
                        ),
                        0
                      ) || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {detail.attributions?.length > 0 ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {detail.attributions.map((attr) => {
                        const quantiteDemandee = Number(attr.quantite_demandee ?? attr.quantite ?? 0);
                        const quantiteValidee = attr.statut === "VALIDEE"
                          ? Number(attr.quantite_validee ?? 0)
                          : 0;
                        const quantiteRefusee = Math.max(
                          quantiteDemandee - quantiteValidee,
                          0
                        );

                        return (
                          <Box key={attr.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                            <Chip
                              label={attr.beneficiaire_nom}
                              size="small"
                              color={attr.beneficiaire_type === "EMPLOYE" ? "primary" : "secondary"}
                              variant="outlined"
                              icon={attr.beneficiaire_type === "EMPLOYE" ? <PersonIcon /> : <BusinessIcon />}
                            />
                            {attr.statut === "VALIDEE" && (
                              <>
                                <Chip label={`Validée : ${quantiteValidee}`} size="small" color="success" variant="outlined" />
                                <Chip label={`Refusée : ${quantiteRefusee}`} size="small" color="error" variant="outlined" />
                              </>
                            )}
                            <StatutAttributionBadge statut={attr.statut} />
                          </Box>
                        );
                      })}
                      </Box>
                    ) : (
                      <Chip
                        label={defaultBeneficiaire}
                        size="small"
                        variant="outlined"
                        color="default"
                        sx={{ fontStyle: "italic", opacity: 0.7 }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun article dans cette commande
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}