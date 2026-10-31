/**
 * BoardMoveDialog: "Change the order readers see?" before a board move renumbers published
 * chapters (story S1-E17-19: "the board asks first, because readers see the new order", as
 * Manage chapters does, S1-E3-04).
 *
 * A native <dialog> with role="alertdialog": focus stays inside and Escape keeps the order.
 * Focus starts on "Keep the order", the safe choice, which is the first button. Same shape as
 * the writer section's DeleteChapterDialog.
 * Who uses it: ChapterBoard. What it calls: onConfirm and onClose (useBoardMoves).
 */
import { useEffect, useRef } from 'react';

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
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="atlas-board-move-heading"
      aria-describedby="atlas-board-move-body"
      onClose={onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-7 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-3.5">
        <h2
          id="atlas-board-move-heading"
          className="m-0 font-heading text-[26px] leading-[1.15] font-bold text-heading"
        >
          {t('storyline.board.confirm.heading')}
        </h2>
        <p id="atlas-board-move-body" className="m-0 text-base leading-relaxed text-body">
          {t('storyline.board.confirm.body')}
        </p>
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <Button size="lg" variant="secondary" onClick={onClose}>
            {t('storyline.board.confirm.keep')}
          </Button>
          <Button size="lg" onClick={onConfirm}>
            {t('storyline.board.confirm.move')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
