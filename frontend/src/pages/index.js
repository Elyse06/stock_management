import { Typography, Paper, Box } from "@mui/material";

// Composant réutilisable pour les pages placeholder
function PagePlaceholder({ title, description }) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Paper
        sx={{
          p: 4,
          border: "1px solid #E0E0E0",
          bgcolor: "#FFFFFF",
        }}
      >
        <Typography color="text.secondary">
          {description || "Cette page sera bientôt disponible."}
        </Typography>
      </Paper>
    </Box>
  );
}

// ====== Pages principales ======
export function Dashboard() {
  return (
    <PagePlaceholder
      title="Tableau de bord"
      description="Visualisation générale des stocks, commandes et inventaires."
    />
  );
}

// ====== Catalogue ======
export function Articles() {
  return <PagePlaceholder title="Articles" description="Gestion des articles du catalogue." />;
}

export function Categories() {
  return <PagePlaceholder title="Catégories" description="Gestion des catégories d'articles." />;
}

export function Marques() {
  return <PagePlaceholder title="Marques" description="Gestion des marques." />;
}

export function Fournisseurs() {
  return <PagePlaceholder title="Fournisseurs" description="Gestion des fournisseurs." />;
}

// ====== Commandes ======
export function Commandes() {
  return (
    <PagePlaceholder
      title="Commandes"
      description="Réalisation, validation et visualisation des commandes."
    />
  );
}

// ====== Inventaire ======
export function Mouvements() {
  return <PagePlaceholder title="Mouvements" description="Gestion des mouvements de stock." />;
}

export function Sessions() {
  return <PagePlaceholder title="Inventaires" description="Réalisation des sessions d'inventaire." />;
}

// ====== 404 ======
export function NotFound() {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Typography variant="h2" fontWeight={700} color="primary.main">
        404
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Page introuvable
      </Typography>
    </Box>
  );
}