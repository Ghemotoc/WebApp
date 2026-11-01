/**
 * The shared Word builder: one story as one Word (.docx) file (story S1-E13-02 builds it;
 * S1-E11-09a's staff data requests and S1-E13-05's Download my stories reuse it, so nobody builds
 * a second one; decided 17 Oct 2026, 12:34).
 *
 * What the file holds (S1-E11-09's contents rule): the title, the pen name, the user ID, the dates
 * created, first published and last updated, the status, then every chapter in order, each on a
 * new page, with its title, status and dates and its text. The format rules: the story's language
 * is set on the whole document so Romanian letters (ă, â, î, ș, ț) are read and spell-checked as
 * Romanian; the title is Word's Title and each chapter a Heading 1, so headings are real
 * headings; pictures keep their alt text; music and video are links.
 * Who calls it: src/features/data-export/ (Download my data). What it calls: chapterTextToWord()
 * and the docx library, which builds the file in the browser (ADR 0012).
 */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

import {
  BULLET_LIST_REFERENCE,
  chapterTextToWord,
  NUMBERED_LIST_REFERENCE,
  QUOTE_STYLE_ID,
  type ChapterConversion,
} from './chapterTextToWord';
import type {
  WordAssets,
  WordChapter,
  WordDateFormatter,
  WordLabels,
  WordStory,
} from './wordTypes';

/** What storyToWord() needs besides the story. */
export interface StoryToWordOptions {
  labels: WordLabels;
  formatDate: WordDateFormatter;
  assets: WordAssets;
}

/** Word's language tag for a story language ("ro" is read as Romanian from Romania). */
function wordLanguageOf(languageCode: string): string {
  if (languageCode === 'ro') return 'ro-RO';
  if (languageCode === 'en') return 'en-GB';
  return languageCode;
}

/** One "Label: value" line, the label in bold (planToWord() uses it too). */
export function detailLine(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)],
  });
}

/**
 * The opening lines: title, byline and the story's details.
 *
 * @returns the paragraphs before the first chapter
 */
function storyOpening(story: WordStory, options: StoryToWordOptions): Paragraph[] {
  const { labels, formatDate } = options;
  const firstPublished =
    story.firstPublishedAt === null ? labels.notPublishedYet : formatDate(story.firstPublishedAt);
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(story.title)] }),
    new Paragraph({
      children: [new TextRun({ text: labels.byLine(story.writerName), italics: true })],
    }),
    detailLine(labels.userId, story.userId),
    detailLine(labels.created, formatDate(story.createdAt)),
    detailLine(labels.firstPublished, firstPublished),
    detailLine(labels.lastUpdated, formatDate(story.updatedAt)),
    detailLine(labels.status, story.statusLabel),
  ];
}

/** "Chapter 3: The storm", or "Chapter 3" when the chapter has no title. */
function chapterHeadingText(chapter: WordChapter, labels: WordLabels): string {
  const number = labels.chapterNumber(chapter.position);
  return chapter.title === null || chapter.title.trim() === ''
    ? number
    : `${number}: ${chapter.title}`;
}

/**
 * One chapter: its heading on a new page, its status and dates, then its text.
 *
 * @returns the chapter's paragraphs
 */
function chapterParagraphs(
  chapter: WordChapter,
  options: StoryToWordOptions,
  conversion: ChapterConversion,
): Paragraph[] {
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
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      children: [new TextRun(chapterHeadingText(chapter, labels))],
    }),
    new Paragraph({ children: [new TextRun({ text: details.join(' · '), italics: true })] }),
    ...chapterTextToWord(chapter.markdown, conversion),
  ];
}

/** The bullet and numbered list levels (two of each, as the editor allows). */
function listNumbering() {
  const indentOf = (level: number) => ({
    paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } },
  });
  return {
    config: [
      {
        reference: BULLET_LIST_REFERENCE,
        levels: [0, 1].map((level) => ({
          level,
          format: LevelFormat.BULLET,
          text: level === 0 ? '•' : '◦',
          alignment: AlignmentType.LEFT,
          style: indentOf(level),
        })),
      },
      {
        reference: NUMBERED_LIST_REFERENCE,
        levels: [0, 1].map((level) => ({
          level,
          format: level === 0 ? LevelFormat.DECIMAL : LevelFormat.LOWER_LETTER,
          text: `%${level + 1}.`,
          alignment: AlignmentType.LEFT,
          style: indentOf(level),
        })),
      },
    ],
  };
}

/**
 * Builds one story's Word file.
 *
 * @param story - the story and its chapters, in order
 * @param options - the translated labels, the date format and the pictures and cards
 * @returns the .docx file's bytes
 * @throws when the docx library can't build the file (the caller shows its plain message)
 */
export async function storyToWord(
  story: WordStory,
  options: StoryToWordOptions,
): Promise<Uint8Array> {
  // Step 1: one counter per file, so every numbered list starts at 1.
  let listCount = 0;
  const conversion: ChapterConversion = {
    assets: options.assets,
    labels: options.labels,
    nextListInstance: () => (listCount += 1),
  };
  // Step 2: the opening, then every chapter in order.
  const children = [
    ...storyOpening(story, options),
    ...story.chapters.flatMap((chapter) => chapterParagraphs(chapter, options, conversion)),
  ];
  // Step 3: the document, in the story's language.
  return wordDocumentBytes({
    title: story.title,
    creator: story.writerName,
    languageCode: story.languageCode,
    children,
  });
}

/** What wordDocumentBytes() needs: the file's title, author, language and paragraphs. */
export interface WordDocumentContent {
  title: string;
  creator: string;
  languageCode: string;
  children: Paragraph[];
}

/**
 * Packs paragraphs into a Word file with the builder's look: a readable body font, the quote
 * style, the list numbering, and the language set on the whole document. planToWord() uses it
 * too, so a story's plan looks like its story.
 *
 * @param content - the title, author, language and paragraphs
 * @returns the .docx file's bytes
 * @throws when the docx library can't build the file
 */
export async function wordDocumentBytes(content: WordDocumentContent): Promise<Uint8Array> {
  const document = new Document({
    title: content.title,
    creator: content.creator,
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 24,
            language: { value: wordLanguageOf(content.languageCode) },
          },
        },
      },
      paragraphStyles: [
        {
          id: QUOTE_STYLE_ID,
          name: 'Quote',
          basedOn: 'Normal',
          next: 'Normal',
          run: { italics: true },
          paragraph: { indent: { left: 720 } },
        },
      ],
    },
    numbering: listNumbering(),
    sections: [{ children: content.children }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
