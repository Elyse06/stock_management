import { useMemo, useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { People as PeopleIcon, Security as SecurityIcon } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorAlert } from "@/components/feedback/ErrorAlert";
import { MESSAGES } from "@/constants/messages";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useEmployees } from "@/hooks/useReferenceData";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";

import { renvoyerAcces, utilisateursApi } from "../api/utilisateursApi";
import { RolesMatrixTab } from "../components/RolesMatrixTab";
import { UserFilters } from "../components/UserFilters";
import { UserFormDialog } from "../components/UserFormDialog";
import { UserPermissionsModal } from "../components/UserPermissionsModal";
import { UserTable } from "../components/UserTable";
import { useUtilisateurs } from "../hooks/useUtilisateurs";

const ongletLabel = (Icon, texte) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Icon fontSize="small" />
    <span>{texte}</span>
  </Box>
);

export function UtilisateursPage() {
  const { user: moi } = usePermission();
  const { refreshUser } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { confirm, dialogProps } = useConfirmDialog();
  const { data: users = [], isLoading, error } = useUtilisateurs();
  const { data: employees = [] } = useEmployees();

  const [onglet, setOnglet] = useState(0);
  const [recherche, setRecherche] = useState("");
  const [role, setRole] = useState("ALL");
  const [form, setForm] = useState({ open: false, user: null });
  const [apercu, setApercu] = useState(null);

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
    queryClient.invalidateQueries({ queryKey: ["options", "employees"] });
  };
  const fermerForm = () => setForm({ open: false, user: null });

  const enregistrement = useMutation({
    mutationFn: ({ id, payload }) => (id ? utilisateursApi.update(id, payload) : utilisateursApi.create(payload)),
    onSuccess: (data, { id }) => {
      rafraichir();
      // Son propre compte : droits et employé lié doivent être rechargés dans la session.
      if (id && id === moi?.utilisateur_id) refreshUser().catch(() => {});
      notify.success(id ? `L'utilisateur ${data.utilisateur_mail} a été mis à jour.` : `L'utilisateur ${data.utilisateur_mail} a été créé avec succès.`);
      fermerForm();
    },
    onError: (err) => {
      // Les erreurs par champ sont affichées dans le formulaire ; les autres en notification.
      if (Object.keys(getFieldErrors(err)).length === 0) notify.error(getErrorMessage(err, MESSAGES.SAVE_FAILED));
    },
  });

  const suppression = useMutation({
    mutationFn: (id) => utilisateursApi.remove(id),
    onSuccess: () => {
      rafraichir();
      notify.success("Utilisateur supprimé avec succès.");
    },
    onError: (err) => notify.error(getErrorMessage(err, MESSAGES.DELETE_FAILED)),
  });

  const renvoi = useMutation({
    mutationFn: (user) => renvoyerAcces(user.utilisateur_id),
    onSuccess: (data) => {
      rafraichir();
      notify.success(data?.detail || "Un nouvel accès va être envoyé.");
    },
    onError: (err) => notify.error(getErrorMessage(err, "Impossible de renvoyer l'accès.")),
  });

  const demanderRenvoi = (user) =>
    confirm(
      "Renvoyer l'accès ?",
      `Un nouveau mot de passe temporaire sera envoyé à « ${user.utilisateur_mail} ». Le précédent cessera de fonctionner.`,
      () => renvoi.mutate(user),
    );

  const ouvrirForm = (user = null) => {
    enregistrement.reset();
    setForm({ open: true, user });
  };

  const demanderSuppression = (user) =>
    confirm("Supprimer cet utilisateur ?", `Êtes-vous sûr de vouloir supprimer le compte « ${user.utilisateur_mail} » ?`, () =>
      suppression.mutate(user.utilisateur_id),
    );

  const filtres = useMemo(() => {
    const terme = recherche.toLowerCase();
    return users.filter((u) => {
      const texte = [u.utilisateur_mail, u.emp_nom, u.emp_matricule, u.role_nom].map((v) => String(v || "").toLowerCase());
      return (!terme || texte.some((t) => t.includes(terme))) && (role === "ALL" || String(u.role_id) === role);
    });
  }, [users, recherche, role]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
        <Tabs value={onglet} onChange={(_, v) => setOnglet(v)} textColor="inherit" sx={{ "& .MuiTabs-indicator": { bgcolor: "primary.main", height: 3 } }}>
          <Tab label={ongletLabel(PeopleIcon, `Utilisateurs & Accès (${filtres.length})`)} sx={{ fontWeight: 600, textTransform: "none" }} />
          <Tab label={ongletLabel(SecurityIcon, "Matrice des Rôles & Permissions")} sx={{ fontWeight: 600, textTransform: "none" }} />
        </Tabs>
      </Box>

      <ErrorAlert error={error && getErrorMessage(error)} />

      {onglet === 0 && (
        <Box>
          <UserFilters searchTerm={recherche} setSearchTerm={setRecherche} roleFilter={role} setRoleFilter={setRole} onAddUser={() => ouvrirForm()} />
          <UserTable
            users={filtres}
            isLoading={isLoading}
            currentUserId={moi?.utilisateur_id}
            onEdit={ouvrirForm}
            onDelete={demanderSuppression}
            onViewPermissions={setApercu}
            onRenvoyerAcces={demanderRenvoi}
          />
        </Box>
      )}
      {onglet === 1 && <RolesMatrixTab />}

      <UserFormDialog
        open={form.open}
        isSubmitting={enregistrement.isPending}
        submitError={enregistrement.error}
        onClose={fermerForm}
        onSubmit={(payload) => enregistrement.mutate({ id: form.user?.utilisateur_id, payload })}
        initialData={form.user}
        employees={employees}
        isSelf={Boolean(form.user) && form.user.utilisateur_id === moi?.utilisateur_id}
      />
      <UserPermissionsModal
        user={apercu}
        onClose={() => setApercu(null)}
        onEdit={(user) => {
          setApercu(null);
          ouvrirForm(user);
        }}
      />
      <ConfirmDialog {...dialogProps} />
    </Box>
  );
}
