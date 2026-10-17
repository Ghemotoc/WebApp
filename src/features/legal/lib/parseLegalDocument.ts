/**
 * Splits a stored legal text into the parts the Legal centre shows (story S1-E14-01).
 *
 * Who calls it: LegalDocumentView (src/features/legal/components/), after fetching a version.
 * What it reads: body_markdown from public.legal_document_versions, written by
 * scripts/build-legal-migration.ts from the drafts in content/legal/. Every draft has the same shape:
 *   ## In short / ## Pe scurt           the whole document in a few bullets
 *   ## 1. Who can join                   a numbered section, then inside it:
 *   **In short** (as on the board)       the short version (a 13-year-old can follow it, DSA Art 14(3))
 *   **Full text**                        the full text
 *   ## Proposed additional sections …   a note introducing sections not on the board yet
 * A section heading ending in {{afterTheInvitedTest}} applies only after the invited test.
 * What it returns: plain data; the Markdown inside each part is rendered by LegalMarkdown.
 */
import { afterTheInvitedTestMarker } from './legalMarks';

/** One numbered section, or the note that introduces the proposed sections. */
export interface LegalSection {
  /** The section number from the heading ("## 6. Ads and sponsors" → 6); null for a note. */
  number: number | null;
  title: string;
  /** True when the short version says "(proposed)": the section is not on the board yet. */
  isProposed: boolean;
  /** True when the whole section applies only after the invited test. */
  isAfterTheTest: boolean;
  /** Markdown of the short version (empty for a note). */
  shortMarkdown: string;
  /** Markdown of the full text, or of the note itself. */
  fullMarkdown: string;
}

/** A whole document, ready to show. */
export interface ParsedLegalDocument {
  /** Markdown of the document's own "In short" list. */
  summaryMarkdown: string;
  sections: LegalSection[];
}

/** The lines that start the short version and the full text, in each language of the drafts. */
const shortVersionStarts = ['**In short**', '**Pe scurt**'];
const fullTextStarts = ['**Full text**', '**Text complet**'];

/** Words in the short version's start line that mean "proposed, not on the board yet". */
const proposedWords = ['(proposed)', '(propus)'];

/**
 * Cuts the body into blocks, one per "## " heading.
 *
 * @param bodyMarkdown - the stored text
 * @returns each heading (without "## ") with the lines under it
 */
function splitIntoBlocks(bodyMarkdown: string): { heading: string; lines: string[] }[] {
  const blocks: { heading: string; lines: string[] }[] = [];
  for (const line of bodyMarkdown.split('\n')) {
    if (line.startsWith('## ')) {
      blocks.push({ heading: line.slice(3).trim(), lines: [] });
    } else {
      blocks.at(-1)?.lines.push(line);
    }
  }
  return blocks;
}

/**
 * Reads a numbered heading such as "6. Ads and sponsors {{afterTheInvitedTest}}".
 *
 * @param heading - the heading text
 * @returns the number (or null), the title and whether the whole section is after the test
 */
function readHeading(heading: string): {
  number: number | null;
  title: string;
  isAfterTheTest: boolean;
} {
  const isAfterTheTest = heading.endsWith(afterTheInvitedTestMarker);
  const withoutMarker = heading.replace(afterTheInvitedTestMarker, '').trim();
  const numbered = /^(\d+)\.\s+(.*)$/.exec(withoutMarker);
  if (numbered === null) return { number: null, title: withoutMarker, isAfterTheTest };
  return { number: Number(numbered[1]), title: numbered[2] ?? '', isAfterTheTest };
}

/**
 * Turns one block into a section: the short version, then the full text.
 *
 * @param block - a heading and its lines
 * @returns the section
 */
function readSection(block: { heading: string; lines: string[] }): LegalSection {
  const { number, title, isAfterTheTest } = readHeading(block.heading);
  const shortIndex = block.lines.findIndex((line) =>
    shortVersionStarts.some((start) => line.startsWith(start)),
  );
  const fullIndex = block.lines.findIndex((line) =>
    fullTextStarts.some((start) => line.startsWith(start)),
  );
  // A block without the two markers is a note (the "Proposed additional sections" introduction).
  if (shortIndex === -1 || fullIndex === -1) {
    return {
      number,
      title,
      isProposed: false,
      isAfterTheTest,
      shortMarkdown: '',
      fullMarkdown: block.lines.join('\n').trim(),
    };
  }
  const shortStartLine = block.lines[shortIndex] ?? '';
  return {
    number,
    title,
    isProposed: proposedWords.some((word) => shortStartLine.includes(word)),
    isAfterTheTest,
    shortMarkdown: block.lines
      .slice(shortIndex + 1, fullIndex)
      .join('\n')
      .trim(),
    fullMarkdown: block.lines
      .slice(fullIndex + 1)
      .join('\n')
      .trim(),
  };
}

/**
 * Parses a stored legal text.
 *
 * @param bodyMarkdown - body_markdown from the database
 * @returns the document's summary and its sections, in order
 * Errors: none; a text without sections gives an empty list, and the screen shows the summary only.
 */
export function parseLegalDocument(bodyMarkdown: string): ParsedLegalDocument {
  const [summaryBlock, ...sectionBlocks] = splitIntoBlocks(bodyMarkdown);
  return {
    summaryMarkdown: (summaryBlock?.lines ?? []).join('\n').trim(),
    sections: sectionBlocks.map(readSection),
  };
}
