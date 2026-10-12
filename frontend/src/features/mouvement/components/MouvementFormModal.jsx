import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  Autocomplete,
  Chip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  SwapHoriz as SwapHorizIcon,
  QrCodeScanner as QrCodeScannerIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { FormDialog } from "../../../components/common/FormDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { SaisieRapideNumerosSerie } from "./SaisieRapideNumerosSerie";

const TYPES_MANUELS = [
  { value: "ENTREE", label: "Entrée de stock", icon: <LoginIcon fontSize="small" /> },
  { value: "TRANSFERT", label: "Transfert entre magasins", icon: <SwapHorizIcon fontSize="small" /> },
];

const EMPTY_DETAIL = { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "", prix_achat: "" };

/** Champ d'ajout d'un numéro de série : Entrée pour valider (sans soumettre le formulaire). */
function NumeroSerieInput({ onAdd }) {
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
            <IconButton size="small" color="primary" onClick={submit} disabled={!value.trim()}>
              <AddIcon fontSize="small" />
            </IconButton>
          ),
        },
      }}
    />
  );
}

export function MouvementFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedArticle = null,
  preselectedQuantite = null,
}) {
  const notify = useNotification();
  const { canManageCatalogue, canManageInventaire } = usePermission();
  const canCreate = canManageCatalogue || canManageInventaire;

  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [typeMouvement, setTypeMouvement] = useState("ENTREE");
  const [origine, setOrigine] = useState("");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([{ ...EMPTY_DETAIL }]);
  const [saving, setSaving] = useState(false);
  const [saisieRapideOpen, setSaisieRapideOpen] = useState(false);
  const [saisieRapideDetailIndex, setSaisieRapideDetailIndex] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTypeMouvement("ENTREE");
    setOrigine("");
    setMagasinSource("");
    setMagasinDestination("");
    setDetails(
      preselectedArticle
        ? [{ ...EMPTY_DETAIL, article: preselectedArticle, quantite: preselectedQuantite || 1 }]
        : [{ ...EMPTY_DETAIL }]
    );

    Promise.all([
      apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } }),
      apiClient.get(API_ENDPOINTS.FOURNISSEURS, { params: { page_size: 100 } }),
    ])
      .then(([magasinsRes, articlesRes, fournisseursRes]) => {
        setMagasins(magasinsRes.data.results ?? magasinsRes.data);
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setFournisseurs(fournisseursRes.data.results ?? fournisseursRes.data);
      })
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED));
  }, [isOpen, preselectedArticle, preselectedQuantite]);

  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);
  const isModeNumeroSerie = (codeArticle) => getArticle(codeArticle)?.mode_suivi === "NUMERO_SERIE";

  // ---- Mises à jour immuables des lignes ----
  const updateDetail = (index, changes) =>
    setDetails((prev) => prev.map((d, i) => (i === index ? { ...d, ...changes } : d)));

  const handleArticleChange = (index, article) =>
    updateDetail(index, {
      article: article?.code_article ?? "",
      numeros_de_serie: [],
      quantite: 1,
    });

  const ajouterNumeros = (index, nouveaux) =>
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const vus = new Set(d.numeros_de_serie.map((n) => n.toLowerCase()));
        const ajoutes = [];
        for (const brut of nouveaux) {
          const numero = brut.trim();
          if (numero && !vus.has(numero.toLowerCase())) {
            vus.add(numero.toLowerCase());
            ajoutes.push(numero);
          }
        }
        const numeros = [...d.numeros_de_serie, ...ajoutes];
        return { ...d, numeros_de_serie: numeros, quantite: numeros.length };
      })
    );

  const retirerNumero = (index, nsIndex) =>
    setDetails((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const numeros = d.numeros_de_serie.filter((_, k) => k !== nsIndex);
        return { ...d, numeros_de_serie: numeros, quantite: numeros.length };
      })
    );

  const ouvrirSaisieRapide = (detailIndex) => {
    setSaisieRapideDetailIndex(detailIndex);
    setSaisieRapideOpen(true);
  };

  const handleSaisieRapideSubmit = (nouveauxNumeros) => {
    if (saisieRapideDetailIndex === null) return;
    ajouterNumeros(saisieRapideDetailIndex, nouveauxNumeros);
    setSaisieRapideOpen(false);
    setSaisieRapideDetailIndex(null);
  };

  const addDetailRow = () => setDetails((prev) => [...prev, { ...EMPTY_DETAIL }]);

  const removeDetailRow = (index) => {
    if (details.length > 1) setDetails((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- Validation et envoi (logique inchangée) ----
  const valider = () => {
    const hasInvalidArticle = details.some((d) => !d.article || String(d.article).trim() === "");
    if (hasInvalidArticle) return "Veuillez sélectionner un article valide pour chaque ligne.";

    for (const detail of details) {
      if (isModeNumeroSerie(detail.article)) {
        const numerosValides = detail.numeros_de_serie.filter((ns) => ns.trim());
        if (numerosValides.length === 0) {
          return `Veuillez saisir au moins un numéro de série pour "${getArticle(detail.article)?.designation}".`;
        }
        const uniqueNumeros = new Set(numerosValides.map((ns) => ns.trim().toLowerCase()));
        if (uniqueNumeros.size !== numerosValides.length) {
          return `Numéros de série en doublon pour "${getArticle(detail.article)?.designation}".`;
        }
      } else if (!detail.quantite || Number(detail.quantite) <= 0) {
        return `Quantité invalide pour "${getArticle(detail.article)?.designation}".`;
      }
    }

    if (typeMouvement === "ENTREE" && !magasinDestination) {
      return "Le magasin destination est requis pour une entrée.";
    }
    if (typeMouvement === "TRANSFERT") {
      if (!magasinSource) return "Le magasin source est requis pour un transfert.";
      if (!magasinDestination) return "Le magasin destination est requis pour un transfert.";
      if (magasinSource === magasinDestination) {
        return "Le magasin source et destination doivent être différents.";
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erreur = valider();
    if (erreur) {
      notify.error(erreur);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type_mouvement: typeMouvement,
        details: details.map((d) => {
          const numeros = d.numeros_de_serie.filter((ns) => ns.trim()).map((ns) => ns.trim());
          const detailPayload = {
            article: String(d.article),
            quantite: isModeNumeroSerie(d.article) ? numeros.length : parseInt(d.quantite, 10),
          };
          if (isModeNumeroSerie(d.article)) {
            detailPayload.numeros_de_serie = numeros;
          }
          if (typeMouvement === "ENTREE" && d.fournisseur) {
            detailPayload.fournisseur = Number(d.fournisseur);
            detailPayload.prix_achat = d.prix_achat;
          }
          return detailPayload;
        }),
      };

      if (typeMouvement === "ENTREE") {
        payload.magasin_destination = Number(magasinDestination);
        if (origine.trim()) payload.origine = origine.trim();
      } else if (typeMouvement === "TRANSFERT") {
        payload.magasin_source = Number(magasinSource);
        payload.magasin_destination = Number(magasinDestination);
      }

      await apiClient.post(API_ENDPOINTS.MOUVEMENTS, payload);
      notify.success("Mouvement enregistré avec succès");
      if (onSuccess) onSuccess();
      onClose();
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

  const magasinOptions = [
    { value: "", label: "Sélectionner un magasin" },
    ...magasins.map((m) => ({
      value: m.magasin_id,
      label: `${m.magasin_nom}${m.localite ? ` (${m.localite_nom})` : ""}`,
    })),
  ];

  const fournisseurOptions = [
    { value: "", label: "-- Sélectionner --" },
    ...fournisseurs.map((f) => ({ value: f.fournisseur_id, label: f.nom })),
  ];

  const titre = typeMouvement === "ENTREE" ? "Nouvelle entrée de stock" : "Nouveau transfert";

  const totalUnites = details.reduce((sum, d) => sum + (Number(d.quantite) || 0), 0);

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={titre}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel="Enregistrer"
      disabled={!canCreate}
      maxWidth="md"
    >
      {preselectedArticle && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Article pré-sélectionné : <strong>{preselectedArticle}</strong>
          {preselectedQuantite && ` — Quantité suggérée : ${preselectedQuantite}`}
        </Alert>
      )}

      {/* ---------- Type ---------- */}
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={typeMouvement}
        onChange={(_, value) => value && setTypeMouvement(value)}
        sx={{
          mb: 2.5,
          "& .MuiToggleButton-root": {
            py: 1,
            gap: 1,
            textTransform: "none",
            "&.Mui-selected": {
              bgcolor: "tint.main",
              color: "primary.main",
              borderColor: "primary.main",
              fontWeight: 600,
            },
          },
        }}
      >
        {TYPES_MANUELS.map((t) => (
          <ToggleButton key={t.value} value={t.value}>
            {t.icon}
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* ---------- Magasins ---------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            typeMouvement === "TRANSFERT"
              ? { xs: "1fr", sm: "1fr auto 1fr" }
              : { xs: "1fr", sm: "1fr 1fr" },
          alignItems: "center",
          gap: 2,
          "& .MuiFormControl-root": { width: "100%" },
        }}
      >
        {typeMouvement === "ENTREE" && (
          <TextField
            label="Origine (optionnel)"
            value={origine}
            onChange={(e) => setOrigine(e.target.value)}
            placeholder="Ex: Réapprovisionnement, Ajustement..."
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        )}

        {typeMouvement === "TRANSFERT" && (
          <>
            <SelectFilter
              label="Magasin source *"
              value={magasinSource}
              onChange={setMagasinSource}
              options={magasinOptions}
              required
            />
            <Box sx={{ display: "flex", justifyContent: "center", color: "text.secondary" }}>
              <ArrowForwardIcon sx={{ display: { xs: "none", sm: "block" } }} />
              <ArrowDownwardIcon sx={{ display: { xs: "block", sm: "none" } }} />
            </Box>
          </>
        )}

        <SelectFilter
          label="Magasin destination *"
          value={magasinDestination}
          onChange={setMagasinDestination}
          options={magasinOptions}
          required
        />
      </Box>

      {/* ---------- Articles ---------- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mt: 3,
          mb: 1.5,
        }}
      >
        <Typography variant="h3">Articles concernés</Typography>
        <Chip
          label={`${details.length} ligne(s) • ${totalUnites} unité(s)`}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {details.map((row, index) => {
        const article = getArticle(row.article);
        const modeNS = article?.mode_suivi === "NUMERO_SERIE";

        return (
          <Paper
            key={index}
            variant="outlined"
            sx={{ p: 2, mb: 1.5, borderLeft: "3px solid", borderLeftColor: "secondary.main" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                LIGNE {index + 1}
              </Typography>
              {details.length > 1 && (
                <IconButton size="small" color="error" onClick={() => removeDetailRow(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Autocomplete
              size="small"
              options={articles}
              value={article ?? null}
              onChange={(_, value) => handleArticleChange(index, value)}
              getOptionLabel={(a) => `${a.code_article} - ${a.designation}`}
              isOptionEqualToValue={(a, v) => a.code_article === v.code_article}
              noOptionsText="Aucun article"
              renderInput={(params) => (
                <TextField {...params} label="Article" placeholder="Rechercher par code ou désignation..." />
              )}
              renderOption={(props, a) => {
                const { key, ...rest } = props;
                return (
                  <Box component="li" key={key} {...rest}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {a.designation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.code_article}
                        {a.categorie_nom ? ` • ${a.categorie_nom}` : ""}
                        {a.mode_suivi === "NUMERO_SERIE" ? " • N° de série" : ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: typeMouvement === "ENTREE" ? "140px 1fr 1fr" : "140px",
                },
                gap: 2,
                mt: 2,
                alignItems: "start",
                "& .MuiFormControl-root": { width: "100%" },
              }}
            >
              {modeNS ? (
                <Button
                  variant="outlined"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => ouvrirSaisieRapide(index)}
                  sx={{ height: 40 }}
                >
                  Saisie rapide
                </Button>
              ) : (
                <TextField
                  label="Quantité"
                  type="number"
                  size="small"
                  value={row.quantite}
                  onChange={(e) => updateDetail(index, { quantite: e.target.value })}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              )}

              {typeMouvement === "ENTREE" && (
                <>
                  <SelectFilter
                    label="Fournisseur"
                    value={row.fournisseur}
                    onChange={(value) => updateDetail(index, { fournisseur: value })}
                    options={fournisseurOptions}
                  />
                  <TextField
                    label="Prix d'achat (MGA)"
                    type="number"
                    size="small"
                    value={row.prix_achat}
                    onChange={(e) => updateDetail(index, { prix_achat: e.target.value })}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </>
              )}
            </Box>

            {modeNS && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  Numéros de série ({row.numeros_de_serie.length})
                </Typography>
                {row.numeros_de_serie.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
                    {row.numeros_de_serie.map((ns, nsIndex) => (
                      <Chip
                        key={`${ns}-${nsIndex}`}
                        label={ns}
                        size="small"
                        onDelete={() => retirerNumero(index, nsIndex)}
                        sx={{ fontFamily: "monospace" }}
                      />
                    ))}
                  </Box>
                )}
                <NumeroSerieInput onAdd={(nouveaux) => ajouterNumeros(index, nouveaux)} />
              </Box>
            )}
          </Paper>
        );
      })}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={addDetailRow} size="small">
        Ajouter une ligne
      </Button>

      <SaisieRapideNumerosSerie
        isOpen={saisieRapideOpen}
        onClose={() => {
          setSaisieRapideOpen(false);
          setSaisieRapideDetailIndex(null);
        }}
        onSubmit={handleSaisieRapideSubmit}
        numerosExistant={
          saisieRapideDetailIndex !== null ? (details[saisieRapideDetailIndex]?.numeros_de_serie ?? []) : []
        }
        quantiteRequise={
          saisieRapideDetailIndex !== null ? (details[saisieRapideDetailIndex]?.quantite ?? 0) : 0
        }
        articleDesignation={
          saisieRapideDetailIndex !== null
            ? (getArticle(details[saisieRapideDetailIndex]?.article)?.designation ?? "")
            : ""
        }
      />
    </FormDialog>
  );
}
