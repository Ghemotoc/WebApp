/**
 * Sheet: a small glass panel for one short task, such as "Add to a bookshelf" (bundle CALM-4;
 * handover Step 2, Sheets).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - Glass (surface-glass with the lg-blur, the glass rim and shadow-popover), radius-card
 *     corners, the title in the subheading type and a Close × at the top right.
 *   - Its rows are split by hairlines (divide-y divide-border on the list inside it).
 *   - On phones (under 600 px) it rises from the bottom edge, full width, with square bottom
 *     corners; on wider screens it sits beside the page, at the right, 400 px wide.
 *   - It is a native <dialog> opened with showModal(), so focus stays inside, Escape closes it and
 *     focus goes back to the button that opened it, with no focus-trap code of our own.
 * Who uses it: AddToReadingList. What it calls: CrossIcon.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CrossIcon } from '@/components/icons/CrossIcon';

/** What a Sheet needs. */
export interface SheetProps {
  isOpen: boolean;
  /** Called when the sheet closes: Close × or Escape. */
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** The panel's classes: glass, the corners, and where it sits at each width. */
const sheetClasses = [
  'm-0 max-h-[85vh] w-full max-w-none overflow-y-auto border border-[var(--glass-border)]',
  'bg-[var(--surface-glass)] p-0 text-ink-muted shadow-popover backdrop-blur-[24px] backdrop-saturate-[1.8]',
  'backdrop:bg-black/30',
  // Phones: a bottom sheet, its top corners rounded.
  'top-auto bottom-0 rounded-t-card rounded-b-none',
  // From 600 px: beside the page, at the right, all four corners rounded.
  'min-[600px]:top-0 min-[600px]:right-6 min-[600px]:bottom-0 min-[600px]:left-auto min-[600px]:my-auto',
  'min-[600px]:h-fit min-[600px]:w-[400px] min-[600px]:rounded-card',
].join(' ');

/**
 * Renders the sheet; nothing shows while it is closed.
 *
 * @returns the dialog
 */
export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Keep the native dialog's open state in step with isOpen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} className={sheetClasses} onClose={onClose}>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="m-0 type-subheading text-ink-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('sheet.close')}
            className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
          >
            <CrossIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
