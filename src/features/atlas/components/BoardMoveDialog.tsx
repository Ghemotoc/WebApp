/**
 * BoardMoveDialog: "Change the order readers see?" before a board move renumbers published
 * chapters (story S1-E17-19: "the board asks first, because readers see the new order", as
 * Manage chapters does, S1-E3-04).
 *
 * A native <dialog> with role="alertdialog": focus stays inside and Escape keeps the order.
 * Focus starts on "Keep the order", the safe choice, put there after showModal() because the
 * main button comes first (design books item 8). Same shape as
 * the writer section's DeleteChapterDialog.
 * Who uses it: ChapterBoard. What it calls: onConfirm and onClose (useBoardMoves).
 */
import { useEffect, useRef } from 'react';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the dialog needs. */
export interface BoardMoveDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed unless isOpen)
 */
export function BoardMoveDialog({ isOpen, onConfirm, onClose }: BoardMoveDialogProps) {
  const { t } = useAtlasTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open and close the native dialog with the waiting move.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // The main button now comes first (design books item 8), so the focus is put on the
      // safe choice by hand instead of on the first button.
      dialog.querySelector<HTMLElement>('[data-safe-choice]')?.focus();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="atlas-board-move-heading"
      aria-describedby="atlas-board-move-body"
      onClose={onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-4">
        <h2
          id="atlas-board-move-heading"
          className="m-0 font-heading type-heading leading-[1.15] font-bold text-ink-heading"
        >
          {t('storyline.board.confirm.heading')}
        </h2>
        <p id="atlas-board-move-body" className="m-0 type-body leading-relaxed text-ink-muted">
          {t('storyline.board.confirm.body')}
        </p>
        <ButtonRow className="mt-2">
          <Button size="lg" onClick={onConfirm}>
            {t('storyline.board.confirm.move')}
          </Button>
          <Button size="lg" variant="secondary" onClick={onClose} data-safe-choice>
            {t('storyline.board.confirm.keep')}
          </Button>
        </ButtonRow>
      </div>
    </dialog>
  );
}
