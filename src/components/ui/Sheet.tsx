/**
 * Sheet: a small glass panel for one short task, such as "Add to a bookshelf" (bundle CALM-4;
 * handover Step 2, Sheets).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - Glass (surface-glass with the lg-blur, the glass rim and shadow-popover), radius-card
 *     corners, the title in the subheading type and a Close × at the top right.
 *   - Its rows are split by hairlines (divide-y divide-border on the list inside it).
 *   - On phones (under 600 px) it rises from the bottom edge, full width, with square bottom
 *     corners; on wider screens it sits beside the page, at the right, 400 px wide, or, with
 *     placement "centre", in the middle of the screen as a dialog, 520 px wide (Story Atlas's
 *     "Add a relationship", user stories bundle 6, story 6.5, board E24).
 *   - It is a native <dialog> opened with showModal(), so focus stays inside, Escape closes it and
 *     focus goes back to the button that opened it, with no focus-trap code of our own.
 * Who uses it: AddToReadingList, the search and list filters, the bug report panel and the Story
 * Atlas's AddRelationshipDialog. What it calls: CrossIcon.
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
  /** Where it sits from 600 px: beside the page (the default) or centred as a dialog. */
  placement?: 'side' | 'centre';
  children: ReactNode;
}

/**
 * The panel's classes: the one solid box surface (no glass outside the nav bars, Robert, 23 Nov
 * 2026, 19:26 UTC), the corners, and where it sits at each width.
 */
const sharedClasses = [
  'box-surface m-0 max-h-[85vh] w-full max-w-none overflow-y-auto',
  'p-0 text-ink-muted shadow-popover',
  'backdrop:bg-black/30',
  // Phones: a bottom sheet, its top corners rounded.
  'top-auto bottom-0 rounded-t-card rounded-b-none',
].join(' ');

/** From 600 px: beside the page, at the right, all four corners rounded. */
const sideClasses = [
  'min-[600px]:top-0 min-[600px]:right-6 min-[600px]:bottom-0 min-[600px]:left-auto min-[600px]:my-auto',
  'min-[600px]:h-fit min-[600px]:w-[400px] min-[600px]:rounded-card',
].join(' ');

/** From 600 px: in the middle of the screen, 520 px wide, all four corners rounded. */
const centreClasses = [
  'min-[600px]:inset-0 min-[600px]:m-auto',
  'min-[600px]:h-fit min-[600px]:w-[520px] min-[600px]:rounded-card',
].join(' ');

/**
 * Renders the sheet; nothing shows while it is closed.
 *
 * @returns the dialog
 */
export function Sheet({ isOpen, onClose, title, placement = 'side', children }: SheetProps) {
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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`${sharedClasses} ${placement === 'centre' ? centreClasses : sideClasses}`}
      onClose={onClose}
    >
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
