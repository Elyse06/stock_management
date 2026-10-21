import { Box, Typography } from "@mui/material";

import { BeneficiaireTag } from "@/components/data-display/BeneficiaireTag";
import { CodeChip } from "@/components/data-display/CodeChip";
import { EtatBadge } from "@/components/data-display/EtatBadge";

const Bloc = ({ label, children }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{children}</Box>
  </Box>
);

/** Résumé d'une unité (article, N° de série, état, bénéficiaire actuel). */
export function UniteResume({ unite }) {
  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Unité actuelle
      </Typography>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Bloc label="Article">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CodeChip value={unite.article_code} />
            <Typography variant="body2">{unite.article_designation}</Typography>
          </Box>
        </Bloc>
        {unite.numero_de_serie && (
          <Bloc label="N° Série">
            <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
              {unite.numero_de_serie}
            </Typography>
          </Bloc>
        )}
        <Bloc label="État">
          <EtatBadge etat={unite.etat} />
        </Bloc>
        {unite.beneficiaire_type && (
          <Bloc label="Bénéficiaire actuel">
            <BeneficiaireTag type={unite.beneficiaire_type} nom={unite.employe_attribue_nom || "—"} />
          </Bloc>
        )}
      </Box>
    </Box>
  );
}
