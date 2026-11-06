/**
 * Tests for the demo content build (Lane B, "Staging top-up: demo content", 23 Oct 2026).
 * Proves: a story file is read into its parts; every rule in content/demo-stories/README.md is
 * checked with a plain message; the SQL uses fixed ids, skips rows that exist and refuses a
 * database without the seed personas; the committed SQL file matches the story files; every demo
 * and classic drawn cover is patterned, and the covers top-up brings staging in line (LOOK-1).
 */
import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildCoversSql,
  buildTopUpSql,
  classicsTextsFolder,
  coversPath,
  drawnCoverSql,
  countWords,
  demoStoriesFolder,
  fileNumber,
  fixedId,
  parseCover,
  parseStory,
  readStories,
  splitChapters,
  storyProblems,
  storedBlurb,
  storySlug,
  topUpPath,
} from './build-demo-content';

/** A chapter body of exactly the number of words asked for. */
function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `cuvânt${index}`).join(' ');
}

/** A well-formed story file. */
const goodStory = `---
id: demo-07
title: Harta orașului care nu există
writer: ana_cu_harti
language: ro
category: fiction
rating: 13_plus
tags: hărți, oraș, mister
cover: drawn:waves/sky/violet
blurb: Două prietene găsesc o hartă pe care apar străzi ce nu au fost construite niciodată.
sample: yes
---

## Capitolul 1: Strada fără nume

${words(320)}

## Capitolul 2: Ce era în spatele ușii

${words(450)}
`;

describe('reading a story file', () => {
  it('reads the front matter and cuts the chapters at each ## heading', () => {
    const story = parseStory(goodStory, 7);

    expect(story.id).toBe('demo-07');
    expect(story.tags).toEqual(['hărți', 'oraș', 'mister']);
    expect(story.cover).toEqual({
      kind: 'drawn',
      design: 'waves',
      background: 'sky',
      accent: 'violet',
    });
    expect(story.isSample).toBe(true);
    expect(story.chapters.map((chapter) => chapter.title)).toEqual([
      'Capitolul 1: Strada fără nume',
      'Capitolul 2: Ce era în spatele ușii',
    ]);
    expect(story.chapters[0]?.wordCount).toBe(320);
    expect(storyProblems(story)).toEqual([]);
  });

  it('counts words like the database: Markdown marks and dashes are not words', () => {
    // "n-a" counts as two words, as the database's count_words() counts it (S1-E3-02a).
    expect(countWords('**Bunica** n-a venit, *zise* el.')).toBe(6);
    expect(countWords('')).toBe(0);
  });

  it('refuses a file without front matter or without a chapter heading', () => {
    expect(() => parseStory('Just text', 1)).toThrow('front matter');
    expect(() => splitChapters('No heading here')).toThrow('chapter heading');
    expect(() => splitChapters('## Empty\n\n')).toThrow('is empty');
  });

  it('reads covers and refuses ones outside the approved designs and palette', () => {
    expect(parseCover('automatic')).toEqual({ kind: 'automatic' });
    expect(() => parseCover('drawn:zigzag/sky/violet')).toThrow('not approved');
    expect(() => parseCover('drawn:waves/red/violet')).toThrow('palette');
    expect(() => parseCover('drawn:waves/sky/sky')).toThrow('two different colours');
  });
});

