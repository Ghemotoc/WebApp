/**
 * ForumPostText: a forum post's words as HTML (bundle FORUMS-1, part b; S1-E8-02; board 5.2).
 *
 * Safety (CLAUDE.md rule 8, criteria 1 and 2): the server checked the text on save
 * (check_forum_post_text()), and it is cleaned again here: react-markdown never renders raw HTML
 * (skipHtml), so no script, iframe or style can run; only paragraphs, line breaks, bold, italic,
 * links, quotes and lists are drawn ("Simple formatting only", board 5.2), anything else is
 * unwrapped to its words; links keep only http, https and mailto addresses, get
 * rel="nofollow ugc noopener" and open in a new tab.
 * Who uses it: ForumPostCard; PostHistory for the earlier versions.
 */
import Markdown, { type Components } from 'react-markdown';

import { isAllowedLink } from '@/lib/safe-links';

/** The elements a post may contain. */
const allowedElements = ['p', 'br', 'strong', 'em', 'a', 'blockquote', 'ul', 'ol', 'li'];

/** How each element looks; links safe only, never followed for ranking. */
const components: Components = {
  a: ({ href, children }) =>
    href !== undefined && isAllowedLink(href) ? (
      <a href={href} rel="nofollow ugc noopener" target="_blank" className="text-link underline">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  p: ({ children }) => <p className="m-0 mt-3 first:mt-0">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="m-0 mt-3 rounded-2xl bg-panel px-4 py-3 text-body first:mt-0">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="m-0 mt-3 list-disc pl-6 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 mt-3 list-decimal pl-6 first:mt-0">{children}</ol>,
};

/**
 * Renders the words.
 *
 * @param props.text - the post as stored
 * @returns the words as HTML, in the board's 15 px body size
 */
export function ForumPostText({ text }: { text: string }) {
  return (
    <div className="text-[15px] leading-[1.65] break-words text-ink">
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
