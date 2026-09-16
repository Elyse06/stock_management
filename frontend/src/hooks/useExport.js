import { useState, useCallback } from "react";

export function useExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const exportToCSV = useCallback(async (data, filename, columns) => {
    setExporting(true);
    setError("");
    try {
      // Construire l'en-tête
      const headers = columns.map((col) => col.label);
      
      // Construire les lignes
      const rows = data.map((row) =>
        columns.map((col) => {
          const value = col.getValue ? col.getValue(row) : row[col.field];
          // Échapper les guillemets et les virgules
          const escaped = String(value ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(",")
      );

      // Ajouter le BOM UTF-8 pour Excel
      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      
      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Erreur lors de l'export");
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportToJSON = useCallback(async (data, filename) => {
    setExporting(true);
    setError("");
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Erreur lors de l'export");
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    error,
    exportToCSV,
    exportToJSON,
    setError,
  };
}