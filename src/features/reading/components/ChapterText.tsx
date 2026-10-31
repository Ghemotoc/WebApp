/**
 * ChapterText: a chapter's stored Markdown shown as reading text (story S1-E3-03 for the
 * writer's preview; the reader uses it from S1-E4-01a; pictures from S1-E3-09; music and video
 * cards from S1-E3-10).
 *
 * Safety (CLAUDE.md rule 8, sanitised before display): react-markdown never renders raw HTML
 * (skipHtml); only the chapter's allowed elements are drawn (paragraphs, headings 2 and 3, bold,
 * italic, quote, lists, the scene break, links, line breaks and chapter pictures), anything else
 * is unwrapped to its words; links keep only http, https and mailto addresses and get
 * rel="nofollow ugc noopener" and open in a new tab.
 * Pictures (S1-E3-09): only a "picture:<ID>" address is kept for an image, and it is drawn by
 * ChapterPicture from the state the database sent, never from an address in the text. An image
 * from anywhere else (an http address) is dropped.
 * Music and video cards (S1-E3-10): an "embed:<ID>" image address is drawn by ChapterEmbed from
 * the card the database sent; nothing loads from the service until the reader presses play.
 * Look: the shared `.tmc-chapter-text` styles (src/styles/index.css), board 4.3 and 3.5.
 * Who uses it: ChapterPreviewDialog (src/features/writing/); the chapter reader.
 */
import type { Element, ElementContent } from 'hast';
import Markdown, { type Components } from 'react-markdown';
import { createContext, useContext, useMemo } from 'react';

import type { EmbedView } from '@/features/embeds/api/embeds';
import { ChapterEmbed } from '@/features/embeds/components/ChapterEmbed';
import type { PictureView } from '@/features/pictures/api/pictures';
import { ChapterPicture } from '@/features/pictures/components/ChapterPicture';
import { embedIdFromAddress } from '@/lib/chapter-embeds';
import { pictureIdFromAddress } from '@/lib/chapter-pictures';
import { isAllowedLink } from '@/lib/safe-links';

/** The elements a chapter may contain (ADR 0005; img only for pictures and cards, S1-E3-09, S1-E3-10). */
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
 * Whether an image address is one of ours: a chapter picture or a music or video card.
 *
 * @param address - the image's address from the Markdown
 * @returns true for "picture:<ID>" and "embed:<ID>"
 */
function isMediaAddress(address: string): boolean {
  return pictureIdFromAddress(address) !== null || embedIdFromAddress(address) !== null;
}

/**
 * Keeps an address only when it is a safe link, a chapter picture or a music or video card.
 *
 * @param url - the address from the Markdown
 * @returns the address, or '' to drop it
 */
function keepSafeAddress(url: string): string {
  if (isAllowedLink(url) || isMediaAddress(url)) return url;
  return '';
}

/**
 * Whether a paragraph holds a picture or a card, so it is drawn as a block instead of a <p>
 * (a figure or a card can't sit inside a paragraph).
 *
 * @param node - the paragraph's element
 * @returns true when one of its children is an image with a picture or card address
 */
function holdsMedia(node: Element | undefined): boolean {
  return (node?.children ?? []).some(
    (child: ElementContent) =>
      child.type === 'element' &&
      child.tagName === 'img' &&
      isMediaAddress(String(child.properties.src ?? '')),
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
  /** Each music or video card, by ID, from get_chapter() or my_embeds() (S1-E3-10). */
  embeds?: Record<string, EmbedView>;
  /** The writer's name, for a card's "Added by". */
  writerName?: string | null;
  /**
   * True on the reader, where each visible picture and card has a Report button (S1-E3-09 and
   * S1-E3-10 criterion 4).
   */
  canReportMedia?: boolean;
}

/** What the picture and card drawers read. */
interface ChapterMedia {
  pictures: Record<string, PictureView>;
  embeds: Record<string, EmbedView>;
  writerName: string | null;
  canReport: boolean;
}

/** What the drawers below read; set by ChapterText around the text. */
const ChapterMediaContext = createContext<ChapterMedia>({
  pictures: {},
  embeds: {},
  writerName: null,
  canReport: false,
});

/**
 * Draws one of our images: a chapter picture or a music or video card. It reads the media from
 * ChapterMediaContext rather than from a prop, so the drawers below stay the same functions on
 * every render: if they were new each time, React would rebuild every card on any re-render and a
 * playing video would stop by itself (found by the S1-E3-10 browser test).
 *
 * @param address - the image's address
 * @param alt - its alt text (a card's title in the text)
 * @returns the picture or card, or nothing for any other address
 */
function MediaImage({ address, alt }: { address: string; alt: string }) {
  const media = useContext(ChapterMediaContext);
  const pictureId = pictureIdFromAddress(address);
  if (pictureId !== null) {
    return (
      <ChapterPicture
        pictureId={pictureId}
        alt={alt}
        view={media.pictures[pictureId]}
        canReport={media.canReport}
      />
    );
  }
  const embedId = embedIdFromAddress(address);
  if (embedId === null) return null;
  return (
    <ChapterEmbed
      embedId={embedId}
      fallbackTitle={alt}
      view={media.embeds[embedId]}
      writerName={media.writerName}
      canReport={media.canReport}
    />
  );
}

/** The element drawers: links, the stray heading 1, pictures and cards. Defined once. */
const chapterComponents: Components = {
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
  p: ({ node, children }) => (holdsMedia(node) ? <div>{children}</div> : <p>{children}</p>),
  img: ({ src, alt }) => (
    <MediaImage address={typeof src === 'string' ? src : ''} alt={alt ?? ''} />
  ),
};

/**
 * Renders the text.
 *
 * @returns the chapter's words as HTML, with its pictures and cards where they sit
 */
export function ChapterText({
  markdown,
  language,
  className = '',
  pictures = {},
  embeds = {},
  writerName = null,
  canReportMedia = false,
}: ChapterTextProps) {
  // The media for the drawers, kept the same object while nothing in it changes.
  const media = useMemo(
    () => ({ pictures, embeds, writerName, canReport: canReportMedia }),
    [pictures, embeds, writerName, canReportMedia],
  );
  return (
    <div lang={language} className={`tmc-chapter-text ${className}`}>
      <ChapterMediaContext.Provider value={media}>
        <Markdown
          skipHtml
          allowedElements={[...allowedElements, 'h1']}
          unwrapDisallowed
          urlTransform={keepSafeAddress}
          components={chapterComponents}
        >
          {markdown}
        </Markdown>
      </ChapterMediaContext.Provider>
    </div>
  );
}
