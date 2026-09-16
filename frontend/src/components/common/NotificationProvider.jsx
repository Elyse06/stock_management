import { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const showNotification = useCallback((message, severity = "info") => {
    setNotification({ open: true, message, severity });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  const notify = {
    success: (message) => showNotification(message, "success"),
    error: (message) => showNotification(message, "error"),
    warning: (message) => showNotification(message, "warning"),
    info: (message) => showNotification(message, "info"),
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}