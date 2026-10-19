import {
  Assignment as InventaireIcon,
  HelpOutlineOutlined as AideIcon,
  Inventory2 as StockIcon,
  ShoppingCart as CommandeIcon,
  SwapHoriz as MouvementIcon,
  TrendingUp as AnalyseIcon,
} from "@mui/icons-material";

/** Questions proposées au démarrage, selon ce que l'utilisateur a le droit de consulter. */
export function suggestionsPour(droits) {
  const toutes = [
    droits.canReadCatalogue && { texte: "Quels articles sont sous le seuil d'alerte ?", Icon: StockIcon },
    droits.canReadMouvements && droits.canReadCatalogue && { texte: "Que faut-il commander en priorité ?", Icon: AnalyseIcon },
    (droits.canCreateCommande || droits.canValidateCommande) && {
      texte: droits.canValidateCommande ? "Quelles commandes attendent une validation ?" : "Où en sont mes commandes ?",
      Icon: CommandeIcon,
    },
    droits.canReadMouvements && { texte: "Quelles sorties de stock cette semaine ?", Icon: MouvementIcon },
    droits.canReadInventaire && { texte: "Y a-t-il des inventaires en attente ?", Icon: InventaireIcon },
    droits.canCreateCommande && { texte: "Comment faire une demande de matériel ?", Icon: AideIcon },
    { texte: "Que puis-je faire dans l'application ?", Icon: AideIcon },
  ];
  return toutes.filter(Boolean).slice(0, 4);
}
