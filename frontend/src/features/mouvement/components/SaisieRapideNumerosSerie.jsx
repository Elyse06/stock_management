import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Paper,
} from "@mui/material";
import {
  Close as CloseIcon,
  QrCodeScanner as ScannerIcon,
  ContentPaste as PasteIcon,
  UploadFile as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

// Onglets disponibles
const TABS = [
  { id: "scanner", label: "Douchette", icon: <ScannerIcon /> },
  { id: "paste", label: "Coller", icon: <PasteIcon /> },
  { id: "file", label: "Fichier", icon: <UploadIcon /> },
];

export function SaisieRapideNumerosSerie({
  isOpen,
  onClose,
  onSubmit,
  numerosExistant = [], // Numéros déjà saisis pour cette ligne
  quantiteRequise = 0,  // Quantité attendue (optionnel)
  articleDesignation = "",
}) {
  const [activeTab, setActiveTab] = useState("scanner");
  const [nouveauxNumeros, setNouveauxNumeros] = useState([]);
  const [scanValue, setScanValue] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ✅ Focus automatique sur le champ douchette à l'ouverture et à chaque changement d'onglet
  useEffect(() => {
    if (isOpen && activeTab === "scanner") {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // ✅ Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setNouveauxNumeros([]);
      setScanValue("");
      setPasteValue("");
      setError("");
      setSuccess("");
      setActiveTab("scanner");
    }
  }, [isOpen]);

  // ✅ Liste complète : existants + nouveaux
  const tousLesNumeros = [...numerosExistant, ...nouveauxNumeros];
  const uniqueNumeros = new Set(tousLesNumeros.map((n) => n.trim().toLowerCase()));
  const nbDoublons = tousLesNumeros.length - uniqueNumeros.size;
  const nbValides = uniqueNumeros.size;

  // ✅ Détecte les doublons dans les nouveaux numéros
  const doublonsDetectes = nouveauxNumeros.filter(
    (n, i) => nouveauxNumeros.indexOf(n) !== i
  );

  // ==========================================
  // MODE 1 : DOUCHETTE (Scan rapide)
  // ==========================================
  const handleScanKeyDown = (e) => {
    if (e.key === "Enter" && scanValue.trim()) {
      e.preventDefault();
      const numero = scanValue.trim();
      
      // Vérifier si déjà présent
      if (tousLesNumeros.some((n) => n.toLowerCase() === numero.toLowerCase())) {
        setError(`⚠️ Doublon détecté : "${numero}" est déjà dans la liste`);
        setScanValue("");
        setTimeout(() => scanInputRef.current?.focus(), 100);
        return;
      }

      setNouveauxNumeros((prev) => [...prev, numero]);
      setScanValue("");
      setSuccess(`✅ "${numero}" ajouté`);
      setError("");
      
      // Feedback sonore (optionnel - navigateur)
      try {
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        oscillator.connect(audio.destination);
        oscillator.frequency.value = 800;
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.1);
      } catch {}
      
      // Refocus immédiat pour scan suivant
      setTimeout(() => scanInputRef.current?.focus(), 50);
    }
  };

  // ==========================================
  // MODE 2 : COLLAGE EN MASSE
  // ==========================================
  const handlePasteSubmit = () => {
    if (!pasteValue.trim()) {
      setError("Veuillez coller au moins un numéro de série.");
      return;
    }

    // Split par retour à la ligne, virgule, point-virgule ou tabulation
    const lignes = pasteValue
      .split(/[\n\r,;\t]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (lignes.length === 0) {
      setError("Aucun numéro valide détecté dans le texte collé.");
      return;
    }

    // Vérifier les doublons internes
    const uniqueLignes = new Set(lignes.map((n) => n.toLowerCase()));
    if (uniqueLignes.size !== lignes.length) {
      const nb = lignes.length - uniqueLignes.size;
      setError(`⚠️ ${nb} doublon(s) détecté(s) dans le texte collé. Les doublons seront ignorés.`);
    }

    // Filtrer les numéros déjà présents
    const nouveaux = lignes.filter(
      (n) => !tousLesNumeros.some((ex) => ex.toLowerCase() === n.toLowerCase())
    );

    if (nouveaux.length === 0) {
      setError("Tous les numéros collés sont déjà dans la liste.");
      return;
    }

    setNouveauxNumeros((prev) => [...prev, ...nouveaux]);
    setPasteValue("");
    setSuccess(`✅ ${nouveaux.length} numéro(s) ajouté(s)`);
    setError("");
  };

  // ==========================================
  // MODE 3 : IMPORT FICHIER TXT/CSV
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier l'extension
    const extension = file.name.split(".").pop().toLowerCase();
    if (!["txt", "csv"].includes(extension)) {
      setError("Format non supporté. Utilisez un fichier .txt ou .csv");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const contenu = event.target.result;
      const lignes = contenu
        .split(/[\n\r]+/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (lignes.length === 0) {
        setError("Le fichier est vide ou ne contient aucun numéro valide.");
        return;
      }

      // Filtrer les doublons et les déjà présents
      const nouveaux = lignes.filter(
        (n) => !tousLesNumeros.some((ex) => ex.toLowerCase() === n.toLowerCase())
      );

      if (nouveaux.length === 0) {
        setError("Tous les numéros du fichier sont déjà dans la liste.");
        return;
      }

      setNouveauxNumeros((prev) => [...prev, ...nouveaux]);
      setSuccess(`✅ ${nouveaux.length} numéro(s) importé(s) depuis ${file.name}`);
      setError("");
    };

    reader.onerror = () => {
      setError("Erreur lors de la lecture du fichier.");
    };

    reader.readAsText(file);
    // Reset l'input pour permettre de réimporter le même fichier
    e.target.value = "";
  };

  // ==========================================
  // ACTIONS COMMUNES
  // ==========================================
  const supprimerNumero = (index) => {
    // Si l'index est dans les nouveaux numéros
    if (index >= numerosExistant.length) {
      const newIndex = index - numerosExistant.length;
      setNouveauxNumeros((prev) => prev.filter((_, i) => i !== newIndex));
    }
    // Les numéros existants ne peuvent pas être supprimés ici (gérés par le parent)
  };

  const validerEtFermer = () => {
    if (nouveauxNumeros.length === 0) {
      setError("Aucun nouveau numéro de série à ajouter.");
      return;
    }
    onSubmit(nouveauxNumeros);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Box>
          <Typography variant="h3">Saisie rapide des numéros de série</Typography>
          {articleDesignation && (
            <Typography variant="body2" color="text.secondary">
              Article : {articleDesignation}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Messages d'erreur/succès */}
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Compteur en temps réel */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "#FAFAFA",
            border: "1px solid #E0E0E0",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total :
            </Typography>
            <Chip
              label={`${nbValides} numéro(s) unique(s)`}
              color="primary"
              size="small"
              sx={{ fontWeight: 700, fontFamily: "monospace" }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {nbDoublons > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`${nbDoublons} doublon(s)`}
                color="warning"
                size="small"
              />
            )}
            {quantiteRequise > 0 && (
              <Chip
                label={`${nbValides} / ${quantiteRequise}`}
                color={nbValides >= quantiteRequise ? "success" : "default"}
                size="small"
                variant={nbValides >= quantiteRequise ? "filled" : "outlined"}
              />
            )}
          </Box>
        </Paper>

        {/* Onglets de méthode de saisie */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 2,
            borderBottom: "1px solid #E0E0E0",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minWidth: 120,
            },
            "& .Mui-selected": { color: "primary.main" },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* ========================================== */}
        {/* CONTENU ONGLET 1 : DOUCHETTE */}
        {/* ========================================== */}
        {activeTab === "scanner" && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Mode Douchette :</strong> Scannez ou tapez un numéro de série puis appuyez sur{" "}
              <strong>Entrée</strong>.
            </Alert>
            <TextField
              inputRef={scanInputRef}
              label="Numéro de série (Entrée pour valider)"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={handleScanKeyDown}
              fullWidth
              autoFocus
              size="small"
              placeholder="Scannez ou tapez ici..."
              InputProps={{
                sx: {
                  fontFamily: "monospace",
                  fontSize: 16,
                  bgcolor: "#FFFDE7",
                },
              }}
            />
          </Box>
        )}

        {/* ========================================== */}
        {/* CONTENU ONGLET 2 : COLLAGE EN MASSE */}
        {/* ========================================== */}
        {activeTab === "paste" && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Collage en masse :</strong> Collez votre liste de numero de série ici.
            </Alert>
            <TextField
              label="Collez votre liste ici"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              fullWidth
              multiline
              rows={8}
              InputProps={{
                sx: { fontFamily: "monospace" },
              }}
            />
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handlePasteSubmit}
                disabled={!pasteValue.trim()}
                startIcon={<PasteIcon />}
              >
                Ajouter à la liste
              </Button>
            </Box>
          </Box>
        )}

        {/* ========================================== */}
        {/* CONTENU ONGLET 3 : IMPORT FICHIER */}
        {/* ========================================== */}
        {activeTab === "file" && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Import de fichier :</strong> Uploadez un fichier <strong>.txt</strong> ou{" "}
              <strong>.csv</strong> contenant un numéro de série par ligne.
            </Alert>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: "2px dashed #F9A825",
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "#FFFDE7",
                cursor: "pointer",
                "&:hover": { bgcolor: "#FFF8E1" },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                Cliquez pour sélectionner un fichier
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Formats acceptés : .txt, .csv (un numéro par ligne)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </Paper>
          </Box>
        )}

        {/* ========================================== */}
        {/* LISTE DES NUMÉROS AJOUTÉS (TOUS ONGLETS) */}
        {/* ========================================== */}
        {tousLesNumeros.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Numéros de série ({tousLesNumeros.length})
              </Typography>
            </Divider>
            <Box
              sx={{
                maxHeight: 200,
                overflow: "auto",
                border: "1px solid #E0E0E0",
                borderRadius: 1,
                p: 1,
                bgcolor: "#FFFFFF",
              }}
            >
              {tousLesNumeros.map((numero, index) => {
                const estExistant = index < numerosExistant.length;
                const estDoublon =
                  tousLesNumeros.indexOf(numero) !== index;
                return (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 0.5,
                      mb: 0.5,
                      borderRadius: 0.5,
                      bgcolor: estDoublon
                        ? "#FFEBEE"
                        : estExistant
                        ? "#FFF8E1"
                        : "#E8F5E9",
                      border: estDoublon
                        ? "1px solid #EF5350"
                        : "1px solid #E0E0E0",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {estDoublon ? (
                        <WarningIcon fontSize="small" color="error" />
                      ) : (
                        <CheckCircleIcon fontSize="small" color="success" />
                      )}
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={500}
                      >
                        {numero}
                      </Typography>
                      {estExistant && (
                        <Chip
                          label="existant"
                          size="small"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      )}
                    </Box>
                    {!estExistant && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => supprimerNumero(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={validerEtFermer}
          disabled={nouveauxNumeros.length === 0}
          startIcon={<CheckCircleIcon />}
        >
          Ajouter {nouveauxNumeros.length} numéro(s)
        </Button>
      </DialogActions>
    </Dialog>
  );
}