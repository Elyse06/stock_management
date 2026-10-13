import { useCallback, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

import { NotificationContext } from "./notificationContext";

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

  const notify = useMemo(() => ({
    success: (message) => showNotification(message, "success"),
    error: (message) => showNotification(message, "error"),
    warning: (message) => showNotification(message, "warning"),
    info: (message) => showNotification(message, "info"),
  }), [showNotification]);

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

