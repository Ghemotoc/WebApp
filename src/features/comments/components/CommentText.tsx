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

/** How a comment's paragraphs look; links are SafeMarkdown's own (SafeLink). */
const components: Components = {
  p: ({ children }) => <p className="m-0 mt-1.5 first:mt-0">{children}</p>,
};

/**
 * Renders the words.
 *
 * @param props.text - the comment as stored
 * @returns the words as HTML, in the board's 16 px reading size
 */
export function CommentText({ text }: { text: string }) {
  return (
    <div className="mt-1.5 text-base leading-[1.6] break-words text-ink">
      <SafeMarkdown text={text} elements={safeMarkdownElements.comment} components={components} />
    </div>
  );
}
