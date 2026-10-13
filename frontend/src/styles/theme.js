import { createTheme } from "@mui/material/styles";

const BRAND_BLUE = "#01509B";
const BRAND_YELLOW = "#FECA05";
const BRAND_ORANGE = "#F99813";

const BLUE_TINT = "#E8F0F9";
const BLUE_TINT_LIGHT = "#F4F8FC";

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND_BLUE,
      light: "#3A7BBF",
      dark: "#003A73",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: BRAND_YELLOW,
      light: "#FFDD55",
      dark: BRAND_ORANGE,
      contrastText: "#000000",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212121",
      secondary: "#5F6B7A",
    },
    tint: {
      main: BLUE_TINT,
      light: BLUE_TINT_LIGHT,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
    h1: {
      fontSize: "2rem",
      fontWeight: 500,
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 500,
    },
    h3: {
      fontSize: "1.25rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "0.875rem",
    },
    body2: {
      fontSize: "0.8125rem",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "1px solid #E0E0E0",
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: BLUE_TINT,
            borderBottom: `2px solid ${BRAND_YELLOW}`,
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #E0E0E0",
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: BLUE_TINT_LIGHT,
          },
        },
      },
    },
  },
});

export default theme;