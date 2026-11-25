/**
 * CommentQuoteLine: the words a comment is on, above its text (READER-SELECT; boards B12 and
 * B13, ".cq": italic, 14 px on 20 px, the reading font, the muted colour).
 *
 * A poem's line breaks read as " / ". The words are the writer's, so they are marked as a quote
 * for screen readers and carry the story's language from the page around them.
 * Who uses it: CommentItem, for a comment on chosen words outside its part's group (the comments
 * under the chapter, and a comment whose words the writer has since changed).
 * What it calls: quoteForReading (lib/commentParts.ts).
 */
import type { CommentQuote } from '../api/comments';
import { quoteForReading } from '../lib/commentParts';

/**
 * Renders the line.
 *
 * @param props.quote - the comment's chosen words, or null for a comment on a whole stanza
 * @returns the quote, or nothing for a comment with no chosen words
 */
export function CommentQuoteLine({ quote }: { quote: CommentQuote | null }) {
  if (quote === null) return null;
  return (
    <blockquote className="tmc-comment-quote font-story">
      “{quoteForReading(quote.text)}”
    </blockquote>
  );
}
