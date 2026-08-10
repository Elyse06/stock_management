/**
 * Table generique reutilisable par tous les modules (catalogue, stock, achats...).
 * columns: [{ key, label, render? }]
 */
export function DataTable({ columns, rows, emptyMessage = "Aucune donnee." }) {
  if (!rows || rows.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id ?? row.code_article}>
            {columns.map((col) => (
              <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
