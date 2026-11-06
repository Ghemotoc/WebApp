/**
 * Builds the demo content top-up (Lane B, "Staging top-up: demo content", decided 23 Oct 2026).
 *
 * The demo needs 30 to 40 real-looking stories. They are written as Markdown files in
 * content/demo-stories/ (synthetic, never real people's work) and, once their texts arrive, the
 * public-domain classics in content/classics/texts/. This script reads those files, checks every
 * rule (lengths, ratings, ș and ț, no HTML) and writes one SQL file,
 * supabase/staging-topups/demo-content-2a.sql, that a person pastes into staging's SQL editor.
 *
 * Who runs it: `npm run demo:build`, after any story file changes; the SQL file is committed, so
 * staging never needs Node. Exit code 1 and a plain list of problems when a file breaks a rule.
 * It also writes the same top-up as numbered parts under 500 KB each, for the Supabase SQL
 * Editor, which refuses the single file (scripts/demo-content-parts.ts; CTO, 24 Oct 2026).
 * What it writes: accounts for the new synthetic writers and the classics account (the one
 * exception to "top-ups never create accounts", Robert, 23 Oct 2026), the stories with their tags,
 * and their chapters already published. Everything has a fixed id, so the file is safe to run
 * twice. It never runs in production: the SQL refuses a database without the 16 seed personas.
 * Where things go next: supabase/staging-topups/README.md ("Top-ups") and docs/code-tour.md.
 * Tests: scripts/build-demo-content.test.ts.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { splitIntoParts, writeParts, type TopUpPieces } from './demo-content-parts';

/** Where the story files live and where the SQL goes. */
export const demoStoriesFolder = fileURLToPath(new URL('../content/demo-stories', import.meta.url));
export const classicsTextsFolder = fileURLToPath(
  new URL('../content/classics/texts', import.meta.url),
);
export const topUpPath = fileURLToPath(
  new URL('../supabase/staging-topups/demo-content-2a.sql', import.meta.url),
);
/** The classics' real authors on their own, for staging after part 2a (S1-E5-06). */
export const classicAuthorsPath = fileURLToPath(
  new URL('../supabase/staging-topups/classic-authors.sql', import.meta.url),
);
/** Only the drawn covers, for staging after part 2a (bundle LOOK-1). */
export const coversPath = fileURLToPath(
  new URL('../supabase/staging-topups/look-1-covers.sql', import.meta.url),
);
/** The same top-up in parts the SQL Editor accepts (scripts/demo-content-parts.ts). */
export const topUpPartsFolder = fileURLToPath(
  new URL('../supabase/staging-topups/demo-content-2a', import.meta.url),
);

/** The writers a story may name: seed personas (fixed ids from supabase/seed.sql) and the new ones. */
export interface DemoWriter {
  userId: string;
  /** null for personas that chose a handle only. */
  penName: string | null;
  /** Years old by year of birth, as seed.sql counts them. */
  yearsOld: number;
  /** Created by the top-up (true) or already on every database (false). */
  isNew: boolean;
}

/** The classics account's handle; its pen name and handle are read from settings at run time. */
export const classicsHandle = 'clasice';
export const classicsPenName = 'Clasice';
const classicsUserId = '00000000-0000-4000-8000-000000000100';

export const demoWriters: Record<string, DemoWriter> = {
  adult_writer: {
    userId: '00000000-0000-4000-8000-000000000001',
    penName: 'Lia Scrie',
    yearsOld: 30,
    isNew: false,
  },
  teen_17: {
    userId: '00000000-0000-4000-8000-000000000002',
    penName: null,
    yearsOld: 18,
    isNew: false,
  },
  teacher: {
    userId: '00000000-0000-4000-8000-000000000007',
    penName: null,
    yearsOld: 40,
    isNew: false,
  },
  blocker: {
    userId: '00000000-0000-4000-8000-000000000015',
    penName: null,
    yearsOld: 30,
    isNew: false,
  },
  blocked: {
    userId: '00000000-0000-4000-8000-000000000016',
    penName: null,
    yearsOld: 17,
    isNew: false,
  },
  ana_cu_harti: {
    userId: '00000000-0000-4000-8000-000000000101',
    penName: 'Ana cu Hărți',
    yearsOld: 34,
    isNew: true,
  },
  tudor_farasomn: {
    userId: '00000000-0000-4000-8000-000000000102',
    penName: 'Tudor Fărăsomn',
    yearsOld: 41,
    isNew: true,
  },
  ilinca_noaptea: {
    userId: '00000000-0000-4000-8000-000000000103',
    penName: 'Ilinca Noaptea',
    yearsOld: 27,
    isNew: true,
  },
  radu_din_deal: {
    userId: '00000000-0000-4000-8000-000000000104',
    penName: 'Radu din Deal',
    yearsOld: 52,
    isNew: true,
  },
  sofia_cerneala: {
    userId: '00000000-0000-4000-8000-000000000105',
    penName: 'Sofia Cerneală',
    yearsOld: 23,
    isNew: true,
  },
  [classicsHandle]: { userId: classicsUserId, penName: classicsPenName, yearsOld: 35, isNew: true },
};

/** The file's friendly category names → the database slugs (S1-E3-01 seeds these three). */
const categorySlugs: Record<string, string> = {
  fiction: 'fiction',
  poetry: 'poetry',
  nonfiction: 'nonfiction_essays',
};

