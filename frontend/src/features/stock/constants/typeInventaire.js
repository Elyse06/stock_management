import { Chair as ImmobilisationIcon, Inventory2 as FournitureIcon } from "@mui/icons-material";

export const TYPES_INVENTAIRE = {
  immobilisation: {
    valeur: "IMMOBILISATION",
    libelle: "Immobilisations",
    description: "Équipements suivis à l'unité : mobilier, matériel informatique, véhicules…",
    immobilisation: true,
    Icon: ImmobilisationIcon,
  },
  fourniture: {
    valeur: "NON IMMOBILISATION",
    libelle: "Non immobilisation",
    description: "Consommables suivis en quantité : papier, cartouches, petites fournitures…",
    immobilisation: false,
    Icon: FournitureIcon,
  },
};

export const libelleTypeSession = (valeur) =>
  Object.values(TYPES_INVENTAIRE).find((t) => t.valeur === valeur)?.libelle ?? "Tous types";