describe('the content rules', () => {
  it('names a chapter that is too short, a cedilla, an HTML tag and a wrong rating', () => {
    const broken = goodStory
      .replace(words(320), `${words(120)} ţară <b>bold</b>`)
      .replace('rating: 13_plus', 'rating: 18_plus');

    const problems = storyProblems(parseStory(broken, 7));

    expect(problems).toContain('rating must be all_ages, 13_plus or 16_plus, not "18_plus"');
    expect(problems.some((problem) => /has \d+ words; 300 to 600 expected/.test(problem))).toBe(
      true,
    );
    expect(problems).toContain('uses ş or ţ with a cedilla; write ș and ț with a comma below');
    expect(problems).toContain('contains an HTML tag');
  });

  it('lets a poem be shorter than a prose chapter', () => {
    const poem = goodStory
      .replace('category: fiction', 'category: poetry')
      .replace(words(320), words(150))
      .replace(words(450), words(200));

    expect(storyProblems(parseStory(poem, 7))).toEqual([]);
  });

  it('refuses an unknown writer and too few tags', () => {
    const broken = goodStory
      .replace('writer: ana_cu_harti', 'writer: nobody')
      .replace('tags: hărți, oraș, mister', 'tags: una');

    const problems = storyProblems(parseStory(broken, 7));

    expect(problems).toContain('unknown writer "nobody"');
    expect(problems).toContain('1 tags; a story needs 2 to 6');
  });
});

describe('the SQL', () => {
  const story = parseStory(goodStory, 7);

  it('gives every row a fixed id and a readable address', () => {
    expect(fixedId(story)).toBe('00000000-0000-4000-9100-000700000000');
    expect(fixedId(story, 2)).toBe('00000000-0000-4000-9100-000700020000');
    expect(storySlug(story)).toBe('harta-orasului-care-nu-exista-demo-07');
  });

  it('refuses a production database, skips rows that exist and runs the text through the database checks', () => {
    const sql = buildTopUpSql([story], []);

    expect(sql).toContain("where email like '%@personas.test') < 16");
    expect(sql).toContain(
      "where not exists (select 1 from public.stories where stories.id = '00000000-0000-4000-9100-000700000000'::uuid)",
    );
    expect(sql).toContain('public.check_chapter_text($demo$');
    expect(sql).toContain('public.count_words($demo$');
    expect(sql).toContain('published_word_count');
    expect(sql).toContain(
      "select public.set_story_tags('00000000-0000-4000-9100-000700000000'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, array['hărți', 'oraș', 'mister'])",
    );
    expect(sql).toContain("'classics_account_handle'");
    expect(sql.trim().endsWith('as after_top_up;')).toBe(true);
  });
});

describe('the fixed ids', () => {
  it("come from the file name, so adding a file never shifts another story's ids", () => {
    expect(fileNumber('demo-07.md', 0)).toBe(7);
    expect(fileNumber('demo-36.md', 3)).toBe(36);
    expect(fileNumber('classic-03-luceafarul.md', 0)).toBe(3);
    expect(fileNumber('classic-without-number.md', 4)).toBe(5);
  });
});

/** A public-domain classic as content/classics/texts/ holds it. */
const classicFile = `---
id: classic-03-luceafarul
title: Luceafărul
writer: clasice
author: Mihai Eminescu
author_died: 1889
source_edition: 1883
source_note: Text: Wikisource, https://ro.wikisource.org/w/index.php?oldid=148561, CC BY-SA 4.0; formatare adaptată.
language: ro
category: poetry
rating: all_ages
tags: domeniu public, clasic, poezie
cover: drawn:starry/ink/gold
blurb: Poemul despre o fată de împărat și luceafărul care o iubește.
---

## Luceafărul

A fost odată ca-n povești,  
A fost ca niciodată.
`;

