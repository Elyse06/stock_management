import { CountChip } from "@/components/data-display/CountChip";

/** Colonne « Actions » standard d'un DataGrid. */
export const actionsColumn = (renderCell, width = 140) => ({
  field: "actions",
  headerName: "Actions",
  width,
  sortable: false,
  filterable: false,
  disableColumnMenu: true,
  headerAlign: "center",
  align: "center",
  renderCell,
});

/** Colonne centrée affichant un compteur (``CountChip``). */
export const countColumn = (field, headerName, palette) => ({
  field,
  headerName,
  width: 110,
  headerAlign: "center",
  align: "center",
  renderCell: ({ value }) => <CountChip value={value} palette={palette} />,
});
