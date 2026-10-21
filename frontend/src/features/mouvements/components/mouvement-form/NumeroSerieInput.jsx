import { useState } from "react";
import { IconButton, TextField } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

/** Ajout d'un numéro de série : Entrée valide sans soumettre le formulaire. */
export function NumeroSerieInput({ onAdd }) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    onAdd([value]);
    setValue("");
  };

  return (
    <TextField
      size="small"
      fullWidth
      label="Ajouter un N° de série (Entrée pour valider)"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
      slotProps={{
        htmlInput: { maxLength: 100, style: { fontFamily: "monospace" } },
        input: {
          endAdornment: (
            <IconButton size="small" color="primary" onClick={submit} disabled={!value.trim()} aria-label="Ajouter le numéro">
              <AddIcon fontSize="small" />
            </IconButton>
          ),
        },
      }}
    />
  );
}
