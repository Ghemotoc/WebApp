/**
 * Turns a chapter's stored text (the Markdown subset of CLAUDE.md rule 8, ADR 0005) into Word
 * paragraphs, for the shared Word builder (story S1-E13-02; the format rules of S1-E11-09).
 *
 * What each piece becomes:
 * - headings (levels 2 and 3) become Word's own Heading 2 and Heading 3, so screen readers and
 *   the navigation pane can use them (S1-E11-09: headings are real headings);
 * - bold, italic and links (http, https, mailto) stay bold, italic and links;
 * - a quote becomes the Quote style, lists become real bullet and numbered lists, and the scene
 *   break (* * *) a centred "* * *";
 * - a chapter picture, `![alt](picture:<ID>)`, becomes the picture with its alt text, or a line
 *   "Picture: <alt>" when it couldn't be loaded; a music or video card, `![title](embed:<ID>)`,
 *   becomes a line with its link (S1-E11-09: embeds are listed as links);
 * - anything else (raw HTML, code) becomes plain text, as in the editor's converter.
 * Who calls it: storyToWord(). What it calls: mdast-util-from-markdown and the docx library.
 */
import {
  AlignmentType,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from 'docx';
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

import type { WordAssets, WordLabels } from './wordTypes';

/** The numbering definitions storyToWord() registers, by name. */
export const BULLET_LIST_REFERENCE = 'chapter-bullets';
export const NUMBERED_LIST_REFERENCE = 'chapter-numbers';

/** The paragraph style storyToWord() registers for quotes. */
export const QUOTE_STYLE_ID = 'Quote';

/** What every step of the conversion needs. */
export interface ChapterConversion {
  assets: WordAssets;
  labels: WordLabels;
  /** Counts numbered lists, so each one starts again at 1 (Word's numbering "instance"). */
  nextListInstance: () => number;
}

/** The look of a run of text, carried down through bold, italic and links. */
interface RunStyle {
  bold: boolean;
  italics: boolean;
  /** Word's character style: "Hyperlink" inside a link, none elsewhere. */
  characterStyle?: string;
}

/** Plain text: neither bold nor italic. */
const plainStyle: RunStyle = { bold: false, italics: false };

/** Text from a node, flattened, for the pieces we don't keep (code, raw HTML). */
function plainTextOf(node: MarkdownNode): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map((child) => plainTextOf(child)).join('');
  return '';
}

/** One run of text in the given look. */
function textRun(text: string, style: RunStyle): TextRun {
  return new TextRun({
    text,
    bold: style.bold,
    italics: style.italics,
    style: style.characterStyle,
  });
}

/**
 * Inline content to Word runs: text with its bold and italic, line breaks and links.
 *
 * @param nodes - the inline Markdown nodes
 * @param style - the look around them
 * @returns the runs and links, in order
 */
function inlineToWord(nodes: PhrasingContent[], style: RunStyle): ParagraphChild[] {
  const result: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      result.push(textRun(node.value, style));
    } else if (node.type === 'strong') {
      result.push(...inlineToWord(node.children, { ...style, bold: true }));
    } else if (node.type === 'emphasis') {
      result.push(...inlineToWord(node.children, { ...style, italics: true }));
    } else if (node.type === 'link' && isAllowedLink(node.url)) {
      // Word's Hyperlink style gives the words their link colour and underline.
      const words = inlineToWord(node.children, { ...style, characterStyle: 'Hyperlink' });
      const children =
        words.length > 0 ? words : [textRun(node.url, { ...style, characterStyle: 'Hyperlink' })];
      result.push(new ExternalHyperlink({ link: node.url, children }));
    } else if (node.type === 'break') {
      result.push(new TextRun({ break: 1 }));
    } else {
      // A refused link, inline code, raw HTML: the words stay, the rest goes.
      const text = plainTextOf(node);
      if (text !== '') result.push(textRun(text, style));
    }
  }
  return result;
}

/** A chapter picture with its alt text; the alt text alone when it couldn't be loaded. */
function pictureParagraph(
  pictureId: string,
  altText: string,
  conversion: ChapterConversion,
): Paragraph {
  const picture = conversion.assets.pictures.get(pictureId);
  if (picture === undefined) {
    const line = conversion.labels.pictureMissing(altText);
    return new Paragraph({ children: [new TextRun({ text: line, italics: true })] });
  }
  const image = new ImageRun({
    type: picture.type,
    data: picture.data,
    transformation: { width: picture.width, height: picture.height },
    // Word reads the description to screen reader users (S1-E11-09: pictures with alt text).
    altText: { name: altText.slice(0, 100), description: altText, title: altText.slice(0, 100) },
  });
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [image] });
}

