export function Notification({ type = "info", message }) {
  if (!message) return null;
  return <div className={`notification notification-${type}`}>{message}</div>;
}
