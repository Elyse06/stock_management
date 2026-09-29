import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Box, Tabs, Tab } from "@mui/material";
import { People as PeopleIcon, Security as SecurityIcon } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { usePermission } from "../../../hooks/usePermission";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { ErrorAlert } from "../../../components/common/ErrorAlert";
import { extractApiError } from "../components/apiError";
import { UserFilters } from "../components/UserFilters.jsx";
import { UserTable } from "../components/UserTable";
import { UserPermissionsModal } from "../components/UserPermissionsModal";
import { UserFormDialog } from "../components/UserFormDialog";
import { RolesMatrixTab } from "../components/RolesMatrixTab";

const normalizeUser = (user) => ({
  ...user,
  actions: user.actions_liste || [],
  emp_id: user.emp_id_lie || "",
  role_id: user.role_id || "CUSTOM",
  role_nom: user.role_nom || "Profil Personnalisé",
});

export function UtilisateursPage() {
  const { canManageUsers } = usePermission();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [tabIndex, setTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permissionsModalUser, setPermissionsModalUser] = useState(null);

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.UTILISATEURS);
      const results = Array.isArray(data) ? data : data?.results || [];
      return results.map(normalizeUser);
    },
    enabled: canManageUsers,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.EMPLOYEES);
      return Array.isArray(data) ? data : data?.results || [];
    },
    enabled: canManageUsers,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.UTILISATEURS, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      notify.success(`L'utilisateur ${data.utilisateur_mail} a été créé avec succès.`);
      setFormOpen(false);
      setEditingUser(null);
    },
    onError: (err) => notify.error(extractApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await apiClient.put(`${API_ENDPOINTS.UTILISATEURS}${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      notify.success(`L'utilisateur ${data.utilisateur_mail} a été mis à jour.`);
      setFormOpen(false);
      setEditingUser(null);
    },
    onError: (err) => notify.error(extractApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`${API_ENDPOINTS.UTILISATEURS}${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      notify.success("Utilisateur supprimé avec succès.");
    },
    onError: (err) => notify.error(extractApiError(err, ERROR_MESSAGES.DELETE_FAILED)),
  });

  const handleDelete = (user) => {
    if (user.utilisateur_id === 1) {
      notify.error("Impossible de supprimer le compte administrateur principal.");
      return;
    }
    confirm(
      "Supprimer cet utilisateur ?",
      `Êtes-vous sûr de vouloir supprimer le compte "${user.utilisateur_mail}" ?`,
      async () => {
        try {
          await deleteMutation.mutateAsync(user.utilisateur_id);
        } catch {}
      }
    );
  };

  const handleFormSubmit = (payload) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.utilisateur_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        u.utilisateur_mail.toLowerCase().includes(search) ||
        String(u.emp_nom || "").toLowerCase().includes(search) ||
        String(u.emp_matricule || "").toLowerCase().includes(search) ||
        String(u.role_nom || "").toLowerCase().includes(search);
      const matchesRole = roleFilter === "ALL" || String(u.role_id) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  if (!canManageUsers) return <Navigate to="/" replace />;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          textColor="inherit"
          sx={{ "& .MuiTabs-indicator": { bgcolor: "primary.main", height: 3 } }}
        >
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PeopleIcon fontSize="small" />
                <span>Utilisateurs & Accès ({filteredUsers.length})</span>
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: "none" }}
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SecurityIcon fontSize="small" />
                <span>Matrice des Rôles & Permissions</span>
              </Box>
            }
            sx={{ fontWeight: 600, textTransform: "none" }}
          />
        </Tabs>
      </Box>

      {usersError && <ErrorAlert error={usersError} />}

      {tabIndex === 0 && (
        <Box>
          <UserFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            onAddUser={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          />
          <UserTable
            users={filteredUsers}
            isLoading={usersLoading}
            onEdit={(user) => {
              setEditingUser(user);
              setFormOpen(true);
            }}
            onDelete={handleDelete}
            onViewPermissions={setPermissionsModalUser}
          />
        </Box>
      )}

      {tabIndex === 1 && <RolesMatrixTab />}

      <UserFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingUser}
        employees={employees}
      />

      <UserPermissionsModal
        user={permissionsModalUser}
        onClose={() => setPermissionsModalUser(null)}
        onEdit={(user) => {
          setPermissionsModalUser(null);
          setEditingUser(user);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
}