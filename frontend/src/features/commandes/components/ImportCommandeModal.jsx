import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined as OkIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  ErrorOutlineOutlined as ErreurIcon,
  UploadFile as UploadIcon,
} from "@mui/icons-material";

import { API_ENDPOINTS } from "@/config/endpoints";
import { UPLOAD_TIMEOUT } from "@/config/env";
import { useNotification } from "@/hooks/useNotification";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";
import { telechargerFichier } from "@/utils/telechargement";

const URL_IMPORT = `${API_ENDPOINTS.COMMANDES}importer/`;
const URL_MODELE = `${API_ENDPOINTS.COMMANDES}modele-import/`;

/** Envoie le fichier : aperçu (``confirmer`` faux) ou enregistrement de la commande. */
async function envoyer(fichier, confirmer) {
  const donnees = new FormData();
  donnees.append("fichier", fichier);
  donnees.append("confirmer", confirmer ? "true" : "false");
  const { data } = await apiClient.post(URL_IMPORT, donnees, { timeout: UPLOAD_TIMEOUT });
  return data;
}

function LignesFichier({ lignes }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
      <Table size="small" stickyHeader aria-label="Lignes du fichier">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 60 }}>Ligne</TableCell>
            <TableCell>Article</TableCell>
            <TableCell align="center" sx={{ width: 80 }}>Quantité</TableCell>
            <TableCell>Bénéficiaire</TableCell>
            <TableCell sx={{ width: 90 }}>Statut</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.ligne} sx={{ bgcolor: l.statut === "ERREUR" ? "#FEF3F2" : undefined }}>
              <TableCell>{l.ligne}</TableCell>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ fontStyle: l.article_repris ? "italic" : "normal", color: l.article_repris ? "text.secondary" : "text.primary" }}>
                    {l.designation || l.article_saisi || "—"}
                  </Typography>
                  {l.nouvel_article && <Chip size="small" color="warning" label="Nouvel article" sx={{ height: 20, fontSize: 11 }} />}
                  {l.article_repris && l.designation && <Typography variant="caption" color="text.secondary">(article de la ligne au-dessus)</Typography>}
                </Box>
                {l.statut === "ERREUR" && (
                  <Typography variant="caption" color="error.main" sx={{ display: "block" }}>{l.message}</Typography>
                )}
              </TableCell>
              <TableCell align="center">{l.quantite ?? "—"}</TableCell>
              <TableCell>
                {l.beneficiaire ? (
                  <>
                    <Typography variant="body2">{l.beneficiaire}{l.pour_demandeur ? " (vous)" : ""}</Typography>
                    <Typography variant="caption" color="text.secondary">{l.beneficiaire_type}</Typography>
                  </>
                ) : (
                  l.beneficiaire_saisi || "—"
                )}
              </TableCell>
              <TableCell>
                {l.statut === "OK" ? <Chip size="small" color="success" variant="outlined" label="OK" /> : <Chip size="small" color="error" label="Erreur" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CommandeObtenue({ commande }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {commande.map((ligne) => (
        <Paper key={`${ligne.article ?? ""}-${ligne.designation}`} variant="outlined" sx={{ p: 1.25, borderLeft: "4px solid", borderLeftColor: ligne.nouvel_article ? "secondary.main" : "primary.main" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
              {ligne.designation}{ligne.article ? ` (${ligne.article})` : ""}
            </Typography>
            {ligne.nouvel_article && <Chip size="small" color="warning" label="Nouvel article" />}
            <Typography variant="body2" fontWeight={700} color="primary.main">× {ligne.quantite}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {ligne.repartition.map((r) => `${r.beneficiaire} : ${r.quantite}`).join(" · ")}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

/**
 * Import d'une commande depuis le modèle Excel : téléchargement du modèle, choix du fichier, aperçu de ce
 * qui a été reconnu (lignes en erreur signalées), puis enregistrement de la commande.
 */
export function ImportCommandeModal({ isOpen, onClose }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const champFichier = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFichier(null);
      setApercu(null);
      setErreur("");
    }
  }, [isOpen]);

  const choisir = async (e) => {
    const choisi = e.target.files?.[0];
    e.target.value = "";
    if (!choisi) return;
    setFichier(choisi);
    setApercu(null);
    setErreur("");
    setChargement(true);
    try {
      setApercu(await envoyer(choisi, false));
    } catch (err) {
      setErreur(getErrorMessage(err, "Impossible de lire le fichier."));
    } finally {
      setChargement(false);
    }
  };

  const enregistrer = async () => {
    setChargement(true);
    try {
      const resultat = await envoyer(fichier, true);
      await queryClient.invalidateQueries({ queryKey: ["commandes"] });
      notify.success(`Commande n°${resultat.commande_creee?.commande_id ?? ""} importée et transmise pour pré-validation.`);
      onClose();
    } catch (err) {
      if (err?.response?.data?.lignes) setApercu(err.response.data);
      setErreur(getErrorMessage(err, "Impossible d'enregistrer la commande."));
    } finally {
      setChargement(false);
    }
  };

  const telechargerModele = async () => {
    try {
      await telechargerFichier(URL_MODELE, "modele_import_commande.xlsx");
    } catch (err) {
      notify.error(getErrorMessage(err, "Impossible de télécharger le modèle."));
    }
  };

  return (
    <Dialog open={isOpen} onClose={chargement ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "tint.main", borderBottom: "2px solid", borderColor: "secondary.main" }}>
        <Typography variant="h3" component="span">Importer une commande</Typography>
        <IconButton onClick={onClose} size="small" aria-label="Fermer" disabled={chargement}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "20px !important", display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={telechargerModele}>Télécharger le modèle</Button>
          <Button variant="contained" disableElevation startIcon={<UploadIcon />} onClick={() => champFichier.current?.click()} disabled={chargement}>
            {fichier ? "Choisir un autre fichier" : "Choisir le fichier rempli"}
          </Button>
          <input ref={champFichier} type="file" hidden accept=".xlsx" onChange={choisir} aria-label="Fichier de commande" />
          {fichier && <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>{fichier.name}</Typography>}
        </Box>

        {!fichier && (
          <Typography variant="body2" color="text.secondary">
            Remplissez l'objet, puis une ligne par article : Article, Quantité, Bénéficiaire (vide : pour vous). Pour plusieurs
            bénéficiaires, écrivez l'article une fois puis une ligne par bénéficiaire, ou répétez l'article.
          </Typography>
        )}

        {chargement && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Lecture du fichier...</Typography>
          </Box>
        )}

        {erreur && <Alert severity="error">{erreur}</Alert>}

        {apercu && (
          <>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="body2"><strong>Objet :</strong> {apercu.objet || "—"}</Typography>
              <Box sx={{ flex: 1 }} />
              <Chip icon={<OkIcon />} size="small" color="success" variant="outlined" label={`${apercu.lignes_ok} ligne(s) reconnue(s)`} />
              {apercu.lignes_erreur > 0 && <Chip icon={<ErreurIcon />} size="small" color="error" label={`${apercu.lignes_erreur} en erreur`} />}
            </Box>
            {apercu.erreurs?.map((message) => <Alert key={message} severity="error" variant="outlined">{message}</Alert>)}
            {!apercu.valide && (
              <Alert severity="warning" variant="outlined">Corrigez le fichier puis choisissez-le à nouveau : la commande ne peut pas être enregistrée avec des erreurs.</Alert>
            )}
            {apercu.lignes?.length > 0 && <LignesFichier lignes={apercu.lignes} />}
            {apercu.valide && (
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Commande obtenue ({apercu.commande.length} ligne(s))</Typography>
                <CommandeObtenue commande={apercu.commande} />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={chargement}>Annuler</Button>
        <Button variant="contained" disableElevation onClick={enregistrer} disabled={!apercu?.valide || chargement}>
          Enregistrer la commande
        </Button>
      </DialogActions>
    </Dialog>
  );
}
