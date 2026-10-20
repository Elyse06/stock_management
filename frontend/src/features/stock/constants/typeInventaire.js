import { Chair as ImmobilisationIcon, Inventory2 as FournitureIcon } from "@mui/icons-material";

/** Types d'inventaire : l'URL de réalisation porte ``?type=immobilisation`` ou ``?type=fourniture``. */
export const TYPES_INVENTAIRE = {
  immobilisation: {
    valeur: "IMMOBILISATION",
    libelle: "Immobilisations",
    description: "Équipements suivis à l'unité : mobilier, matériel informatique, véhicules…",
    immobilisation: true,
    Icon: ImmobilisationIcon,
  },
  fourniture: {
    valeur: "FOURNITURE",
    libelle: "Fournitures",
    description: "Consommables suivis en quantité : papier, cartouches, petites fournitures…",
    immobilisation: false,
    Icon: FournitureIcon,
  },
};

/** Libellé du type d'une session (``type_articles`` du backend) ; vide pour les sessions antérieures. */
export const libelleTypeSession = (valeur) =>
  Object.values(TYPES_INVENTAIRE).find((t) => t.valeur === valeur)?.libelle ?? "Tous types";
