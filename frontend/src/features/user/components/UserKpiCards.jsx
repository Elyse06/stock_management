import { Grid } from "@mui/material";
import { People as PeopleIcon, AdminPanelSettings as AdminIcon, AssignmentTurnedIn as RolesIcon } from "@mui/icons-material";
import { StatCard } from "../../dashboard/components/StatCard";

export function UserKpiCards({ stats }) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard icon={<PeopleIcon />} label="Comptes enregistrés" value={stats.total} />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard icon={<AdminIcon />} label="Administrateurs" value={stats.admins} />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard icon={<RolesIcon />} label="Liés au personnel" value={stats.linked} />
      </Grid>
    </Grid>
  );
}
