import { apiClient } from "./client";

let notifyRef = null;

export function setupApiErrorHandling(notify) {
  notifyRef = notify;

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (!error.response) {
        notifyRef?.error("Impossible de contacter le serveur.");
        return Promise.reject(error);
      }

      const { status, data } = error.response;

      switch (status) {
        case 401:
          notifyRef?.error("Session expirée. Veuillez vous reconnecter.");
          break;
        case 403:
          notifyRef?.error("Vous n'avez pas les permissions nécessaires.");
          break;
        case 404:
          notifyRef?.error("Ressource introuvable.");
          break;
        case 500:
          notifyRef?.error("Erreur serveur. Veuillez réessayer plus tard.");
          break;
        default:
          notifyRef?.error(extractErrorMessage(data));
      }

      return Promise.reject(error);
    }
  );
}

function extractErrorMessage(data) {
  if (!data) return "Une erreur est survenue";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const messages = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        messages.push(`${key}: ${value.join(", ")}`);
      } else if (typeof value === "string") {
        messages.push(`${key}: ${value}`);
      }
    }
    return messages.join(" | ") || "Une erreur est survenue";
  }
  return "Une erreur est survenue";
}