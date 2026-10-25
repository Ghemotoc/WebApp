/**
 * CommentText: a comment's words as HTML (story S1-E6-01).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display; the server checked it on save with
 * check_comment_text()): react-markdown never renders raw HTML (skipHtml); only paragraphs,
 * line breaks, bold, italic and links are drawn, anything else is unwrapped to its words; links
 * keep only http, https and mailto addresses, get rel="nofollow ugc noopener" (the story's legal
 * note) and open in a new tab. Emoji are just text and stay as written (Q25).
 * Who uses it: CommentItem.
 */
import Markdown, { type Components } from 'react-markdown';

import { isAllowedLink } from '@/lib/safe-links';

/** The elements a comment may contain. */
const allowedElements = ['p', 'br', 'strong', 'em', 'a'];

/** Links: safe address only, never followed for ranking, never given the page's opener. */
const components: Components = {
  a: ({ href, children }) =>
    href !== undefined && isAllowedLink(href) ? (
      <a href={href} rel="nofollow ugc noopener" target="_blank" className="text-link underline">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
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
      <Markdown
        skipHtml
        allowedElements={allowedElements}
        unwrapDisallowed
        urlTransform={(url) => (isAllowedLink(url) ? url : '')}
        components={components}
      >
        {text}
      </Markdown>
    </div>
  );
}
