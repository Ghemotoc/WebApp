/**
 * PeopleDialog: the frame of the profile's small dialogs, "Block @name?" and "Your followers"
 * (stories S1-E5-05 and S1-E6-05).
 *
 * The browser's own <dialog> with showModal(), as the report dialog does (S1-E10-01): it traps
 * focus, closes on Escape and gives focus back to the button that opened it (WCAG 2.2, 2.1.2 and
 * 2.4.3). A corner "×" named "Close" / "Închide" closes it too. No doodles (DoD: safety screens).
 * Who uses it: BlockDialog and FollowersDialog.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

/** What the frame needs. */
export interface PeopleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/**
 * Renders the dialog; its content renders only while it is open.
 *
 * @returns the <dialog>
 */
export function PeopleDialog(props: PeopleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      onClose={props.onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(100%-32px,520px)] rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] text-ink shadow-card backdrop:bg-ink/50"
    >
      {props.isOpen && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="m-0 font-eyebrow text-sm text-eyebrow">{props.eyebrow}</p>
              <h2
                id={titleId}
                className="m-0 font-heading text-[26px] font-bold break-words text-heading"
              >
                {props.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label={props.closeLabel}
              onClick={() => dialogRef.current?.close()}
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
          </div>
          {props.children}
        </div>
      )}
    </dialog>
  );
}
