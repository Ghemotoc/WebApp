/**
 * HomeCommentWords: the words of a comment picked for the home page, drawn the same way on the
 * home page's card, the reader's invitation and the staff list, so the reader and staff see
 * exactly what visitors would (bundle GAPS-13).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display), through SafeMarkdown: raw HTML is never
 * rendered; only paragraphs, line breaks, bold and italic are drawn. Unlike a comment under a
 * chapter, a link is never drawn as a link here: the home page carries no member's link, and
 * the database refuses a comment with a web address for it (home_comment_can_show()).
 * Who uses it: HomeCommentCard, HubHomeCommentInvitations and HomeCommentSection.
 */
import type { Components } from 'react-markdown';

import { SafeMarkdown } from '@/components/ui/SafeMarkdown';

/** The only Markdown drawn: paragraphs, line breaks, bold and italic. */
const elements = ['p', 'br', 'strong', 'em'];

/** Paragraphs without the browser's own margins, a small gap between two. */
const components: Components = {
  p: ({ children }) => <p className="m-0 mt-1.5 first:mt-0">{children}</p>,
};

/**
 * Renders the words.
 *
 * @param props.text - the comment as stored
 * @param props.className - the quote's own classes (size and colour differ by screen)
 * @returns the words inside a blockquote
 */
export function HomeCommentWords({ text, className }: { text: string; className: string }) {
  return (
    <blockquote className={className}>
      <SafeMarkdown text={text} elements={elements} components={components} />
    </blockquote>
  );
}
