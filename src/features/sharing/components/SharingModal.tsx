/**
 * SharingModal: the frame every sharing dialog uses (stories S1-E4-05 and S1-E4-07; board 3.6).
 *
 * Board values: a white 20 px-radius card, a eyebrow ("Share", "Share a quote"), the
 * heading in Bricolage Grotesque and a corner "×" named "Close". No doodles on sharing screens
 * (DoD design rules).
 * How it is a dialog: the browser's own <dialog> with showModal(), which traps focus, closes on
 * Escape and gives focus back to the button that opened it (WCAG 2.2, 2.1.2 and 2.4.3), as the
 * report dialog does. The limit pop-up passes role="alertdialog".
 * Who uses it: ShareDialog, QuoteCardDialog and QuoteLimitDialog.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

/** What the frame needs. */
export interface SharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  /** The line under the heading, read with it as the dialog's description. */
  description?: string;
  closeLabel: string;
  role?: 'dialog' | 'alertdialog';
  /** The widest the card may be. */
  width?: number;
  children: ReactNode;
}

/**
 * The corner "×", a 44 px round button. The × is a close icon, which the doodle rule exempts.
 *
 * @returns the button
 */
function CloseButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-body hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}

/**
 * Renders the frame.
 *
 * @returns the <dialog>, open or closed as asked
 */
export function SharingModal(props: SharingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Open and close the native dialog as the prop changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (props.isOpen && !dialog.open) dialog.showModal();
    if (!props.isOpen && dialog.open) dialog.close();
  }, [props.isOpen]);
  return (
    <dialog
      ref={dialogRef}
      role={props.role}
      onClose={props.onClose}
      aria-labelledby={titleId}
      aria-describedby={props.description === undefined ? undefined : descriptionId}
      style={{ maxWidth: `min(100% - 32px, ${props.width ?? 560}px)` }}
      className="m-auto w-full rounded-card border border-border bg-surface p-[clamp(20px,5vw,28px)] text-ink shadow-card backdrop:bg-ink/50"
    >
      {props.isOpen && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {props.eyebrow !== undefined && <p className="m-0 eyebrow">{props.eyebrow}</p>}
              <h2
                id={titleId}
                className="m-0 font-heading text-[26px] leading-tight font-bold text-heading"
              >
                {props.title}
              </h2>
              {props.description !== undefined && (
                <p id={descriptionId} className="m-0 text-sm text-body">
                  {props.description}
                </p>
              )}
            </div>
            <CloseButton label={props.closeLabel} onClick={() => dialogRef.current?.close()} />
          </div>
          {props.children}
        </div>
      )}
    </dialog>
  );
}
