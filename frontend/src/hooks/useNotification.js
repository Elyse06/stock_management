import { useContext } from "react";

import { NotificationContext } from "@/components/feedback/notificationContext";

/** ``notify.success/error/warning/info(message)`` */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification doit être utilisé sous <NotificationProvider>");
  return context;
}
