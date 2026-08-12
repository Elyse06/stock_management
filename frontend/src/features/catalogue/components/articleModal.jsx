import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function ArticleModal({ article, isOpen, onClose }) {
  console.log(article);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !article) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: "520px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "modalSlideIn 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e9ecef",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600 }}>
            {article.designation}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              color: "#6c757d",
              padding: "0 0.25rem",
            }}
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem 1.5rem",
              fontSize: "0.95rem",
            }}
          >
            <div>
              <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                Code article
              </span>
              <div style={{ fontWeight: 500 }}>{article.code_article}</div>
            </div>
            <div>
              <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                Catégorie
              </span>
              <div style={{ fontWeight: 500 }}>
                {article.categorie_nom || "—"}
              </div>
            </div>
            {article.code_barre && (
              <div>
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                  Code-barre
                </span>
                <div style={{ fontWeight: 500 }}>{article.code_barre}</div>
              </div>
            )}

            {article.unite && (
              <div>
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                  Unité
                </span>
                <div style={{ fontWeight: 500 }}>{article.unite}</div>
              </div>
            )}
          </div>

          {article.description && (
            <div style={{ marginTop: "1rem" }}>
              <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                Description
              </span>
              <p
                style={{
                  margin: "0.25rem 0 0",
                  color: "#333",
                  lineHeight: 1.5,
                }}
              >
                {article.description}
              </p>
            </div>
          )}
          <div>
            <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
              Fournisseurs
            </span>
          </div>
          {article.fournisseurs && article.fournisseurs.length > 0 ? (
            <ul>
              {article.fournisseurs.map((f) => (
                <li key={f.id}>
                  <strong>{f.fournisseur_nom}</strong> :{" "}
                  {Number(f.prix_achat).toLocaleString()} Ar
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun fournisseur disponible</p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderTop: "1px solid #e9ecef",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
          }}
        >
          <Link
            className="btn btn-sm btn-secondary"
            to={`/catalogue/${article.code_article}/modifier`}
            onClick={onClose}
          >
            Modifier
          </Link>
          <button className="btn btn-sm btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
