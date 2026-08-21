export function Modal({ title, onClose, children, className = "" }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-box ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
