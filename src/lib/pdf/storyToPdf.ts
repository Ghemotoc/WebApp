/**
 * The shared PDF builder: one story as one PDF file, beside its Word file (bundle ADMIN-2, part d;
 * story S1-E11-09b: "PDF later" for story exports, Q29; Robert, 2 Nov 2026: PDF wherever Word is
 * offered).
 *
 * What the file holds is the same as the Word file (S1-E11-09's contents rule): the title, the pen
 * name, the user ID, the dates created, first published and last updated, the status, then every
 * chapter in order, each on a new page, with its title, status and dates and its text. The file
 * carries the story's language and title, and is marked as tagged; pdfmake can't yet write a full
 * reading structure, so the Word file stays the accessible format (said in the panel's help text).
 * Who calls it: src/features/data-export/ (Download my data, Download my stories) and
 * src/features/data-requests/ (staff copies). What it calls: chapterTextToPdf() and
 * pdfDocumentBytes(), which loads pdfmake only when it is needed.
 */
import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';

import type {
  WordAssets,
  WordChapter,
  WordDateFormatter,
  WordLabels,
  WordStory,
} from '@/lib/word/wordTypes';

import { chapterTextToPdf, PDF_STYLES, type PdfChapterConversion } from './chapterTextToPdf';
import { pdfDocumentBytes } from './loadPdfMake';

/** What storyToPdf() needs besides the story: the same as the Word builder. */
export interface StoryToPdfOptions {
  labels: WordLabels;
  formatDate: WordDateFormatter;
  assets: WordAssets;
}

/** Page margins in points: 72 (one inch) left and right leaves the 451-point text width. */
const PAGE_MARGINS: [number, number, number, number] = [72, 64, 72, 64];

/** The look of every PDF the builder makes: Roboto 12 point, close to the Word file's look. */
const pdfStyles: StyleDictionary = {
  [PDF_STYLES.title]: { fontSize: 26, bold: true, margin: [0, 0, 0, 8] },
  [PDF_STYLES.heading1]: { fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
  [PDF_STYLES.heading2]: { fontSize: 16, bold: true, margin: [0, 10, 0, 6] },
  [PDF_STYLES.heading3]: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] },
  [PDF_STYLES.quote]: { italics: true, margin: [36, 0, 0, 8] },
  [PDF_STYLES.details]: { italics: true, margin: [0, 0, 0, 12] },
  [PDF_STYLES.link]: { color: '#481C5F', decoration: 'underline' },
};

/** The PDF language tag for a story language, as in the Word file ("ro" is Romanian from Romania). */
function pdfLanguageOf(languageCode: string): string {
  if (languageCode === 'ro') return 'ro-RO';
  if (languageCode === 'en') return 'en-GB';
  return languageCode;
}

/** One "Label: value" line, the label in bold (planToPdf() uses it too). */
export function pdfDetailLine(label: string, value: string): Content {
  return { text: [{ text: `${label}: `, bold: true }, { text: value }], margin: [0, 0, 0, 2] };
}

/** The opening lines: title, byline and the story's details. */
function storyOpening(story: WordStory, options: StoryToPdfOptions): Content[] {
  const { labels, formatDate } = options;
  const firstPublished =
    story.firstPublishedAt === null ? labels.notPublishedYet : formatDate(story.firstPublishedAt);
  return [
    { text: story.title, style: PDF_STYLES.title },
    { text: labels.byLine(story.writerName), italics: true, margin: [0, 0, 0, 12] },
    pdfDetailLine(labels.userId, story.userId),
    pdfDetailLine(labels.created, formatDate(story.createdAt)),
    pdfDetailLine(labels.firstPublished, firstPublished),
    pdfDetailLine(labels.lastUpdated, formatDate(story.updatedAt)),
    pdfDetailLine(labels.status, story.statusLabel),
  ];
}

/** "Chapter 3: The storm", or "Chapter 3" when the chapter has no title. */
function chapterHeadingText(chapter: WordChapter, labels: WordLabels): string {
  const number = labels.chapterNumber(chapter.position);
  return chapter.title === null || chapter.title.trim() === ''
    ? number
    : `${number}: ${chapter.title}`;
}

/** One chapter: its heading on a new page, its status and dates, then its text. */
function chapterContent(
  chapter: WordChapter,
  options: StoryToPdfOptions,
  conversion: PdfChapterConversion,
): Content[] {
  const { labels, formatDate } = options;
  const firstPublished =
    chapter.firstPublishedAt === null
      ? labels.notPublishedYet
      : formatDate(chapter.firstPublishedAt);
  const details = [
    `${labels.status}: ${chapter.statusLabel}`,
    `${labels.created}: ${formatDate(chapter.createdAt)}`,
    `${labels.firstPublished}: ${firstPublished}`,
  ];
  if (chapter.lastPublishedAt !== null)
    details.push(`${labels.lastPublished}: ${formatDate(chapter.lastPublishedAt)}`);
  return [
    {
      text: chapterHeadingText(chapter, labels),
      style: PDF_STYLES.heading1,
      pageBreak: 'before',
    },
    { text: details.join(' · '), style: PDF_STYLES.details },
    ...chapterTextToPdf(chapter.markdown, conversion),
  ];
}

/** What pdfDefinition() needs: the file's title, author, language and content. */
export interface PdfDocumentContent {
  title: string;
  creator: string;
  languageCode: string;
  content: Content[];
}

/**
 * The full pdfmake definition with the builder's look: A4, the margins, the styles, the language
 * and the title, and a heading never left alone at the foot of a page. planToPdf() uses it too.
 *
 * @param documentContent - the title, author, language and content
 * @returns the definition pdfmake builds the file from
 */
export function pdfDefinition(documentContent: PdfDocumentContent): TDocumentDefinitions {
  return {
    info: { title: documentContent.title, author: documentContent.creator },
    language: pdfLanguageOf(documentContent.languageCode),
    tagged: true,
    displayTitle: true,
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
    defaultStyle: { font: 'Roboto', fontSize: 12, lineHeight: 1.3 },
    styles: pdfStyles,
    content: documentContent.content,
    // A heading inside a chapter moves to the next page when nothing follows it on this one.
    pageBreakBefore: (currentNode, nodeQueries) =>
      currentNode.headlineLevel === 1 && nodeQueries.getFollowingNodesOnPage().length === 0,
  };
}

/**
 * Builds one story's PDF file.
 *
 * @param story - the story and its chapters, in order
 * @param options - the translated labels, the date format and the pictures and cards
 * @returns the .pdf file's bytes
 * @throws when pdfmake can't load or can't build the file (the caller shows its plain message)
 */
export async function storyToPdf(
  story: WordStory,
  options: StoryToPdfOptions,
): Promise<Uint8Array> {
  // Step 1: the pictures, cards and labels every chapter needs.
  const conversion: PdfChapterConversion = { assets: options.assets, labels: options.labels };
  // Step 2: the opening, then every chapter in order.
  const content = [
    ...storyOpening(story, options),
    ...story.chapters.flatMap((chapter) => chapterContent(chapter, options, conversion)),
  ];
  // Step 3: the file, in the story's language.
  return pdfDocumentBytes(
    pdfDefinition({
      title: story.title,
      creator: story.writerName,
      languageCode: story.languageCode,
      content,
    }),
  );
}