/** The 16 approved drawn designs and the 9-colour palette (S1-E3-01). */
const coverDesigns = [
  'plum',
  'ink',
  'violet',
  'gold',
  'lilac',
  'blush',
  'sky',
  'sage',
  'paper',
  'stripes',
  'dots',
  'grid',
  'waves',
  'starry',
  'doodles',
  'twotone',
];
const coverPalette = ['plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper'];

/** No 18+ in the demo (Robert, 23 Oct 2026). */
const ratings = ['all_ages', '13_plus', '16_plus'];

/** Word limits per chapter (content/demo-stories/README.md). */
const wordLimits = {
  prose: { minimum: 300, maximum: 600 },
  poetry: { minimum: 120, maximum: 360 },
};

/** A drawn or automatic cover, as the stories table stores it. */
export type DemoCover =
  { kind: 'automatic' } | { kind: 'drawn'; design: string; background: string; accent: string };

/** One chapter as written. */
export interface DemoChapter {
  title: string;
  body: string;
  wordCount: number;
}

/** One story file, parsed. */
export interface DemoStory {
  /** From the file, for example "demo-07" or "classic-capra-cu-trei-iezi". */
  id: string;
  /** From the file name ("demo-07.md" is 7; see fileNumber()); drives the fixed ids and dates. */
  number: number;
  title: string;
  writer: string;
  language: string;
  category: string;
  rating: string;
  tags: string[];
  cover: DemoCover;
  blurb: string;
  /** One of the five Robert reads whole. */
  isSample: boolean;
  /** Classics only. */
  author?: string;
  authorDied?: number;
  sourceEdition?: number;
  /** The year the work was first published anywhere; blank when it couldn't be confirmed. */
  firstPublished?: number;
  /** Classics from Wikisource: the attribution CC BY-SA asks for (link and licence). */
  sourceNote?: string;
  chapters: DemoChapter[];
}

/**
 * Counts words the way the database's count_words() does: runs of letters, digits or
 * apostrophes, Markdown marks ignored. Used for the limits and for the stored word_count.
 *
 * @param body - the chapter body
 * @returns the number of words
 */
export function countWords(body: string): number {
  const words = body.replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
  return words === '' ? 0 : words.split(/\s+/).length;
}

/**
 * Reads the "key: value" lines between the two --- lines at the top of a file.
 *
 * @param markdown - the whole file
 * @returns the front matter as a map and the text after it
 * Errors: throws when the file has no front matter.
 */
export function splitFrontMatter(markdown: string): { fields: Map<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(markdown.trimStart());
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new Error('the file must start with a --- front matter block ---');
  }
  const fields = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    fields.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  return { fields, body: match[2] };
}

/**
 * Cuts the text after the front matter into chapters at each "## " heading.
 *
 * @param body - the text after the front matter
 * @returns the chapters in order
 * Errors: throws when text sits before the first heading or a chapter is empty.
 */
