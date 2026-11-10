/**
 * MoveChapterDialog: "Move a published chapter?" before a published chapter gets a new number
 * (liquid glass Chapters board, bundle G9 WRITING, part d; story S1-E3-04).
 *
 * Why it asks: chapter numbers follow the reading order, so moving a published chapter changes
 * the number readers know it by. Drafts, scheduled and unpublished chapters move without a
 * question (lib/chapterMoves.ts, needsMoveQuestion).
 * It follows DeleteChapterDialog: a native <dialog> with role="alertdialog", focus stays
 * inside, Escape keeps the order, and focus starts on "Keep the order", the safe choice, because
 * showModal() focuses the first button.
 * Who uses it: ManageChaptersPage. What it calls: onConfirm, which the page turns into
 * move_chapter() or set_chapter_order() through useManageChapters.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

/** What the dialog needs. */
export interface MoveChapterDialogProps {
  /** The chapter's title and its new number, or null while the dialog is closed. */
  move: { title: string; newNumber: number } | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when move is null)
 */
export function MoveChapterDialog({ move, onConfirm, onClose }: MoveChapterDialogProps) {
  const { t } = useTranslation('writing');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = move !== null;

  // Open and close the native dialog as the question comes and goes.
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
      aria-labelledby="move-chapter-heading"
      aria-describedby="move-chapter-body"
      onClose={onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-7 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-3.5">
        <h2
          id="move-chapter-heading"
          className="m-0 font-heading text-[26px] leading-[1.15] font-bold text-heading"
        >
          {t('manageChapters.moveDialog.title')}
        </h2>
        <p id="move-chapter-body" className="m-0 text-base leading-relaxed break-words text-body">
          {t('manageChapters.moveDialog.body', {
            title: move?.title ?? '',
            number: move?.newNumber ?? 0,
          })}
        </p>
        <div className="mt-1.5 flex flex-wrap justify-end gap-2">
          <Button size="lg" variant="secondary" onClick={onClose}>
            {t('manageChapters.moveDialog.keep')}
          </Button>
          <Button size="lg" onClick={onConfirm}>
            {t('manageChapters.moveDialog.confirm')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
