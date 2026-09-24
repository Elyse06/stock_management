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
  Chip,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";

const ETATS_AJOUT = ["BON", "MOYEN", "MAUVAIS"];
const ETATS_CHANGE = ["MOYEN", "MAUVAIS", "HORS_USAGE"];

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
  
  // Pour le mode QUANTITE (changement d'état)
  const [qteChangement, setQteChangement] = useState("");
  const [etatChangement, setEtatChangement] = useState("MOYEN");

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
  // Si mode QUANTITE, on génère automatiquement la liste en prenant les N premières unités
  useEffect(() => {
    if (type === "CHANGEMENT_ETAT" && modeSuivi === "QUANTITE" && qteChangement && etatChangement) {
      const qte = Number(qteChangement);
      if (qte > 0 && qte <= unitesExistantes.length) {
        const unitesSelectionnees = unitesExistantes.slice(0, qte);
        const changements = unitesSelectionnees.map((u) => ({
          unite_id: u.unite_id,
          numero_serie: u.numero_de_serie,
          etat: etatChangement,
        }));
        if (JSON.stringify(value.changements_etat || []) !== JSON.stringify(changements)) {
          onChange({ ...value, changements_etat: changements });
        }
      } else {
        if ((value.changements_etat || []).length > 0) {
          onChange({ ...value, changements_etat: [] });
        }
      }
    }
  }, [qteChangement, etatChangement, modeSuivi, unitesExistantes, type, value, onChange]);

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
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField size="small" placeholder="N° de série" value={nouveauNs} onChange={(e) => setNouveauNs(e.target.value)} sx={{ flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={nouveauEtat} onChange={(e) => setNouveauEtat(e.target.value)}>
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
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Unité à retirer</InputLabel>
                <Select value="" label="Unité à retirer" onChange={(e) => handleAddRetrait(e.target.value)}>
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
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Nombre d'unités concernées"
              type="number"
              size="small"
              value={qteChangement}
              onChange={(e) => setQteChangement(e.target.value)}
              inputProps={{ min: 1, max: unitesExistantes.length }}
              sx={{ width: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Nouvel état</InputLabel>
              <Select value={etatChangement} onChange={(e) => setEtatChangement(e.target.value)} label="Nouvel état">
                {ETATS_CHANGE.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Unité concernée</InputLabel>
                <Select
                  value=""
                  label="Unité concernée"
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
                <Select value={etatChangement} onChange={(e) => setEtatChangement(e.target.value)} label="Nouvel état">
                  {ETATS_CHANGE.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </>
        )}

        {value.changements_etat?.length > 0 && (
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