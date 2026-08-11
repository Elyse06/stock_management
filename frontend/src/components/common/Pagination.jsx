export function Pagination({ page, setPage, hasNext, hasPrevious, count }) {
  return (
    <div className="pagination">
      <button disabled={!hasPrevious} onClick={() => setPage((p) => p - 1)}>
        Precedent
      </button>
      <span>
        Page {page} {count != null && `(${count} resultats)`}
      </span>
      <button disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
        Suivant
      </button>
    </div>
  );
}
