import { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { FileDownload as FileDownloadIcon, TableChart as CSVIcon, DataObject as JSONIcon } from "@mui/icons-material";
import { useExport } from "../../hooks/useExport";

export function ExportButton({ data, filename, columns, disabled = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const { exporting, exportToCSV, exportToJSON } = useExport();

  const handleExportCSV = async () => {
    setAnchorEl(null);
    await exportToCSV(data, filename, columns);
  };

  const handleExportJSON = async () => {
    setAnchorEl(null);
    await exportToJSON(data, filename);
  };

  return (
    <>
      <Tooltip title="Exporter">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={disabled || exporting || !data?.length}
        >
          <FileDownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={handleExportCSV}>
          <ListItemIcon>
            <CSVIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exporter en CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportJSON}>
          <ListItemIcon>
            <JSONIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exporter en JSON</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}