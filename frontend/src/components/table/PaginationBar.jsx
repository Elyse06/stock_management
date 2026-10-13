import { Box, Button, MenuItem, Pagination, Select, Typography } from "@mui/material";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon } from "@mui/icons-material";

/**
 * Barre de pagination commune au tableau (bureau) et aux cartes (mobile) :
 * gros boutons Précédent / Suivant, numéros de page cliquables, lignes par page.
 */
export function PaginationBar({ count, paginationModel, onPaginationModelChange, compact = false }) {
  const page = paginationModel?.page ?? 0;
  const pageSize = paginationModel?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, count);

  const goTo = (newPage) => {
    if (newPage < 0 || newPage >= pageCount || newPage === page) return;
    onPaginationModelChange?.({ ...paginationModel, page: newPage });
  };

  const prevButton = (
    <Button
      variant="outlined"
      onClick={() => goTo(page - 1)}
      disabled={page <= 0}
      startIcon={<NavigateBeforeIcon />}
      sx={{ minWidth: 120, height: 40, flex: compact ? 1 : "none" }}
    >
      Précédent
    </Button>
  );

  const nextButton = (
    <Button
      variant="outlined"
      onClick={() => goTo(page + 1)}
      disabled={page >= pageCount - 1}
      endIcon={<NavigateNextIcon />}
      sx={{ minWidth: 120, height: 40, flex: compact ? 1 : "none" }}
    >
      Suivant
    </Button>
  );

  const pageSizeSelect = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Lignes
      </Typography>
      <Select
        size="small"
        inputProps={{ "aria-label": "Lignes par page" }}
        value={pageSize}
        onChange={(e) =>
          onPaginationModelChange?.({ page: 0, pageSize: Number(e.target.value) })
        }
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <MenuItem key={n} value={n}>
            {n}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const info = (
    <Typography variant="body2" color="text.secondary">
      {from}–{to} sur {count}
    </Typography>
  );

  if (compact) {
    return (
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {prevButton}
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ whiteSpace: "nowrap", px: 0.5 }}
          >
            {page + 1} / {pageCount}
          </Typography>
          {nextButton}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {info}
          {pageSizeSelect}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {pageSizeSelect}
        {info}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {prevButton}
        <Pagination
          count={pageCount}
          page={page + 1}
          onChange={(_, value) => goTo(value - 1)}
          shape="rounded"
          color="primary"
          siblingCount={1}
          boundaryCount={1}
          hidePrevButton
          hideNextButton
        />
        {nextButton}
      </Box>
    </Box>
  );
}

