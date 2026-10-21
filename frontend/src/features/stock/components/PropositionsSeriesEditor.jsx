import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  DeleteOutlined as SupprimerIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";

const ETATS_AJOUT = ["BON", "MOYEN", "MAUVAIS"];
const ETATS_CHANGE = ["MOYEN", "MAUVAIS", "HORS_USAGE"];
const LIBELLES_ETAT = { MOYEN: "Moyen", MAUVAIS: "Mauvais", HORS_USAGE: "Hors usage" };

/** Répartition initiale (« 1 Moyen, 3 Mauvais ») reconstituée à partir de changements déjà saisis. */
function repartitionInitiale(changements = []) {
  const parEtat = {};
  for (const c of changements) parEtat[c.etat] = (parEtat[c.etat] || 0) + 1;
  const lignes = Object.entries(parEtat).map(([etat, quantite]) => ({ etat, quantite: String(quantite) }));
  return lignes.length ? lignes : [{ etat: "MOYEN", quantite: "" }];
}

/** Changements d'état en quantité : plusieurs lignes « nombre → état », chacune sur des unités distinctes. */
function changementsDepuisRepartition(repartition, unites) {
  const changements = [];
  let rang = 0;
  for (const { etat, quantite } of repartition) {
    const n = Number(quantite);
    if (!(n > 0)) continue;
    for (const u of unites.slice(rang, rang + n)) changements.push({ unite_id: u.unite_id, numero_serie: u.numero_de_serie, etat });
    rang += n;
  }
  return changements;
}

