import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import {
  Person as PersonIcon,
} from "@mui/icons-material";

const STATUT_OPTIONS = [
  { value: "ACTIF", label: "Actif" },
  { value: "INACTIF", label: "Inactif" },
  { value: "CONGE", label: "En congé" },
];

export function EmployeeFormDialog({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
  sites = [],
  directions = [],
  services = [],
}) {
  const isEditing = Boolean(initialData);

  const [nom, setNom] = useState("");
  const [matricule, setMatricule] = useState("");
  const [fonction, setFonction] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [siteId, setSiteId] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [statut, setStatut] = useState("ACTIF");
  const [dateEmbauche, setDateEmbauche] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (initialData) {
        setNom(initialData.emp_nom || "");
        setMatricule(initialData.emp_matricule || "");
        setFonction(initialData.emp_fonction || "");
        setContact(initialData.emp_contact || "");
        setEmail(initialData.emp_email || "");
        setSiteId(initialData.site_id || "");
        setDirectionId(initialData.direction_id || "");
        setServiceId(initialData.service_id || "");
        setStatut(initialData.statut || "ACTIF");
        setDateEmbauche(
          initialData.date_embauche
            ? initialData.date_embauche.slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
      } else {
        setNom("");
        setMatricule(`M-${Math.floor(1000 + Math.random() * 9000)}`);
        setFonction("");
        setContact("");
        setEmail("");
        setSiteId(sites[0]?.site_id || "");
        setDirectionId(directions[0]?.dir_id || "");
        setServiceId(services[0]?.service_id || "");
        setStatut("ACTIF");
        setDateEmbauche(new Date().toISOString().slice(0, 10));
      }
      setErrors({});
    }
  }, [open, initialData, sites, directions, services]);

  // Filter services by selected direction if any
  const filteredServices = useMemo(() => {
    if (!directionId) return services;
    return services.filter((s) => s.direction_id === directionId);
  }, [services, directionId]);

  // Filter directions by selected site if any
  const filteredDirections = useMemo(() => {
    if (!siteId) return directions;
    return directions.filter((d) => !d.site_id || d.site_id === siteId || d.site === siteId);
  }, [directions, siteId]);

  const handleNomChange = (e) => {
    const val = e.target.value;
    setNom(val);
    if (!isEditing && val) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean && !email) {
        setEmail(`${clean}@paositra.mg`);
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!nom.trim()) {
      newErrors.nom = "Le nom et prénom est obligatoire.";
    }
    if (!matricule.trim()) {
      newErrors.matricule = "Le numéro matricule est obligatoire.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Adresse email invalide.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedSite = sites.find((s) => s.site_id === Number(siteId));
    const selectedDir = directions.find((d) => d.dir_id === directionId);
    const selectedServ = services.find((s) => s.service_id === Number(serviceId));

    const payload = {
      emp_nom: nom.trim(),
      emp_matricule: matricule.trim(),
      emp_fonction: fonction.trim() || "Agent",
      emp_contact: contact.trim(),
      emp_email: email.trim(),
      site_id: selectedSite ? selectedSite.site_id : null,
      site_nom: selectedSite ? selectedSite.site_nom : "",
      direction_id: selectedDir ? selectedDir.dir_id : "",
      direction_libelle: selectedDir ? selectedDir.dir_libelle : "",
      service_id: selectedServ ? selectedServ.service_id : null,
      service_libelle: selectedServ ? selectedServ.service_libelle : "",
      statut,
      date_embauche: dateEmbauche,
    };

    onSubmit(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 1.5,
                bgcolor: "#FFF8E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.dark",
              }}
            >
              <PersonIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {isEditing ? "Modifier l'employé" : "Ajouter un nouvel employé"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditing
                  ? `Mise à jour des informations de ${initialData?.emp_nom}`
                  : "Enregistrement d'un collaborateur au registre du personnel"}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            {/* Section 1: Identité */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="primary.dark"
                sx={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5, mb: 1 }}
              >
                1. Identité & Immatriculation
              </Typography>
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                label="Nom et Prénoms *"
                fullWidth
                size="small"
                value={nom}
                onChange={handleNomChange}
                error={Boolean(errors.nom)}
                helperText={errors.nom || "Ex: RAKOTOARISOA Jean-Luc"}
                disabled={loading}
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Matricule *"
                fullWidth
                size="small"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                error={Boolean(errors.matricule)}
                helperText={errors.matricule || "Ex: M-4012"}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Fonction / Intitulé du poste"
                fullWidth
                size="small"
                value={fonction}
                onChange={(e) => setFonction(e.target.value)}
                helperText="Ex: Administrateur Réseaux, Responsable Parc, Agent Guichet"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut professionnel</InputLabel>
                <Select
                  value={statut}
                  label="Statut professionnel"
                  onChange={(e) => setStatut(e.target.value)}
                  disabled={loading}
                >
                  {STATUT_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Section 2: Structure Organisationnelle */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="primary.dark"
                sx={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5, mb: 1 }}
              >
                2. Affectation & Rattachement Hiérarchique
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Site / Localité</InputLabel>
                <Select
                  value={siteId}
                  label="Site / Localité"
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>-- Non défini --</em>
                  </MenuItem>
                  {sites.map((site) => (
                    <MenuItem key={site.site_id} value={site.site_id}>
                      {site.site_nom} ({site.site_type})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Lieu de travail physique</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction de rattachement</InputLabel>
                <Select
                  value={directionId}
                  label="Direction de rattachement"
                  onChange={(e) => {
                    setDirectionId(e.target.value);
                    setServiceId(""); // Reset service on direction change
                  }}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>-- Aucune --</em>
                  </MenuItem>
                  {filteredDirections.map((dir) => (
                    <MenuItem key={dir.dir_id} value={dir.dir_id}>
                      {dir.dir_libelle} ({dir.dir_id})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Entité hiérarchique parente</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Service</InputLabel>
                <Select
                  value={serviceId}
                  label="Service"
                  onChange={(e) => setServiceId(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>-- Aucun --</em>
                  </MenuItem>
                  {filteredServices.map((serv) => (
                    <MenuItem key={serv.service_id} value={serv.service_id}>
                      {serv.service_libelle}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Unité opérationnelle directe</FormHelperText>
              </FormControl>
            </Grid>

            {/* Section 3: Coordonnées & Administratif */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="primary.dark"
                sx={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5, mb: 1 }}
              >
                3. Contacts & Administratif
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact téléphonique"
                fullWidth
                size="small"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Ex: 034 11 222 33 / +261 32 55 666 77"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Adresse Email professionnelle"
                fullWidth
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(errors.email)}
                helperText={errors.email || "Ex: collaborateur@paositra.mg"}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Date d'embauche / prise de service"
                fullWidth
                size="small"
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#FAFAFA" }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: "primary.main",
              color: "#000000",
              fontWeight: 600,
              px: 3,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {loading ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer l'employé"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
