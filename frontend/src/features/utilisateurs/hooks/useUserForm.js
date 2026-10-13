import { useEffect, useMemo, useState } from "react";

import { ACTIONS } from "@/constants/permissions";

import { buildPermissionGroups, detectRoleId, resolveRoles } from "../constants/roles";
import { verifierMotDePasse } from "../utils/password";

import { useActions } from "./useActions";

const STANDARD_ACTIONS = [ACTIONS.CAT_LIRE, ACTIONS.MOV_LIRE, ACTIONS.COM_DEM];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** État et validation du formulaire utilisateur. */
export function useUserForm({ open, initialData, isSelf }) {
  const isEdit = Boolean(initialData);
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedActions, setSelectedActions] = useState(STANDARD_ACTIONS);
  const [empId, setEmpId] = useState("");
  const [errors, setErrors] = useState({});

  const { data: apiActions = [], isLoading: actionsLoading, error: actionsError } = useActions();
  const permissionGroups = useMemo(() => buildPermissionGroups(apiActions), [apiActions]);
  const allIds = useMemo(() => apiActions.map((a) => a.action_id), [apiActions]);
  const presetRoles = useMemo(() => resolveRoles(allIds), [allIds]);
  const actionsRetenues = useMemo(() => selectedActions.filter((id) => allIds.includes(id)), [selectedActions, allIds]);

  useEffect(() => {
    if (!open) return;
    setMail(initialData?.utilisateur_mail || "");
    setSelectedActions(initialData ? initialData.actions || [] : STANDARD_ACTIONS);
    setEmpId(initialData?.emp_id || "");
    setPassword("");
    setErrors({});
  }, [open, initialData]);

  const clearError = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
  // Un administrateur ne peut pas se retirer la gestion des utilisateurs (règle du backend).
  const verrouillee = (id) => isSelf && id === ACTIONS.USR_GERE;
  const avecVerrou = (ids) => (isSelf && !ids.includes(ACTIONS.USR_GERE) ? [...ids, ACTIONS.USR_GERE] : ids);

  const toggleAction = (id) => {
    if (verrouillee(id)) return;
    setSelectedActions((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
    clearError("actions");
  };
  const toggleGroup = (group) => {
    const ids = group.items.map((i) => i.id);
    const tous = ids.every((id) => selectedActions.includes(id));
    setSelectedActions((prev) => avecVerrou(tous ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
    clearError("actions");
  };
  const applyPreset = (preset) => setSelectedActions(avecVerrou([...preset.actions]));

  const valider = () => {
    const e = {};
    if (!mail.trim()) e.mail = "L'adresse email est obligatoire.";
    else if (!EMAIL_RE.test(mail.trim())) e.mail = "Adresse email invalide.";
    if (!isEdit && !password) e.password = "Le mot de passe est obligatoire.";
    else if (password) e.password = verifierMotDePasse(password);
    if (actionsRetenues.length === 0) e.actions = "Accordez au moins une permission.";
    const nettoye = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErrors(nettoye);
    return Object.keys(nettoye).length === 0;
  };

  const payload = () => ({
    utilisateur_mail: mail.trim().toLowerCase(),
    actions: actionsRetenues,
    emp_id: empId || null,
    ...(password ? { utilisateur_mdp: password } : {}),
  });

  return {
    isEdit,
    mail, setMail,
    password, setPassword,
    empId, setEmpId,
    selectedActions,
    actionsRetenues,
    errors, setErrors, clearError,
    permissionGroups,
    allIds,
    selectableRoles: presetRoles.filter((r) => r.id !== "CUSTOM"),
    roleId: detectRoleId(actionsRetenues, presetRoles),
    actionsLoading,
    actionsError,
    toggleAction,
    toggleGroup,
    applyPreset,
    verrouillee,
    valider,
    payload,
  };
}