/** A music or video card as "Music or video: <title>" and its link. */
function embedParagraph(embedId: string, conversion: ChapterConversion): Paragraph {
  const embed = conversion.assets.embeds.get(embedId);
  if (embed === undefined) {
    return new Paragraph({
      children: [new TextRun({ text: conversion.labels.embedMissing, italics: true })],
    });
  }
  const link = new ExternalHyperlink({
    link: embed.url,
    children: [new TextRun({ text: embed.url, style: 'Hyperlink' })],
  });
  return new Paragraph({
    children: [new TextRun(`${conversion.labels.embedLine(embed.title)} `), link],
  });
}

/**
 * A paragraph that is only a chapter picture or a music or video card, in Word.
 *
 * @returns the paragraph, or null when the Markdown paragraph is anything else
 */
function pictureOrEmbedToWord(
  node: MarkdownParagraph,
  conversion: ChapterConversion,
): Paragraph | null {
  const onlyChild = node.children.length === 1 ? node.children[0] : undefined;
  if (onlyChild?.type !== 'image') return null;
  // Step 1: a chapter picture, drawn with its alt text, or its alt text alone.
  const pictureId = pictureIdFromAddress(onlyChild.url);
  if (pictureId !== null) return pictureParagraph(pictureId, onlyChild.alt ?? '', conversion);
  // Step 2: a music or video card, as a line with its link.
  const embedId = embedIdFromAddress(onlyChild.url);
  if (embedId !== null) return embedParagraph(embedId, conversion);
  return null;
}

/**
 * One list's items as Word list paragraphs, one level deeper for a list inside an item (Word
 * draws two levels).
 *
 * @returns the list's paragraphs
 */
function listToWord(node: List, conversion: ChapterConversion, level: number): Paragraph[] {
  // Each numbered list starts again at 1; bullets need no counting.
  const isNumbered = node.ordered === true;
  const instance = isNumbered ? conversion.nextListInstance() : 0;
  const reference = isNumbered ? NUMBERED_LIST_REFERENCE : BULLET_LIST_REFERENCE;
  const result: Paragraph[] = [];
  for (const child of node.children.flatMap((item) => item.children)) {
    if (child.type === 'list') {
      result.push(...listToWord(child, conversion, Math.min(level + 1, 1)));
    } else {
      const runs =
        child.type === 'paragraph'
          ? inlineToWord(child.children, plainStyle)
          : [new TextRun(plainTextOf(child))];
      result.push(new Paragraph({ children: runs, numbering: { reference, level, instance } }));
    }
  }
  return result;
}

/**
 * One top-level piece of the chapter in Word.
 *
 * @param node - the Markdown piece
 * @param conversion - the pictures, cards, labels and list counter
 * @param paragraphStyle - the Quote style inside a quote, nothing elsewhere
 * @returns its paragraphs (a list or a quote gives several)
 */
function blockToWord(
  node: RootContent,
  conversion: ChapterConversion,
  paragraphStyle?: string,
): Paragraph[] {
  if (node.type === 'paragraph') {
    const special = pictureOrEmbedToWord(node, conversion);
    return [
      special ??
        new Paragraph({ style: paragraphStyle, children: inlineToWord(node.children, plainStyle) }),
    ];
  }
  if (node.type === 'heading') {
    // The subset allows levels 2 and 3; level 1 is the chapter's own title.
    const heading = node.depth <= 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
    return [new Paragraph({ heading, children: inlineToWord(node.children, plainStyle) })];
  }
  if (node.type === 'thematicBreak') {
    return [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('* * *')] })];
  }
  if (node.type === 'blockquote') {
    return node.children.flatMap((child) => blockToWord(child, conversion, QUOTE_STYLE_ID));
  }
  if (node.type === 'list') return listToWord(node, conversion, 0);
  const text = plainTextOf(node);
  return text === ''
    ? []
    : [new Paragraph({ style: paragraphStyle, children: [new TextRun(text)] })];
}

/**
 * A chapter's stored text as Word paragraphs.
 *
 * @param markdown - the chapter's text
 * @param conversion - the pictures, cards, labels and list counter
 * @returns the paragraphs, in order
 */
export function chapterTextToWord(markdown: string, conversion: ChapterConversion): Paragraph[] {
  const tree = fromMarkdown(markdown);
  return tree.children.flatMap((node) => blockToWord(node, conversion));
}
