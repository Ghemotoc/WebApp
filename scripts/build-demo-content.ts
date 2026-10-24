/**
 * Builds the demo content top-up (Lane B, "Staging top-up: demo content", decided 23 Oct 2026).
 *
 * The investor demo needs 30 to 40 real-looking stories. They are written as Markdown files in
 * content/demo-stories/ (synthetic, never real people's work) and, once their texts arrive, the
 * public-domain classics in content/classics/texts/. This script reads those files, checks every
 * rule (lengths, ratings, ș and ț, no HTML) and writes one SQL file,
 * supabase/staging-topups/demo-content-2a.sql, that a person pastes into staging's SQL editor.
 *
 * Who runs it: `npm run demo:build`, after any story file changes; the SQL file is committed, so
 * staging never needs Node. Exit code 1 and a plain list of problems when a file breaks a rule.
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

/** Where the story files live and where the SQL goes. */
export const demoStoriesFolder = fileURLToPath(new URL('../content/demo-stories', import.meta.url));
export const classicsTextsFolder = fileURLToPath(
  new URL('../content/classics/texts', import.meta.url),
);
export const topUpPath = fileURLToPath(
  new URL('../supabase/staging-topups/demo-content-2a.sql', import.meta.url),
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
  /** The file's position in its folder, 1-based; drives the fixed ids and the dates. */
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
    story.sourceEdition = Number(fields.get('source_edition'));
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
  if (story.blurb.length > 500) problems.push('the blurb has more than 500 characters');
  if (!(story.writer in demoWriters)) problems.push(`unknown writer "${story.writer}"`);
  if (!['ro', 'en'].includes(story.language))
    problems.push(`language must be ro or en, not "${story.language}"`);
  if (!(story.category in categorySlugs)) problems.push(`unknown category "${story.category}"`);
  if (!ratings.includes(story.rating))
    problems.push(`rating must be all_ages, 13_plus or 16_plus, not "${story.rating}"`);
  problems.push(...tagProblems(story.tags));
  problems.push(...chapterProblems(story));
  problems.push(...textProblems(story));
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
  const suffix = story.id.replace(/[^a-z0-9]+/g, '-');
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

/** The SQL that creates the new writers' accounts, the same way supabase/seed.sql does. */
function accountsSql(): string {
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
 * The SQL for one story: the row (skipped when it exists) and its tags (replaced with the same).
 *
 * @param story - the story
 * @returns SQL
 */
function storySql(story: DemoStory): string {
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
  ${sqlText(story.title)}, ${sqlText(story.blurb)}, ${sqlValue(story.language)},
  (select id from public.categories where slug = ${sqlValue(categorySlugs[story.category] ?? story.category)}),
  ${cover}, ${sqlValue(story.rating)}, 'no_ai',
  now() - interval '${daysAgo(story)} days', now() - interval '${lastChapterDaysAgo} days', now() - interval '${daysAgo(story) + 2} days'
where not exists (select 1 from public.stories where stories.id = ${sqlValue(fixedId(story))}::uuid);
select public.set_story_tags(${sqlValue(fixedId(story))}::uuid, ${sqlValue(writer.userId)}::uuid, array[${tags}]);
${story.chapters.map((chapter, index) => chapterSql(story, chapter, index + 1)).join('')}`;
}

/**
 * The SQL for one chapter, already published: the draft and the published copy hold the same
 * text, as publish_chapter() (S1-E3-03) will leave them. The body goes through the database's
 * own check_chapter_text() and count_words(), so the rules can't drift from the app's.
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
  const code = `d${String(story.number).padStart(3, '0')}c${String(position).padStart(3, '0')}`;
  return `insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, draft_version,
  draft_saved_at, published_title, published_body, status, first_published_at, last_published_at, word_count, created_at)
select ${sqlValue(fixedId(story, position))}::uuid, ${sqlValue(fixedId(story))}::uuid, ${sqlValue(writer.userId)}::uuid,
  ${sqlValue(code)}, ${position}, ${sqlText(chapter.title)}, public.check_chapter_text(${sqlText(chapter.body)}), 1,
  now() - interval '${publishedDaysAgo} days', ${sqlText(chapter.title)}, public.check_chapter_text(${sqlText(chapter.body)}), 'published',
  now() - interval '${publishedDaysAgo} days', now() - interval '${publishedDaysAgo} days', public.count_words(${sqlText(chapter.body)}),
  now() - interval '${publishedDaysAgo + 1} days'
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
-- ${demoStories.reduce((sum, story) => sum + story.chapters.length, 0)}, classics ${classics.length}, demo_writers ${Object.values(demoWriters).filter((writer) => writer.isNew).length}.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

-- The classics account's names are settings, not code (CLAUDE.md): change them here, not below.
insert into public.settings (key, value, is_public, description) values
  ('classics_account_handle', ${sqlValue(JSON.stringify(classicsHandle))}::jsonb, true,
   'Handle of the official account that publishes public-domain classics (S1-E5-06, S1-E11-16; demo top-up 23 Oct 2026).'),
  ('classics_account_pen_name', ${sqlValue(JSON.stringify(classicsPenName))}::jsonb, true,
   'Pen name of the official classics account.')
on conflict (key) do nothing;

${accountsSql()}
-- 3. The synthetic stories, their tags and their chapters, already published.
${demoStories.map(storySql).join('\n')}
-- 4. The public-domain classics (empty until content/classics/texts/ has the texts).
${classics.map(storySql).join('\n')}
commit;

select json_build_object(
  'demo_stories', (select count(*) from public.stories where slug like '%-demo-__'),
  'demo_chapters', (select count(*) from public.chapters where code like 'd___c___'),
  'classics', (select count(*) from public.stories where slug like '%-classic-%'),
  'demo_writers', (select count(*) from public.profiles where id::text like '00000000-0000-4000-8000-0000000001__')
)::text as after_top_up;
`;
  return header;
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
      const story = parseStory(readFileSync(join(folder, fileName), 'utf8'), index + 1);
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
  console.log(
    `Wrote ${topUpPath}: ${demo.stories.length} demo stories, ${classics.stories.length} classics.`,
  );
}

// Run only when started from the command line, not when a test imports the functions.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
