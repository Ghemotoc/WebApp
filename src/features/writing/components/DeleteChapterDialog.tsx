/**
 * DeleteChapterDialog: "Delete “<title>”?" before a chapter is deleted (story S1-E3-04;
 * board 4.4, the dimmed page with the dialog on top).
 *
 * Board values: a 480 px white dialog, a 26 px heading, the line "We hide it from readers
 * straight away and delete it for good after 30 days. Until then you can undo it under Recently
 * deleted.", then "Keep chapter" (outlined) and "Delete chapter" (solid red), right-aligned.
 * It is a native <dialog> with role="alertdialog": focus stays inside, Escape keeps the chapter.
 * Focus starts on "Keep chapter", the safe choice: it is the dialog's first button, and
 * showModal() focuses the first control.
 * Who uses it: ManageChaptersPage. What it calls: onConfirm, which the page turns into
 * delete_chapter() through useManageChapters.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

/** What the dialog needs. */
export interface DeleteChapterDialogProps {
  /** The chapter's title, or null while the dialog is closed. */
  title: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when title is null)
 */
export function DeleteChapterDialog({ title, onConfirm, onClose }: DeleteChapterDialogProps) {
  const { t } = useTranslation('writing');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = title !== null;

  // Open and close the native dialog as the chapter changes; focus starts on "Keep chapter".
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="delete-chapter-heading"
      aria-describedby="delete-chapter-body"
      onClose={onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-7 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-3.5">
        <h2
          id="delete-chapter-heading"
          className="m-0 font-heading text-[26px] leading-[1.15] font-bold break-words text-heading"
        >
          {t('manageChapters.deleteDialog.title', { title: title ?? '' })}
        </h2>
        <p id="delete-chapter-body" className="m-0 text-base leading-relaxed text-body">
          {t('manageChapters.deleteDialog.body')}
        </p>
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <Button size="lg" variant="secondary" onClick={onClose}>
            {t('manageChapters.deleteDialog.keep')}
          </Button>
          <Button
            size="lg"
            className="border-0 bg-destructive text-white hover:opacity-90"
            onClick={onConfirm}
          >
            {t('manageChapters.deleteDialog.confirm')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
