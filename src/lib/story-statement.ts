/**
 * The story statement: one sentence that says what a story is, built in one place for people,
 * search engines and answer engines (CALM-9s; Robert's canvas comments of 23 Nov 2026, boards
 * B01 to B06: "this helps for discoverability").
 *
 * "[Title] is a [genre] [type] published on [site] by [pen name or username]." then the blurb,
 * then "[site] is a free website for writing and reading stories, poems and essays."
 * The same words fill the footer of the story page and the reader, the page's <title>, its
 * description, its Open Graph description and its JSON-LD, so every reader of the page, human or
 * machine, gets one consistent statement. The type comes from the category (Fiction is a story,
 * Poetry a poem, Essays an essay); the genre is the story's first recommended tag, when it has one.
 * The words live in the reading namespace's `storyFooter` keys of the locale files (CLAUDE.md
 * rule 4); the callers pass them in, in the story's own language.
 * Never a real name, an age, the rating (18+ adds only "For mature readers") or chapter text.
 * Who uses it: server/link-preview.ts (the page as search engines and link previews read it) and
 * the app's StoryFooterAbout (src/features/reading/components/StoryFooterAbout.tsx).
 * Nothing here imports with "@" paths: server code loads this file too.
 */

/** What kind of writing a story is, from its category. */
export type StoryType = 'story' | 'poem' | 'essay';

/** The sentence's words in one language: the reading namespace's `storyFooter` keys. */
export interface StoryStatementWords {
  /** One sentence per type, without a genre: "{{title}} is {{article}} story published …". */
  story: string;
  poem: string;
  essay: string;
  /** The same with a genre: "{{title}} is {{article}} {{genre}} story published …". */
  storyGenre: string;
  poemGenre: string;
  essayGenre: string;
  /** "{{site}} is a free website for writing and reading stories, poems and essays." */
  site: string;
  /** "For mature readers", for 18+ only. */
  matureReaders: string;
  /** The page title: "{{title}} by {{writer}}, {{genre}}, {{site}}". */
  pageTitle: string;
  /** The page title when there is no genre or category: "{{title}} by {{writer}}, {{site}}". */
  pageTitlePlain: string;
  /** The first step of the breadcrumb trail in structured data: "Read". */
  breadcrumbRead: string;
  /** The footer block's accessible name: "About this story". */
  label: string;
}

/** The facts the statement is made of. */
export interface StoryStatementFacts {
  title: string;
  /** The category's key, for example "poetry". */
  categorySlug: string | null;
  /** The story's genre (its first recommended tag), or null. */
  genre: string | null;
  /** The pen name, or the username when there is none. */
  writerName: string;
  /** The story's language, for the genre's lower case and the article. */
  languageCode: string;
  /** True for an 18+ story, which adds "For mature readers" (never the rating itself). */
  isMature: boolean;
}

/** One piece of the sentence: plain words, the title (drawn in <cite>) or the writer (a link). */
export interface StatementPiece {
  kind: 'text' | 'title' | 'writer';
  text: string;
}

/** Search engines show about this many characters of a description. */
export const DESCRIPTION_LENGTH = 155;

/**
 * The type of writing a category stands for.
 *
 * @param categorySlug - the category's key, or null
 * @returns "poem" for Poetry, "essay" for Essays and "story" for Fiction or anything else
 */
export function storyTypeOf(categorySlug: string | null): StoryType {
  if (categorySlug === 'poetry') return 'poem';
  if (categorySlug === 'nonfiction_essays') return 'essay';
  return 'story';
}

/**
 * The English article for the word that follows it: "an" before a vowel, "a" otherwise.
 *
 * @param nextWord - the word after the article
 * @returns "a" or "an"
 */
function englishArticle(nextWord: string): string {
  return /^[aeiou]/i.test(nextWord) ? 'an' : 'a';
}

/**
 * Splits a sentence template into pieces, so the title and the writer can be drawn on their own.
 *
 * @param template - the sentence with {{title}} and {{writer}} still in it
 * @param facts - the title and the writer's name
 * @returns the pieces in order
 */
