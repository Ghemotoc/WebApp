/**
 * SharePrivacyNote: the privacy line with its shield under a share link ("The link doesn't
 * include your name or any tracking code…"; story S1-E4-05, board 3.6 Share). Moved to its own
 * file in IDEAS-1c so the chapter and the whole-story dialogs share it.
 * Who uses it: ShareDialog and StoryShareDialog. What it calls: nothing.
 */

/** The small shield before the line (a plain status icon). */
function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 flex-none text-(--success-text)"
    >
      <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z" />
    </svg>
  );
}

/**
 * Renders the line.
 *
 * @param props.text - the words, already translated
 * @returns the line
 */
export function SharePrivacyNote({ text }: { text: string }) {
  return (
    <p className="m-0 flex gap-2 text-sm text-body">
      <ShieldIcon />
      <span>{text}</span>
    </p>
  );
}
