/**
 * The chapter draft's rules, shared by the editor and the autosave (story S1-E3-02a; CLAUDE.md
 * rule 8; ADR 0005). The database checks the same rules again in save_chapter_draft() and
 * check_chapter_text() (supabase/migrations/…_s1_e3_02a_chapters.sql).
 *
 * Who uses it: useAutosave() checks the title and body before each save; the chapter editor's
 * converters (src/features/writing/lib/chapterMarkdown.ts) have already dropped every node
 * outside the allow-list, so this is the last net: no HTML tag, no script link, not too long,
 * and ş/ţ corrected (rule 4).
 */
import { z } from 'zod';

import { normaliseRomanianLetters } from '@/lib/romanian-text';

/** The chapter title's limit (the database constraint). */
export const MAXIMUM_CHAPTER_TITLE_LENGTH = 120;

/** The body's limit in characters (the setting chapter_max_characters; proposal 100,000). */
export const MAXIMUM_CHAPTER_CHARACTERS = 100_000;

/** A "<letter", "</", "<!" or "<?": the start of an HTML tag. A bare "<" between words is fine. */
const htmlTagPattern = /<[a-zA-Z/!?]/;

/** A javascript:, data: or vbscript: address anywhere in the text. */
const scriptLinkPattern = /(javascript|data|vbscript)\s*:/i;

/**
 * The body without its backslash-escaped pairs ("\\<" is a literal "<", "\\\\" a literal backslash),
 * so a tag check sees only the characters Markdown would really read as HTML.
 *
 * @param body - the Markdown
 * @returns the body with every "\\x" pair removed
 */
function withoutEscapes(body: string): string {
  return body.replace(/\\./g, '');
}

/** The draft as the autosave sends it. */
export const chapterDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .transform(normaliseRomanianLetters)
    .pipe(z.string().max(MAXIMUM_CHAPTER_TITLE_LENGTH, 'errors.titleTooLong')),
  body: z
    .string()
    .transform(normaliseRomanianLetters)
    .pipe(
      z
        .string()
        .max(MAXIMUM_CHAPTER_CHARACTERS, 'errors.bodyTooLong')
        .refine((body) => !htmlTagPattern.test(withoutEscapes(body)), 'errors.htmlNotAllowed')
        .refine((body) => !scriptLinkPattern.test(body), 'errors.linkNotAllowed'),
    ),
  /** The draft_version the editor loaded or last saved; a stale one is a conflict. */
  expectedVersion: z.number().int().min(1),
});

/** The checked draft. */
export type ChapterDraftInput = z.infer<typeof chapterDraftSchema>;
