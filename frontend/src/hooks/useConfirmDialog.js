import { useState, useCallback } from "react";

export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const confirm = useCallback((title, message, onConfirm) => {
    setConfirmState({
      open: true,
      title,
      message,
      onConfirm,
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
    setConfirmState({ open: false, title: "", message: "", onConfirm: null });
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    setConfirmState({ open: false, title: "", message: "", onConfirm: null });
  }, []);

  return { confirmState, confirm, handleConfirm, handleCancel };
}