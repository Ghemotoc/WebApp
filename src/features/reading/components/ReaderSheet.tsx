/**
 * ReaderSheet: the reader's bottom sheet below 1280 px, where Reading settings (Aa) and a
 * paragraph's comments open (bundle CALM-5; design handover Step 4, "Comments on a paragraph"
 * point 4 and "Reading settings" point 8; board New-PhoneReader; design system Sheet and
 * ParagraphComments).
 *
 * The rules:
 *   - Glass from the bottom edge (nearly solid, so text on it keeps its contrast over any page and
 *     the scrim), 24 px top corners, at most 70% of the window's height; what it
 *     holds scrolls inside it, and its foot stays clear of a phone's home bar.
 *   - A light scrim behind it (rgb(20 10 30 / 0.16) by day, rgb(0 0 0 / 0.5) at night).
 *   - A modal dialog (a native <dialog> opened with showModal()): focus stays inside, Escape or a
 *     tap on the scrim closes it, and the page behind it doesn't scroll while it is open.
 *   - It never opens by itself: the reader opens it from Aa or a paragraph's count.
 * It is drawn at the end of <body> (a portal), so it takes the interface's fonts and colours, not
 * the chapter text's, and the chapter's copy protection doesn't cover readers' comments.
 * When it closes, focus goes back to the control that had it as the sheet opened (the opener's
 * own onClose asks for the same, but the page is inert until the dialog has closed).
 * Who uses it: ReaderToolPlace (Reading settings) and LazyParagraphThread (a paragraph's comments).
 * What it calls: React's createPortal and the browser's <dialog>.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** What the sheet needs. */
export interface ReaderSheetProps {
  /** The dialog's name for screen readers ("Comments on this paragraph", "Reading settings"). */
  label: string;
  /** Called on Escape or a tap on the scrim; the opener closes the sheet and takes focus back. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The sheet's classes: the one box surface at the bottom edge, the 70dvh cap and the home bar's
 * room. The sheet never paints its own colour (Robert, 21 Nov 2026, 15:58 UTC; CALM-7a): box-surface
 * gives the warm off-white by day and the dark glass, with its blur, at night (index.css).
 */
const sheetClasses = [
  'tmc-reader-sheet box-surface m-0 mt-auto max-h-[70dvh] w-full max-w-none overflow-y-auto',
  'rounded-t-card rounded-b-none p-0 text-ink-muted shadow-popover',
].join(' ');

/**
 * Keeps the page behind the sheet still while it is open (handover Step 4, point 4), and puts the
 * page's own setting back afterwards.
 */
function useStillPage() {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, []);
}

/**
 * Renders the sheet, open from its first paint until the opener takes it away.
 *
 * @returns the dialog, drawn at the end of the page
 */
export function ReaderSheet({ label, onClose, children }: ReaderSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The control that had focus as the sheet was first drawn (Aa or a paragraph's count). While the
  // sheet is modal the page behind it can't take focus, so focus goes back there once it closes.
  const [opener] = useState(() => document.activeElement);
  useStillPage();

  // Step 1: open as a modal dialog once it is on the page; close it again when it leaves.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    // What it holds may already have taken focus (a thread focuses itself as it arrives, and a
    // child's effect runs before this one). showModal() would move focus to the first control,
    // so the focus that was already inside is put back afterwards (WCAG 2.4.3).
    const focusedInside = dialog.contains(document.activeElement) ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    if (focusedInside instanceof HTMLElement) focusedInside.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      // Back to the opener, if it is still on the page (WCAG 2.4.3).
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, [opener]);

  // Step 2: a tap on the scrim lands on the dialog itself (its contents are inside a child), so
  // it closes the sheet. Keyboard users close it with Escape (step 3) or the sheet's Close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    function closeOnScrim(event: MouseEvent) {
      if (event.target === dialog) onClose();
    }
    dialog.addEventListener('click', closeOnScrim);
    return () => dialog.removeEventListener('click', closeOnScrim);
  }, [onClose]);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={label}
      className={sheetClasses}
      // Step 3: Escape asks the opener to close it, so focus goes back to the right control.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {/* The padding sits inside, so a tap on it never counts as a tap on the scrim. */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
