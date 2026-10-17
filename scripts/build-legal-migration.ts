/**
 * Turns the legal drafts in content/legal/ into a migration that stores one version of each
 * (story S1-E14-01).
 *
 * Who runs it: a person, by hand, each time a new version is ready (for example after the
 * lawyer's review). Every version becomes its own migration, so the history in the Legal centre is
 * the history of these files. Example (one line):
 *   npx tsx scripts/build-legal-migration.ts --version 0.1 --published-at 2026-10-17T18:00:00Z
 *     --material --documents terms,privacy,guidelines --output supabase/migrations/<time>_<name>.sql
 * What it reads: content/legal/<file>.md (English), content/legal/ro/<file>.md (Romanian) and
 * content/legal/after-the-invited-test.json. Each draft is prepared by
 * scripts/legal/prepare-legal-text.ts (lawyer-only sections left out, after-the-test lines marked,
 * brand values swapped for tokens).
 * What it writes: one SQL file that inserts a row per document and language into
 * public.legal_document_versions (supabase/migrations/…_s1_e14_01_legal_documents.sql).
 * Who marks a change as important ("material"): the person who runs this, with --material; the
 * founder confirms it in that pull request (decided 17 Oct 2026, 19:43, Q7). An important change
 * makes every signed-in person accept the new version before posting again.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { prepareLegalText, type AfterTheTestMarks } from './legal/prepare-legal-text';

/** The draft file of each document, by its slug (the slug is also its web address, /legal/<slug>). */
export const legalDraftFiles: Record<string, string> = {
  terms: '01-terms-of-use.md',
  privacy: '02-privacy-notice.md',
  guidelines: '03-community-guidelines.md',
  contact: '04-contact-and-company-details.md',
};

/** Where each language's drafts live, relative to content/legal/. */
const languageFolders: Record<string, string> = { en: '', ro: 'ro/' };

/** The SQL quote used around the texts; the build stops if a text ever contains it. */
const sqlQuoteTag = '$legal_text$';

/** What the person running the script asked for. */
export interface MigrationRequest {
  versionLabel: string;
  publishedAt: string;
  isMaterial: boolean;
  documentSlugs: string[];
}

/** The after-the-test marks file: per document, sections and passages per language. */
type AfterTheTestFile = Record<
  string,
  { sections: number[]; passages: Record<string, string[]> } | string
>;

/**
 * Reads the marks for one document and language.
 *
 * @param marksFile - the parsed after-the-invited-test.json
 * @param slug - the document, for example 'terms'
 * @param language - 'en' or 'ro'
 * @returns the sections and passages to mark (none when the file doesn't list the document)
 */
export function marksFor(
  marksFile: AfterTheTestFile,
  slug: string,
  language: string,
): AfterTheTestMarks {
  const entry = marksFile[slug];
  if (entry === undefined || typeof entry === 'string') return { sections: [], passages: [] };
  return { sections: entry.sections, passages: entry.passages[language] ?? [] };
}

/**
 * Wraps a text in SQL quotes that need no escaping.
 *
 * @param text - any text
 * @returns the quoted text
 * Errors: throws if the text contains the quote tag, which would end the quote early.
 */
function quoteForSql(text: string): string {
  if (text.includes(sqlQuoteTag)) throw new Error(`A legal text contains ${sqlQuoteTag}.`);
  return `${sqlQuoteTag}${text}${sqlQuoteTag}`;
}

/**
 * Builds the insert for one document in one language.
 *
 * @param request - the version being stored
 * @param slug - the document
 * @param language - 'en' or 'ro'
 * @param draftText - the draft file's contents, already prepared
 * @returns one SQL statement
 */
function buildInsert(
  request: MigrationRequest,
  slug: string,
  language: string,
  draftText: { title: string; bodyMarkdown: string },
): string {
  return [
    'insert into public.legal_document_versions (',
    '  document_id, version_label, language, title, body_markdown, is_material, is_lawyer_reviewed,',
    '  published_at',
    ')',
    'select',
    `  legal_documents.id, '${request.versionLabel}', '${language}', ${quoteForSql(draftText.title)},`,
    `  ${quoteForSql(draftText.bodyMarkdown)},`,
    `  ${String(request.isMaterial)}, false, '${request.publishedAt}'`,
    `from public.legal_documents where legal_documents.slug = '${slug}';`,
  ].join('\n');
}

/**
 * Builds the whole migration from the drafts on disk.
 *
 * @param request - the version being stored
 * @param contentFolder - the content/legal folder
 * @returns the SQL file's text
 * Errors: throws for an unknown document, a missing draft or a mark that can't be placed.
 */
export function buildLegalMigration(request: MigrationRequest, contentFolder: string): string {
  const marksFile = JSON.parse(
    readFileSync(`${contentFolder}/after-the-invited-test.json`, 'utf8'),
  ) as AfterTheTestFile;
  const statements: string[] = [];
  // One insert per document and language that has a draft; English must always exist.
  for (const slug of request.documentSlugs) {
    const fileName = legalDraftFiles[slug];
    if (fileName === undefined) throw new Error(`Unknown legal document "${slug}".`);
    for (const [language, folder] of Object.entries(languageFolders)) {
      const draftPath = `${contentFolder}/${folder}${fileName}`;
      if (!existsSync(draftPath) && language !== 'en') continue;
      const prepared = prepareLegalText(
        readFileSync(draftPath, 'utf8'),
        marksFor(marksFile, slug, language),
      );
      statements.push(buildInsert(request, slug, language, prepared));
    }
  }
  return `${migrationHeader(request)}\n${statements.join('\n\n')}\n`;
}

/**
 * The comment at the top of the migration, so a reader knows where it came from.
 *
 * @param request - the version being stored
 * @returns SQL comment lines
 */
function migrationHeader(request: MigrationRequest): string {
  return [
    `-- Legal documents, version ${request.versionLabel}: ${request.documentSlugs.join(', ')} (story S1-E14-01).`,
    '-- Generated by scripts/build-legal-migration.ts from content/legal/ (English) and',
    '-- content/legal/ro/ (Romanian). Do not edit by hand: change the drafts and make a new version.',
    '-- Brand values are stored as {{tokens}} that the Legal centre fills in from src/config/brand.ts;',
    '-- {{afterTheInvitedTest}} marks lines that start only after the invited March test.',
    `-- Important change (everyone accepts again before posting): ${String(request.isMaterial)}.`,
    '-- Drafts, not checked by a lawyer yet (is_lawyer_reviewed = false).',
    '',
  ].join('\n');
}

/** Reads the command line, builds the migration and writes it. */
function main(): void {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      'published-at': { type: 'string' },
      material: { type: 'boolean', default: false },
      documents: { type: 'string' },
      output: { type: 'string' },
    },
  });
  if (!values.version || !values['published-at'] || !values.documents || !values.output) {
    throw new Error('Give --version, --published-at, --documents and --output (see the header).');
  }
  const request: MigrationRequest = {
    versionLabel: values.version,
    publishedAt: values['published-at'],
    isMaterial: values.material,
    documentSlugs: values.documents.split(','),
  };
  const contentFolder = fileURLToPath(new URL('../content/legal', import.meta.url));
  writeFileSync(values.output, buildLegalMigration(request, contentFolder));
  console.log(`Wrote ${values.output}.`);
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
