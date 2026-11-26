/**
 * Sheet: a small glass panel for one short task, such as "Add to a bookshelf" (bundle CALM-4;
 * handover Step 2, Sheets).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - Glass (surface-glass with the lg-blur, the glass rim and shadow-popover), radius-card
 *     corners, the title in the subheading type and a Close × at the top right.
 *   - Its rows are split by hairlines (divide-y divide-border on the list inside it).
 *   - On phones (under 600 px) it rises from the bottom edge, full width, with square bottom
 *     corners; on wider screens it sits beside the page, at the right, 400 px wide. A sheet for
 *     a decision about the page itself (placement "centre", board D06 Publish chapter) sits in
 *     the middle of the screen instead, 520 px wide.
 *   - An optional subtitle sits under the title in the meta type ("Chapter 16 · Epilogue: Spring").
 *   - It is a native <dialog> opened with showModal(), so focus stays inside, Escape closes it and
 *     focus goes back to the button that opened it, with no focus-trap code of our own.
 * Who uses it: AddToReadingList, the chapter editor's Publish chapter (centre). What it calls:
 * CrossIcon.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CrossIcon } from '@/components/icons/CrossIcon';
import { cn } from '@/lib/utils';

/** What a Sheet needs. */
export interface SheetProps {
  isOpen: boolean;
  /** Called when the sheet closes: Close × or Escape. */
  onClose: () => void;
  title: string;
  /** A short line under the title, in the meta type; left out, nothing shows. */
  subtitle?: string;
  /** Beside the page at the right (the default), or in the middle of the screen from 600 px. */
  placement?: 'side' | 'centre';
  children: ReactNode;
}

/**
 * The panel's classes: the one solid box surface (no glass outside the nav bars, Robert, 23 Nov
 * 2026, 19:26 UTC), the corners, and where it sits at each width.
 */
const sheetClasses = [
  'box-surface m-0 max-h-[85vh] w-full max-w-none overflow-y-auto',
  'p-0 text-ink-muted shadow-popover',
  'backdrop:bg-black/30',
  // Phones: a bottom sheet, its top corners rounded.
  'top-auto bottom-0 rounded-t-card rounded-b-none',
  // From 600 px: all four corners rounded, only as tall as its content.
  'min-[600px]:bottom-0 min-[600px]:top-0 min-[600px]:my-auto min-[600px]:h-fit min-[600px]:rounded-card',
].join(' ');

/** From 600 px: beside the page at the right, 400 px wide (side), or centred, 520 px (centre). */
const placementClasses = {
  side: 'min-[600px]:right-6 min-[600px]:left-auto min-[600px]:w-[400px]',
  centre: 'min-[600px]:inset-x-0 min-[600px]:mx-auto min-[600px]:w-[520px]',
} as const;

/**
 * Renders the sheet; nothing shows while it is closed.
 *
 * @returns the dialog
 */
export function Sheet({
  isOpen,
  onClose,
  title,
  subtitle,
  placement = 'side',
  children,
}: SheetProps) {
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
      className={cn(sheetClasses, placementClasses[placement])}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="m-0 type-subheading text-ink-heading">
              {title}
            </h2>
            {subtitle !== undefined && subtitle !== '' && (
              <p className="m-0 type-meta text-ink-muted">{subtitle}</p>
            )}
          </div>
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
