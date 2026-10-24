/**
 * ChapterText: a chapter's stored Markdown shown as reading text (story S1-E3-03 for the
 * writer's preview; the reader uses it from S1-E4-01a).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display): react-markdown never renders raw HTML
 * (skipHtml); only the chapter's allowed elements are drawn (paragraphs, headings 2 and 3, bold,
 * italic, quote, lists, the scene break, links, line breaks), anything else is unwrapped to its
 * words; links keep only http, https and mailto addresses and get rel="nofollow ugc noopener"
 * and open in a new tab.
 * Look: the shared `.tmc-chapter-text` styles (src/styles/index.css), board 4.3 and 3.5.
 * Who uses it: ChapterPreviewDialog (src/features/writing/); the chapter reader.
 */
import Markdown, { type Components } from 'react-markdown';

import { isAllowedLink } from '@/lib/safe-links';

/** The elements a chapter may contain (ADR 0005). */
const allowedElements = [
  'p',
  'h2',
  'h3',
  'strong',
  'em',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  'br',
];

/** Links: safe address only, never followed for ranking, never given the page's opener. */
const components: Components = {
  a: ({ href, children }) =>
    href !== undefined && isAllowedLink(href) ? (
      <a href={href} rel="nofollow ugc noopener" target="_blank">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  // A heading 1 can't be stored (the editor snaps it), but if one ever arrives it reads as h2.
  h1: ({ children }) => <h2>{children}</h2>,
};

/** What the text needs. */
export interface ChapterTextProps {
  /** The chapter body as stored. */
  markdown: string;
  /** The story's language, which can differ from the interface (WCAG 3.1.2). */
  language: string;
  className?: string;
}

/**
 * Renders the text.
 *
 * @returns the chapter's words as HTML
 */
export function ChapterText({ markdown, language, className = '' }: ChapterTextProps) {
  return (
    <div lang={language} className={`tmc-chapter-text ${className}`}>
      <Markdown
        skipHtml
        allowedElements={[...allowedElements, 'h1']}
        unwrapDisallowed
        urlTransform={(url) => (isAllowedLink(url) ? url : '')}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
