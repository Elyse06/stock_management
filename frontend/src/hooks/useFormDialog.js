import { useCallback, useState } from "react";

/**
 * État d'une modale de formulaire création / édition.
 *
 * >>> const dialog = useFormDialog(EMPTY_FORM, (row) => ({ nom: row.nom }));
 * >>> dialog.openCreate();  dialog.openEdit(row);  dialog.setField("nom", "x");
 */
export function useFormDialog(emptyForm, toForm = (row) => ({ ...emptyForm, ...row })) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }, [emptyForm]);

  const openEdit = useCallback(
    (row) => {
      setEditing(row);
      setForm(toForm(row));
      setOpen(true);
    },
    [toForm],
  );

  const close = useCallback(() => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }, [emptyForm]);

  const setField = useCallback((name, value) => setForm((prev) => ({ ...prev, [name]: value })), []);

  /** Gestionnaire ``onChange`` pour un ``TextField`` : ``bind("nom")``. */
  const bind = useCallback(
    (name) => ({ value: form[name] ?? "", onChange: (e) => setField(name, e.target.value) }),
    [form, setField],
  );

  return { open, editing, isEdit: Boolean(editing), form, setForm, setField, bind, openCreate, openEdit, close };
}
