import { useCallback, useRef, useState } from "react";

const FERME = { open: false, title: "", message: "" };

/**
 * Boîte de confirmation.
 *
 * >>> const { confirm, dialogProps } = useConfirmDialog();
 * >>> confirm("Supprimer", "Êtes-vous sûr ?", () => remove.mutate(id));
 * >>> <ConfirmDialog {...dialogProps} />
 */
export function useConfirmDialog() {
  const [state, setState] = useState(FERME);
  const callback = useRef(null);

  const confirm = useCallback((title, message, onConfirm) => {
    callback.current = onConfirm;
    setState({ open: true, title, message });
  }, []);

  const close = useCallback(() => {
    callback.current = null;
    setState(FERME);
  }, []);

  const handleConfirm = useCallback(() => {
    const action = callback.current;
    close();
    action?.();
  }, [close]);

  return {
    confirm,
    confirmState: state,
    handleConfirm,
    handleCancel: close,
    dialogProps: { ...state, onConfirm: handleConfirm, onCancel: close },
  };
}
