import { useEffect, useState } from "react";
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { FormDialog } from "../../../components/common/FormDialog";

const getRelationId = (value, key) =>
  value && typeof value === "object" ? value[key] ?? value.pk ?? "" : value ?? "";

export function EmployeeFormModal({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit = null,
  sites = [],
  directions = [],
  services = [],
}) {
  const notify = useNotification();
  const isEditMode = Boolean(employeeToEdit);

  const [form, setForm] = useState({
    emp_nom: "",
    emp_matricule: "",
    emp_fonction: "",
    emp_contact: "",
    site_id: "",
    direction_id: "",
    emp_serv_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (employeeToEdit) {
      const serviceId = getRelationId(employeeToEdit.emp_serv_id, "serv_id");
      const selectedService = services.find(
        (service) => String(service.serv_id) === String(serviceId)
      );
      const directionId =
        getRelationId(employeeToEdit.emp_dir_id, "dir_id") ||
        getRelationId(selectedService?.serv_dir_id, "dir_id");
      const selectedDirection = directions.find(
        (direction) => String(direction.dir_id) === String(directionId)
      );

      setForm({
        emp_nom: employeeToEdit.emp_nom || "",
        emp_matricule: employeeToEdit.emp_matricule || "",
        emp_fonction: employeeToEdit.emp_fonction || "",
        emp_contact: employeeToEdit.emp_contact || "",
        site_id:
          getRelationId(employeeToEdit.emp_site_id, "site_id") ||
          getRelationId(selectedDirection?.site, "site_id"),
        direction_id: directionId,
        emp_serv_id: serviceId,
      });
    } else {
      setForm({
        emp_nom: "",
        emp_matricule: `M-${Math.floor(1000 + Math.random() * 9000)}`,
        emp_fonction: "",
        emp_contact: "",
        site_id: "",
        direction_id: "",
        emp_serv_id: "",
      });
    }
  }, [isOpen, employeeToEdit, directions, services]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClose = () => {
    setForm({
      emp_nom: "",
      emp_matricule: "",
      emp_fonction: "",
      emp_contact: "",
      site_id: "",
      direction_id: "",
      emp_serv_id: "",
    });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.emp_nom.trim()) {
      notify.error("Le nom est obligatoire.");
      return;
    }
    if (!form.emp_matricule.trim()) {
      notify.error("Le matricule est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        emp_nom: form.emp_nom.trim(),
        emp_matricule: form.emp_matricule.trim(),
        emp_fonction: form.emp_fonction.trim(),
        emp_contact: form.emp_contact.trim(),
        emp_site_id: form.site_id || null,
        emp_dir_id: form.direction_id || null,
        emp_serv_id: form.emp_serv_id || null,
      };

      if (isEditMode) {
        await apiClient.put(`${API_ENDPOINTS.EMPLOYEES}${employeeToEdit.emp_id}/`, payload);
        notify.success("Employé modifié avec succès");
      } else {
        await apiClient.post(API_ENDPOINTS.EMPLOYEES, payload);
        notify.success("Employé créé avec succès");
      }
      if (onSuccess) onSuccess();
      handleClose();
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

  const selectedService = services.find(
    (service) => String(service.serv_id) === String(form.emp_serv_id)
  );
  const selectedDirection = directions.find(
    (direction) => String(direction.dir_id) === String(form.direction_id)
  );
  const selectedSite = sites.find(
    (site) => String(site.site_id) === String(form.site_id)
  );
  const directionsForSite = directions.filter(
    (direction) =>
      String(getRelationId(direction.site, "site_id")) === String(form.site_id)
  );
  const servicesForDirection = services.filter(
    (service) =>
      String(getRelationId(service.serv_dir_id, "dir_id")) === String(form.direction_id)
  );

  return (
    <FormDialog
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Modifier l'employé" : "Nouvel employé"}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={isEditMode ? "Mettre à jour" : "Créer l'employé"}
      submitIcon={<PersonIcon />}
      maxWidth="md"
      headerBadge={isEditMode ? "ÉDITION" : "CRÉATION"}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          label="Nom et Prénoms *"
          value={form.emp_nom}
          onChange={handleChange("emp_nom")}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label="Matricule *"
          value={form.emp_matricule}
          onChange={handleChange("emp_matricule")}
          required
          fullWidth
        />
        <TextField
          label="Fonction"
          value={form.emp_fonction}
          onChange={handleChange("emp_fonction")}
          fullWidth
        />
        <TextField
          label="Contact"
          value={form.emp_contact}
          onChange={handleChange("emp_contact")}
          fullWidth
        />

        <Box sx={{ gridColumn: { sm: "1 / -1" }, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
            Rattachement organisationnel
          </Typography>
        </Box>

        <Autocomplete
          options={sites}
          getOptionLabel={(option) => option.site_nom || ""}
          value={selectedSite || null}
          onChange={(_, newValue) => {
            setForm((prev) => ({
              ...prev,
              site_id: newValue?.site_id || "",
              direction_id: "",
              emp_serv_id: "",
            }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Site" placeholder="Sélectionner un site..." />
          )}
          fullWidth
        />

        <Autocomplete
          options={directionsForSite}
          getOptionLabel={(option) => option.dir_libelle || ""}
          value={selectedDirection || null}
          onChange={(_, newValue) => {
            setForm((prev) => ({
              ...prev,
              direction_id: newValue?.dir_id || "",
              emp_serv_id: "",
            }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Direction" placeholder="Sélectionner une direction..." />
          )}
          disabled={!form.site_id}
          fullWidth
        />

        <Autocomplete
          options={servicesForDirection}
          getOptionLabel={(option) => option.serv_libelle || ""}
          value={selectedService || null}
          onChange={(_, newValue) => {
            setForm((prev) => ({ ...prev, emp_serv_id: newValue?.serv_id || "" }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Service *" placeholder="Sélectionner un service..." />
          )}
          disabled={!form.direction_id}
          fullWidth
        />
      </Box>

      {selectedSite && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
          <Typography variant="body2" color="primary.main">
            <strong>Rattachement :</strong> {selectedSite.site_nom}
            {selectedDirection && ` → ${selectedDirection.dir_libelle}`}
            {selectedService && ` → ${selectedService.serv_libelle}`}
          </Typography>
        </Box>
      )}
    </FormDialog>
  );
}