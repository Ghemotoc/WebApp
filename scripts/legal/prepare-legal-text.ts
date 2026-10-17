/**
 * Prepares one legal draft from content/legal/ for the database (story S1-E14-01).
 *
 * Who calls it: scripts/build-legal-migration.ts, which turns the prepared drafts into a migration,
 * and its test, scripts/legal/prepare-legal-text.test.ts.
 * What it does, in order:
 * 1. Reads the title (the "# " line) and keeps the text people read: everything from the first
 *    "## " heading, without the "Drafting notes for the lawyer" and "Open points" sections, which
 *    are for the lawyer only (decided 17 Oct 2026, 19:43, Q2).
 * 2. Marks the lines that apply only after the invited March test with {{afterTheInvitedTest}}
 *    (decided 17 Oct 2026, 19:43: marked inline, without changing any words). Which lines comes
 *    from content/legal/after-the-invited-test.json.
 * 3. Swaps the brand values (product name, company name, contact address) for {{tokens}} that the
 *    Legal centre fills in from src/config/brand.ts, because names are settings, not code
 *    (CLAUDE.md, decided 17 Oct 2026, 12:47). It also fills the "[privacy email]" placeholder with
 *    a token (Robert, 17 Oct 2026, 19:43: the contact address until the company exists).
 * What it never does: change a word of the legal text itself.
 */
import { brandDefaults } from '../../src/config/brand';

/** The marker put at the start of a line (or the end of a heading) that applies after the test. */
export const afterTheInvitedTestMarker = '{{afterTheInvitedTest}}';

/** Headings where the text for the lawyer starts; everything from the first one is left out. */
const lawyerOnlyHeadings = ['## Drafting notes for the lawyer', '## Open points'];

/** Which lines and sections of one document, in one language, apply only after the test. */
export interface AfterTheTestMarks {
  /** Section numbers marked as a whole, for example 6 for "## 6. Ads and sponsors". */
  sections: number[];
  /** Passages copied exactly from the draft; each marks one line (see markLinesAfterTheTest). */
  passages: string[];
}

/** One draft, ready to store. */
export interface PreparedLegalText {
  title: string;
  bodyMarkdown: string;
}

/**
 * Splits a draft into its title and the part people read.
 *
 * @param draft - the whole Markdown file
 * @returns the title and the body from the first "## " heading, without the lawyer-only sections
 * Errors: throws when the file has no "# " title or no "## " heading, so a broken draft never
 *   reaches the database.
 */
export function splitDraft(draft: string): PreparedLegalText {
  const lines = draft.split('\n');
  // Step 1: the title is the one "# " line at the top.
  const titleLine = lines.find((line) => line.startsWith('# '));
  if (titleLine === undefined) throw new Error('The draft has no "# " title line.');
  // Step 2: the readable part starts at the first "## " heading (the preface above it is the
  // "Draft for lawyer review" note, which the Legal centre shows as its own chip).
  const firstSectionIndex = lines.findIndex((line) => line.startsWith('## '));
  if (firstSectionIndex === -1) throw new Error('The draft has no "## " sections.');
  // Step 3: stop at the first heading meant only for the lawyer.
  const lawyerIndex = lines.findIndex((line) => lawyerOnlyHeadings.includes(line.trim()));
  const endIndex = lawyerIndex === -1 ? lines.length : lawyerIndex;
  const body = lines.slice(firstSectionIndex, endIndex).join('\n').trim();
  return { title: titleLine.slice(2).trim(), bodyMarkdown: `${body}\n` };
}

/**
 * The words of one line without its list dash, so a passage can be compared with it.
 *
 * @param line - one line of Markdown
 * @returns the line's text
 */
function lineText(line: string): string {
  return line.startsWith('- ') ? line.slice(2) : line;
}

/**
 * Finds the one line a passage marks: the line that equals it, or else the one line containing it.
 *
 * @param lines - the body, line by line
 * @param passage - text copied exactly from the draft
 * @returns the indexes of the lines to mark
 * Errors: throws when no line contains the passage, or several do and none equals it, naming
 *   the passage so whoever edits after-the-invited-test.json can fix it.
 */
export function findLinesForPassage(lines: string[], passage: string): number[] {
  const equalLines = lines.flatMap((line, index) => (lineText(line) === passage ? [index] : []));
  if (equalLines.length > 0) return equalLines;
  const containingLines = lines.flatMap((line, index) => (line.includes(passage) ? [index] : []));
  if (containingLines.length === 1) return containingLines;
  const problem = containingLines.length === 0 ? 'is not in the draft' : 'is in several lines';
  throw new Error(`The after-the-test passage "${passage}" ${problem}.`);
}

/**
 * Puts the after-the-test marker on the lines and sections that apply only after the test.
 *
 * @param bodyMarkdown - the body from splitDraft
 * @param marks - what to mark, from content/legal/after-the-invited-test.json
 * @returns the body with markers; no word is changed
 * Errors: throws for a passage findLinesForPassage can't place, or a section number not in the draft.
 */
export function markLinesAfterTheTest(bodyMarkdown: string, marks: AfterTheTestMarks): string {
  const lines = bodyMarkdown.split('\n');
  // Step 1: mark each passage's line once, after the list dash so the list still works.
  const linesToMark = new Set(
    marks.passages.flatMap((passage) => findLinesForPassage(lines, passage)),
  );
  for (const index of linesToMark) {
    const line = lines[index] ?? '';
    lines[index] = line.startsWith('- ')
      ? `- ${afterTheInvitedTestMarker} ${line.slice(2)}`
      : `${afterTheInvitedTestMarker} ${line}`;
  }
  // Step 2: mark whole sections at the end of their heading, for example "## 6. Ads and sponsors".
  for (const sectionNumber of marks.sections) {
    const index = lines.findIndex((line) => line.startsWith(`## ${sectionNumber}. `));
    if (index === -1) throw new Error(`Section ${sectionNumber} is not in the draft.`);
    lines[index] = `${lines[index] ?? ''} ${afterTheInvitedTestMarker}`;
  }
  return lines.join('\n');
}

/** Brand values in the drafts and the token the Legal centre fills each one with. */
const brandTokens: { value: string; token: string }[] = [
  // Addresses first, so the name inside an address is never swapped on its own.
  { value: brandDefaults.contactEmail, token: '{{contactEmail}}' },
  { value: brandDefaults.supportEmail, token: '{{supportEmail}}' },
  { value: '[privacy email]', token: '{{privacyEmail}}' },
  { value: '[emailul pentru confidențialitate]', token: '{{privacyEmail}}' },
  { value: brandDefaults.companyName, token: '{{companyName}}' },
  { value: brandDefaults.productName, token: '{{productName}}' },
];

/**
 * Swaps every brand value for its token, so no brand value is stored in SQL (CLAUDE.md).
 *
 * @param text - a title or a body
 * @returns the same text with {{tokens}} in place of the brand values
 */
export function replaceBrandValues(text: string): string {
  let result = text;
  for (const { value, token } of brandTokens) {
    result = result.split(value).join(token);
  }
  return result;
}

/**
 * Prepares one draft: split, mark, then swap the brand values.
 *
 * @param draft - the whole Markdown file
 * @param marks - the after-the-test marks for this document and language
 * @returns the title and body to store
 */
export function prepareLegalText(draft: string, marks: AfterTheTestMarks): PreparedLegalText {
  const { title, bodyMarkdown } = splitDraft(draft);
  const markedBody = markLinesAfterTheTest(bodyMarkdown, marks);
  return { title: replaceBrandValues(title), bodyMarkdown: replaceBrandValues(markedBody) };
}
