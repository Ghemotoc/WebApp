/**
 * LeaveThreadDialog: "Leave without posting?" when Cancel is pressed on New thread with words
 * typed (bundle BOOKS-7, board F04, user story 7.4: "Cancel with words typed asks once: Leave
 * without posting? (Keep writing / Leave)").
 *
 * A native <dialog> with role="alertdialog", as DeleteChapterDialog: the focus stays inside and
 * Escape keeps writing. "Keep writing" comes first (the main button, design books item 8) and
 * holds the focus, so the safe choice is the one Enter picks. Leaving keeps the draft on this
 * device (useThreadDraft) until the thread is posted.
 * Who uses it: NewThreadForm. What it calls: onLeave and onClose.
 */
import { useEffect, useRef } from 'react';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';

import { useForumsTranslation } from '../registerForumsTranslations';

/** What the dialog needs. */
export interface LeaveThreadDialogProps {
  isOpen: boolean;
  onLeave: () => void;
  onClose: () => void;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed unless isOpen)
 */
export function LeaveThreadDialog({ isOpen, onLeave, onClose }: LeaveThreadDialogProps) {
  const { t } = useForumsTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open and close the native dialog with isOpen; the focus starts on "Keep writing".
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-safe-choice]')?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="leave-thread-heading"
      aria-describedby="leave-thread-body"
      onClose={onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-4">
        <h2
          id="leave-thread-heading"
          className="m-0 font-heading type-heading font-bold break-words text-ink-heading"
        >
          {t('newThread.leave.title')}
        </h2>
        <p id="leave-thread-body" className="m-0 type-body text-ink-muted">
          {t('newThread.leave.body')}
        </p>
        <ButtonRow className="mt-2">
          <Button onClick={onClose} data-safe-choice>
            {t('newThread.leave.keep')}
          </Button>
          <Button variant="secondary" onClick={onLeave}>
            {t('newThread.leave.leave')}
          </Button>
        </ButtonRow>
      </div>
    </dialog>
  );
}
