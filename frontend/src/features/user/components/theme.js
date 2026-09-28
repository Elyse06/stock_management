import { alpha } from "@mui/material/styles";
import theme from "../../../theme.js";

const { primary, grey, background, text, warning } = theme.palette;

export const THEME = {
  primary: primary.main,
  primaryDark: primary.dark,
  primaryAmber: warning.main,
  primarySoft: alpha(primary.main, 0.16),
  primaryLight: alpha(primary.main, 0.1),
  primaryVeryLight: alpha(primary.main, 0.06),
  primaryBorder: alpha(primary.main, 0.35),
  primaryBorderSoft: alpha(primary.light, 0.65),
  textStrong: text.primary,
  white: background.paper,
  gray50: grey[50],
  gray100: grey[100],
  gray200: grey[200],
  gray500: grey[500],
  gray700: grey[700],
  gray900: grey[900],
};

export const CATEGORY_COLORS = {
  CAT: { color: THEME.primaryVeryLight, borderColor: THEME.primaryBorder },
  MOV: { color: THEME.primarySoft, borderColor: THEME.primaryBorderSoft },
  INV: { color: THEME.primaryLight, borderColor: THEME.primaryAmber },
  COM: { color: alpha(warning.main, 0.08), borderColor: alpha(warning.main, 0.45) },
  USR: { color: THEME.primaryVeryLight, borderColor: THEME.primary },
  AUTRE: { color: THEME.gray100, borderColor: THEME.gray200 },
};

export const primaryButtonSx = {
  bgcolor: primary.main,
  color: primary.contrastText,
  fontWeight: 600,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": { bgcolor: primary.dark, boxShadow: "none" },
};

export const codeChipSx = {
  fontFamily: "monospace",
  fontWeight: 700,
  fontSize: "0.75rem",
  bgcolor: THEME.primaryLight,
  color: THEME.textStrong,
  border: `1px solid ${THEME.primaryBorder}`,
};