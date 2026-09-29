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
    emp_serv_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (employeeToEdit) {
      setForm({
        emp_nom: employeeToEdit.emp_nom || "",
        emp_matricule: employeeToEdit.emp_matricule || "",
        emp_fonction: employeeToEdit.emp_fonction || "",
        emp_contact: employeeToEdit.emp_contact || "",
        emp_serv_id: employeeToEdit.emp_serv_id || "",
      });
    } else {
      setForm({
        emp_nom: "",
        emp_matricule: `M-${Math.floor(1000 + Math.random() * 9000)}`,
        emp_fonction: "",
        emp_contact: "",
        emp_serv_id: services[0]?.serv_id || "",
      });
    }
  }, [isOpen, employeeToEdit, services]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClose = () => {
    setForm({
      emp_nom: "",
      emp_matricule: "",
      emp_fonction: "",
      emp_contact: "",
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
        ...form,
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

  const selectedService = services.find((s) => s.serv_id === form.emp_serv_id);
  const selectedDirection = selectedService ? directions.find((d) => d.dir_id === selectedService.serv_dir_id) : null;
  const selectedSite = selectedDirection?.site;

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
            setForm((prev) => ({ ...prev, emp_serv_id: "" }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Site" placeholder="Sélectionner un site..." />
          )}
          disabled
          fullWidth
        />

        <Autocomplete
          options={directions}
          getOptionLabel={(option) => option.dir_libelle || ""}
          value={selectedDirection || null}
          onChange={(_, newValue) => {
            setForm((prev) => ({ ...prev, emp_serv_id: "" }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Direction" placeholder="Sélectionner une direction..." />
          )}
          disabled
          fullWidth
        />

        <Autocomplete
          options={services}
          getOptionLabel={(option) => option.serv_libelle || ""}
          value={selectedService || null}
          onChange={(_, newValue) => {
            setForm((prev) => ({ ...prev, emp_serv_id: newValue?.serv_id || "" }));
          }}
          renderInput={(params) => (
            <TextField {...params} label="Service *" placeholder="Sélectionner un service..." />
          )}
          fullWidth
        />
      </Box>

      {selectedService && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
          <Typography variant="body2" color="primary.main">
            <strong>Rattachement :</strong> {selectedSite?.site_nom} → {selectedDirection?.dir_libelle} → {selectedService.serv_libelle}
          </Typography>
        </Box>
      )}
    </FormDialog>
  );
}