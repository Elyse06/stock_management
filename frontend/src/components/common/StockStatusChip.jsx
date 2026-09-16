import { Chip } from "@mui/material";

export function StockStatusChip({ stockActuel, quantiteDemandee }) {
  const insuffisant = stockActuel !== undefined && quantiteDemandee > stockActuel;

  if (insuffisant) {
    return (
      <Chip
        label={`À commander : ${quantiteDemandee - stockActuel}`}
        size="small"
        color="warning"
        variant="filled"
      />
    );
  }

  return (
    <Chip
      label="Stock suffisant"
      size="small"
      color="success"
      variant="outlined"
    />
  );
}