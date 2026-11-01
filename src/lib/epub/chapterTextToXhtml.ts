/**
 * A chapter's stored text (the Markdown subset, ADR 0005) as XHTML for an EPUB (story S1-E13-05,
 * PRIVACY part f).
 *
 * The rules, the same as the Word files':
 * - paragraphs, headings (levels 2 and 3), bold, italic, quotes, lists and scene breaks keep
 *   their meaning, as real XHTML elements, so e-readers and screen readers read them right;
 * - links are kept only when they are allowed (src/lib/safe-links.ts); anything else keeps its
 *   words and loses the rest, so nothing the writer typed can run as code in an e-reader;
 * - a chapter picture is included with its alt text, or its alt text alone when it couldn't be
 *   loaded; a music or video card becomes a line with its link.
 * Every piece of text is escaped, so the file is always well-formed XML.
 * Who calls it: buildEpub(). What it calls: mdast-util-from-markdown, as the Word builder does.
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { List, Paragraph, PhrasingContent, RootContent } from 'mdast';

import { embedIdFromAddress } from '@/lib/chapter-embeds';
import { pictureIdFromAddress } from '@/lib/chapter-pictures';
import { isAllowedLink } from '@/lib/safe-links';

import type { EpubEmbed, EpubWords } from './epubTypes';

/** What the conversion needs: which pictures are in the book, the cards and the words. */
export interface XhtmlConversion {
  /** The file name of each included picture inside the book, by picture ID. */
  pictureFiles: ReadonlyMap<string, string>;
  embeds: ReadonlyMap<string, EpubEmbed>;
  words: Pick<EpubWords, 'pictureMissing' | 'embedLine' | 'embedMissing'>;
}

/**
 * Escapes text for XML, so "<", "&" and quotes stay text.
 *
 * @returns the escaped text
 */
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Text from a node, flattened, for the pieces we don't keep (code, raw HTML). */
function plainTextOf(node: RootContent | PhrasingContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) {
    return (node.children as (RootContent | PhrasingContent)[])
      .map((child) => plainTextOf(child))
      .join('');
  }
  return '';
}

/** Inline content: text, bold, italic, allowed links and line breaks. */
function inlineToXhtml(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return escapeXml(node.value);
      if (node.type === 'strong') return `<strong>${inlineToXhtml(node.children)}</strong>`;
      if (node.type === 'emphasis') return `<em>${inlineToXhtml(node.children)}</em>`;
      if (node.type === 'break') return '<br/>';
      if (node.type === 'link' && isAllowedLink(node.url)) {
        const words = inlineToXhtml(node.children);
        return `<a href="${escapeXml(node.url)}">${words === '' ? escapeXml(node.url) : words}</a>`;
      }
      // A refused link, inline code, raw HTML: the words stay, the rest goes.
      return escapeXml(plainTextOf(node));
    })
    .join('');
}

/** A chapter picture, or its alt text alone when it isn't in the book. */
function pictureToXhtml(pictureId: string, altText: string, conversion: XhtmlConversion): string {
  const fileName = conversion.pictureFiles.get(pictureId);
  if (fileName === undefined) {
    return `<p class="note">${escapeXml(conversion.words.pictureMissing(altText))}</p>`;
  }
  return `<figure><img src="${escapeXml(fileName)}" alt="${escapeXml(altText)}"/></figure>`;
}

/** A music or video card as a line with its link. */
function embedToXhtml(embedId: string, conversion: XhtmlConversion): string {
  const embed = conversion.embeds.get(embedId);
  if (embed === undefined) return `<p class="note">${escapeXml(conversion.words.embedMissing)}</p>`;
  const link = `<a href="${escapeXml(embed.url)}">${escapeXml(embed.url)}</a>`;
  return `<p class="note">${escapeXml(conversion.words.embedLine(embed.title))} ${link}</p>`;
}

/** A paragraph: a picture or a card when it is only that, otherwise its words. */
function paragraphToXhtml(node: Paragraph, conversion: XhtmlConversion): string {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  if (onlyChild?.type === 'image') {
    const pictureId = pictureIdFromAddress(onlyChild.url);
    if (pictureId !== null) return pictureToXhtml(pictureId, onlyChild.alt ?? '', conversion);
    const embedId = embedIdFromAddress(onlyChild.url);
    if (embedId !== null) return embedToXhtml(embedId, conversion);
  }
  return `<p>${inlineToXhtml(node.children)}</p>`;
}

/** A list, numbered or not, with its items (a list inside an item stays inside it). */
function listToXhtml(node: List, conversion: XhtmlConversion): string {
  const tag = node.ordered === true ? 'ol' : 'ul';
  const items = node.children
    .map(
      (item) =>
        `<li>${item.children.map((child) => blockToXhtml(child, conversion)).join('')}</li>`,
    )
    .join('');
  return `<${tag}>${items}</${tag}>`;
}

/** One top-level piece of the chapter. */
function blockToXhtml(node: RootContent, conversion: XhtmlConversion): string {
  if (node.type === 'paragraph') return paragraphToXhtml(node, conversion);
  if (node.type === 'heading') {
    // The subset allows levels 2 and 3; level 1 is the chapter's own heading.
    const tag = node.depth <= 2 ? 'h2' : 'h3';
    return `<${tag}>${inlineToXhtml(node.children)}</${tag}>`;
  }
  if (node.type === 'thematicBreak') return '<hr/>';
  if (node.type === 'blockquote') {
    return `<blockquote>${node.children.map((child) => blockToXhtml(child, conversion)).join('')}</blockquote>`;
  }
  if (node.type === 'list') return listToXhtml(node, conversion);
  const text = plainTextOf(node);
  return text === '' ? '' : `<p>${escapeXml(text)}</p>`;
}

/**
 * A chapter's text as XHTML.
 *
 * @param markdown - the chapter's published text
 * @param conversion - the book's pictures, cards and words
 * @returns the XHTML for the chapter's body, without its heading
 */
export function chapterTextToXhtml(markdown: string, conversion: XhtmlConversion): string {
  const tree = fromMarkdown(markdown);
  return tree.children.map((node) => blockToXhtml(node, conversion)).join('\n');
}
