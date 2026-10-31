/**
 * BibleMarkdown: a bible entry's text in reading mode (story S1-E17-18: "it shows in reading mode
 * with clickable links").
 *
 * Safety (CLAUDE.md rule 8, sanitised before display; the server checked it on save with
 * check_bible_text()): react-markdown never renders raw HTML (skipHtml); only paragraphs, line
 * breaks, bold, italic, headings, lists, quotes and links are drawn, anything else is unwrapped to
 * its words; links keep only http, https and mailto addresses, get rel="nofollow ugc noopener"
 * and open in a new tab. Headings drop to h3 and h4, under the entry's own heading.
 * [[Name]] cross-links come with S1-E17-31 (part h).
 * Who uses it: BibleEntryView.
 */
import Markdown, { type Components } from 'react-markdown';

import { isAllowedLink } from '@/lib/safe-links';

/** The elements an entry may contain. */
const allowedElements = [
  'p',
  'br',
  'strong',
  'em',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
];

/** Headings sit under the entry's title, so every level the writer types becomes h3 or h4. */
const components: Components = {
  a: ({ href, children }) =>
    href !== undefined && isAllowedLink(href) ? (
      <a href={href} rel="nofollow ugc noopener" target="_blank" className="text-link underline">
        {children}
      </a>
    ) : (
      <>{children}</>
    ),
  h1: ({ children }) => (
    <h3 className="m-0 font-heading text-xl font-bold text-heading">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="m-0 font-heading text-xl font-bold text-heading">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="m-0 font-heading text-lg font-bold text-heading">{children}</h4>
  ),
  h4: ({ children }) => (
    <h4 className="m-0 font-heading text-lg font-bold text-heading">{children}</h4>
  ),
  ul: ({ children }) => <ul className="m-0 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 list-decimal pl-6">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="m-0 border-l-4 border-control-border pl-4 text-body">
      {children}
    </blockquote>
  ),
  p: ({ children }) => <p className="m-0">{children}</p>,
};

/**
 * Renders the text.
 *
 * @param props.text - the entry's text as stored
 * @returns the text as HTML, at the reading size
 */
export function BibleMarkdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-base leading-[1.6] break-words text-ink">
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
