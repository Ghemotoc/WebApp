/**
 * BibleMarkdown: a bible entry's text in reading mode (story S1-E17-18: "it shows in reading mode
 * with clickable links").
 *
 * Safety (CLAUDE.md rule 8, sanitised before display; the server checked it on save with
 * check_bible_text()): SafeMarkdown (src/components/ui/) never renders raw HTML (skipHtml); only paragraphs, line
 * breaks, bold, italic, headings, lists, quotes and links are drawn, anything else is unwrapped to
 * its words; links keep only http, https and mailto addresses, get rel="nofollow ugc noopener"
 * and open in a new tab. Headings drop to h3 and h4, under the entry's own heading.
 * [[Name]] cross-links (S1-E17-31) become links to the character, entry or chapter they name, or
 * read "not found yet": before drawing, each [[Name]] is turned into a link to the address
 * "#atlas-link:<name>", which only this component's link drawing understands.
 * Who uses it: BibleEntryView. What it calls: SafeMarkdown, lib/crossLinks.ts,
 * useCrossLinks and CrossLink. On a readers' page (S1-E17-33) the same text resolves against the
 * public items only, so a private one reads as plain words.
 */
import type { Components } from 'react-markdown';

import { SafeLink, SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { safeMarkdownElements } from '@/components/ui/safeMarkdownElements';

import { isAllowedLink } from '@/lib/safe-links';

import { useCrossLinks } from '../hooks/useCrossLinks';
import { resolveCrossLink, splitCrossLinks, type LinkIndex } from '../lib/crossLinks';

import { CrossLink } from './CrossLink';

/** The address a [[Name]] is given before drawing; never a real address. */
const crossLinkPrefix = '#atlas-link:';

/** Turns each [[Name]] into a Markdown link to "#atlas-link:<name>". */
function withCrossLinks(text: string): string {
  return splitCrossLinks(text)
    .map((piece) =>
      piece.kind === 'text'
        ? piece.text
        : `[${piece.name}](${crossLinkPrefix}${encodeURIComponent(piece.name)})`,
    )
    .join('');
}

/** Keeps safe addresses and the cross-link ones; anything else becomes no address. */
function isKeptAddress(url: string): boolean {
  return url.startsWith(crossLinkPrefix) || isAllowedLink(url);
}

/** Headings sit under the entry's title, so every level the writer types becomes h3 or h4. */
const components: Components = {
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

/** The link drawing: a cross-link, a safe outside link (new tab) or just its words. */
function linkComponent(slug: string, index: LinkIndex | null): Components['a'] {
  return function MarkdownLink({ href, children }) {
    if (href?.startsWith(crossLinkPrefix) === true) {
      const name = decodeURIComponent(href.slice(crossLinkPrefix.length));
      // While the story's names load (index null) the name shows as plain words.
      const target = index === null ? undefined : resolveCrossLink(name, index);
      return <CrossLink slug={slug} name={name} target={target} />;
    }
    // Any other address is drawn by the shared member link (safe only, never followed).
    return <SafeLink href={href}>{children}</SafeLink>;
  };
}

/**
 * Renders the text.
 *
 * @param props.text - the entry's text as stored
 * @returns the text as HTML, at the reading size
 */
export function BibleMarkdown({ text }: { text: string }) {
  // The links resolve against the open story's names (S1-E17-31), or on a readers' page
  // against its public items only (S1-E17-32).
  const { slug, index, isLoaded } = useCrossLinks();
  return (
    <div className="flex flex-col gap-3 text-base leading-[1.6] break-words text-ink">
      <SafeMarkdown
        text={withCrossLinks(text)}
        elements={safeMarkdownElements.storyWorldEntry}
        keepAddress={isKeptAddress}
        components={{ ...components, a: linkComponent(slug, isLoaded ? index : null) }}
      />
    </div>
  );
}
