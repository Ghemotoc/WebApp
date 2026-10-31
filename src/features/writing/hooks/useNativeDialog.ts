/**
 * useNativeDialog: opens and closes a native <dialog> as a prop changes (stories S1-E3-09 to
 * S1-E3-11).
 *
 * A native dialog opened with showModal() keeps focus inside and closes on Escape by itself, so
 * the editor's Insert dialogs need no focus-trap code of their own.
 * Who uses it: PictureInsertDialog, EmbedInsertDialog and DrawingInsertDialog.
 */
import { useEffect, useRef } from 'react';

/**
 * Keeps the dialog's open state in step with isOpen.
 *
 * @param isOpen - whether the dialog should be showing
 * @returns the ref to put on the <dialog>
 */
export function useNativeDialog(isOpen: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return dialogRef;
}