export function splitChapters(body: string): DemoChapter[] {
  const parts = body.split(/^## /m);
  const preamble = parts.shift() ?? '';
  if (preamble.trim() !== '') throw new Error('text before the first "## " chapter heading');
  if (parts.length === 0) throw new Error('no "## " chapter heading');
  return parts.map((part) => {
    const newline = part.indexOf('\n');
    const title = (newline === -1 ? part : part.slice(0, newline)).trim();
    const chapterBody = (newline === -1 ? '' : part.slice(newline + 1)).trim();
    if (chapterBody === '') throw new Error(`chapter "${title}" is empty`);
    return { title, body: chapterBody, wordCount: countWords(chapterBody) };
  });
}

/**
 * Reads the cover field: "automatic" or "drawn:<design>/<background>/<accent>".
 *
 * @param value - the front matter value
 * @returns the cover
 * Errors: throws for an unknown design, a colour outside the palette or the same two colours.
 */
export function parseCover(value: string): DemoCover {
  if (value === 'automatic') return { kind: 'automatic' };
  const match = /^drawn:([a-z]+)\/([a-z]+)\/([a-z]+)$/.exec(value);
  if (
    match === null ||
    match[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new Error(
      `cover "${value}" must be "automatic" or "drawn:<design>/<background>/<accent>"`,
    );
  }
  const [, design, background, accent] = match;
  if (!coverDesigns.includes(design)) throw new Error(`cover design "${design}" is not approved`);
  if (!coverPalette.includes(background) || !coverPalette.includes(accent)) {
    throw new Error(`cover colours "${background}/${accent}" are not in the palette`);
  }
  if (background === accent) throw new Error('a cover needs two different colours');
  return { kind: 'drawn', design, background, accent };
}

/**
 * Reads one field that must be present.
 *
 * @param fields - the front matter
 * @param name - the field
 * @returns its value
 * Errors: throws when it is missing or empty.
 */
function requiredField(fields: Map<string, string>, name: string): string {
  const value = fields.get(name);
  if (value === undefined || value === '') throw new Error(`front matter needs "${name}"`);
  return value;
}

/**
 * Turns one file into a DemoStory. Shape problems throw here; content rules are checked by
 * storyProblems(), so a file can report several problems at once.
 *
 * @param markdown - the file's contents
 * @param number - the file's position in its folder, 1-based
 * @returns the story
 */
export function parseStory(markdown: string, number: number): DemoStory {
  const { fields, body } = splitFrontMatter(markdown);
  const story: DemoStory = {
    id: requiredField(fields, 'id'),
    number,
    title: requiredField(fields, 'title'),
    writer: requiredField(fields, 'writer'),
    language: requiredField(fields, 'language'),
    category: requiredField(fields, 'category'),
    rating: requiredField(fields, 'rating'),
    tags: requiredField(fields, 'tags')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ''),
    cover: parseCover(requiredField(fields, 'cover')),
    blurb: requiredField(fields, 'blurb'),
    isSample: fields.get('sample') === 'yes',
    chapters: splitChapters(body),
  };
  // Classics carry their author and source; demo stories don't.
  if (fields.has('author')) {
    story.author = fields.get('author');
    story.authorDied = Number(fields.get('author_died'));
    // A blank year means the source names none and it could not be confirmed (CTO, 24 Oct 2026:
    // leave it blank rather than guess).
    const edition = fields.get('source_edition') ?? '';
    story.sourceEdition = edition === '' ? undefined : Number(edition);
    // The story page's "First published" row (Robert, 6 Nov 2026). Blank rather than a guess,
    // like the edition year: the row is then left out.
    const firstPublished = fields.get('first_published') ?? '';
    story.firstPublished = firstPublished === '' ? undefined : Number(firstPublished);
    story.sourceNote = fields.get('source_note');
  }
  return story;
}

/**
 * Lists everything in a story that breaks a rule from content/demo-stories/README.md.
 *
 * @param story - a parsed story
 * @returns one plain line per problem (empty when the story is fine)
 */
export function storyProblems(story: DemoStory): string[] {
  const problems: string[] = [];
  if (story.title.length > 120) problems.push('the title has more than 120 characters');
  if (storedBlurb(story).length > 500) {
    problems.push("the blurb (with a classic's credit line) has more than 500 characters");
  }
  if (!(story.writer in demoWriters)) problems.push(`unknown writer "${story.writer}"`);
  if (!['ro', 'en'].includes(story.language))
    problems.push(`language must be ro or en, not "${story.language}"`);
  if (!(story.category in categorySlugs)) problems.push(`unknown category "${story.category}"`);
  if (!ratings.includes(story.rating))
    problems.push(`rating must be all_ages, 13_plus or 16_plus, not "${story.rating}"`);
  problems.push(...tagProblems(story.tags));
  problems.push(...chapterProblems(story));
  problems.push(...textProblems(story));
  problems.push(...classicProblems(story));
  return problems;
}

/**
 * Tag rules: 2 to 6 tags, each at most 40 characters, lower case.
 *
 * @param tags - the story's tags
 * @returns the problems
 */
function tagProblems(tags: string[]): string[] {
  const problems: string[] = [];
  if (tags.length < 2 || tags.length > 6)
    problems.push(`${tags.length} tags; a story needs 2 to 6`);
  for (const tag of tags) {
    if (tag.length > 40) problems.push(`tag "${tag}" has more than 40 characters`);
    if (tag !== tag.toLowerCase()) problems.push(`tag "${tag}" should be lower case`);
  }
  return problems;
}

/**
 * Chapter rules: 2 to 4 chapters (a classic may have more), each inside its word limits.
 *
 * @param story - the story
 * @returns the problems
 */
function chapterProblems(story: DemoStory): string[] {
  const problems: string[] = [];
  const isClassic = story.author !== undefined;
  if (!isClassic && (story.chapters.length < 2 || story.chapters.length > 4)) {
    problems.push(`${story.chapters.length} chapters; a demo story needs 2 to 4`);
  }
  const limits = story.category === 'poetry' ? wordLimits.poetry : wordLimits.prose;
  for (const chapter of story.chapters) {
    if (chapter.title.length > 120)
      problems.push(`chapter "${chapter.title}" title over 120 characters`);
    // Classics keep the author's lengths; only our own writing has word limits.
    if (isClassic) continue;
    if (chapter.wordCount < limits.minimum || chapter.wordCount > limits.maximum) {
      problems.push(
        `chapter "${chapter.title}" has ${chapter.wordCount} words; ${limits.minimum} to ${limits.maximum} expected`,
      );
    }
  }
  return problems;
}

/**
 * The rules only a public-domain classic has (S1-E5-06): the author died long enough ago, the
 * edition year is given, and the text names no Gutenberg (decided 23 Oct 2026: the licence
 * header is stripped, so the name may not be used).
 *
 * @param story - the story
 * @returns the problems (none for a demo story)
 */
function classicProblems(story: DemoStory): string[] {
  if (story.author === undefined) return [];
  const problems: string[] = [];
  // Law 8/1996 art. 28(1) and 34: life plus 70 years from 1 January after death, so in 2026
  // authors who died in 1955 or earlier (S1-E5-06).
  const lastFreeDeathYear = new Date().getFullYear() - 71;
  if (!Number.isInteger(story.authorDied) || (story.authorDied ?? 0) > lastFreeDeathYear) {
    problems.push(`author_died must be ${lastFreeDeathYear} or earlier to be public domain`);
  }
  problems.push(...editionProblems(story));
  problems.push(...firstPublishedProblems(story));
  const allText = [story.blurb, ...story.chapters.map((chapter) => chapter.body)].join('\n');
  if (/gutenberg/i.test(allText)) problems.push('names Gutenberg; strip its licence and name');
  return problems;
}

/**
 * The first publication year's rule (6 Nov 2026): blank, or a year no later than the edition the
 * text was taken from, since a work can't be reprinted before it first came out.
 *
 * @param story - a classic
 * @returns the problems
 */
function firstPublishedProblems(story: DemoStory): string[] {
  if (story.firstPublished === undefined) return [];
  if (!Number.isInteger(story.firstPublished) || story.firstPublished < 1500) {
    return ['first_published must be the year the work first came out, or blank'];
  }
  if (story.sourceEdition !== undefined && story.firstPublished > story.sourceEdition) {
    return ['first_published can’t be later than source_edition'];
  }
  return [];
}

/**
 * The edition year's rule: a year when given; left blank only when the source names none, and
 * then only for a Wikisource text, whose credit line still carries its link and licence. A
 * Gutenberg text's credit is the year alone, so it must have one (decided 23 and 24 Oct 2026).
 *
 * @param story - a classic
 * @returns the problems
 */
function editionProblems(story: DemoStory): string[] {
  if (story.sourceEdition === undefined) {
    return story.sourceNote === undefined
      ? [
          'source_edition is blank; only a Wikisource text (with its source_note) may leave it blank',
        ]
      : [];
  }
  if (!Number.isInteger(story.sourceEdition) || story.sourceEdition < 1500) {
    return ['source_edition must be the year of the edition the text was taken from, or blank'];
  }
  return [];
}

/**
 * The blurb as stored. A classic gets its credit line under the blurb: the source edition year
 * when known and, for a Wikisource text, the link and licence CC BY-SA asks for (decided 23 and
 * 24 Oct 2026).
 *
 * @param story - the story
 * @returns the text for stories.blurb
 */
export function storedBlurb(story: DemoStory): string {
  if (story.author === undefined) return story.blurb;
  const parts: string[] = [];
  // The year only when it is known; a blank year is left out, never guessed.
  if (story.sourceEdition !== undefined) {
    parts.push(
      story.language === 'ro'
        ? `Ediția sursă: ${story.sourceEdition}.`
        : `Source edition: ${story.sourceEdition}.`,
    );
  }
  if (story.sourceNote !== undefined) parts.push(story.sourceNote);
  return `${story.blurb}\n\n${parts.join(' ')}`;
}

/**
 * Text rules shared with the database: comma-below ș and ț only (CLAUDE.md rule 4), no HTML
 * tags and no script links (rule 8), and nothing that would end the SQL quoting.
 *
 * @param story - the story
 * @returns the problems
 */
function textProblems(story: DemoStory): string[] {
  const problems: string[] = [];
  const allText = [
    story.title,
    story.blurb,
    ...story.chapters.flatMap((chapter) => [chapter.title, chapter.body]),
  ].join('\n');
  if (/[şţŞŢ]/.test(allText))
    problems.push('uses ş or ţ with a cedilla; write ș and ț with a comma below');
  if (/<[a-zA-Z/!?]/.test(allText.replace(/\\./g, ''))) problems.push('contains an HTML tag');
  if (/(javascript|data|vbscript)\s*:/i.test(allText)) problems.push('contains a script link');
  if (allText.includes('$demo$'))
    problems.push('contains the text "$demo$", which the SQL quoting uses');
  return problems;
}

/**
 * Makes the story's web address from its title plus its id, for example
 * "harta-orasului-care-nu-exista-demo-07" (stories_slug_shape: lower-case letters, digits, dashes).
 *
 * @param story - the story
 * @returns the slug, at most 80 characters
 */
export function storySlug(story: DemoStory): string {
  const plainTitle = story.title
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  // Demo stories end in their id ("-demo-07"); classics in "-classic".
  const suffix = story.author === undefined ? story.id.replace(/[^a-z0-9]+/g, '-') : 'classic';
  return `${plainTitle.slice(0, 80 - suffix.length - 1).replace(/-$/, '')}-${suffix}`;
}

/**
 * Fixed ids so a second run finds every row already there. Demo stories use the 9100 block,
 * classics the 9300 block; chapters hang off the story's number.
 *
 * @param story - the story
 * @param chapterPosition - 0 for the story itself, else the 1-based chapter position
 * @returns a uuid
 */
export function fixedId(story: DemoStory, chapterPosition = 0): string {
  const block = story.author === undefined ? '9100' : '9300';
  const storyPart = String(story.number).padStart(4, '0');
  const chapterPart = String(chapterPosition).padStart(4, '0');
  return `00000000-0000-4000-${block}-${storyPart}${chapterPart}0000`;
}

/**
 * Quotes a text for SQL with dollar quoting, so apostrophes and quotes in the writing need no
 * escaping. storyProblems() refuses a text that contains the tag.
 *
 * @param text - any text
 * @returns the quoted literal
 */
function sqlText(text: string): string {
  return `$demo$${text}$demo$`;
}

/**
 * Quotes a short value with single quotes (ids, slugs, enum values, tags).
 *
 * @param value - the value
 * @returns the quoted literal
 */
function sqlValue(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * How many days ago a story was first published: spread over the last three months from the
 * story's number, so Discover's "newest" order has something to show.
 *
 * @param story - the story
 * @returns days, 1 to 90
 */
function daysAgo(story: DemoStory): number {
  return ((story.number * 37) % 90) + 1;
}

/**
 * One row of the writers list in the accounts SQL: id, handle, pen name, years old.
 * The classics account reads its names from settings, so renaming it is a settings change.
 *
 * @param handle - the writer's handle
 * @param writer - the writer
 * @returns one "(…)" row
 */
function writerRowSql(handle: string, writer: DemoWriter): string {
  let handleSql = sqlValue(handle);
  let penNameSql = writer.penName === null ? 'null' : sqlValue(writer.penName);
  if (handle === classicsHandle) {
    handleSql = `coalesce(public.setting_value('classics_account_handle') #>> '{}', ${sqlValue(handle)})`;
    penNameSql = `coalesce(public.setting_value('classics_account_pen_name') #>> '{}', ${sqlValue(writer.penName ?? '')})`;
  }
  return `      (${sqlValue(writer.userId)}::uuid, ${handleSql}, ${penNameSql}, ${writer.yearsOld})`;
}

/**
 * Step 1 of every run, the whole file and each part alike: refuse any database without the 16
 * seed personas, so the top-up can never run in production (supabase/staging-topups/README.md).
 */
export const guardSql = `-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;
`;

/** The check the whole run ends with: what was added, to compare with the header's numbers. */
export const checkQuerySql = `select json_build_object(
  'demo_stories', (select count(*) from public.stories where slug like '%-demo-__'),
  'demo_chapters', (select count(*) from public.chapters where code like 'd___c___'),
  'classic_chapters', (select count(*) from public.chapters where code like 'k___c___'),
  'classics', (select count(*) from public.stories where slug like '%-classic'),
  'demo_writers', (select count(*) from public.profiles where id::text like '00000000-0000-4000-8000-0000000001__')
)::text as after_top_up;
`;

/**
 * The classics account's two settings (its handle and pen name; names are settings, not code).
 *
 * @returns SQL, ending with a newline
 */
export function settingsSql(): string {
  return `-- The classics account's names are settings, not code (CLAUDE.md): change them here, not below.
insert into public.settings (key, value, is_public, description) values
  ('classics_account_handle', ${sqlValue(JSON.stringify(classicsHandle))}::jsonb, true,
   'Handle of the official account that publishes public-domain classics (S1-E5-06, S1-E11-16; demo top-up 23 Oct 2026).'),
  ('classics_account_pen_name', ${sqlValue(JSON.stringify(classicsPenName))}::jsonb, true,
   'Pen name of the official classics account.')
on conflict (key) do nothing;
`;
}

/** The SQL that creates the new writers' accounts, the same way supabase/seed.sql does. */
export function accountsSql(): string {
  const rows = Object.entries(demoWriters)
    .filter(([, writer]) => writer.isNew)
    .map(([handle, writer]) => writerRowSql(handle, writer))
    .join(',\n');

  return `-- 2. The new synthetic writers and the classics account, created exactly as supabase/seed.sql
--    creates the personas (auth user, email identity, profile, consents). The one exception to
--    "top-ups never create accounts" (Robert, 23 Oct 2026, for this top-up only). An account
--    that already exists is skipped, so the file is safe to run twice.
do $$
declare
  current_year integer := extract(year from (now() at time zone 'Europe/Bucharest'))::integer;
  shared_password text := 'Persona-Test-2026!';
  writer record;
begin
  for writer in
    select * from (values
${rows}
    ) as writers (user_id, handle, pen_name, years_old)
  loop
    if exists (select 1 from auth.users where users.id = writer.user_id) then
      continue;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', writer.user_id, 'authenticated', 'authenticated',
      writer.handle || '@personas.test',
      extensions.crypt(shared_password, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"], "seed_persona": true}', '{}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (
      writer.user_id::text, writer.user_id,
      jsonb_build_object('sub', writer.user_id::text, 'email', writer.handle || '@personas.test', 'email_verified', true),
      'email', now(), now()
    );
    -- Adults with a passed check, like adult_writer, so the account gate lets them publish.
    insert into public.profiles (id, birth_year, age_check_result, age_checked_at, age_check_method, handle, pen_name)
    values (writer.user_id, current_year - writer.years_old, '18_or_over', now(), 'facial_estimation', writer.handle, writer.pen_name);
    insert into public.consents (user_id, legal_document_version_id, method)
    select writer.user_id, versions.id, 'sign_up'
    from public.legal_document_versions as versions
    join public.legal_documents as documents on documents.id = versions.document_id
    where documents.needs_acceptance and versions.version_label = '0.1' and versions.language = 'en';
  end loop;
end;
$$;
`;
}

/**
 * The SQL for one story: its row and tags, then its chapters.
 *
 * @param story - the story
 * @returns SQL
 */
function storySql(story: DemoStory): string {
  return storyRowSql(story) + storyChapterSql(story).join('');
}

/**
 * The SQL for one chapter of each story, in order: one statement each. The split top-up packs
 * these one by one, so a long story's chapters may continue in the next part.
 *
 * @param story - the story
 * @returns one SQL statement per chapter
 */
export function storyChapterSql(story: DemoStory): string[] {
  return story.chapters.map((chapter, index) => chapterSql(story, chapter, index + 1));
}

/**
 * The SQL for one story's row (skipped when it exists) and its tags (replaced with the same).
 * It must run before the story's chapters, which point at it.
 *
 * @param story - the story
 * @returns SQL, ending with a newline
 */
export function storyRowSql(story: DemoStory): string {
  const writer = demoWriters[story.writer];
  if (writer === undefined) throw new Error(`unknown writer "${story.writer}"`);
  const lastChapterDaysAgo = Math.max(1, daysAgo(story) - 3 * (story.chapters.length - 1));
  const cover =
    story.cover.kind === 'automatic'
      ? `'automatic', null, null, null`
      : `'drawn', ${sqlValue(story.cover.design)}, ${sqlValue(story.cover.background)}, ${sqlValue(story.cover.accent)}`;
  const tags = story.tags.map(sqlValue).join(', ');

  return `-- ${story.id}: "${story.title.replace(/\n/g, ' ')}" by ${story.writer}${story.isSample ? ' (Robert reads this one)' : ''}
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id,
  cover_kind, cover_design, cover_background, cover_accent, rating, ai_disclosure,
  first_published_at, last_chapter_published_at, created_at)
select ${sqlValue(fixedId(story))}::uuid, ${sqlValue(writer.userId)}::uuid, ${sqlValue(storySlug(story))},
  ${sqlText(story.title)}, ${sqlText(storedBlurb(story))}, ${sqlValue(story.language)},
  (select id from public.categories where slug = ${sqlValue(categorySlugs[story.category] ?? story.category)}),
  ${cover}, ${sqlValue(story.rating)}, 'no_ai',
  now() - interval '${daysAgo(story)} days', now() - interval '${lastChapterDaysAgo} days', now() - interval '${daysAgo(story) + 2} days'
where not exists (select 1 from public.stories where stories.id = ${sqlValue(fixedId(story))}::uuid);
select public.set_story_tags(${sqlValue(fixedId(story))}::uuid, ${sqlValue(writer.userId)}::uuid, array[${tags}]);
${drawnCoverSql(story)}${classicAuthorSql(story)}`;
}

/**
 * The SQL that brings an existing story's drawn cover in line with its file (bundle LOOK-1,
 * 6 Nov 2026: the demo covers that were flat colours became patterned ones, so no card looks
 * empty). Empty for a story with an automatic cover. Safe to run twice: it changes a story only
 * while its stored cover differs from the file.
 *
 * @param story - the story
 * @returns SQL, ending with a newline, or ''
 */
export function drawnCoverSql(story: DemoStory): string {
  if (story.cover.kind === 'automatic') return '';
  const design = sqlValue(story.cover.design);
  const background = sqlValue(story.cover.background);
  const accent = sqlValue(story.cover.accent);
  return `update public.stories
set cover_kind = 'drawn', cover_design = ${design}, cover_background = ${background}, cover_accent = ${accent}
where stories.id = ${sqlValue(fixedId(story))}::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', ${design}, ${background}, ${accent});
`;
}

/**
 * The small top-up for a staging database that already has part 2a: only the drawn covers
 * (bundle LOOK-1), so nothing else has to run again.
 *
 * @param stories - the demo stories and the classics
 * @returns the SQL file's contents
 */
export function buildCoversSql(stories: DemoStory[]): string {
  const drawnCount = stories.filter((story) => story.cover.kind === 'drawn').length;
  return `-- Staging top-up: the demo stories' drawn covers (bundle LOOK-1; Robert, 6 Nov 2026, D3). GENERATED FILE.
--
-- Made by \`npm run demo:build\` from content/demo-stories and content/classics/texts; edit those
-- files, not this one. What it does: sets each of the ${drawnCount} drawn covers to what its file says,
-- so the demo stories that had a flat colour get a patterned design. Needs part 2a. Adds no
-- accounts and touches no story with an automatic cover.
-- Rules (supabase/staging-topups/README.md): safe to run twice; never production (step 1).
-- How to check it worked: the last query shows flat_drawn_covers 0.
begin;

${guardSql}
${stories.map(drawnCoverSql).join('')}commit;

select json_build_object(
  'flat_drawn_covers', (select count(*) from public.stories
    where cover_kind = 'drawn' and cover_design in ('plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper')
      and user_id in (select id from auth.users where email like '%@personas.test'))
)::text as after_look_1_covers;
`;
}

/**
 * The SQL that names a classic's real author (S1-E5-06; Robert, 25 Oct 2026: classics show
 * "the real writers"): adds the author once, then sets the story's classic_author_id. Since
 * 6 Nov 2026 it also marks the classic Completed (its author is dead, so no chapter will follow)
 * and sets the year it was first published. Empty for a demo story. Safe to run twice: the
 * author is unique by name, and each update only changes a story that still differs.
 *
 * @param story - the story
 * @returns SQL, ending with a newline, or ''
 */
export function classicAuthorSql(story: DemoStory): string {
  if (story.author === undefined) return '';
  const author = sqlText(story.author);
  const year = story.firstPublished === undefined ? 'null' : String(story.firstPublished);
  return `insert into public.classic_authors (name, died_year) values (${author}, ${story.authorDied})
on conflict (name) do nothing;
update public.stories
set classic_author_id = (select id from public.classic_authors where name = ${author})
where stories.id = ${sqlValue(fixedId(story))}::uuid
  and stories.classic_author_id is distinct from (select id from public.classic_authors where name = ${author});
update public.stories
set completion_status = 'completed', first_published_year = ${year}
where stories.id = ${sqlValue(fixedId(story))}::uuid
  and (stories.completion_status <> 'completed' or stories.first_published_year is distinct from ${year});
`;
}

/**
 * The small top-up for a staging database that already has part 2a: only the classics' real
 * authors (S1-E5-06, 25 Oct 2026), so nothing else has to run again.
 *
 * @param classics - the classics
 * @returns the SQL file's contents
 */
export function buildClassicAuthorsSql(classics: DemoStory[]): string {
  const authorCount = new Set(classics.map((story) => story.author)).size;
  const yearCount = classics.filter((story) => story.firstPublished !== undefined).length;
  return `-- Staging top-up: the classics' real authors, Completed status and first publication year
-- (S1-E5-06; Robert, 25 Oct and 6 Nov 2026). GENERATED FILE.
--
-- Made by \`npm run demo:build\` from content/classics/texts/*.md; edit those files, not this one.
-- What it does: adds the ${authorCount} real authors to classic_authors and names each of the ${classics.length}
-- classics' author, so every byline shows "Ion Creangă" and not the classics account; marks every
-- classic Completed; and sets the year each was first published (${yearCount} of ${classics.length}; the rest are
-- blank until confirmed). Needs the migrations 20261028130001_s1_e5_06_classic_authors.sql and
-- 20270202110001_fix_classics_year_and_status.sql, and part 2a. Adds no accounts.
-- Rules (supabase/staging-topups/README.md): safe to run twice; never production (step 1).
-- How to check it worked: the last query shows classics_with_author ${classics.length}, completed ${classics.length},
-- with_year ${yearCount}, authors ${authorCount}.
begin;

${guardSql}
${classics.map(classicAuthorSql).join('')}commit;

select json_build_object(
  'classics_with_author', (select count(*) from public.stories where slug like '%-classic' and classic_author_id is not null),
  'completed', (select count(*) from public.stories where slug like '%-classic' and completion_status = 'completed'),
  'with_year', (select count(*) from public.stories where slug like '%-classic' and first_published_year is not null),
  'authors', (select count(*) from public.classic_authors)
)::text as after_classic_authors;
`;
}

/**
 * The SQL for one chapter, already published: the draft and the published copy hold the same
 * text and word count, as publish_chapter() (S1-E3-03, chapter_publish_now()) leaves them. The
 * body goes through the database's own check_chapter_text() and count_words(), so the rules
 * can't drift from the app's.
 *
 * @param story - the chapter's story
 * @param chapter - the chapter
 * @param position - 1-based
 * @returns SQL
 */
function chapterSql(story: DemoStory, chapter: DemoChapter, position: number): string {
  const writer = demoWriters[story.writer];
  if (writer === undefined) throw new Error(`unknown writer "${story.writer}"`);
  const publishedDaysAgo = Math.max(1, daysAgo(story) - 3 * (position - 1));
  // An 8-character address of letters and digits, fixed from the story and position.
  // Demo chapters start with "d", classics with "k" (chapters.code is unique).
  const prefix = story.author === undefined ? 'd' : 'k';
  const code = `${prefix}${String(story.number).padStart(3, '0')}c${String(position).padStart(3, '0')}`;
  return `insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, draft_version,
  draft_saved_at, published_title, published_body, status, first_published_at, last_published_at, word_count,
  published_word_count, created_at)
select ${sqlValue(fixedId(story, position))}::uuid, ${sqlValue(fixedId(story))}::uuid, ${sqlValue(writer.userId)}::uuid,
  ${sqlValue(code)}, ${position}, ${sqlText(chapter.title)}, public.check_chapter_text(${sqlText(chapter.body)}), 1,
  now() - interval '${publishedDaysAgo} days', ${sqlText(chapter.title)}, public.check_chapter_text(${sqlText(chapter.body)}), 'published',
  now() - interval '${publishedDaysAgo} days', now() - interval '${publishedDaysAgo} days', public.count_words(${sqlText(chapter.body)}),
  public.count_words(${sqlText(chapter.body)}), now() - interval '${publishedDaysAgo + 1} days'
where not exists (select 1 from public.chapters where chapters.id = ${sqlValue(fixedId(story, position))}::uuid);
`;
}

/**
 * Puts the whole top-up together.
 *
 * @param demoStories - the synthetic stories, in file order
 * @param classics - the classics with texts (may be empty while the texts are missing)
 * @returns the SQL file's contents
 */
export function buildTopUpSql(demoStories: DemoStory[], classics: DemoStory[]): string {
  const samples = demoStories
    .filter((story) => story.isSample)
    .map((story) => `${story.id} "${story.title}"`);
  const header = `-- Staging top-up: demo content, part 2a (Lane B, decided 23 Oct 2026). GENERATED FILE.
--
-- Made by \`npm run demo:build\` from content/demo-stories/*.md and content/classics/texts/*.md;
-- edit those files, not this one. What it adds: the five synthetic writers and the classics
-- account (the one agreed exception to "top-ups never create accounts"), ${demoStories.length} synthetic
-- stories with ${demoStories.reduce((sum, story) => sum + story.chapters.length, 0)} published chapters, and ${classics.length} public-domain classics.
-- Synthetic text only, never real people's work or names. Robert reads every title and blurb
-- plus these whole stories: ${samples.join('; ')}.
-- Rules (supabase/staging-topups/README.md): safe to run twice (every row has a fixed id and is
-- skipped when it exists; tags are replaced with the same); never production (step 1 refuses a
-- database without the 16 seed personas). Merge after S1-E3-03 and S1-E3-06.
-- How to check it worked: the last query should show demo_stories ${demoStories.length}, demo_chapters
-- ${demoStories.reduce((sum, story) => sum + story.chapters.length, 0)}, classic_chapters ${classics.reduce((sum, story) => sum + story.chapters.length, 0)}, classics ${classics.length}, demo_writers ${Object.values(demoWriters).filter((writer) => writer.isNew).length}.
begin;

${guardSql}
${settingsSql()}
${accountsSql()}
-- 3. The synthetic stories, their tags and their chapters, already published.
${demoStories.map(storySql).join('\n')}
-- 4. The public-domain classics (empty until content/classics/texts/ has the texts).
${classics.map(storySql).join('\n')}
commit;

${checkQuerySql}`;
  return header;
}

/**
 * The top-up as pieces, for the split version (scripts/demo-content-parts.ts): the same
 * statements as buildTopUpSql(), in the same order, one story row or chapter at a time.
 *
 * @param demoStories - the synthetic stories, in file order
 * @param classics - the classics
 * @returns the guard, the opening (settings and accounts), the statements and the check query
 */
export function topUpPieces(demoStories: DemoStory[], classics: DemoStory[]): TopUpPieces {
  const statements = [...demoStories, ...classics].flatMap((story) => [
    // A blank line before each story keeps the parts readable, as in the single file.
    `\n${storyRowSql(story)}`,
    ...storyChapterSql(story),
  ]);
  return {
    guard: guardSql,
    opening: `${settingsSql()}\n${accountsSql()}`,
    statements,
    checkQuery: checkQuerySql,
  };
}

/**
 * The number that drives a story's fixed ids. Every file carries its own ("demo-07.md" is 7,
 * "classic-03-luceafarul.md" is 3), so adding or removing another file never changes an id that
 * staging already holds. A name without a number falls back to its place in the folder.
 *
 * @param fileName - for example "demo-07.md" or "classic-03-luceafarul.md"
 * @param index - the file's 0-based place in the folder
 * @returns the number, from 1
 */
export function fileNumber(fileName: string, index: number): number {
  const match = /^(?:demo|classic)-(\d+)[.-]/.exec(fileName);
  return match?.[1] === undefined ? index + 1 : Number(match[1]);
}

/**
 * Reads and parses every story file in a folder, in name order.
 *
 * @param folder - the folder
 * @param filePattern - which files count, for example /^demo-\d\d\.md$/
 * @returns the stories and the problems found, each problem starting with the file name
 */
export function readStories(
  folder: string,
  filePattern: RegExp,
): { stories: DemoStory[]; problems: string[] } {
  const stories: DemoStory[] = [];
  const problems: string[] = [];
  if (!existsSync(folder)) return { stories, problems };
  const fileNames = readdirSync(folder)
    .filter((name) => filePattern.test(name))
    .sort();
  fileNames.forEach((fileName, index) => {
    try {
      const story = parseStory(
        readFileSync(join(folder, fileName), 'utf8'),
        fileNumber(fileName, index),
      );
      problems.push(...storyProblems(story).map((problem) => `${fileName}: ${problem}`));
      stories.push(story);
    } catch (error) {
      problems.push(`${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return { stories, problems };
}

/**
 * Command-line entry: reads the files, refuses on any problem, writes the SQL.
 */
function main(): void {
  const demo = readStories(demoStoriesFolder, /^demo-\d\d\.md$/);
  const classics = readStories(classicsTextsFolder, /^classic-.*\.md$/);
  const problems = [...demo.problems, ...classics.problems];
  const sampleCount = demo.stories.filter((story) => story.isSample).length;
  if (demo.stories.length > 0 && sampleCount !== 5) {
    problems.push(`${sampleCount} stories are marked "sample: yes"; Robert reads exactly 5`);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error(`${problems.length} problem(s); the SQL file was not written.`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(topUpPath, buildTopUpSql(demo.stories, classics.stories));
  // Only the classics' authors, for a staging database that already ran part 2a (S1-E5-06).
  writeFileSync(classicAuthorsPath, buildClassicAuthorsSql(classics.stories));
  // Only the drawn covers, for a staging database that already ran part 2a (LOOK-1).
  writeFileSync(coversPath, buildCoversSql([...demo.stories, ...classics.stories]));
  // The same top-up in parts under 500 KB, for the SQL Editor (CTO, 24 Oct 2026).
  const parts = splitIntoParts(topUpPieces(demo.stories, classics.stories));
  writeParts(topUpPartsFolder, parts);
  console.log(
    `Wrote ${topUpPath}: ${demo.stories.length} demo stories, ${classics.stories.length} classics; ` +
      `and the same in ${parts.length} parts in ${topUpPartsFolder}.`,
  );
}

// Run only when started from the command line, not when a test imports the functions.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
