import { useEffect, useState } from "react";
import {
  listUtilisateurs,
  createUtilisateur,
  updateUtilisateur,
  deleteUtilisateur,
  listEmployes,
  listProfils,
} from "../api";
import { DataTable } from "../../../components/common/DataTable";
import { Modal } from "../../../components/common/Modal";
import { Notification } from "../../../components/common/Notification";
import { Pagination } from "../../../components/common/Pagination";
import { useAuth } from "../../../context/AuthContext";

const CHAMPS_VIDES = { nom_user: "", email: "", employe: "", profil: "" };

const getIdFromRelation = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return value.id ?? value.employee_id ?? value.profil_id ?? "";
  }
  return value;
};

const getDisplayFromRelation = (value, fallbackLabel) => {
  if (!value) return "-";
  if (typeof value === "object") {
    return value.nom ?? value.name ?? value.label ?? fallbackLabel;
  }
  return fallbackLabel;
};

export function UserListPage() {
  const { hasProfil } = useAuth();
  const canEdit = hasProfil("Administrateur");

  const [users, setUsers] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [profils, setProfils] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [champs, setChamps] = useState(CHAMPS_VIDES);

  const charger = async () => {
    try {
      const params = { page };
      if (search) params.search = search;

      const data = await listUtilisateurs(params);
      setUsers(data.results ?? data ?? []);
      setPageInfo({
        count: data.count ?? (Array.isArray(data) ? data.length : 0),
        next: data.next ?? null,
        previous: data.previous ?? null,
      });
      setError("");
    } catch {
      setError("Impossible de charger les utilisateurs.");
    }
  };

  useEffect(() => {
    charger();
  }, [page, search]);

  useEffect(() => {
    const loadEmployes = async () => {
      try {
        const data = await listEmployes();
        setEmployes(data.results ?? data ?? []);
      } catch {
        setEmployes([]);
      }
    };

    const loadProfils = async () => {
      try {
        const data = await listProfils();
        setProfils(data.results ?? data ?? []);
      } catch {
        setProfils([]);
      }
    };

    loadEmployes();
    loadProfils();
  }, []);

  const ouvrirCreation = () => {
    setChamps(CHAMPS_VIDES);
    setEditing({});
  };

  const ouvrirEdition = (u) => {
    setChamps({
      nom_user: u.nom_user ?? "",
      email: u.email ?? "",
      employe: getIdFromRelation(u.employe),
      profil: getIdFromRelation(u.profil),
    });
    setEditing(u);
  };

  const enregistrer = async (e) => {
    e.preventDefault();

    const payload = {
      ...champs,
      employe: champs.employe ? Number(champs.employe) : "",
      profil: champs.profil ? Number(champs.profil) : "",
    };

    try {
      if (editing?.id) {
        await updateUtilisateur(editing.id, payload);
      } else {
        await createUtilisateur(payload);
      }
      setEditing(null);
      setError("");
      charger();
    } catch {
      setError("Erreur lors de l'enregistrement de l'utilisateur.");
    }
  };

  const supprimer = async (u) => {
    if (!window.confirm(`Supprimer l'utilisateur "${u.nom_user}" ?`)) return;

    try {
      await deleteUtilisateur(u.id);
      setError("");
      charger();
    } catch {
      setError("Suppression impossible de l'utilisateur.");
    }
  };

  const columns = [
    { key: "nom_user", label: "Nom d'utilisateur" },
    { key: "email", label: "Email" },
    {
      key: "employe_matricule",
      label: "Matricule",
    },
    {
      key: "profil_nom",
      label: "Profil",
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        canEdit && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => ouvrirEdition(row)}
            >
              Modifier
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => supprimer(row)}
            >
              Supprimer
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="spacer" />
        {canEdit && (
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            + Nouvel utilisateur
          </button>
        )}
      </div>

      <Notification type="error" message={error} />

      <DataTable columns={columns} rows={users} emptyMessage="Aucun utilisateur." />

      <Pagination
        page={page}
        setPage={setPage}
        hasNext={!!pageInfo.next}
        hasPrevious={!!pageInfo.previous}
        count={pageInfo.count}
      />

      {editing && (
        <Modal
          title={editing.id ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={enregistrer}>
            <div className="form-field">
              <label>Nom d'utilisateur</label>
              <input
                value={champs.nom_user}
                onChange={(e) => setChamps({ ...champs, nom_user: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={champs.email}
                onChange={(e) => setChamps({ ...champs, email: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label>Employé</label>
              <select
                value={champs.employe}
                onChange={(e) => setChamps({ ...champs, employe: e.target.value })}
                required
              >
                <option value="">Sélectionner un employé</option>
                {employes.map((emp) => (
                  <option key={emp.id ?? emp.employee_id ?? emp.employe_id} value={emp.id ?? emp.employee_id ?? emp.employe_id}>
                    {emp.nom ?? emp.prenom ?? emp.email ?? "Employé"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Profil</label>
              <select
                value={champs.profil}
                onChange={(e) => setChamps({ ...champs, profil: e.target.value })}
                required
              >
                <option value="">Sélectionner un profil</option>
                {profils.map((prof) => (
                  <option key={prof.id ?? prof.profil_id} value={prof.id ?? prof.profil_id}>
                    {prof.nom ?? prof.name ?? "Profil"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(null)}
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
