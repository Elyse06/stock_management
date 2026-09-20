import { useState, useEffect } from "react";
import {
  FormControl,
  FormHelperText,
  Autocomplete,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
} from "@mui/material";
import { Person as PersonIcon, Business as BusinessIcon } from "@mui/icons-material";

export function BeneficiaireSelector({
  value,
  onChange,
  employes = [],
  directions = [],
  label = "Bénéficiaire",
  required = false,
  error = false,
  helperText = "",
  disabled = false,
  size = "medium",
}) {
  const [type, setType] = useState(value?.type || "EMPLOYE");
  const [selectedEmploye, setSelectedEmploye] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState(null);

  // Initialisation quand value change
  useEffect(() => {
    if (value?.type === "EMPLOYE") {
      setType("EMPLOYE");
      const emp = employes.find((e) => e.emp_id === value.id);
      setSelectedEmploye(emp || null);
      setSelectedDirection(null);
    } else if (value?.type === "DIRECTION") {
      setType("DIRECTION");
      const dir = directions.find((d) => d.dir_id === value.id);
      setSelectedDirection(dir || null);
      setSelectedEmploye(null);
    }
  }, [value, employes, directions]);

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setType(newType);
      // Reset les sélections
      setSelectedEmploye(null);
      setSelectedDirection(null);
      onChange(null);
    }
  };

  const handleEmployeChange = (event, newValue) => {
    setSelectedEmploye(newValue);
    if (newValue) {
      onChange({ type: "EMPLOYE", id: newValue.emp_id, data: newValue });
    } else {
      onChange(null);
    }
  };

  const handleDirectionChange = (event, newValue) => {
    setSelectedDirection(newValue);
    if (newValue) {
      onChange({ type: "DIRECTION", id: newValue.dir_id, data: newValue });
    } else {
      onChange(null);
    }
  };

  return (
    <FormControl fullWidth error={error} required={required} size={size}>
      <Box sx={{ mb: 1 }}>
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={handleTypeChange}
          disabled={disabled}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              px: 2,
              py: 0.75,
              border: "1px solid #E0E0E0",
              "&.Mui-selected": {
                bgcolor: "primary.light",
                borderColor: "primary.main",
                color: "text.primary",
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white",
                },
              },
            },
          }}
        >
          <ToggleButton value="EMPLOYE">
            <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
            Employé
          </ToggleButton>
          <ToggleButton value="DIRECTION">
            <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
            Direction
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {type === "EMPLOYE" ? (
        <Autocomplete
          value={selectedEmploye}
          onChange={handleEmployeChange}
          options={employes}
          getOptionLabel={(option) =>
            `${option.emp_nom} (${option.emp_matricule}) - ${option.emp_fonction}`
          }
          isOptionEqualToValue={(option, value) => option.emp_id === value?.emp_id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sélectionner un employé"
              placeholder="Rechercher par nom, matricule..."
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {option.emp_nom}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.emp_matricule} • {option.emp_fonction} •{" "}
                  {option.direction_libelle}
                </Typography>
              </Box>
            </Box>
          )}
        />
      ) : (
        <Autocomplete
          value={selectedDirection}
          onChange={handleDirectionChange}
          options={directions}
          getOptionLabel={(option) => `${option.dir_libelle} (${option.site_nom})`}
          isOptionEqualToValue={(option, value) => option.dir_id === value?.dir_id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sélectionner une direction"
              placeholder="Rechercher une direction..."
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {option.dir_libelle}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.site_nom} • {option.site_type}
                </Typography>
              </Box>
            </Box>
          )}
        />
      )}

      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}