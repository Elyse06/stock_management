import { TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { PageHeader } from "../../../components/common/PageHeader";
import { PRESET_ROLES } from "./permissions";

export function UserFilters({ searchTerm, setSearchTerm, roleFilter, setRoleFilter, onAddUser }) {
  return (
    <PageHeader actionLabel="Ajouter un utilisateur" onAction={onAddUser}>
      <TextField
        size="small"
        placeholder="Rechercher par email, nom d'employé..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ minWidth: { xs: "100%", sm: 320 }, flex: 1 }}
        slotProps={{ input: { startAdornment: <SearchIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} /> } }}
      />
      <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
        <InputLabel id="filter-role-label">Filtrer par Rôle</InputLabel>
        <Select labelId="filter-role-label" value={roleFilter} label="Filtrer par Rôle" onChange={(e) => setRoleFilter(e.target.value)}>
          <MenuItem value="ALL">Tous les profils / rôles</MenuItem>
          {PRESET_ROLES.map((role) => (
            <MenuItem key={role.id} value={role.id}>{role.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </PageHeader>
  );
}
