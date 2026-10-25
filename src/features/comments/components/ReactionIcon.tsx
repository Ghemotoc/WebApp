/**
 * ReactionIcon: one of the six reactions, drawn as an inline SVG (story S1-E6-02; board 3.5).
 *
 * The paths are copied from the Reader board. Plain icons, not doodles: the chapter reader has no
 * doodles (DoD design rules), and the interface shows no emoji (the story's note). Hidden from
 * screen readers: the button around it carries the reaction's name.
 * Who uses it: CommentReactions.
 */
import type { ReactionKind } from '../api/reactions';

/** The outline of a face, shared by laugh, wow and sad. */
const faceOutline = 'M22 12a10 10 0 1 1-20 0 10 10 0 1 1 20 0';
/** The two eyes of a face. */
const faceEyes = 'M9 9h.01M15 9h.01';

/** Each kind's path, from the board's reactions(). */
const reactionPaths: Record<ReactionKind, string> = {
  heart:
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z',
  laugh: `${faceOutline}M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z${faceEyes}`,
  wow: `${faceOutline}M14 15.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0${faceEyes}`,
  sad: `${faceOutline}M16 16s-1.5-2-4-2-4 2-4 2${faceEyes}`,
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z',
};

/**
 * Draws one reaction in the current text colour.
 *
 * @param props.kind - which reaction
 * @param props.size - width and height in pixels: 16 on a chip, 18 in the picker (the board)
 * @returns the SVG element
 */
export function ReactionIcon({ kind, size }: { kind: ReactionKind; size: 16 | 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={reactionPaths[kind]} />
    </svg>
  );
}
