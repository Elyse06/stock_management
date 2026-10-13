import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";

import { FormDialog } from "@/components/forms/FormDialog";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useDirections, useServices, useSites } from "@/hooks/useReferenceData";

import { employeesApi, ORGANISATION_KEYS } from "../api/organisationApi";

const EMPTY_FORM = { emp_nom: "", emp_matricule: "", emp_fonction: "", emp_contact: "", site_id: "", direction_id: "", emp_serv_id: "" };
const idDe = (value, key) => (value && typeof value === "object" ? value[key] ?? "" : value ?? "");
const memeId = (a, b) => String(a) === String(b);

function versFormulaire(employe, services) {
  const serviceId = idDe(employe.emp_serv_id, "serv_id");
  const service = services.find((s) => memeId(s.serv_id, serviceId));
  return {
    emp_nom: employe.emp_nom || "",
    emp_matricule: employe.emp_matricule || "",
    emp_fonction: employe.emp_fonction || "",
    emp_contact: employe.emp_contact || "",
    site_id: idDe(employe.emp_site_id, "site_id"),
    direction_id: idDe(employe.emp_dir_id, "dir_id") || idDe(service?.serv_dir_id, "dir_id"),
    emp_serv_id: serviceId,
  };
}

/**
 * Création / modification d'un employé.
 *
 * Le site est indépendant de la direction (le backend ne relie plus les
 * directions à un site) ; le service est filtré par la direction choisie.
 */
export function EmployeeFormModal({ isOpen, onClose, employeeToEdit = null }) {
  const isEdit = Boolean(employeeToEdit);
  const [form, setForm] = useState(EMPTY_FORM);
  const { data: sites = [] } = useSites({ enabled: isOpen });
  const { data: directions = [] } = useDirections({ enabled: isOpen });
  const { data: services = [] } = useServices({ enabled: isOpen });
  const { save, saving } = useCrudMutations(employeesApi, ORGANISATION_KEYS, {
    created: "Employé créé avec succès",
    updated: "Employé modifié avec succès",
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      isEdit
        ? versFormulaire(employeeToEdit, services)
        : { ...EMPTY_FORM, emp_matricule: `M-${Math.floor(1000 + Math.random() * 9000)}` },
    );
  }, [isOpen, isEdit, employeeToEdit, services]);

  const site = sites.find((s) => memeId(s.site_id, form.site_id)) || null;
  const direction = directions.find((d) => memeId(d.dir_id, form.direction_id)) || null;
  const service = services.find((s) => memeId(s.serv_id, form.emp_serv_id)) || null;
  const servicesDeLaDirection = useMemo(
    () => services.filter((s) => memeId(idDe(s.serv_dir_id, "dir_id"), form.direction_id)),
    [services, form.direction_id],
  );

  const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      emp_nom: form.emp_nom.trim(),
      emp_matricule: form.emp_matricule.trim(),
      emp_fonction: form.emp_fonction.trim(),
      emp_contact: form.emp_contact.trim(),
      emp_site_id: form.site_id || null,
      emp_dir_id: form.direction_id || null,
      emp_serv_id: form.emp_serv_id || null,
    };
    if (await save(isEdit ? employeeToEdit.emp_id : null, payload)) onClose();
  };

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier l'employé" : "Nouvel employé"}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={isEdit ? "Mettre à jour" : "Créer l'employé"}
      disabled={!form.emp_nom.trim() || !form.emp_matricule.trim() || !form.emp_fonction.trim()}
      maxWidth="md"
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1 }}>
        <TextField label="Nom et Prénoms" value={form.emp_nom} onChange={setField("emp_nom")} required autoFocus slotProps={{ htmlInput: { maxLength: 255 } }} />
        <TextField label="Matricule" value={form.emp_matricule} onChange={setField("emp_matricule")} required slotProps={{ htmlInput: { maxLength: 15 } }} />
        <TextField label="Fonction" value={form.emp_fonction} onChange={setField("emp_fonction")} required slotProps={{ htmlInput: { maxLength: 50 } }} />
        <TextField label="Contact" value={form.emp_contact} onChange={setField("emp_contact")} slotProps={{ htmlInput: { maxLength: 50 } }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ gridColumn: { sm: "1 / -1" }, mt: 1 }}>
          Rattachement organisationnel
        </Typography>

        <Autocomplete
          options={sites}
          getOptionLabel={(o) => o.site_nom || ""}
          isOptionEqualToValue={(o, v) => o.site_id === v.site_id}
          value={site}
          onChange={(_, v) => setForm((prev) => ({ ...prev, site_id: v?.site_id || "" }))}
          renderInput={(params) => <TextField {...params} label="Site" placeholder="Sélectionner un site..." />}
        />
        <Autocomplete
          options={directions}
          getOptionLabel={(o) => o.dir_libelle || ""}
          isOptionEqualToValue={(o, v) => o.dir_id === v.dir_id}
          value={direction}
          onChange={(_, v) => setForm((prev) => ({ ...prev, direction_id: v?.dir_id || "", emp_serv_id: "" }))}
          renderInput={(params) => <TextField {...params} label="Direction" placeholder="Sélectionner une direction..." />}
        />
        <Autocomplete
          options={servicesDeLaDirection}
          getOptionLabel={(o) => o.serv_libelle || ""}
          isOptionEqualToValue={(o, v) => o.serv_id === v.serv_id}
          value={service}
          onChange={(_, v) => setForm((prev) => ({ ...prev, emp_serv_id: v?.serv_id || "" }))}
          renderInput={(params) => <TextField {...params} label="Service" placeholder="Sélectionner un service..." />}
          disabled={!form.direction_id}
        />
      </Box>

      {(site || direction) && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
          <Typography variant="body2" color="primary.main">
            <strong>Rattachement :</strong> {[site?.site_nom, direction?.dir_libelle, service?.serv_libelle].filter(Boolean).join(" → ")}
          </Typography>
        </Box>
      )}
    </FormDialog>
  );
}
