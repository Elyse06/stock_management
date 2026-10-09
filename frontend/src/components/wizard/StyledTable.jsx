import { Children } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";

export function StyledTable({ columns, children, emptyMessage, size = "small" }) {
  const isEmpty = Children.toArray(children).length === 0;

  return (
    <TableContainer sx={{ mb: 2, overflowX: "auto" }}>
      <Table
        size={size}
        sx={{
          border: "1px solid #E0E0E0",
          "& .MuiTableCell-root": {
            borderColor: "#E0E0E0",
            py: 1,
            px: 1.5,
          },
          // Les éditeurs utilisent des <tr>/<td> natifs : on les aligne sur TableCell
          "& tbody > tr > td": {
            py: 1,
            px: 1.5,
            borderBottom: "1px solid #E0E0E0",
            verticalAlign: "middle",
          },
          "& .MuiTableHead-root .MuiTableCell-root": {
            bgcolor: "tint.main",
            fontWeight: 600,
            fontSize: 13,
            borderBottom: "2px solid",
            borderColor: "secondary.main",
          },
          "& .MuiTableBody-root .MuiTableRow-root:hover": {
            bgcolor: "tint.light",
          },
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((col, index) => (
              <TableCell
                key={index}
                align={col.align || "left"}
                sx={{
                  ...(col.width ? { width: col.width } : {}),
                  ...(col.minWidth ? { minWidth: col.minWidth } : {}),
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {children}
          {isEmpty && emptyMessage && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                align="center"
                sx={{ py: 3, color: "text.secondary" }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
