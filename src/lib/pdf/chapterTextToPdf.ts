/**
 * Turns a chapter's stored text (the Markdown subset of CLAUDE.md rule 8, ADR 0005) into pdfmake
 * content, for the shared PDF builder (bundle ADMIN-2, part d; story S1-E11-09b: "PDF beside
 * Word"). It mirrors src/lib/word/chapterTextToWord.ts piece by piece, so a story reads the same
 * in both files:
 * - headings (levels 2 and 3) become larger bold lines, kept with the paragraph after them;
 * - bold, italic and links (http, https, mailto) stay bold, italic and links;
 * - a quote is indented and in italics, lists are real bullet and numbered lists, and the scene
 *   break (* * *) is a centred "* * *";
 * - a chapter picture, `![alt](picture:<ID>)`, becomes the picture (its alt text is not kept in
 *   the PDF itself, which pdfmake can't tag; the Word file keeps it), or a line "Picture: <alt>"
 *   when it couldn't be loaded; a music or video card, `![title](embed:<ID>)`, becomes a line with
 *   its link (S1-E11-09: embeds are listed as links);
 * - anything else (raw HTML, code) becomes plain text, as in the Word converter.
 * Who calls it: storyToPdf() and planToPdf(). What it calls: mdast-util-from-markdown and the
 * shared link and address checks; it builds plain objects and never loads pdfmake itself.
 */
import type { Content, ContentText } from 'pdfmake/interfaces';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type {
  List,
  Nodes as MarkdownNode,
  Paragraph as MarkdownParagraph,
  PhrasingContent,
  RootContent,
} from 'mdast';

import { embedIdFromAddress } from '@/lib/chapter-embeds';
import { pictureIdFromAddress } from '@/lib/chapter-pictures';
import { isAllowedLink } from '@/lib/safe-links';
import type { WordAssets, WordLabels, WordPicture } from '@/lib/word/wordTypes';

/** The widest a picture may be drawn, in points: the text width of an A4 page with our margins. */
export const PDF_TEXT_WIDTH = 451;

/** The tallest a picture may be drawn, in points, so it never runs past the bottom of a page. */
const PICTURE_MAX_HEIGHT = 600;

/** The style names storyToPdf() defines (see pdfStyles in storyToPdf.ts). */
export const PDF_STYLES = {
  title: 'title',
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  quote: 'quote',
  details: 'details',
  link: 'link',
} as const;

/** What every step of the conversion needs: the pictures and cards, and the translated labels. */
export interface PdfChapterConversion {
  assets: WordAssets;
  labels: WordLabels;
}

/** The look of a run of text, carried down through bold, italic and links. */
interface RunStyle {
  bold: boolean;
  italics: boolean;
  /** The link's address inside a link; undefined elsewhere. */
  link?: string;
}

/** Plain text: neither bold nor italic, no link. */
const plainStyle: RunStyle = { bold: false, italics: false };

/** Text from a node, flattened, for the pieces we don't keep (code, raw HTML). */
function plainTextOf(node: MarkdownNode): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map((child) => plainTextOf(child)).join('');
  return '';
}

/** One run of text in the given look; inside a link it gets the link style and address. */
function textRun(text: string, style: RunStyle): ContentText {
  const run: ContentText = { text, bold: style.bold, italics: style.italics };
  if (style.link !== undefined) {
    run.link = style.link;
    run.style = PDF_STYLES.link;
  }
  return run;
}

/**
 * Inline content to pdfmake runs: text with its bold and italic, line breaks and links.
 *
 * @param nodes - the inline Markdown nodes
 * @param style - the look around them
 * @returns the runs, in order
 */
function inlineToPdf(nodes: PhrasingContent[], style: RunStyle): ContentText[] {
  const result: ContentText[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      result.push(textRun(node.value, style));
    } else if (node.type === 'strong') {
      result.push(...inlineToPdf(node.children, { ...style, bold: true }));
    } else if (node.type === 'emphasis') {
      result.push(...inlineToPdf(node.children, { ...style, italics: true }));
    } else if (node.type === 'link' && isAllowedLink(node.url)) {
      // Only allowed addresses become clickable (CLAUDE.md rule 8); the words keep their look.
      const words = inlineToPdf(node.children, { ...style, link: node.url });
      result.push(
        ...(words.length > 0 ? words : [textRun(node.url, { ...style, link: node.url })]),
      );
    } else if (node.type === 'break') {
      result.push({ text: '\n' });
    } else {
      // A refused link, inline code, raw HTML: the words stay, the rest goes.
      const text = plainTextOf(node);
      if (text !== '') result.push(textRun(text, style));
    }
  }
  return result;
}

/** A paragraph of runs, with the gap after it that every body paragraph has. */
function paragraph(runs: ContentText[], style?: string): Content {
  return { text: runs, style, margin: [0, 0, 0, 8] };
}

/** The size to draw a picture at: its own size, made smaller to fit the page, never larger. */
function pictureSize(picture: WordPicture): { width: number; height: number } {
  const scale = Math.min(1, PDF_TEXT_WIDTH / picture.width, PICTURE_MAX_HEIGHT / picture.height);
  return { width: picture.width * scale, height: picture.height * scale };
}

