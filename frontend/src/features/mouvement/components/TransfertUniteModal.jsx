import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box,
  Typography, FormControl, InputLabel, Select, MenuItem, Autocomplete,
  CircularProgress, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import {
  Person as PersonIcon, Business as BusinessIcon, LocationCity as LocationCityIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { CodeChip } from "../../../components/common/CodeChip";
import { EtatBadge } from "../../../components/common/EtatBadge";
import { getEmployeLocation } from "../../../components/common/EmployeLocation";

export function TransfertUniteModal({ unite, isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const [magasins, setMagasins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [directions, setDirections] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeBeneficiaire, setTypeBeneficiaire] = useState("EMPLOYE");
  const [nouvelEmploye, setNouvelEmploye] = useState(null);
  const [nouvelleDirection, setNouvelleDirection] = useState(null);
  const [nouveauSite, setNouveauSite] = useState(null);
  const [magasinSource, setMagasinSource] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setNouvelEmploye(null);
    setNouvelleDirection(null);
    setNouveauSite(null);
    setMagasinSource("");
    setMotif("");
    setTypeBeneficiaire("EMPLOYE");

    Promise.all([
      apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.EMPLOYEES, { params: { page_size: 500 } }),
      apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.SITES, { params: { page_size: 100 } }),
    ])
      .then(([magRes, empRes, dirRes, siteRes]) => {
        setMagasins(magRes.data.results ?? magRes.data);
        setEmployees(empRes.data.results ?? empRes.data);
        setDirections(dirRes.data.results ?? dirRes.data);
        setSites(siteRes.data.results ?? siteRes.data);
      })
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED))
      .finally(() => setLoading(false));
  }, [isOpen, notify]);

  const handleSubmit = async () => {
    if (!magasinSource) {
      notify.error("Veuillez sélectionner un magasin source.");
      return;
    }
    if (typeBeneficiaire === "EMPLOYE" && !nouvelEmploye) {
      notify.error("Veuillez sélectionner un employé.");
      return;
    }
    if (typeBeneficiaire === "DIRECTION" && !nouvelleDirection) {
      notify.error("Veuillez sélectionner une direction.");
      return;
    }
    if (typeBeneficiaire === "SITE" && !nouveauSite) {
      notify.error("Veuillez sélectionner un site.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        magasin_source: Number(magasinSource),
        motif: motif.trim(),
      };

      if (typeBeneficiaire === "EMPLOYE") {
        payload.nouvel_employe_beneficiaire = nouvelEmploye.emp_id;
        payload.nouvelle_direction_beneficiaire = null;
        payload.nouveau_site_beneficiaire = null;
      } else if (typeBeneficiaire === "SITE") {
        payload.nouveau_site_beneficiaire = nouveauSite.site_id;
        payload.nouvel_employe_beneficiaire = null;
        payload.nouvelle_direction_beneficiaire = null;
      } else {
        payload.nouvelle_direction_beneficiaire = nouvelleDirection.dir_id;
        payload.nouvel_employe_beneficiaire = null;
        payload.nouveau_site_beneficiaire = null;
      }

      await apiClient.post(
        `${API_ENDPOINTS.UNITES_ARTICLE}${unite.unite_id}/transferer/`,
        payload
      );
      notify.success("Unité transférée avec succès.");
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        notify.error(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        notify.error(ERROR_MESSAGES.SAVE_FAILED);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!unite) return null;

  const beneficiaireActuelNom = unite.employe_attribue_nom || "—";
  const beneficiaireActuelType = unite.beneficiaire_type;

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#FFF8E1", borderBottom: "2px solid", borderColor: "primary.main" }}>
        <Typography variant="h6">Transfert d'unité</Typography>
        <Typography variant="caption" color="text.secondary">
          Unité #{unite.unite_id}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Infos unité actuelle */}
            <Box sx={{ mb: 3, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Unité actuelle</Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Article</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <CodeChip value={unite.article_code} />
                    <Typography variant="body2">{unite.article_designation}</Typography>
                  </Box>
                </Box>
                {unite.numero_de_serie && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">N° Série</Typography>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                      {unite.numero_de_serie}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">État</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <EtatBadge etat={unite.etat} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Bénéficiaire actuel</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    {beneficiaireActuelType === "EMPLOYE" ? (
                      <PersonIcon fontSize="small" color="primary" />
                    ) : beneficiaireActuelType === "SITE" ? (
                      <LocationCityIcon fontSize="small" sx={{ color: "warning.main" }} />
                    ) : (
                      <BusinessIcon fontSize="small" color="secondary" />
                    )}
                    <Typography variant="body2">{beneficiaireActuelNom}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Magasin source */}
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>Magasin source</InputLabel>
              <Select value={magasinSource} label="Magasin source" onChange={(e) => setMagasinSource(e.target.value)}>
                <MenuItem value="" disabled>Sélectionner un magasin...</MenuItem>
                {magasins.map((m) => (
                  <MenuItem key={m.magasin_id} value={m.magasin_id}>
                    {m.magasin_nom}{m.localite_nom ? ` (${m.localite_nom})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type de bénéficiaire */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Nouveau bénéficiaire</Typography>
              <ToggleButtonGroup
                value={typeBeneficiaire}
                exclusive
                onChange={(e, val) => {
                  if (val !== null) {
                    setTypeBeneficiaire(val);
                    setNouvelEmploye(null);
                    setNouvelleDirection(null);
                    setNouveauSite(null);
                  }
                }}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    px: 2, py: 0.75, border: "1px solid #E0E0E0",
                    "&.Mui-selected": {
                      bgcolor: "primary.light", borderColor: "primary.main",
                      color: "text.primary",
                      "&:hover": { bgcolor: "primary.main", color: "white" },
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
                <ToggleButton value="SITE">
                  <LocationCityIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Site
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Sélecteur conditionnel */}
            {typeBeneficiaire === "EMPLOYE" ? (
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => option?.emp_nom ? `${option.emp_nom} (${option.emp_matricule})` : ""}
                isOptionEqualToValue={(option, value) => option?.emp_id === value?.emp_id}
                value={nouvelEmploye}
                onChange={(_, newValue) => setNouvelEmploye(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Sélectionner un employé" placeholder="Rechercher par nom, matricule..." required />
                )}
                renderOption={(props, option) => {
                  const loc = getEmployeLocation(option);
                  return (
                    <li {...props} key={option.emp_id}>
                      <Box sx={{ width: "100%" }}>
                        <Typography variant="body2" fontWeight={500}>{option.emp_nom}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.emp_matricule}{option.emp_fonction ? ` • ${option.emp_fonction}` : ""}
                        </Typography>
                        {loc && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                            <BusinessIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption" color="text.secondary">
                              {loc.site ? `${loc.site} → ` : ""}{loc.direction || "—"}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </li>
                  );
                }}
                noOptionsText="Aucun employé trouvé"
                sx={{ mb: 2 }}
              />
            ) : typeBeneficiaire === "SITE" ? (
              <Autocomplete
                options={sites}
                getOptionLabel={(option) =>
                  option?.site_nom
                    ? `${option.site_nom} (${option.site_type || "Site"})`
                    : ""
                }
                isOptionEqualToValue={(option, value) =>
                  String(option?.site_id) === String(value?.site_id)
                }
                value={nouveauSite}
                onChange={(_, newValue) => setNouveauSite(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Sélectionner un site" placeholder="Rechercher un site..." required />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.site_id}>
                    <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationCityIcon fontSize="small" sx={{ color: "warning.main" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{option.site_nom}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.site_type} • {option.localite || "—"}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                noOptionsText="Aucun site trouvé"
                sx={{ mb: 2 }}
              />
            ) : (
              <Autocomplete
                options={directions}
                getOptionLabel={(option) => option?.dir_libelle ? `${option.dir_libelle} (${option.site_nom})` : ""}
                isOptionEqualToValue={(option, value) => option?.dir_id === value?.dir_id}
                value={nouvelleDirection}
                onChange={(_, newValue) => setNouvelleDirection(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Sélectionner une direction" placeholder="Rechercher une direction..." required />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.dir_id}>
                    <Box sx={{ width: "100%" }}>
                      <Typography variant="body2" fontWeight={500}>{option.dir_libelle}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.site_nom} • {option.site_type}
                      </Typography>
                    </Box>
                  </li>
                )}
                noOptionsText="Aucune direction trouvée"
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              label="Motif du transfert (optionnel)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              fullWidth
              multiline
              rows={2}
              inputProps={{ maxLength: 255 }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Annuler</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            saving ||
            !magasinSource ||
            (typeBeneficiaire === "EMPLOYE" && !nouvelEmploye) ||
            (typeBeneficiaire === "DIRECTION" && !nouvelleDirection) ||
            (typeBeneficiaire === "SITE" && !nouveauSite)
          }
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          Confirmer le transfert
        </Button>
      </DialogActions>
    </Dialog>
  );
}