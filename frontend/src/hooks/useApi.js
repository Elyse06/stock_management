import { useState, useCallback } from "react";

export function useApi(apiCall) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError("");
      try {
        const response = await apiCall(...args);
        setData(response.data);
        return response.data;
      } catch (err) {
        const errorMessage = extractErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiCall]
  );

  const reset = useCallback(() => {
    setData(null);
    setError("");
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, setError };
}

function extractErrorMessage(err) {
  if (err?.response?.data) {
    const detail = err.response.data;
    if (typeof detail === "object") {
      return Object.entries(detail)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ");
    }
    if (typeof detail === "string") {
      return detail;
    }
  }
  return err?.message || "Une erreur est survenue";
}