function piecesOf(template: string, facts: StoryStatementFacts): StatementPiece[] {
  // Step 1: cut the text at each {{title}} and {{writer}}, keeping the placeholders.
  const parts = template.split(/(\{\{title\}\}|\{\{writer\}\})/);
  const pieces: StatementPiece[] = [];
  // Step 2: each placeholder becomes its own piece; the text around it stays plain.
  for (const part of parts) {
    if (part === '') continue;
    if (part === '{{title}}') pieces.push({ kind: 'title', text: facts.title });
    else if (part === '{{writer}}') pieces.push({ kind: 'writer', text: facts.writerName });
    else pieces.push({ kind: 'text', text: part });
  }
  return pieces;
}

/**
 * The statement's sentence, in pieces: "[Title] is a [genre] [type] published on [site] by
 * [writer]."
 *
 * @param facts - what the story is
 * @param words - the sentence's words in the story's language
 * @param siteName - the product's name (from the brand config, never written here)
 * @returns the pieces of the sentence
 */
export function statementSentence(
  facts: StoryStatementFacts,
  words: StoryStatementWords,
  siteName: string,
): StatementPiece[] {
  // Step 1: the type and, when the story has one, the genre in lower case ("mystery").
  const type = storyTypeOf(facts.categorySlug);
  const genre = facts.genre === null ? null : facts.genre.toLocaleLowerCase(facts.languageCode);
  const template = genre === null ? words[type] : words[`${type}Genre`];
  // Step 2: the English article agrees with the word after it ("an essay", "a mystery story");
  // languages without one leave {{article}} out of their sentences.
  const article = englishArticle(genre ?? type);
  // Step 3: fill in everything but the title and the writer, then cut it into pieces.
  const filled = template
    .replaceAll('{{article}}', article)
    .replaceAll('{{genre}}', genre ?? '')
    .replaceAll('{{site}}', siteName);
  return piecesOf(filled, facts);
}

/**
 * The statement as plain text: the sentence, "For mature readers." for 18+, then the blurb.
 *
 * @param facts - what the story is
 * @param words - the words in the story's language
 * @param siteName - the product's name
 * @param blurb - the story's blurb, or an empty text
 * @returns the full statement in one line
 */
export function statementText(
  facts: StoryStatementFacts,
  words: StoryStatementWords,
  siteName: string,
  blurb: string,
): string {
  const parts = [
    statementSentence(facts, words, siteName)
      .map((piece) => piece.text)
      .join(''),
  ];
  if (facts.isMature) parts.push(`${words.matureReaders}.`);
  if (blurb.trim() !== '') parts.push(blurb.trim());
  return parts.join(' ');
}

/**
 * Shortens a text for a page's description: whole words, "…" when it was cut.
 *
 * @param text - the full text
 * @param limit - the most characters, the "…" included
 * @returns the text, or its first words and "…"
 */
export function shortenForDescription(text: string, limit = DESCRIPTION_LENGTH): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= limit) return oneLine;
  // Cut at the last space that leaves room for the "…", so no word is split.
  const cut = oneLine.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const words = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${words.replace(/[\s,.;:]+$/, '')}…`;
}

/**
 * The page's title: "[Title] by [writer], [genre], [site]"; without a genre the category's name
 * stands in, and with neither the middle part is left out.
 *
 * @param facts - what the story is
 * @param words - the words in the story's language
 * @param siteName - the product's name
 * @param categoryName - the category's name in the story's language, or null
 * @returns the title
 */
export function statementPageTitle(
  facts: StoryStatementFacts,
  words: StoryStatementWords,
  siteName: string,
  categoryName: string | null,
): string {
  const kind = facts.genre ?? categoryName;
  const template = kind === null ? words.pageTitlePlain : words.pageTitle;
  return template
    .replaceAll('{{title}}', facts.title)
    .replaceAll('{{writer}}', facts.writerName)
    .replaceAll('{{genre}}', kind ?? '')
    .replaceAll('{{site}}', siteName);
}

/**
 * The closing line: "[site] is a free website for writing and reading stories, poems and essays."
 *
 * @param words - the words in the story's language
 * @param siteName - the product's name
 * @returns the line
 */
export function statementSiteLine(words: StoryStatementWords, siteName: string): string {
  return words.site.replaceAll('{{site}}', siteName);
}
