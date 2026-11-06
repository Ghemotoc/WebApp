/**
 * SafeMarkdown: the one way to draw text a member wrote (QA-5, finding R3; CLAUDE.md rule 8).
 *
 * Before QA-5, each kind of member text (comments, forum posts, Story world entries, chapters)
 * set up react-markdown on its own, each with its own copy of the safety settings and the link
 * drawing. A change to one could quietly miss the others. Here the safety settings are fixed in
 * one place, and each use only picks its allowed elements (a preset below) and how they look.
 *
 * Safety, always on, whatever the caller passes:
 * - raw HTML in the text is never drawn (skipHtml), so no script, iframe or style can run;
 * - only the preset's elements are drawn; anything else is unwrapped to its words;
 * - addresses keep only what `keepAddress` allows (by default isAllowedLink: http, https and
 *   mailto), and links get rel="nofollow ugc noopener" and open in a new tab.
 * The server checked the text on save too (check_comment_text(), check_forum_post_text(),
 * check_bible_text() and check_chapter_text()); this is the second check, before display.
 *
 * Who uses it: CommentText, ForumPostText, BibleMarkdown and ChapterText. Staff-written website
 * and legal text (CmsMarkdown, LegalMarkdown) keep their own renderers: their links may point
 * inside the site and are followed.
 * What it calls next: react-markdown, and isAllowedLink from src/lib/safe-links.ts.
 */
import type { ReactNode } from 'react';
import Markdown, { type Components, type Options } from 'react-markdown';

import { isAllowedLink } from '@/lib/safe-links';

/**
 * A member's link: drawn only for a safe address, never followed for ranking, never given the
 * page's opener; anything else shows as its words alone.
 *
 * @param props.href - the address, after SafeMarkdown's address rule
 * @param props.children - the link's words
 * @returns the link, or just its words
 */
export function SafeLink({ href, children }: { href?: string; children?: ReactNode }) {
  if (href === undefined || !isAllowedLink(href)) return <>{children}</>;
  return (
    <a href={href} rel="nofollow ugc noopener" target="_blank" className="text-link underline">
      {children}
    </a>
  );
}

/** What a caller may choose; the safety settings are not among them. */
type SafeMarkdownProps = {
  /** The text as stored. */
  text: string;
  /** Which elements may be drawn: a preset from ./safeMarkdownElements.ts, or one plus a few more. */
  elements: readonly string[];
  /** How the elements look. A link drawing given here replaces SafeLink. */
  components?: Components;
  /** Which addresses to keep; anything it refuses becomes no address. Default: isAllowedLink. */
  keepAddress?: (address: string) => boolean;
  /** Extra rehype plugins (the chapter's paragraph numbers). */
  rehypePlugins?: Options['rehypePlugins'];
};

/** The default address rule: a safe outside link only. */
function keepSafeLinkOnly(address: string): boolean {
  return isAllowedLink(address);
}

/**
 * Draws a member's text with the fixed safety settings.
 *
 * @param props - see SafeMarkdownProps
 * @returns the text as HTML; the caller wraps it in its own sized container
 */
export function SafeMarkdown({
  text,
  elements,
  components,
  keepAddress = keepSafeLinkOnly,
  rehypePlugins,
}: SafeMarkdownProps) {
  return (
    <Markdown
      skipHtml
      allowedElements={[...elements]}
      unwrapDisallowed
      urlTransform={(address) => (keepAddress(address) ? address : '')}
      rehypePlugins={rehypePlugins}
      components={{ a: SafeLink, ...components }}
    >
      {text}
    </Markdown>
  );
}
