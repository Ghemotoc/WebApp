/**
 * The plan builder: one story's plan from Story Atlas as one Word (.docx) file (story S1-E13-05;
 * Robert, 1 Nov 2026, 06:27: the downloads hold everything the writer made in Story Atlas).
 *
 * What the file holds: the title ("The plan of …"), the byline and the user ID, then each part of
 * the plan (at a glance, characters, connections, story bible, storyline, chapter plans, ideas,
 * marketing) as a Heading 1 on a new page, and in it each entry as a Heading 2 with its labelled
 * lines and its longer text. It has the same look and language rules as the story's own file.
 * Who calls it: src/features/data-export/ (Download my data and Download my stories), which turns
 * the rows into a WordPlan. What it calls: chapterTextToWord() for the writer's longer text, and
 * wordDocumentBytes() from storyToWord.ts.
 */
import { HeadingLevel, Paragraph, TextRun } from 'docx';

import { chapterTextToWord, type ChapterConversion } from './chapterTextToWord';
import { detailLine, wordDocumentBytes } from './storyToWord';
import type { WordLabels, WordPlan, WordPlanEntry, WordPlanPart } from './wordTypes';

/** What planToWord() needs besides the plan: the story builder's labels, for links and lists. */
export interface PlanToWordOptions {
  labels: WordLabels;
}

/** The opening lines: the title, the byline and the user ID. */
function planOpening(plan: WordPlan, labels: WordLabels): Paragraph[] {
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(plan.title)] }),
    new Paragraph({
      children: [new TextRun({ text: labels.byLine(plan.writerName), italics: true })],
    }),
    detailLine(labels.userId, plan.userId),
  ];
}

/** One entry: its heading, its lines, then its longer text. */
function entryParagraphs(entry: WordPlanEntry, conversion: ChapterConversion): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (entry.title !== null) {
    paragraphs.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(entry.title)] }),
    );
  }
  for (const detail of entry.details) paragraphs.push(detailLine(detail.label, detail.value));
  if (entry.markdown !== null) paragraphs.push(...chapterTextToWord(entry.markdown, conversion));
  return paragraphs;
}

/** One part: its heading on a new page, then every entry. */
function partParagraphs(part: WordPlanPart, conversion: ChapterConversion): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      children: [new TextRun(part.heading)],
    }),
    ...part.entries.flatMap((entry) => entryParagraphs(entry, conversion)),
  ];
}

/**
 * Builds one story's plan as a Word file.
 *
 * @param plan - the plan's parts, already in the writer's language
 * @param options - the story builder's translated labels
 * @returns the .docx file's bytes
 * @throws when the docx library can't build the file (the caller shows its plain message)
 */
export async function planToWord(plan: WordPlan, options: PlanToWordOptions): Promise<Uint8Array> {
  // Step 1: the writer's longer text goes through the chapter converter; a plan has no pictures.
  let listCount = 0;
  const conversion: ChapterConversion = {
    assets: { pictures: new Map(), embeds: new Map() },
    labels: options.labels,
    nextListInstance: () => (listCount += 1),
  };
  // Step 2: the opening, then every part, or one line when nothing is planned yet.
  const body =
    plan.parts.length === 0
      ? [new Paragraph({ children: [new TextRun(plan.emptyNote)] })]
      : plan.parts.flatMap((part) => partParagraphs(part, conversion));
  // Step 3: the file, with the same look as the story's own.
  return wordDocumentBytes({
    title: plan.title,
    creator: plan.writerName,
    languageCode: plan.languageCode,
    children: [...planOpening(plan, options.labels), ...body],
  });
}