describe('a public-domain classic', () => {
  const classic = parseStory(classicFile, 3);

  it("keeps the author's length and gets its credit line under the blurb", () => {
    expect(storyProblems(classic)).toEqual([]);
    expect(storedBlurb(classic)).toBe(
      'Poemul despre o fată de împărat și luceafărul care o iubește.\n\nEdiția sursă: 1883. Text: Wikisource, https://ro.wikisource.org/w/index.php?oldid=148561, CC BY-SA 4.0; formatare adaptată.',
    );
  });

  it('credits an English text with its source edition only', () => {
    const english = parseStory(
      classicFile.replace('language: ro', 'language: en').replace(/source_note: .*\n/, ''),
      3,
    );

    expect(storedBlurb(english).endsWith('\n\nSource edition: 1883.')).toBe(true);
  });

  it('refuses an author who died too recently, a missing edition year and the Gutenberg name', () => {
    const broken = parseStory(
      classicFile
        .replace('author_died: 1889', 'author_died: 1990')
        .replace('source_edition: 1883', 'source_edition: unknown')
        .replace('A fost ca niciodată.', 'A fost ca niciodată. Project Gutenberg'),
      3,
    );

    const problems = storyProblems(broken);

    expect(problems.some((problem) => problem.startsWith('author_died must be'))).toBe(true);
    expect(problems).toContain(
      'source_edition must be the year of the edition the text was taken from, or blank',
    );
    expect(problems).toContain('names Gutenberg; strip its licence and name');
  });

  it('leaves a year the source never names blank, and says only where the text came from', () => {
    const noYear = parseStory(classicFile.replace('source_edition: 1883', 'source_edition:'), 3);

    expect(storyProblems(noYear)).toEqual([]);
    expect(
      storedBlurb(noYear).endsWith(
        '\n\nText: Wikisource, https://ro.wikisource.org/w/index.php?oldid=148561, CC BY-SA 4.0; formatare adaptată.',
      ),
    ).toBe(true);
  });

  it('refuses a blank year on a text with no other credit', () => {
    const gutenbergStyle = parseStory(
      classicFile
        .replace('source_edition: 1883', 'source_edition:')
        .replace(/source_note: .*\n/, ''),
      3,
    );

    expect(storyProblems(gutenbergStyle)).toContain(
      'source_edition is blank; only a Wikisource text (with its source_note) may leave it blank',
    );
  });

  it('has its own ids, address and chapter codes, apart from the demo stories', () => {
    const sql = buildTopUpSql([], [classic]);

    expect(fixedId(classic)).toBe('00000000-0000-4000-9300-000300000000');
    expect(storySlug(classic)).toBe('luceafarul-classic');
    expect(sql).toContain("'k003c001'");
  });
});

describe('the committed top-up', () => {
  it('matches the story files in the repository', () => {
    const demo = readStories(demoStoriesFolder, /^demo-\d\d\.md$/);
    const classics = readStories(classicsTextsFolder, /^classic-.*\.md$/);

    expect(demo.problems).toEqual([]);
    expect(classics.problems).toEqual([]);
    if (demo.stories.length === 0) return;
    expect(demo.stories.filter((candidate) => candidate.isSample)).toHaveLength(5);
    expect(existsSync(topUpPath)).toBe(true);
    expect(readFileSync(topUpPath, 'utf8')).toBe(buildTopUpSql(demo.stories, classics.stories));
  });
});

describe('the drawn covers (LOOK-1)', () => {
  const demo = readStories(demoStoriesFolder, /^demo-\d\d\.md$/);
  const classics = readStories(classicsTextsFolder, /^classic-.*\.md$/);
  const allStories = [...demo.stories, ...classics.stories];

  it('no demo story or classic draws a flat colour, so no card looks empty', () => {
    const flat = ['plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper'];
    const flatOnes = allStories.filter(
      (story) => story.cover.kind === 'drawn' && flat.includes(story.cover.design),
    );
    expect(flatOnes.map((story) => story.id)).toEqual([]);
  });

  it('updates a drawn cover only while it differs, and leaves an automatic one alone', () => {
    const drawn = parseStory(goodStory, 7);
    const sql = drawnCoverSql(drawn);
    expect(sql).toContain(`where stories.id = '${fixedId(drawn)}'::uuid`);
    expect(sql).toContain("is distinct from ('drawn', 'waves', 'sky', 'violet')");
    const automatic = parseStory(goodStory.replace(/^cover: .*$/m, 'cover: automatic'), 7);
    expect(drawnCoverSql(automatic)).toBe('');
  });

  it('the committed covers top-up matches the files and refuses a production database', () => {
    if (demo.stories.length === 0) return;
    const sql = readFileSync(coversPath, 'utf8');
    expect(sql).toBe(buildCoversSql(allStories));
    expect(sql).toContain("email like '%@personas.test'");
  });
});
