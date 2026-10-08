import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton } from "@mui/material";
import { Close as CloseIcon, Print as PrintIcon, Download as DownloadIcon } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

function formatDateFr(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR");
}

function getMoisFr(dateStr) {
  if (!dateStr) return "inconnu";
  const date = new Date(dateStr);
  return MOIS_FR[date.getMonth()];
}

function genererCodeEtiquette(unite) {
  const site = unite.site_beneficiaire?.site_nom   /** besoin d'adaptation */
    || unite.direction_beneficiaire?.site?.site_nom 
    || "INCONNU";
  const categorie = unite.article?.categorie_nom || "DIVERS";   /** besoin d'adaptation */
  const dateAcquisition = unite.mouvement_sortie?.mouvement?.date 
    || unite.date_creation;
  const mois = getMoisFr(dateAcquisition);
  const jour = dateAcquisition ? new Date(dateAcquisition).getDate() : "00";
  
  return `${site.toUpperCase()}/${categorie.toUpperCase()}/${mois}/${jour}`;
}

function getContenuQR(unite) {
  const designation = unite.article_designation || "—";
  const beneficiaire = unite.employe_attribue_nom 
    || unite.direction_beneficiaire?.dir_libelle 
    || unite.site_beneficiaire?.site_nom 
    || "—";
  const site = unite.site_beneficiaire?.site_nom    /** besoin d'adaptation */
    || unite.direction_beneficiaire?.site?.site_nom 
    || "—";
  const dateAcquisition = formatDateFr(
    unite.mouvement_sortie?.mouvement?.date || unite.date_creation
  );
  const etiquette = genererCodeEtiquette(unite);
  
  return `${designation}\n${beneficiaire}\n${site}\n${dateAcquisition}\n${etiquette}`;
}

export function EtiquetteModal({ unite, isOpen, onClose }) {
  const etiquetteRef = useRef(null);
  
  if (!unite) return null;
  
  const codeEtiquette = genererCodeEtiquette(unite);
  const contenuQR = getContenuQR(unite);
  
  const handlePrint = () => {
    const printContent = etiquetteRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Étiquette ${codeEtiquette}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .etiquette { 
              border: 2px solid #000; 
              padding: 15px; 
              width: 300px;
              page-break-inside: avoid;
            }
            .qr-code { text-align: center; margin-bottom: 15px; }
            .qr-code svg { width: 150px; height: 150px; }
            .code-etiquette { 
              font-size: 14px; 
              font-weight: bold; 
              text-align: center;
              margin-top: 10px;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
              .etiquette { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="etiquette">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Étiquette - Unité #{unite.unite_id}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Box ref={etiquetteRef} sx={{ p: 3, border: "2px solid #000", borderRadius: 1, bgcolor: "#FFF" }}>
          {/* QR Code */}
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <QRCodeSVG 
              value={contenuQR} 
              size={150} 
              level="M" 
              includeMargin={true}
              style={{ display: "inline-block" }}
            />
          </Box>
          
          {/* Code étiquette */}
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: "center", 
              fontWeight: 700, 
              fontSize: 13,
              wordBreak: "break-all",
              fontFamily: "monospace"
            }}
          >
            {codeEtiquette}
          </Typography>
        </Box>
        
        {/* Aperçu du contenu QR */}
        <Box sx={{ mt: 2, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Contenu du QR Code :
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "pre-line" }}>
            {contenuQR}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
        <Button 
          variant="contained" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
          sx={{ bgcolor: "primary.main", color: "#000", fontWeight: 600 }}
        >
          Imprimer l'étiquette
        </Button>
      </DialogActions>
    </Dialog>
  );
}