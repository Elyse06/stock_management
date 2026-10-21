import { useId } from "react";
import { Box, FormControl, FormControlLabel, FormLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, Typography } from "@mui/material";
import { LocationCity as LocationCityIcon, MeetingRoom as MeetingRoomIcon, Store as StoreIcon } from "@mui/icons-material";

const radio = (value, Icon, texte) => (
  <FormControlLabel
    value={value}
    control={<Radio size="small" />}
    label={
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {Icon && <Icon fontSize="small" color="action" />}
        <Typography variant="body2">{texte}</Typography>
      </Box>
    }
  />
);

function Choix({ label, value, onChange, placeholder, items, getValue, getLabel }) {
  const labelId = useId();
  return (
    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 } }}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} value={value} label={label} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">
          <em>{placeholder}</em>
        </MenuItem>
        {items.map((item) => (
          <MenuItem key={getValue(item)} value={getValue(item)}>
            {getLabel(item)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/** Sélection du lieu : magasin, ou site (agence, ou direction / salle du Siège). */
export function LieuSelector({ lieu }) {
  const estMagasin = lieu.lieuType === "magasin";
  const legende = { typography: "caption", fontWeight: "bold", mb: 0.5 };

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, gap: 3, flexWrap: "wrap" }}>
      <FormControl component="fieldset" size="small">
        <FormLabel component="legend" sx={legende}>
          Type de lieu
        </FormLabel>
        <RadioGroup row value={lieu.lieuType} onChange={(e) => lieu.setLieuType(e.target.value)}>
          {radio("magasin", StoreIcon, "Magasin")}
          {radio("site", LocationCityIcon, "Site")}
        </RadioGroup>
      </FormControl>

      <Choix
        label={estMagasin ? "Magasin" : "Site"}
        value={lieu.lieuId}
        onChange={lieu.setLieuId}
        placeholder={`Sélectionner ${estMagasin ? "un magasin" : "un site"}...`}
        items={lieu.lieux}
        getValue={(l) => (estMagasin ? l.magasin_id : l.site_id)}
        getLabel={(l) =>
          estMagasin
            ? `${l.magasin_nom}${l.localite_nom ? ` (${l.localite_nom})` : ""}`
            : `${l.site_nom} (${l.site_type === "SIEGE" ? "Siège" : "Agence"})`
        }
      />

      {lieu.estSiege && (
        <>
          <FormControl component="fieldset" size="small">
            <FormLabel component="legend" sx={legende}>
              Localisation du siège
            </FormLabel>
            <RadioGroup row value={lieu.scopeType} onChange={(e) => lieu.setScopeType(e.target.value)}>
              {radio("direction", null, "Direction")}
              {radio("salle", MeetingRoomIcon, "Salle")}
            </RadioGroup>
          </FormControl>
          {lieu.scopeType && (
            <Choix
              label={lieu.scopeType === "direction" ? "Direction" : "Salle"}
              value={lieu.scopeId}
              onChange={lieu.setScopeId}
              placeholder={`Sélectionner ${lieu.scopeType === "direction" ? "une direction" : "une salle"}...`}
              items={lieu.scopes}
              getValue={(s) => (lieu.scopeType === "direction" ? s.dir_id : s.salle_id)}
              getLabel={(s) => (lieu.scopeType === "direction" ? s.dir_libelle : s.nom)}
            />
          )}
        </>
      )}
    </Box>
  );
}
