import { Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";

export function StyledTable({ columns, children, emptyMessage, size = "small" }) {
  return (
    <Table
      size={size}
      sx={{
        mb: 2,
        border: "1px solid #E0E0E0",
        "& .MuiTableCell-root": {
          borderColor: "#E0E0E0",
          py: 1,
          px: 1.5,
        },
        "& .MuiTableHead-root .MuiTableCell-root": {
          bgcolor: "#FFF8E1",
          fontWeight: 600,
          fontSize: 13,
          borderBottom: "2px solid #F9A825",
        },
      }}
    >
      <TableHead>
        <TableRow>
          {columns.map((col, index) => (
            <TableCell
              key={index}
              align={col.align || "left"}
              sx={col.width ? { width: col.width } : {}}
            >
              {col.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>{children}</TableBody>
    </Table>
  );
}