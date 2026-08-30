import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#F9A825",
      light: "#FFD54F",
      dark: "#F57F17",
      contrastText: "#000000",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
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
            backgroundColor: "#FFF8E1",
            borderBottom: "2px solid #F9A825",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #E0E0E0",
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: "#FFFDE7",
          },
        },
      },
    },
  },
});

export default theme;