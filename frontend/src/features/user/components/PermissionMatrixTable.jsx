import { Fragment } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Typography } from "@mui/material";
import { Check as CheckIcon } from "@mui/icons-material";
import { THEME, codeChipSx } from "./theme";

const headCellSx = { fontWeight: 700, bgcolor: THEME.gray100 };

export function PermissionMatrixTable({ visibleRoles, permissionGroups }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 600 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headCellSx, width: 140 }}>Code</TableCell>
            <TableCell sx={headCellSx}>Permission</TableCell>
            {visibleRoles.map((role) => (
              <TableCell key={role.id} align="center" sx={{ ...headCellSx, minWidth: 100 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.2 }}>
                  {role.label}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {permissionGroups.map((group) => (
            <Fragment key={group.key}>
              <TableRow>
                <TableCell
                  colSpan={2 + visibleRoles.length}
                  sx={{
                    bgcolor: group.color,
                    borderTop: `1px solid ${group.borderColor}`,
                    borderBottom: `1px solid ${group.borderColor}`,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    py: 0.75,
                  }}
                >
                  {group.category}
                </TableCell>
              </TableRow>
              {group.items.map((action) => (
                <TableRow key={action.id} hover>
                  <TableCell sx={{ py: 1 }}>
                    <Chip size="small" label={action.id} sx={codeChipSx} />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {action.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </TableCell>
                  {visibleRoles.map((role) => (
                    <TableCell key={role.id} align="center" sx={{ py: 1 }}>
                      {role.actions.includes(action.id) ? (
                        <CheckIcon aria-label="Accordée" sx={{ color: THEME.primaryDark, fontSize: 20 }} />
                      ) : (
                        <Typography component="span" aria-label="Non accordée" sx={{ color: THEME.gray200 }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}