export function PropositionsSeriesEditor({
  type,
  ecart = 0,
  modeSuivi = "NUMERO_SERIE",
  unitesExistantes = [],
  value = {},
  onChange,
}) {
  const [nouveauNs, setNouveauNs] = useState("");
  const [nouveauEtat, setNouveauEtat] = useState("BON");
  
  // Mode QUANTITE : répartition des unités concernées par nouvel état (ex. 1 Moyen, 3 Mauvais, 1 Hors usage).
  const [repartition, setRepartition] = useState(() => repartitionInitiale(value.changements_etat));
  // Mode NUMERO_SERIE : état appliqué à l'unité choisie.
  const [etatChangement, setEtatChangement] = useState("MOYEN");
  const totalReparti = repartition.reduce((somme, l) => somme + (Number(l.quantite) > 0 ? Number(l.quantite) : 0), 0);
  const depassement = totalReparti > unitesExistantes.length;

  // --- Logique pour les AJOUTS (ecart > 0) ---
  const handleAddAjout = () => {
    if (!nouveauNs.trim()) return;
    const newAjout = { numero_serie: nouveauNs.trim(), etat: nouveauEtat };
    onChange({ ...value, ajouts: [...(value.ajouts || []), newAjout] });
    setNouveauNs("");
  };

  const removeAjout = (index) => {
    const list = [...(value.ajouts || [])];
    list.splice(index, 1);
    onChange({ ...value, ajouts: list });
  };

  // --- Logique pour les RETRAITS (ecart < 0) ---
  const handleAddRetrait = (uniteId) => {
    const unite = unitesExistantes.find((u) => String(u.unite_id) === String(uniteId));
    if (!unite) return;
    const newRetrait = { unite_id: unite.unite_id, numero_serie: unite.numero_de_serie, etat: "PERDU" }; // Par défaut perdu pour retrait
    onChange({ ...value, retraits: [...(value.retraits || []), newRetrait] });
  };

  const removeRetrait = (index) => {
    const list = [...(value.retraits || [])];
    list.splice(index, 1);
    onChange({ ...value, retraits: list });
  };

  // --- Logique pour les CHANGEMENTS D'ÉTAT ---
  // Mode QUANTITE : les changements sont générés à partir de la répartition (unités distinctes, dans l'ordre).
  useEffect(() => {
    if (type !== "CHANGEMENT_ETAT" || modeSuivi !== "QUANTITE") return;
    const changements = depassement ? [] : changementsDepuisRepartition(repartition, unitesExistantes);
    if (JSON.stringify(value.changements_etat || []) !== JSON.stringify(changements)) {
      onChange({ ...value, changements_etat: changements });
    }
  }, [repartition, depassement, modeSuivi, unitesExistantes, type, value, onChange]);

  const modifierRepartition = (index, patch) =>
    setRepartition((lignes) => lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const ajouterEtat = () => {
    const libre = ETATS_CHANGE.find((e) => !repartition.some((l) => l.etat === e)) ?? "MOYEN";
    setRepartition((lignes) => [...lignes, { etat: libre, quantite: "" }]);
  };
  const retirerEtat = (index) =>
    setRepartition((lignes) => (lignes.length > 1 ? lignes.filter((_, i) => i !== index) : [{ etat: "MOYEN", quantite: "" }]));

  const removeChange = (index) => {
    const list = [...(value.changements_etat || [])];
    list.splice(index, 1);
    onChange({ ...value, changements_etat: list });
  };

  // Filtrer les unités déjà utilisées
  const usedUniteIds = new Set([
    ...(value.retraits || []).map((r) => r.unite_id),
    ...(value.changements_etat || []).map((c) => c.unite_id),
  ]);
  const unitesDisponibles = unitesExistantes.filter((u) => !usedUniteIds.has(u.unite_id));

  // --- RENDU CONDITIONNEL ---

  // 1. Affichage des AJOUTS (si ecart > 0)
  if (type === "ECART" && ecart > 0) {
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: "#F1F8E9", borderRadius: 1, border: "1px solid #C5E1A5" }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: "#2E7D32" }}>
          <AddIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          Ajouter {ecart} nouvelle(s) unité(s) trouvée(s)
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
          <TextField size="small" placeholder="N° de série" value={nouveauNs} onChange={(e) => setNouveauNs(e.target.value)} sx={{ flex: 1, minWidth: 160 }} />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={nouveauEtat} onChange={(e) => setNouveauEtat(e.target.value)} inputProps={{ "aria-label": "État de la nouvelle unité" }}>
              {ETATS_AJOUT.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddAjout} disabled={!nouveauNs.trim()}>
            Ajouter
          </Button>
        </Box>
        {value.ajouts?.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {value.ajouts.map((a, idx) => (
              <Chip key={idx} label={`${a.numero_serie} (${a.etat})`} onDelete={() => removeAjout(idx)} color="success" variant="outlined" size="small" />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  // 2. Affichage des RETRAITS (si ecart < 0)
  if (type === "ECART" && ecart < 0) {
    const nbRetraitsNecessaires = Math.abs(ecart);
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: "#FFEBEE", borderRadius: 1, border: "1px solid #FFCDD2" }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: "#C62828" }}>
          <RemoveIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          Retirer {nbRetraitsNecessaires} unité(s) manquante(s)
        </Typography>
        {unitesExistantes.length === 0 ? (
          <Alert severity="warning">Aucune unité en stock à retirer.</Alert>
        ) : (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
                <InputLabel>Unité à retirer</InputLabel>
                <Select value="" label="Unité à retirer" onChange={(e) => handleAddRetrait(e.target.value)} inputProps={{ "aria-label": "Unité à retirer" }}>
                  {unitesDisponibles.map((u) => (
                    <MenuItem key={u.unite_id} value={u.unite_id}>
                      {u.numero_de_serie} {u.etat && `(${u.etat})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {value.retraits?.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {value.retraits.map((r, idx) => (
                  <Chip key={idx} label={`${r.numero_serie} → PERDU`} onDelete={() => removeRetrait(idx)} color="error" variant="outlined" size="small" />
                ))}
              </Box>
            )}
          </>
        )}
      </Box>
    );
  }

  // 3. Affichage des CHANGEMENTS D'ÉTAT
  if (type === "CHANGEMENT_ETAT") {
    return (
      <Box sx={{ mt: 1, p: 2, bgcolor: "#FFF3E0", borderRadius: 1, border: "1px solid #FFE0B2" }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: "#E65100" }}>
          <SwapHorizIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
          Changer l'état d'unités existantes
        </Typography>

        {modeSuivi === "QUANTITE" ? (
          <Box>
            {repartition.map((ligne, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <Box key={index} sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
                <TextField
                  label="Nombre d'unités"
                  type="number"
                  size="small"
                  value={ligne.quantite}
                  onChange={(e) => modifierRepartition(index, { quantite: e.target.value })}
                  slotProps={{ htmlInput: { min: 1, max: unitesExistantes.length } }}
                  sx={{ width: 150 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Nouvel état</InputLabel>
                  <Select value={ligne.etat} onChange={(e) => modifierRepartition(index, { etat: e.target.value })} label="Nouvel état"
                    inputProps={{ "aria-label": `Nouvel état (ligne ${index + 1})` }}>
                    {ETATS_CHANGE.map((e) => <MenuItem key={e} value={e}>{LIBELLES_ETAT[e]}</MenuItem>)}
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={() => retirerEtat(index)} aria-label={`Retirer la ligne ${index + 1}`}>
                  <SupprimerIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Button size="small" startIcon={<AddIcon />} onClick={ajouterEtat}>Ajouter un état</Button>
              <Typography variant="caption" color={depassement ? "error" : "text.secondary"}>
                {totalReparti} unité(s) sur {unitesExistantes.length}
                {depassement && " : plus d'unités que dans ce lieu"}
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 180 }}>
                <InputLabel>Unité concernée</InputLabel>
                <Select
                  value=""
                  label="Unité concernée"
                  inputProps={{ "aria-label": "Unité concernée" }}
                  onChange={(e) => {
                    const unite = unitesExistantes.find((u) => String(u.unite_id) === String(e.target.value));
                    if (unite) {
                      const newChange = { unite_id: unite.unite_id, numero_serie: unite.numero_de_serie, etat: etatChangement };
                      onChange({ ...value, changements_etat: [...(value.changements_etat || []), newChange] });
                    }
                  }}
                >
                  {unitesDisponibles.map((u) => (
                    <MenuItem key={u.unite_id} value={u.unite_id}>
                      {u.numero_de_serie} {u.etat && `(${u.etat})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Nouvel état</InputLabel>
                <Select value={etatChangement} onChange={(e) => setEtatChangement(e.target.value)} label="Nouvel état" inputProps={{ "aria-label": "Nouvel état" }}>
                  {ETATS_CHANGE.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {modeSuivi !== "QUANTITE" && value.changements_etat?.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {value.changements_etat.map((c, idx) => (
              <Chip
                key={idx}
                label={`${c.numero_serie || `Unité ${c.unite_id}`} → ${c.etat}`}
                onDelete={() => removeChange(idx)}
                color="warning"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return null;
}