import { Box, Typography } from "@mui/material";
import {
  Event as EventIcon,
  Inventory as InventoryIcon,
  Input as InputIcon,
  Description as DescriptionIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from "@mui/icons-material";
import { InfoTile } from "@/components/data-display/InfoTile";
import { formatDateTime } from "@/utils/formatters";

function FlowTile({ label, value, icon }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: "1px solid #E0E0E0",
      }}
    >
      <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600} sx={{ wordBreak: "break-word" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * `mouvement` : données les plus complètes disponibles (détail ou, à défaut, ligne de liste).
 * `resume` : la ligne de liste, qui porte nb_articles / quantite_totale dès l'ouverture.
 */
export function MouvementInfoSection({ mouvement, resume }) {
  const type = mouvement.type_mouvement;
  const details = mouvement.details ?? [];

  const nbArticles = resume?.nb_articles ?? details.length;
  const quantiteTotale =
    resume?.quantite_totale ?? details.reduce((sum, d) => sum + (Number(d.quantite) || 0), 0);

  const source = mouvement.magasin_source_nom;
  const destination = mouvement.magasin_destination_nom;
  const origineAffichee = !source && type === "ENTREE" ? mouvement.origine || "Extérieur" : null;

  const de = source
    ? { label: "Source", value: source, icon: <StoreIcon /> }
    : origineAffichee
      ? { label: "Origine", value: origineAffichee, icon: <InputIcon /> }
      : null;
  const vers = destination
    ? { label: type === "RETOUR" ? "Destination (retour)" : "Destination", value: destination, icon: <StoreIcon /> }
    : type === "SORTIE"
      ? { label: "Destination", value: "Bénéficiaire(s)", icon: <PeopleIcon /> }
      : null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Informations générales
      </Typography>

      {(de || vers) && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "stretch",
            gap: 1,
            mb: 1.5,
            p: 1.5,
            borderRadius: 1,
            bgcolor: "tint.light",
            border: "1px solid #E0E0E0",
          }}
        >
          {de && <FlowTile {...de} />}
          {de && vers && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
              <ArrowForwardIcon sx={{ display: { xs: "none", sm: "block" } }} />
              <ArrowDownwardIcon sx={{ display: { xs: "block", sm: "none" } }} />
            </Box>
          )}
          {vers && <FlowTile {...vers} />}
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: 1.5,
        }}
      >
        <InfoTile icon={<EventIcon fontSize="small" />} label="Date">
          <Typography variant="body1" fontWeight={500}>
            {formatDateTime(mouvement.date)}
          </Typography>
        </InfoTile>

        <InfoTile icon={<InventoryIcon fontSize="small" />} label="Contenu">
          <Typography variant="body1" fontWeight={500}>
            {nbArticles} article(s) • {quantiteTotale} unité(s)
          </Typography>
        </InfoTile>

        {mouvement.origine && !origineAffichee && (
          <InfoTile icon={<InputIcon fontSize="small" />} label="Origine / Provenance">
            <Typography variant="body1" fontWeight={500}>
              {mouvement.origine}
            </Typography>
          </InfoTile>
        )}

        {mouvement.motif && (
          <InfoTile icon={<DescriptionIcon fontSize="small" />} label="Motif">
            <Typography variant="body1" fontWeight={500}>
              {mouvement.motif}
            </Typography>
          </InfoTile>
        )}
      </Box>
    </Box>
  );
}
