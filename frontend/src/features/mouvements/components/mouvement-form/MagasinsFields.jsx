import { Box, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowForward as ArrowForwardIcon,
  Login as LoginIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";

import { SelectFilter } from "@/components/forms/SelectFilter";

const TYPES = [
  { value: "ENTREE", label: "Entrée de stock", Icon: LoginIcon },
  { value: "TRANSFERT", label: "Transfert entre magasins", Icon: SwapHorizIcon },
];

/** Type de mouvement et magasins concernés. */
export function MagasinsFields({ form, magasinOptions }) {
  const transfert = form.type === "TRANSFERT";
  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={form.type}
        onChange={(_, value) => value && form.setType(value)}
        sx={{
          mb: 2.5,
          "& .MuiToggleButton-root": {
            py: 1,
            gap: 1,
            textTransform: "none",
            "&.Mui-selected": { bgcolor: "tint.main", color: "primary.main", borderColor: "primary.main", fontWeight: 600 },
          },
        }}
      >
        {TYPES.map(({ value, label, Icon }) => (
          <ToggleButton key={value} value={value}>
            <Icon fontSize="small" />
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: transfert ? { xs: "1fr", sm: "1fr auto 1fr" } : { xs: "1fr", sm: "1fr 1fr" },
          alignItems: "center",
          gap: 2,
          "& .MuiFormControl-root": { width: "100%" },
        }}
      >
        {!transfert && (
          <TextField
            label="Origine (optionnel)"
            value={form.origine}
            onChange={(e) => form.setOrigine(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        )}
        {transfert && (
          <>
            <SelectFilter label="Magasin source" value={form.magasinSource} onChange={form.setMagasinSource} options={magasinOptions} required />
            <Box sx={{ display: "flex", justifyContent: "center", color: "text.secondary" }}>
              <ArrowForwardIcon sx={{ display: { xs: "none", sm: "block" } }} />
              <ArrowDownwardIcon sx={{ display: { xs: "block", sm: "none" } }} />
            </Box>
          </>
        )}
        <SelectFilter label="Magasin destination" value={form.magasinDestination} onChange={form.setMagasinDestination} options={magasinOptions} required />
      </Box>
    </>
  );
}
