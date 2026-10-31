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
 * Blocks (S1-E4-11): every top-level part is marked with the blocks it holds (lib/numberBlocks.ts),
 * so a passage or picture can be shared as a link to its spot, and a shared passage is highlighted.
 * A picture readers may share gets the Share button the reader passes in (pictureShare).
 * Paragraph comments (S1-E6-06): when the reader passes paragraphAddon, each top-level paragraph
 * sits in a two-column row (.tmc-paragraph-row) with the addon (the comment marker) beside it.
 * Look: the shared `.tmc-chapter-text` styles (src/styles/index.css), board 4.3 and 3.5.
 * Who uses it: ChapterPreviewDialog (src/features/writing/); the chapter reader.
 */
import type { Element, ElementContent } from 'hast';
import Markdown, { type Components, type ExtraProps, type Options } from 'react-markdown';
import {
  createContext,
  Suspense,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from 'react';

import type { EmbedView } from '@/features/embeds/api/embeds';
import { ChapterEmbed } from '@/features/embeds/components/ChapterEmbed';
import type { PictureView } from '@/features/pictures/api/pictures';
import { ChapterPicture } from '@/features/pictures/components/ChapterPicture';
import { chapterBlocks, type SpotRange } from '@/lib/chapter-blocks';
import { embedIdFromAddress } from '@/lib/chapter-embeds';
import { pictureIdFromAddress } from '@/lib/chapter-pictures';
import { isAllowedLink } from '@/lib/safe-links';

import { numberBlocks } from '../lib/numberBlocks';

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
  /** The shared passage to highlight, from the address (S1-E4-11), or null. */
  spot?: SpotRange | null;
  /** The reader's Share button for a visible picture (S1-E4-11); left out, there is none. */
  pictureShare?: ComponentType<PictureShareProps>;
  /**
   * What sits beside each top-level paragraph (S1-E6-06: the reader's comment marker), given the
   * paragraph's block number; left out, paragraphs are drawn on their own.
   */
  paragraphAddon?: ComponentType<{ block: number }>;
}

/** What a picture's Share button is given. */
export interface PictureShareProps {
  pictureId: string;
  alt: string;
  /** The picture's signed address, for drawing the picture card. */
  url: string;
}

/** What the picture and card drawers read. */
interface ChapterMedia {
  pictures: Record<string, PictureView>;
  embeds: Record<string, EmbedView>;
  writerName: string | null;
  canReport: boolean;
  pictureShare: ComponentType<PictureShareProps> | null;
  paragraphAddon: ComponentType<{ block: number }> | null;
}

/** What the drawers below read; set by ChapterText around the text. */
const ChapterMediaContext = createContext<ChapterMedia>({
  pictures: {},
  embeds: {},
  writerName: null,
  canReport: false,
  pictureShare: null,
  paragraphAddon: null,
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
    const view = media.pictures[pictureId];
    const PictureShare = media.pictureShare;
    return (
      <>
        <ChapterPicture pictureId={pictureId} alt={alt} view={view} canReport={media.canReport} />
        {/* Only a picture readers can see may be shared (S1-E4-11 legal note). */}
        {PictureShare !== null && view?.state === 'visible' && view.url !== null && (
          <Suspense fallback={null}>
            <PictureShare pictureId={pictureId} alt={alt} url={view.url} />
          </Suspense>
        )}
      </>
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

/**
 * Draws one paragraph. A paragraph holding a picture or a card is a block (a figure can't sit in
 * a <p>). With a paragraph addon (S1-E6-06), a top-level paragraph shares a row with it; the
 * block marks (data-block, the highlight) stay on the paragraph itself, where the share bar and
 * the shared-passage highlight look for them.
 *
 * @param props - the paragraph's attributes and its hast node
 * @returns the paragraph
 */
function ChapterParagraph({ node, ...props }: ComponentPropsWithoutRef<'p'> & ExtraProps) {
  const media = useContext(ChapterMediaContext);
  if (holdsMedia(node)) return <div {...props} />;
  const Addon = media.paragraphAddon;
  // Only top-level paragraphs are numbered (lib/numberBlocks.ts); those inside a quote or a list aren't.
  const block = Number((props as Record<string, unknown>)['data-block']);
  if (Addon === null || !Number.isInteger(block) || block < 1) return <p {...props} />;
  return (
    <div className="tmc-paragraph-row">
      <p {...props} />
      <Addon block={block} />
    </div>
  );
}

/** The element drawers: links, the stray heading 1, paragraphs, pictures and cards. Defined once. */
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
  // The block marks (data-block, the highlight) are passed on, so a picture's block keeps them.
  p: ChapterParagraph,
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
  spot = null,
  pictureShare,
  paragraphAddon,
}: ChapterTextProps) {
  // The media for the drawers, kept the same object while nothing in it changes.
  const media = useMemo(
    () => ({
      pictures,
      embeds,
      writerName,
      canReport: canReportMedia,
      pictureShare: pictureShare ?? null,
      paragraphAddon: paragraphAddon ?? null,
    }),
    [pictures, embeds, writerName, canReportMedia, pictureShare, paragraphAddon],
  );
  // The block numbers and the highlight, worked out again only when the text or spot changes.
  const rehypePlugins = useMemo<Options['rehypePlugins']>(
    () => [[numberBlocks, { blocks: chapterBlocks(markdown), highlight: spot }]],
    [markdown, spot],
  );
  return (
    <div lang={language} className={`tmc-chapter-text ${className}`}>
      <ChapterMediaContext.Provider value={media}>
        <Markdown
          skipHtml
          allowedElements={[...allowedElements, 'h1']}
          unwrapDisallowed
          urlTransform={keepSafeAddress}
          rehypePlugins={rehypePlugins}
          components={chapterComponents}
        >
          {markdown}
        </Markdown>
      </ChapterMediaContext.Provider>
    </div>
  );
}