/** The picture's bytes as a data address, which is the only way pdfmake takes a picture here. */
function pictureDataAddress(picture: WordPicture): string {
  // Step 1: bytes to a binary string, in slices so a big picture doesn't overflow the call stack.
  let binary = '';
  const sliceLength = 0x8000;
  for (let start = 0; start < picture.data.length; start += sliceLength) {
    binary += String.fromCharCode(...picture.data.subarray(start, start + sliceLength));
  }
  // Step 2: base64, with the picture's own type.
  const mimeType = picture.type === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** A chapter picture, centred and fitted to the page; the alt text alone when it couldn't load. */
function pictureContent(
  pictureId: string,
  altText: string,
  conversion: PdfChapterConversion,
): Content {
  const picture = conversion.assets.pictures.get(pictureId);
  if (picture === undefined) {
    return paragraph([{ text: conversion.labels.pictureMissing(altText), italics: true }]);
  }
  return {
    image: pictureDataAddress(picture),
    ...pictureSize(picture),
    alignment: 'center',
    margin: [0, 4, 0, 12],
  };
}

/** A music or video card as "Music or video: <title>" and its link. */
function embedContent(embedId: string, conversion: PdfChapterConversion): Content {
  const embed = conversion.assets.embeds.get(embedId);
  if (embed === undefined) {
    return paragraph([{ text: conversion.labels.embedMissing, italics: true }]);
  }
  return paragraph([
    { text: `${conversion.labels.embedLine(embed.title)} ` },
    { text: embed.url, link: embed.url, style: PDF_STYLES.link },
  ]);
}

/**
 * A paragraph that is only a chapter picture or a music or video card, in the PDF.
 *
 * @returns the content, or null when the Markdown paragraph is anything else
 */
function pictureOrEmbedToPdf(
  node: MarkdownParagraph,
  conversion: PdfChapterConversion,
): Content | null {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  if (onlyChild?.type !== 'image') return null;
  // Step 1: a chapter picture, or its alt text alone.
  const pictureId = pictureIdFromAddress(onlyChild.url);
  if (pictureId !== null) return pictureContent(pictureId, onlyChild.alt ?? '', conversion);
  // Step 2: a music or video card, as a line with its link.
  const embedId = embedIdFromAddress(onlyChild.url);
  if (embedId !== null) return embedContent(embedId, conversion);
  return null;
}

/**
 * One list as a pdfmake list, with a list inside an item one level deeper (as the editor allows).
 *
 * @returns the list
 */
function listToPdf(node: List): Content {
  const items: Content[] = [];
  for (const item of node.children) {
    // Each item's own pieces: its words, and any list inside it.
    const pieces: Content[] = item.children.map((child) => {
      if (child.type === 'list') return listToPdf(child);
      if (child.type === 'paragraph') return { text: inlineToPdf(child.children, plainStyle) };
      return { text: plainTextOf(child) };
    });
    items.push(pieces.length === 1 && pieces[0] !== undefined ? pieces[0] : { stack: pieces });
  }
  const list: Content = node.ordered === true ? { ol: items } : { ul: items };
  return { ...list, margin: [0, 0, 0, 8] };
}

/** A heading inside a chapter: level 2 and 3 as the subset allows; level 1 is the chapter's own. */
function headingToPdf(depth: number, children: PhrasingContent[]): Content {
  const style = depth <= 2 ? PDF_STYLES.heading2 : PDF_STYLES.heading3;
  // headlineLevel lets storyToPdf() keep a heading on the same page as the text after it.
  return { text: inlineToPdf(children, plainStyle), style, headlineLevel: 1 };
}

/**
 * One top-level piece of the chapter in the PDF.
 *
 * @param node - the Markdown piece
 * @param conversion - the pictures, cards and labels
 * @param paragraphStyle - the quote style inside a quote, nothing elsewhere
 * @returns its content (a quote gives several pieces)
 */
function blockToPdf(
  node: RootContent,
  conversion: PdfChapterConversion,
  paragraphStyle?: string,
): Content[] {
  if (node.type === 'paragraph') {
    const special = pictureOrEmbedToPdf(node, conversion);
    return [special ?? paragraph(inlineToPdf(node.children, plainStyle), paragraphStyle)];
  }
  if (node.type === 'heading') return [headingToPdf(node.depth, node.children)];
  if (node.type === 'thematicBreak') {
    return [{ text: '* * *', alignment: 'center', margin: [0, 4, 0, 12] }];
  }
  if (node.type === 'blockquote') {
    return node.children.flatMap((child) => blockToPdf(child, conversion, PDF_STYLES.quote));
  }
  if (node.type === 'list') return [listToPdf(node)];
  const text = plainTextOf(node);
  return text === '' ? [] : [paragraph([{ text }], paragraphStyle)];
}

/**
 * A chapter's stored text as pdfmake content.
 *
 * @param markdown - the chapter's text
 * @param conversion - the pictures, cards and labels
 * @returns the content, in order
 */
export function chapterTextToPdf(markdown: string, conversion: PdfChapterConversion): Content[] {
  const tree = fromMarkdown(markdown);
  return tree.children.flatMap((node) => blockToPdf(node, conversion));
}
