import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  SwapHoriz as SwapHorizIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { FormDialog } from "../../../components/common/FormDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { SaisieRapideNumerosSerie } from "./SaisieRapideNumerosSerie";

const TYPES_MANUELS = [
  { value: "ENTREE", label: "Entrée de stock", icon: <LoginIcon fontSize="small" /> },
  { value: "TRANSFERT", label: "Transfert entre magasins", icon: <SwapHorizIcon fontSize="small" /> },
];

const EMPTY_DETAIL = { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "" , prix_achat: ""};

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
        ? [{ article: preselectedArticle, quantite: preselectedQuantite || 1, numeros_de_serie: [], fournisseur: "", prix_achat: "" }]
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

  const handleDetailChange = (index, field, value) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "article") {
      updated[index].numeros_de_serie = [];
      if (isModeNumeroSerie(value)) {
        updated[index].quantite = updated[index].numeros_de_serie.length || 1;
      }
    }
    setDetails(updated);
  };

  const handleNumeroSerieChange = (detailIndex, nsIndex, value) => {
    const updated = [...details];
    const numeros = [...updated[detailIndex].numeros_de_serie];
    numeros[nsIndex] = value;
    updated[detailIndex].numeros_de_serie = numeros;
    updated[detailIndex].quantite = numeros.filter((ns) => ns.trim()).length;
    setDetails(updated);
  };

  const addNumeroSerieRow = (detailIndex) => {
    const updated = [...details];
    updated[detailIndex].numeros_de_serie = [...updated[detailIndex].numeros_de_serie, ""];
    setDetails(updated);
  };

  const removeNumeroSerieRow = (detailIndex, nsIndex) => {
    const updated = [...details];
    const numeros = updated[detailIndex].numeros_de_serie.filter((_, i) => i !== nsIndex);
    updated[detailIndex].numeros_de_serie = numeros;
    updated[detailIndex].quantite = numeros.filter((ns) => ns.trim()).length;
    setDetails(updated);
  };

  const ouvrirSaisieRapide = (detailIndex) => {
    setSaisieRapideDetailIndex(detailIndex);
    setSaisieRapideOpen(true);
  };

  const handleSaisieRapideSubmit = (nouveauxNumeros) => {
    if (saisieRapideDetailIndex === null) return;
    const updated = [...details];
    const detail = updated[saisieRapideDetailIndex];
    const existantsSet = new Set(detail.numeros_de_serie.map((n) => n.toLowerCase()));
    const nouveauxFiltres = nouveauxNumeros.filter((n) => !existantsSet.has(n.toLowerCase()));
    detail.numeros_de_serie = [...detail.numeros_de_serie, ...nouveauxFiltres];
    detail.quantite = detail.numeros_de_serie.filter((ns) => ns.trim()).length;
    setDetails(updated);
    setSaisieRapideOpen(false);
    setSaisieRapideDetailIndex(null);
  };

  const addDetailRow = () => {
    setDetails([...details, { ...EMPTY_DETAIL }]);
  };

  const removeDetailRow = (index) => {
    if (details.length > 1) {
      setDetails(details.filter((_, i) => i !== index));
    }
  };

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
      } else {
        if (!detail.quantite || Number(detail.quantite) <= 0) {
          return `Quantité invalide pour "${getArticle(detail.article)?.designation}".`;
        }
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
          const detailPayload = {
            article: String(d.article),
            quantite: parseInt(d.quantite, 10),
          };
          if (isModeNumeroSerie(d.article)) {
            detailPayload.numeros_de_serie = d.numeros_de_serie.filter((ns) => ns.trim()).map((ns) => ns.trim());
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

  const typeMouvementOptions = TYPES_MANUELS.map((t) => ({
    value: t.value,
    label: (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {t.icon}
        <span>{t.label}</span>
      </Box>
    ),
  }));

  const magasinOptions = [
    { value: "", label: "Sélectionner un magasin" },
    ...magasins.map((m) => ({
      value: m.magasin_id,
      label: `${m.magasin_nom}${m.localite ? ` (${m.localite})` : ""}`,
    })),
  ];

  const fournisseurOptions = [
    { value: "", label: "-- Sélectionner --" },
    ...fournisseurs.map((f) => ({ value: f.fournisseur_id, label: f.nom })),
  ];

  const articleOptions = [
    { value: "", label: "-- Sélectionner un article --" },
    ...articles.map((a) => ({ value: a.code_article, label: `${a.code_article} - ${a.designation}` })),
  ];

  const titre = typeMouvement === "ENTREE" ? "Nouvelle entrée de stock" : "Nouveau transfert";

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={titre}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel="Enregistrer"
      submitIcon={<SaveIcon />}
      disabled={!canCreate}
      maxWidth="md"
    >
      {preselectedArticle && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1 }}>
          <Typography variant="body2">
            Article pré-sélectionné : <strong>{preselectedArticle}</strong>
            {preselectedQuantite && ` — Quantité suggérée : ${preselectedQuantite}`}
          </Typography>
        </Box>
      )}

      <SelectFilter
        label="Type de mouvement"
        value={typeMouvement}
        onChange={(value) => setTypeMouvement(value)}
        options={typeMouvementOptions}
      />

      {typeMouvement === "ENTREE" && (
        <TextField
          label="Origine (optionnel)"
          value={origine}
          onChange={(e) => setOrigine(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="Ex: Réapprovisionnement, Ajustement..."
          inputProps={{ maxLength: 100 }}
        />
      )}

      {typeMouvement === "TRANSFERT" && (
        <SelectFilter
          label="Magasin source *"
          value={magasinSource}
          onChange={(value) => setMagasinSource(value)}
          options={magasinOptions}
          required
        />
      )}

      <SelectFilter
        label="Magasin destination *"
        value={magasinDestination}
        onChange={(value) => setMagasinDestination(value)}
        options={magasinOptions}
        required
      />

      <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
        Articles concernés
      </Typography>

      <StyledTable
        columns={[
          { label: "Article" },
          { label: "Quantité", align: "center", width: 120 },
          { label: "Numéros de série", minWidth: 250 },
          ...(typeMouvement === "ENTREE" ? [
            {label: 
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <BusinessIcon fontSize="small" />Fournisseur
            </Box>, 
            minWidth: 180},
            {label: "Prix d'achat (MGA)", minWidth: 150}
          ] : []),
          { label: "", align: "center", width: 60 },
        ]}
      >
        {details.map((row, index) => {
          const article = getArticle(row.article);
          const modeNS = article?.mode_suivi === "NUMERO_SERIE";
          return (
            <tr key={index}>
              <td>
                <SelectFilter
                  value={row.article}
                  onChange={(value) => handleDetailChange(index, "article", value)}
                  options={articleOptions}
                  size="small"
                />
              </td>
              <td align="center">
                {modeNS ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => ouvrirSaisieRapide(index)}
                    sx={{ mb: 1, width: "100%" }}
                  >
                    Saisie rapide ({row.numeros_de_serie.length})
                  </Button>
                ) : (
                  <TextField
                    type="number"
                    size="small"
                    value={row.quantite}
                    onChange={(e) => handleDetailChange(index, "quantite", e.target.value)}
                    inputProps={{ min: 1 }}
                    sx={{ width: 100 }}
                  />
                )}
              </td>
              <td>
                {modeNS ? (
                  <Box>
                    {row.numeros_de_serie.map((ns, nsIndex) => (
                      <Box key={nsIndex} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                        <QrCodeIcon fontSize="small" color="action" />
                        <TextField
                          size="small"
                          value={ns}
                          onChange={(e) => handleNumeroSerieChange(index, nsIndex, e.target.value)}
                          placeholder={`N° série ${nsIndex + 1}`}
                          sx={{ flex: 1 }}
                          inputProps={{ maxLength: 100 }}
                        />
                        <IconButton size="small" color="error" onClick={() => removeNumeroSerieRow(index, nsIndex)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addNumeroSerieRow(index)} sx={{ mt: 0.5 }}>
                      Ajouter N° série
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </td>
              {typeMouvement === "ENTREE" && (
                <><td>
                  <SelectFilter
                    value={row.fournisseur}
                    onChange={(value) => handleDetailChange(index, "fournisseur", value)}
                    options={fournisseurOptions}
                    size="small" />
                </td><td>
                    <TextField
                      type="number"
                      size="small"
                      value={row.prix_achat}
                      onChange={(e) => handleDetailChange(index, "prix_achat", e.target.value)}
                      inputProps={{ min: 1 }}
                      sx={{ width: 100 }} />
                  </td></>
              )}
              <td align="center">
                {details.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeDetailRow(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </td>
            </tr>
          );
        })}
      </StyledTable>

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
        numerosExistant={saisieRapideDetailIndex !== null ? (details[saisieRapideDetailIndex]?.numeros_de_serie ?? []) : []}
        quantiteRequise={saisieRapideDetailIndex !== null ? (details[saisieRapideDetailIndex]?.quantite ?? 0) : 0}
        articleDesignation={saisieRapideDetailIndex !== null ? (getArticle(details[saisieRapideDetailIndex]?.article)?.designation ?? "") : ""}
      />
    </FormDialog>
  );
}