import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  QrCodeScanner as ScannerIcon,
  ContentPaste as PasteIcon,
  UploadFile as UploadIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNotification } from "../../../components/common/NotificationProvider";
import { SaisieStats } from "./SaisieStats";
import { ScannerMode } from "./ScannerMode";
import { PasteMode } from "./PasteMode";
import { FileImportMode } from "./FileImportMode";
import { NumeroList } from "./NumeroList";

const TABS = [
  { id: "scanner", label: "Douchette", icon: <ScannerIcon /> },
  { id: "paste", label: "Coller", icon: <PasteIcon /> },
  { id: "file", label: "Fichier", icon: <UploadIcon /> },
];

export function SaisieRapideNumerosSerie({
  isOpen,
  onClose,
  onSubmit,
  numerosExistant = [],
  quantiteRequise = 0,
  articleDesignation = "",
}) {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState("scanner");
  const [nouveauxNumeros, setNouveauxNumeros] = useState([]);
  const [scanValue, setScanValue] = useState("");
  const [pasteValue, setPasteValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setNouveauxNumeros([]);
      setScanValue("");
      setPasteValue("");
      setActiveTab("scanner");
    }
  }, [isOpen]);

  // Liste complète : existants + nouveaux
  const tousLesNumeros = [...numerosExistant, ...nouveauxNumeros];
  const uniqueNumeros = new Set(tousLesNumeros.map((n) => n.trim().toLowerCase()));
  const nbDoublons = tousLesNumeros.length - uniqueNumeros.size;
  const nbValides = uniqueNumeros.size;

  const handleScanKeyDown = (e) => {
    if (e.key === "Enter" && scanValue.trim()) {
      e.preventDefault();
      const numero = scanValue.trim();

      if (tousLesNumeros.some((n) => n.toLowerCase() === numero.toLowerCase())) {
        notify.warning(`Doublon détecté : "${numero}" est déjà dans la liste`);
        setScanValue("");
        return;
      }

      setNouveauxNumeros((prev) => [...prev, numero]);
      setScanValue("");
      notify.success(`"${numero}" ajouté`);

      try {
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        oscillator.connect(audio.destination);
        oscillator.frequency.value = 800;
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.1);
      } catch {}
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteValue.trim()) {
      notify.error("Veuillez coller au moins un numéro de série.");
      return;
    }

    const lignes = pasteValue
      .split(/[\n\r,;\t]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (lignes.length === 0) {
      notify.error("Aucun numéro valide détecté dans le texte collé.");
      return;
    }

    const uniqueLignes = new Set(lignes.map((n) => n.toLowerCase()));
    if (uniqueLignes.size !== lignes.length) {
      const nb = lignes.length - uniqueLignes.size;
      notify.warning(`${nb} doublon(s) détecté(s) dans le texte collé. Les doublons seront ignorés.`);
    }

    const nouveaux = lignes.filter(
      (n) => !tousLesNumeros.some((ex) => ex.toLowerCase() === n.toLowerCase())
    );

    if (nouveaux.length === 0) {
      notify.error("Tous les numéros collés sont déjà dans la liste.");
      return;
    }

    setNouveauxNumeros((prev) => [...prev, ...nouveaux]);
    setPasteValue("");
    notify.success(`${nouveaux.length} numéro(s) ajouté(s)`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();
    if (!["txt", "csv"].includes(extension)) {
      notify.error("Format non supporté. Utilisez un fichier .txt ou .csv");
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
        notify.error("Le fichier est vide ou ne contient aucun numéro valide.");
        return;
      }

      const nouveaux = lignes.filter(
        (n) => !tousLesNumeros.some((ex) => ex.toLowerCase() === n.toLowerCase())
      );

      if (nouveaux.length === 0) {
        notify.error("Tous les numéros du fichier sont déjà dans la liste.");
        return;
      }

      setNouveauxNumeros((prev) => [...prev, ...nouveaux]);
      notify.success(`${nouveaux.length} numéro(s) importé(s) depuis ${file.name}`);
    };

    reader.onerror = () => {
      notify.error("Erreur lors de la lecture du fichier.");
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const supprimerNumero = (index) => {
    if (index >= numerosExistant.length) {
      const newIndex = index - numerosExistant.length;
      setNouveauxNumeros((prev) => prev.filter((_, i) => i !== newIndex));
    }
  };

  const validerEtFermer = () => {
    if (nouveauxNumeros.length === 0) {
      notify.error("Aucun nouveau numéro de série à ajouter.");
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
        {/* Stats */}
        <SaisieStats
          nbValides={nbValides}
          nbDoublons={nbDoublons}
          quantiteRequise={quantiteRequise}
        />

        {/* Onglets */}
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

        {/* Contenu des onglets */}
        {activeTab === "scanner" && (
          <ScannerMode
            scanValue={scanValue}
            onScanValueChange={setScanValue}
            onScanKeyDown={handleScanKeyDown}
          />
        )}
        {activeTab === "paste" && (
          <PasteMode
            pasteValue={pasteValue}
            onPasteValueChange={setPasteValue}
            onSubmit={handlePasteSubmit}
          />
        )}
        {activeTab === "file" && (
          <FileImportMode onFileUpload={handleFileUpload} />
        )}

        {/* Liste des numéros */}
        <NumeroList
          numeros={tousLesNumeros}
          numerosExistant={numerosExistant}
          onDelete={supprimerNumero}
        />
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