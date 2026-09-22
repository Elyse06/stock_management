import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { StatusChip } from "../../../components/common/StatusChip";
import { CodeChip } from "../../../components/common/CodeChip";
import { CommandeInfoSection } from "./CommandeInfoSection";
import { CommandeArticlesTable } from "./CommandeArticlesTable";
import { CommandeTraitementSection } from "./CommandeTraitementSection";
import { CommandeActions } from "./CommandeActions";

export function CommandeDetailModal({ commande, isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { canManageCatalogue, canValidateCommande } = usePermission();
  
  const [magasinSource, setMagasinSource] = useState("");
  const [unitesSelectionnees, setUnitesSelectionnees] = useState({});
  const [commentaire, setCommentaire] = useState("");
  const [traitement, setTraitement] = useState(false);
  
  //  État pour les décisions de validation { attributionId: { statut, quantite_validee, motif_refus } }
  const [validations, setValidations] = useState({});

  const isAgentPrincipal = canManageCatalogue && canValidateCommande;
  const isAgentSecondaire = !canManageCatalogue && canValidateCommande;

  // ... (Queries magasins, articles, unitesDisponibles inchangées) ...
  const { data: magasins = [] } = useQuery({
    queryKey: ["magasins", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.MAGASINS, { params: { page_size: 100 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["articles", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const articlesNS = commande?.details?.map((d) => {
    const article = articles.find((a) => a.code_article === d.article);
    return article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE" ? d.article : null;
  }).filter(Boolean) ?? [];

  const { data: unitesDisponibles = {}, isLoading: loadingUnites } = useQuery({
    queryKey: ["unites", "stock", magasinSource, articlesNS],
    queryFn: async () => {
      if (!magasinSource || articlesNS.length === 0) return {};
      const responses = await Promise.all(articlesNS.map((codeArticle) =>
        apiClient.get("/api/stock/unites-article/", { params: { article: codeArticle, statut: "EN_STOCK", page_size: 100 } })
      ));
      const unites = {};
      responses.forEach((res, idx) => { unites[articlesNS[idx]] = res.data.results ?? res.data; });
      return unites;
    },
    enabled: Boolean(magasinSource && articlesNS.length > 0),
  });

  const traiterMutation = useMutation({
    mutationFn: async ({ commandeId, payload }) => {
      const { data } = await apiClient.post(`${API_ENDPOINTS.COMMANDES}${commandeId}/traiter/`, payload);
      return data;
    },
    onSuccess: (_, { statut }) => {
      const messages = { EN_COURS: "Commande pré-validée.", VALIDEE: "Commande validée.", REJETEE: "Commande rejetée." };
      notify.success(messages[statut]);
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
    },
    onError: (err) => {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const flatten = (obj, prefix = "") =>
          Object.entries(obj).flatMap(([k, v]) => {
            const key = prefix ? `${prefix}.${k}` : k;
            if (Array.isArray(v)) return v.flatMap((item) => typeof item === "object" && item !== null ? flatten(item, key) : [`${key}: ${item}`]);
            if (typeof v === "object" && v !== null) return flatten(v, key);
            return [`${key}: ${v}`];
          });
        notify.error(flatten(detail).join(" | "));
      } else {
        notify.error("Erreur lors du traitement.");
      }
    },
    onSettled: () => setTraitement(false),
  });

  // Reset + pré-remplissage des validations à l'ouverture
  useEffect(() => {
    if (isOpen && commande) {
      setMagasinSource("");
      setUnitesSelectionnees({});
      setCommentaire("");
      // Pré-remplir chaque attribution à VALIDEE avec sa quantité demandée
      const initial = {};
      commande.details?.forEach((detail) => {
        detail.attributions?.forEach((attr) => {
          initial[attr.id] = {
            statut: attr.statut === "EN_ATTENTE" ? "VALIDEE" : attr.statut,
            quantite_validee: attr.quantite_demandee ?? attr.quantite,
            motif_refus: attr.motif_refus ?? "",
          };
        });
      });
      setValidations(initial);
    }
  }, [isOpen, commande]);

  if (!commande) return null;

  const getArticle = (codeArticle) => articles.find((a) => a.code_article === codeArticle);
  const peutTraiter = (isAgentPrincipal && commande.statut === "EN_COURS") || (isAgentSecondaire && commande.statut === "EN_ATTENTE");

  const toggleUnite = (detailId, uniteId) => {
    setUnitesSelectionnees((prev) => {
      const current = prev[detailId] || [];
      const updated = current.includes(uniteId) ? current.filter((id) => id !== uniteId) : [...current, uniteId];
      return { ...prev, [detailId]: updated };
    });
  };

    const validerAvantTraitement = (targetStatut) => {
      // 1. Vérification du magasin source
      if (targetStatut === "VALIDEE" && isAgentPrincipal && !magasinSource) {
        return "Veuillez sélectionner un magasin source pour la sortie de stock.";
      }

      if (targetStatut === "VALIDEE") {
        for (const detail of commande.details || []) {
          const article = getArticle(detail.article);
          if (isAgentPrincipal && detail.attributions?.length > 0) {
            const toutesDecidees = detail.attributions.every((attr) => {
              const decision = validations[attr.id];
              return decision && (decision.statut === "VALIDEE" || decision.statut === "REFUSEE");
            });
            if (!toutesDecidees) {
              return `Veuillez statuer (Valider ou Refuser) sur toutes les attributions pour "${article?.designation}".`;
            }
          }

          if (article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE") {
            const quantiteValideeTotale = (detail.attributions || []).reduce((sum, attr) => {
              const decision = validations[attr.id];
              if (decision?.statut === "VALIDEE") {
                return sum + Number(decision.quantite_validee || attr.quantite_demandee || attr.quantite);
              }
              return sum;
            }, 0);

            if (!Number.isInteger(quantiteValideeTotale)) {
              return `La quantité validée pour "${article.designation}" doit être entière.`;
            }

            const unitesSel = unitesSelectionnees[detail.id] || [];
            
            if (unitesSel.length !== quantiteValideeTotale) {
              return `Pour "${article.designation}", veuillez sélectionner exactement ${quantiteValideeTotale} unité(s) physique(s) correspondant à la quantité validée. Actuellement : ${unitesSel.length} sélectionnée(s).`;
            }
          }
        }
      }
      return null;
    };

  const traiter = async (statut) => {
    const erreur = validerAvantTraitement(statut);
    if (erreur) { notify.error(erreur); return; }
    setTraitement(true);

    const payload = { statut, commentaire_agent: commentaire.trim() };
    
    if (statut === "VALIDEE" && magasinSource) {
      payload.magasin_source = Number(magasinSource);
      
      // 🆕 Construction du tableau validations pour le backend
      payload.validations = Object.entries(validations).map(([attrId, data]) => ({
        attribution_id: Number(attrId),
        statut: data.statut,
        quantite_validee: data.statut === "VALIDEE" ? (Number(data.quantite_validee) || null) : null,
        motif_refus: data.statut === "REFUSEE" ? (data.motif_refus || "") : null,
      }));

      payload.details = (commande.details || []).map((detail) => {
        const article = getArticle(detail.article);
        if (article?.is_immobilisation && article?.mode_suivi === "NUMERO_SERIE") {
          return { detail_id: detail.id, unites_a_attribuer: unitesSelectionnees[detail.id] || [] };
        }
        return { detail_id: detail.id, unites_a_attribuer: [] };
      });
    }

    await traiterMutation.mutateAsync({ commandeId: commande.commande_id, payload });
  };

  const magasinOptions = [{ value: "", label: "Sélectionner un magasin" }, ...magasins.map((m) => ({ value: m.magasin_id, label: `${m.magasin_nom}${m.localite ? ` (${m.localite})` : ""}` }))];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#FFF8E1", borderBottom: "2px solid", borderColor: "primary.main" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h3">Commande <CodeChip value={`#${commande.commande_id}`} /></Typography>
          <StatusChip status={commande.statut} />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <CommandeInfoSection commande={commande} />
        <CommandeArticlesTable commande={commande} articles={articles} />
        {peutTraiter && (
          <CommandeTraitementSection
            commande={commande}
            articles={articles}
            magasinSource={magasinSource}
            onMagasinSourceChange={setMagasinSource}
            magasinOptions={magasinOptions}
            unitesDisponibles={unitesDisponibles}
            loadingUnites={loadingUnites}
            unitesSelectionnees={unitesSelectionnees}
            onToggleUnite={toggleUnite}
            commentaire={commentaire}
            onCommentaireChange={(e) => setCommentaire(e.target.value)}
            isAgentPrincipal={isAgentPrincipal}
            validations={validations} // 
            setValidations={setValidations} // 🆕
          />
        )}
      </DialogContent>
      <CommandeActions
        onClose={onClose}
        onTraiter={traiter}
        peutTraiter={peutTraiter}
        isAgentPrincipal={isAgentPrincipal}
        isAgentSecondaire={isAgentSecondaire}
        statut={commande.statut}
        traitement={traitement}
        magasinSource={magasinSource}
        validations={validations} // 
      />
    </Dialog>
  );
}