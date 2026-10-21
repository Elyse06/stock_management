import { Store as StoreIcon } from "@mui/icons-material";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";

/** Icône, libellé et couleur du lieu d'un inventaire (magasin, salle, site ou direction). */
export function getLieuMeta(session) {
  if (session?.magasin) return { label: "Magasin", Icon: StoreIcon, color: "primary" };
  if (session?.salle) return getBeneficiaireMeta("SALLE");
  if (session?.site) return getBeneficiaireMeta("SITE");
  return getBeneficiaireMeta("DIRECTION");
}
