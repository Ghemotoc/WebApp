/**
 * CommentText: a comment's words as HTML (story S1-E6-01).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display; the server checked it on save with
 * check_comment_text()), through SafeMarkdown: raw HTML is never rendered; only paragraphs,
 * line breaks, bold, italic and links are drawn, anything else is unwrapped to its words; links
 * keep only http, https and mailto addresses, get rel="nofollow ugc noopener" (the story's legal
 * note) and open in a new tab. Emoji are just text and stay as written (Q25).
 * Who uses it: CommentItem.
 */
import type { Components } from 'react-markdown';

import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { safeMarkdownElements } from '@/components/ui/safeMarkdownElements';

/**
 * From this many characters a comment counts as long: about four lines of the comment column, the
 * point where it is read rather than glanced at (design books item 11: long comments use type-long,
 * short ones stay type-body; Robert, approved 23 Nov 2026).
 */
const LONG_COMMENT_CHARACTERS = 280;

/** How a comment's paragraphs look; links are SafeMarkdown's own (SafeLink). */
const components: Components = {
  p: ({ children }) => <p className="m-0 mt-2 first:mt-0">{children}</p>,
};

/**
 * Renders the words.
 *
 * @param props.text - the comment as stored
 * @returns the words as HTML: type-body (15/24) for a short comment, type-long (17/28) for a long one
 */
export function CommentText({ text }: { text: string }) {
  // A long comment gets the bigger reading size; a short one keeps the interface size.
  const typeStyle = text.length >= LONG_COMMENT_CHARACTERS ? 'type-long' : 'type-body';
  return (
    <div className={`mt-2 ${typeStyle} break-words text-ink`}>
      <SafeMarkdown text={text} elements={safeMarkdownElements.comment} components={components} />
    </div>
  );
}
