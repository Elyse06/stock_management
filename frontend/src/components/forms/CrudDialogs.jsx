import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";

import { FormDialog } from "./FormDialog";
import { requiredFilled } from "@/utils/forms";

import { FormFields } from "./FormFields";

/**
 * Modale de formulaire + confirmation de suppression d'une page ``useCrudPage``.
 * ``children`` remplace les champs déclaratifs si le formulaire est spécifique.
 */
export function CrudDialogs({ crud, titles, fields, maxWidth = "sm", children, canSubmit = true }) {
  const { dialog } = crud;
  return (
    <>
      <FormDialog
        open={dialog.open}
        onClose={dialog.close}
        title={dialog.isEdit ? titles.edit : titles.create}
        onSubmit={crud.handleSubmit}
        saving={crud.saving}
        disabled={!canSubmit || (fields && !requiredFilled(fields, dialog.form))}
        maxWidth={maxWidth}
      >
        {children ?? <FormFields fields={fields} form={dialog.form} onChange={dialog.setField} />}
      </FormDialog>
      <ConfirmDialog {...crud.confirmProps} />
    </>
  );
}
