import { useState } from "react";
import { Box, Typography, Chip, Paper, Button, Collapse, Alert } from "@mui/material";
import {
  Business as BusinessIcon,
  QrCode as QrCodeIcon,
  Tag as TagIcon,
} from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { CodeChip } from "../../../components/common/CodeChip";
import { getBeneficiaireMeta } from "../../../utils/beneficiaireMeta";

/** Nom (et précision éventuelle) du bénéficiaire d'une ligne de sortie / retour. */
function getBeneficiaire(detail) {
  switch (detail.beneficiaire_type) {
    case "EMPLOYE":
      return {
        nom: detail.employe_beneficiaire_nom,
        precision: [detail.employe_beneficiaire_matricule, detail.employe_beneficiaire_fonction]
          .filter(Boolean)
          .join(" • "),
      };
    case "DIRECTION":
      return { nom: detail.direction_beneficiaire_nom };
    case "SITE":
      return { nom: detail.site_beneficiaire_nom };
    case "SALLE":
      return { nom: detail.salle_beneficiaire_nom };
    default:
      return null;
  }
}

function ArticleCard({ detail, type }) {
  const [showQr, setShowQr] = useState(false);
  const [showSerials, setShowSerials] = useState(false);

  const beneficiaire = ["SORTIE", "RETOUR"].includes(type) ? getBeneficiaire(detail) : null;
  const meta = getBeneficiaireMeta(detail.beneficiaire_type);
  const { Icon } = meta;

  const unites = [...(detail.unites_creees ?? []), ...(detail.unites_attribuees ?? [])];
  const numeros = unites.map((u) => u.numero_de_serie).filter(Boolean);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderLeft: "3px solid", borderLeftColor: "secondary.main" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <CodeChip value={detail.article} />
          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, wordBreak: "break-word" }}>
            {detail.article_designation}
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

      {/* Entrée : fournisseur et prix */}
      {type === "ENTREE" && (detail.fournisseur_nom || detail.prix_achat) && (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 1.25 }}>
          {detail.fournisseur_nom && (
            <Chip
              icon={<BusinessIcon />}
              label={detail.fournisseur_nom}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
          {detail.prix_achat && (
            <Typography variant="body2" color="text.secondary">
              Prix d'achat :{" "}
              <strong>{Number(detail.prix_achat).toLocaleString("fr-FR")} MGA</strong>
            </Typography>
          )}
        </Box>
      )}

      {/* Sortie / retour : bénéficiaire */}
      {beneficiaire?.nom && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.25 }}>
          <Icon fontSize="small" color={meta.color === "default" ? "action" : meta.color} />
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {beneficiaire.nom}{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                ({meta.label})
              </Typography>
            </Typography>
            {beneficiaire.precision && (
              <Typography variant="caption" color="text.secondary">
                {beneficiaire.precision}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Actions repliables : numéros de série / QR code (rendus seulement à l'ouverture) */}
      {(numeros.length > 0 || detail.qr_code_data) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.25 }}>
          {numeros.length > 0 && (
            <Button
              size="small"
              startIcon={<TagIcon />}
              onClick={() => setShowSerials((v) => !v)}
            >
              N° de série ({numeros.length})
            </Button>
          )}
          {detail.qr_code_data && (
            <Button size="small" startIcon={<QrCodeIcon />} onClick={() => setShowQr((v) => !v)}>
              QR de traçabilité
            </Button>
          )}
        </Box>
      )}

      <Collapse in={showSerials} unmountOnExit>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
          {numeros.map((numero) => (
            <Chip
              key={numero}
              label={numero}
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace" }}
            />
          ))}
        </Box>
      </Collapse>

      <Collapse in={showQr} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            textAlign: "center",
            bgcolor: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 1,
          }}
        >
          <QRCodeSVG value={detail.qr_code_data ?? ""} size={160} level="M" includeMargin />
        </Box>
      </Collapse>
    </Paper>
  );
}

export function MouvementArticlesTable({ mouvement }) {
  const details = mouvement.details ?? [];

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <Typography variant="h3">Articles</Typography>
        <Chip label={details.length} size="small" color="primary" variant="outlined" />
      </Box>

      {details.length === 0 ? (
        <Alert severity="info" variant="outlined">
          Aucun article dans ce mouvement.
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {details.map((detail, index) => (
            <ArticleCard
              key={detail.id ?? `${detail.article}-${index}`}
              detail={detail}
              type={mouvement.type_mouvement}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
