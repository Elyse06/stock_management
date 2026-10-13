import { Box, Checkbox, Chip, CircularProgress, Tooltip, Typography } from "@mui/material";

import { codeChipSx, THEME } from "../../constants/theme";

function PermissionItem({ action, checked, locked, disabled, onToggle }) {
  const contenu = (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        p: 1,
        height: "100%",
        borderRadius: 1,
        bgcolor: checked ? THEME.white : "rgba(255,255,255,0.6)",
        border: `1px solid ${checked ? THEME.primary : "rgba(0,0,0,0.06)"}`,
        cursor: disabled || locked ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Checkbox
        checked={checked}
        onChange={onToggle}
        size="small"
        disabled={disabled || locked}
        sx={{ p: 0.5, mr: 1, color: THEME.gray700, "&.Mui-checked": { color: THEME.primaryDark } }}
      />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.2, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: THEME.gray900 }}>
            {action.label}
          </Typography>
          <Chip size="small" label={action.id} sx={{ ...codeChipSx, height: 18, fontSize: "0.65rem" }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
          {action.description}
        </Typography>
      </Box>
    </Box>
  );
  return locked ? <Tooltip title="Vous ne pouvez pas retirer votre propre droit de gestion des utilisateurs.">{contenu}</Tooltip> : contenu;
}

/** Permissions regroupées par domaine, avec sélection par groupe. */
export function PermissionsSection({ form, disabled }) {
  if (form.actionsLoading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Permissions
        </Typography>
        <Chip
          size="small"
          label={`${form.actionsRetenues.length} sur ${form.allIds.length}`}
          sx={{ fontWeight: 600, bgcolor: THEME.primaryVeryLight, color: THEME.textStrong, border: `1px solid ${THEME.primaryBorder}` }}
        />
      </Box>
      {form.errors.actions && (
        <Typography variant="caption" color="error" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
          {form.errors.actions}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {form.permissionGroups.map((group) => {
          const ids = group.items.map((i) => i.id);
          const nombre = ids.filter((id) => form.selectedActions.includes(id)).length;
          return (
            <Box key={group.key} sx={{ border: `1px solid ${group.borderColor}`, borderRadius: 1.5, p: 1.5, bgcolor: group.color }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Checkbox
                  size="small"
                  checked={nombre === ids.length}
                  indeterminate={nombre > 0 && nombre < ids.length}
                  onChange={() => form.toggleGroup(group)}
                  disabled={disabled}
                  slotProps={{ input: { "aria-label": `Tout sélectionner : ${group.category}` } }}
                  sx={{ p: 0.5, mr: 0.5, color: THEME.gray700, "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: THEME.primaryDark } }}
                />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {group.category}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  {nombre}/{ids.length}
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: group.items.length === 1 ? "1fr" : { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                {group.items.map((action) => (
                  <PermissionItem
                    key={action.id}
                    action={action}
                    checked={form.selectedActions.includes(action.id)}
                    locked={form.verrouillee(action.id)}
                    disabled={disabled}
                    onToggle={() => form.toggleAction(action.id)}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
