/**
 * The plan builder for PDF: one story's plan from Story Atlas as one PDF file, beside its Word
 * file (bundle ADMIN-2, part d; Robert, 2 Nov 2026: a PDF for every download that includes the
 * plan).
 *
 * What the file holds is the same as planToWord(): the title ("The plan of …"), the byline and
 * the user ID, then each part of the plan as a heading on a new page, and in it each entry with
 * its labelled lines and its longer text.
 * Who calls it: src/features/data-export/ (Download my data and Download my stories) and staff
 * copies. What it calls: chapterTextToPdf() for the writer's longer text, and pdfDefinition() and
 * pdfDocumentBytes() so a plan looks like its story.
 */
import type { Content } from 'pdfmake/interfaces';

import type { WordLabels, WordPlan, WordPlanEntry, WordPlanPart } from '@/lib/word/wordTypes';

import { chapterTextToPdf, PDF_STYLES, type PdfChapterConversion } from './chapterTextToPdf';
import { pdfDocumentBytes } from './loadPdfMake';
import { pdfDefinition, pdfDetailLine } from './storyToPdf';

/** What planToPdf() needs besides the plan: the story builder's labels, for links and lists. */
export interface PlanToPdfOptions {
  labels: WordLabels;
}

/** The opening lines: the title, the byline and the user ID. */
function planOpening(plan: WordPlan, labels: WordLabels): Content[] {
  return [
    { text: plan.title, style: PDF_STYLES.title },
    { text: labels.byLine(plan.writerName), italics: true, margin: [0, 0, 0, 12] },
    pdfDetailLine(labels.userId, plan.userId),
  ];
}

/** One entry: its heading, its lines, then its longer text. */
function entryContent(entry: WordPlanEntry, conversion: PdfChapterConversion): Content[] {
  const content: Content[] = [];
  if (entry.title !== null) {
    content.push({ text: entry.title, style: PDF_STYLES.heading2, headlineLevel: 1 });
  }
  for (const detail of entry.details) content.push(pdfDetailLine(detail.label, detail.value));
  if (entry.markdown !== null) content.push(...chapterTextToPdf(entry.markdown, conversion));
  return content;
}

/** One part: its heading on a new page, then every entry. */
function partContent(part: WordPlanPart, conversion: PdfChapterConversion): Content[] {
  return [
    { text: part.heading, style: PDF_STYLES.heading1, pageBreak: 'before' },
    ...part.entries.flatMap((entry) => entryContent(entry, conversion)),
  ];
}

/**
 * Builds one story's plan as a PDF file.
 *
 * @param plan - the plan's parts, already in the writer's language
 * @param options - the story builder's translated labels
 * @returns the .pdf file's bytes
 * @throws when pdfmake can't load or can't build the file (the caller shows its plain message)
 */
export async function planToPdf(plan: WordPlan, options: PlanToPdfOptions): Promise<Uint8Array> {
  // Step 1: the writer's longer text goes through the chapter converter; a plan has no pictures.
  const conversion: PdfChapterConversion = {
    assets: { pictures: new Map(), embeds: new Map() },
    labels: options.labels,
  };
  // Step 2: the opening, then every part, or one line when nothing is planned yet.
  const body: Content[] =
    plan.parts.length === 0
      ? [{ text: plan.emptyNote }]
      : plan.parts.flatMap((part) => partContent(part, conversion));
  // Step 3: the file, with the same look as the story's own.
  return pdfDocumentBytes(
    pdfDefinition({
      title: plan.title,
      creator: plan.writerName,
      languageCode: plan.languageCode,
      content: [...planOpening(plan, options.labels), ...body],
    }),
  );
}
