import {
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
} from "@mui/icons-material";

// Icône, libellé et couleur MUI par type de bénéficiaire (partagés par les modals de commande)
const META = {
  EMPLOYE: { label: "Employé", Icon: PersonIcon, color: "primary" },
  DIRECTION: { label: "Direction", Icon: BusinessIcon, color: "default" },
  SITE: { label: "Site", Icon: LocationCityIcon, color: "warning" },
  SALLE: { label: "Salle", Icon: MeetingRoomIcon, color: "info" },
};

export function getBeneficiaireMeta(type) {
  return META[type] || META.DIRECTION;
}
