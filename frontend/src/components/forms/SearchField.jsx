import { InputAdornment, TextField } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

/** Champ de recherche standard des barres de filtres. */
export function SearchField({ value, onChange, placeholder = "Rechercher", minWidth = 200, ...props }) {
  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      sx={{ flex: { sm: 1 }, minWidth: { sm: minWidth } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </InputAdornment>
          ),
        },
        htmlInput: { maxLength: 100, "aria-label": placeholder },
      }}
      {...props}
    />
  );
}
