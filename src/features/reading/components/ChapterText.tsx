/**
 * ChapterText: a chapter's stored Markdown shown as reading text (story S1-E3-03 for the
 * writer's preview; the reader uses it from S1-E4-01a; pictures from S1-E3-09).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display): react-markdown never renders raw HTML
 * (skipHtml); only the chapter's allowed elements are drawn (paragraphs, headings 2 and 3, bold,
 * italic, quote, lists, the scene break, links, line breaks and chapter pictures), anything else
 * is unwrapped to its words; links keep only http, https and mailto addresses and get
 * rel="nofollow ugc noopener" and open in a new tab.
 * Pictures (S1-E3-09): only a "picture:<ID>" address is kept for an image, and it is drawn by
 * ChapterPicture from the state the database sent, never from an address in the text. An image
 * from anywhere else (an http address) is dropped.
 * Look: the shared `.tmc-chapter-text` styles (src/styles/index.css), board 4.3 and 3.5.
 * Who uses it: ChapterPreviewDialog (src/features/writing/); the chapter reader.
 */
import type { Element, ElementContent } from 'hast';
import Markdown, { type Components } from 'react-markdown';

import type { PictureView } from '@/features/pictures/api/pictures';
import { ChapterPicture } from '@/features/pictures/components/ChapterPicture';
import { pictureIdFromAddress } from '@/lib/chapter-pictures';
import { isAllowedLink } from '@/lib/safe-links';

/** The elements a chapter may contain (ADR 0005; img only for chapter pictures, S1-E3-09). */
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
  'img',
];

/**
 * Keeps an address only when it is a safe link or a chapter picture.
 *
 * @param url - the address from the Markdown
 * @returns the address, or '' to drop it
 */
function keepSafeAddress(url: string): string {
  if (isAllowedLink(url) || pictureIdFromAddress(url) !== null) return url;
  return '';
}

/**
 * Whether a paragraph holds a chapter picture, so it is drawn as a block instead of a <p>
 * (a figure can't sit inside a paragraph).
 *
 * @param node - the paragraph's element
 * @returns true when one of its children is an image with a picture address
 */
function holdsPicture(node: Element | undefined): boolean {
  return (node?.children ?? []).some(
    (child: ElementContent) =>
      child.type === 'element' &&
      child.tagName === 'img' &&
      pictureIdFromAddress(String(child.properties.src ?? '')) !== null,
  );
}

/** What the text needs. */
export interface ChapterTextProps {
  /** The chapter body as stored. */
  markdown: string;
  /** The story's language, which can differ from the interface (WCAG 3.1.2). */
  language: string;
  className?: string;
  /** Each picture's state and address, by ID, from get_chapter() or my_picture_states(). */
  pictures?: Record<string, PictureView>;
  /** True on the reader, where each visible picture has a Report button (S1-E3-09 criterion 4). */
  canReportPictures?: boolean;
}

/**
 * The element drawers: links, the stray heading 1 and pictures.
 *
 * @returns the components react-markdown uses
 */
function chapterComponents(
  pictures: Record<string, PictureView>,
  canReportPictures: boolean,
): Components {
  return {
    // Links: safe address only, never followed for ranking, never given the page's opener.
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
    p: ({ node, children }) => (holdsPicture(node) ? <div>{children}</div> : <p>{children}</p>),
    img: ({ src, alt }) => {
      const pictureId = pictureIdFromAddress(typeof src === 'string' ? src : null);
      if (pictureId === null) return null;
      return (
        <ChapterPicture
          pictureId={pictureId}
          alt={alt ?? ''}
          view={pictures[pictureId]}
          canReport={canReportPictures}
        />
      );
    },
  };
}

/**
 * Renders the text.
 *
 * @returns the chapter's words as HTML, with its pictures where they sit
 */
export function ChapterText({
  markdown,
  language,
  className = '',
  pictures = {},
  canReportPictures = false,
}: ChapterTextProps) {
  return (
    <div lang={language} className={`tmc-chapter-text ${className}`}>
      <Markdown
        skipHtml
        allowedElements={[...allowedElements, 'h1']}
        unwrapDisallowed
        urlTransform={keepSafeAddress}
        components={chapterComponents(pictures, canReportPictures)}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
