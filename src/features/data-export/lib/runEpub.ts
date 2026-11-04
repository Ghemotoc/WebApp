/**
 * Makes the EPUB of a completed story for its writer, start to finish (story S1-E13-05, PRIVACY
 * part f; Robert, 1 Nov 2026, 06:31 to 06:40), or a sample of the chapters the writer picks, for
 * beta readers (bundle IDEAS-2, part b; idea IDEA-20261101-3; Robert, 2 Nov 2026, 22:00: any
 * chapters, as many or as few as they like, of an ongoing or finished story).
 *
 * The rules:
 * - only the writer; the whole book only for a Completed story (the block offers it only then,
 *   and this checks again), a sample for any of their stories; the data comes from the writer's
 *   own data file, so nobody else's can be read;
 * - a sample keeps each chapter's number in the story ("Chapter 3"), says "Sample" on its title
 *   and copyright pages with the chapters it holds, and is saved as "<slug>-sample.epub";
 * - "About the writer" at the back only when the writer ticked it (idea IDEA-20261101-4): the
 *   public bio and a link to the public profile, nothing that isn't already public;
 * - only the published chapters, in reading order, never the Atlas (06:33) and never a draft
 *   (a proposal: the book is what readers can read);
 * - the name on the book is what the writer typed in the form (06:34: the pen name or any name);
 *   it stays in this browser and is never sent or stored (rule 5), and so does a cover picture
 *   the writer picked from their device;
 * - the copyright page's words are the dataExport epub.book texts, which staff edit in Interface
 *   text (S1-E11-18), in the story's language when it is Romanian or English.
 * The steps: read the data file and narrow it to the story; pick the published chapters; load
 * their pictures; make the cover; fill in the words; build the book.
 * Who calls it: EpubDialog, loaded only when the writer asks for the book. What it calls:
 * api/dataExport.ts, epubCover.ts and buildEpub() in src/lib/epub.
 */
import type { TFunction } from 'i18next';

import { automaticCoverFor } from '@/components/covers/automaticCover';
import {
  coverColourKeys,
  coverDesignKeys,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import { fetchStoryCoverPicture } from '@/features/pictures/api/pictures';
import { brand } from '@/config/brand';
import { pictureIdsIn } from '@/lib/chapter-pictures';
import { buildEpub } from '@/lib/epub/buildEpub';
import type {
  EpubAboutWriter,
  EpubChapter,
  EpubEmbed,
  EpubImage,
  EpubSample,
  EpubWords,
} from '@/lib/epub/epubTypes';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { WordPicture } from '@/lib/word/wordTypes';

import {
  downloadPicture,
  fetchDataExportDocument,
  type DataExportDocument,
  type ExportedChapter,
  type ExportedStory,
} from '../api/dataExport';

import { drawnCoverPicture, pictureCoverFrom, type DrawnCoverWords } from './epubCover';
import { pictureForWord } from './pictureForWord';
import { documentForChoice } from './storiesForData';

/** The cover the writer confirmed: the story's own, or a picture from their device. */
export type EpubCoverChoice = { kind: 'story' } | { kind: 'file'; file: Blob };

/** What the writer filled in on the form. */
export interface EpubForm {
  name: string;
  title: string;
  cover: EpubCoverChoice;
  /** The chapters of a sample, by ID; null for the whole book (IDEAS-2b). */
  chapterIds: string[] | null;
  /** True when "Add an About the writer page" is ticked (IDEAS-2b). */
  withAboutWriter: boolean;
}

/** The ways a cover is drawn: the browser's canvas by default, fakes in tests. */
export interface CoverPainters {
  drawn: (words: DrawnCoverWords) => Promise<EpubImage>;
  picture: (file: Blob) => Promise<EpubImage>;
}

/** What a run needs. */
export interface EpubRunOptions {
  client: AppSupabaseClient;
  storyId: string;
  form: EpubForm;
  /** The dataExport texts in the book's language (translatorForBook()). */
  bookText: TFunction;
  /** The book's language for dates ("ro" or "en"). */
  bookLanguage: string;
  /** When the book is made; now by default. */
  madeAt?: Date;
  preparePicture?: (file: Blob) => Promise<WordPicture | null>;
  coverPainters?: CoverPainters;
}

/** The finished book, ready to save. */
export interface EpubFile {
  fileName: string;
  bytes: Uint8Array;
}

/** The story's drawn choice as stored, or null when a value isn't one we know. */
function storedDrawnChoice(story: ExportedStory): DrawnCoverChoice | null {
  const design = coverDesignKeys.find((key) => key === story.cover_design);
  const background = coverColourKeys.find((key) => key === story.cover_background);
  const accent = coverColourKeys.find((key) => key === story.cover_accent);
  if (design === undefined || background === undefined || accent === undefined) return null;
  return { design, background, accent };
}

/** The story's uploaded cover as a file, or null when it can't be read (then it is drawn). */
async function uploadedCoverFile(client: AppSupabaseClient, slug: string): Promise<Blob | null> {
  try {
    const view = await fetchStoryCoverPicture(client, slug);
    // A cover a moderator removed isn't used; the drawn cover stands in, as on the story page.
    if (view === null || view.state === 'removed' || view.url === null) return null;
    const response = await fetch(view.url);
    return response.ok ? await response.blob() : null;
  } catch (error) {
    console.warn(`The uploaded cover couldn't be read, so it is drawn instead: ${String(error)}`);
    return null;
  }
}

/**
 * The book's cover: the writer's own file, the story's uploaded cover, or the drawn or automatic
 * cover with the title and name the writer confirmed.
 *
 * @returns the cover picture
 */
async function coverFor(story: ExportedStory, options: EpubRunOptions): Promise<EpubImage> {
  const painters = options.coverPainters ?? {
    drawn: drawnCoverPicture,
    picture: pictureCoverFrom,
  };
  const { form } = options;
  if (form.cover.kind === 'file') return painters.picture(form.cover.file);
  if (story.cover_kind === 'upload') {
    const file = await uploadedCoverFile(options.client, story.slug);
    if (file !== null) return painters.picture(file);
  }
  const drawn = story.cover_kind === 'drawn' ? storedDrawnChoice(story) : null;
  const choice = drawn ?? automaticCoverFor(story.id);
  return painters.drawn({ title: form.title, name: form.name, choice });
}

/** The published chapters of the story, first to last. */
function publishedChapters(document: DataExportDocument): ExportedChapter[] {
  return (document.tables.chapters ?? [])
    .filter((chapter) => chapter.deleted_at === null && chapter.status === 'published')
    .filter((chapter) => chapter.published_body !== null)
    .sort((first, second) => first.position - second.position);
}

/** A chapter for the book: "Chapter 3: The storm", or "Chapter 3" when it has no title. */
function chapterForBook(
  chapter: ExportedChapter,
  number: number,
  bookText: TFunction,
): EpubChapter {
  const title = chapter.published_title?.trim() ?? '';
  const heading =
    title === ''
      ? bookText('epub.book.chapterNumber', { number })
      : bookText('epub.book.chapterWithTitle', { number, title });
  return { heading, markdown: chapter.published_body ?? '' };
}

/** The chapters' pictures that load, drawn for the book. A missing one leaves its alt text. */
async function loadPictures(
  document: DataExportDocument,
  chapters: EpubChapter[],
  options: EpubRunOptions,
): Promise<Map<string, EpubImage>> {
  const prepare = options.preparePicture ?? pictureForWord;
  const shown = new Set(chapters.flatMap((chapter) => pictureIdsIn(chapter.markdown)));
  const loaded = new Map<string, EpubImage>();
  for (const picture of document.tables.picture_checks ?? []) {
    if (!shown.has(picture.id)) continue;
    const file = await downloadPicture(options.client, picture);
    const ready = file === null ? null : await prepare(file);
    if (ready !== null) loaded.set(picture.id, ready);
  }
  return loaded;
}

/** The words of the book that aren't the writer's, filled in. */
function bookWords(options: EpubRunOptions, madeAt: Date): EpubWords {
  const { bookText, form } = options;
  const values = {
    author: form.name,
    // The year as Romania sees it, like the date below.
    year: new Intl.DateTimeFormat('en', { timeZone: 'Europe/Bucharest', year: 'numeric' }).format(
      madeAt,
    ),
    date: formatRomaniaDate(madeAt, options.bookLanguage),
    siteUrl: brand.siteUrl,
  };
  const copyrightKeys = ['rights', 'noCopying', 'ownership', 'prepared'] as const;
  return {
    contents: bookText('epub.book.contents'),
    copyrightHeading: bookText('epub.book.copyrightHeading'),
    copyrightLines: copyrightKeys.map((key) => bookText(`epub.book.copyright.${key}`, values)),
    byLine: bookText('epub.book.byLine', { name: form.name }),
    coverAlt: bookText('epub.book.coverAlt', { title: form.title }),
    pictureMissing: (alt) => bookText('epub.book.pictureMissing', { alt }),
    embedLine: (title) => bookText('epub.book.embedLine', { title }),
    embedMissing: bookText('epub.book.embedMissing'),
  };
}

/** The story's music and video cards, by ID. */
function embedsOf(document: DataExportDocument): Map<string, EpubEmbed> {
  return new Map(
    (document.tables.chapter_embeds ?? []).map((embed) => [
      embed.id,
      { title: embed.title ?? embed.source_url, url: embed.source_url },
    ]),
  );
}

/**
 * The writer's live story, or a plain error when it isn't theirs, or when the whole book is asked
 * for a story that isn't completed (a sample may come from any of their stories, IDEAS-2b).
 */
function storyForBook(document: DataExportDocument, isSample: boolean): ExportedStory {
  const story = (document.tables.stories ?? []).find((row) => row.deleted_at === null);
  if (story === undefined) throw new Error('This story is not one of yours.');
  if (!isSample && story.completion_status !== 'completed') {
    throw new Error('Only a completed story can be made into an EPUB.');
  }
  return story;
}

/**
 * The chapters for the book, numbered by their place in the story: every published one, or for a
 * sample only the chosen ones, keeping their numbers ("Chapter 3" stays chapter 3).
 *
 * @returns the chapters, first to last
 */
function chaptersForBook(document: DataExportDocument, options: EpubRunOptions): EpubChapter[] {
  const chosen = options.form.chapterIds === null ? null : new Set(options.form.chapterIds);
  return publishedChapters(document)
    .map((chapter, index) => ({ chapter, number: index + 1 }))
    .filter(({ chapter }) => chosen === null || chosen.has(chapter.id))
    .map(({ chapter, number }) => chapterForBook(chapter, number, options.bookText));
}

/** A sample's words, or null for the whole book (IDEAS-2b). */
function sampleFor(options: EpubRunOptions): EpubSample | null {
  if (options.form.chapterIds === null) return null;
  return {
    label: options.bookText('epub.book.sample.label'),
    holdsLine: options.bookText('epub.book.sample.holds'),
  };
}

/**
 * "About the writer" from the writer's public bio and profile, or null when it isn't ticked
 * (IDEAS-2b). The bio and the username are already public, so nothing new is shared.
 */
function aboutWriterFor(
  document: DataExportDocument,
  options: EpubRunOptions,
): EpubAboutWriter | null {
  if (!options.form.withAboutWriter) return null;
  const profile = document.account.profile;
  const bio = profile?.bio ?? '';
  return {
    heading: options.bookText('epub.book.about.heading'),
    bio,
    linkLine: options.bookText('epub.book.about.linkLine', { name: options.form.name }),
    profileUrl: `${brand.siteUrl}/u/${encodeURIComponent(profile?.handle ?? '')}`,
  };
}

/**
 * Makes the book.
 *
 * @param options - the client, the story, the form and the book's words
 * @returns the file name ("<slug>.epub", or "<slug>-sample.epub" for a sample) and its bytes, to
 *   save on the device
 * @throws Error with a plain message when the story isn't the writer's, the whole book is asked
 *   for a story that isn't completed, there is no published chapter to put in, or a step fails
 */
export async function makeEpub(options: EpubRunOptions): Promise<EpubFile> {
  const madeAt = options.madeAt ?? new Date();
  // Step 1: the writer's own data, narrowed to this story.
  const document = documentForChoice(await fetchDataExportDocument(options.client), {
    storyId: options.storyId,
    chapterIds: null,
  });
  const isSample = options.form.chapterIds !== null;
  const story = storyForBook(document, isSample);
  // Step 2: the published chapters, numbered in reading order; a sample keeps only its own.
  const chapters = chaptersForBook(document, options);
  if (chapters.length === 0) throw new Error('There is no published chapter to put in the book.');
  // Steps 3 and 4: the pictures and the cover, drawn here in the browser.
  const pictures = await loadPictures(document, chapters, options);
  const cover = await coverFor(story, options);
  // Step 5: the whole book.
  const bytes = await buildEpub({
    title: options.form.title,
    author: options.form.name,
    languageCode: story.language_code,
    identifier: story.id,
    madeAt: madeAt.toISOString(),
    cover,
    chapters,
    pictures,
    embeds: embedsOf(document),
    words: bookWords(options, madeAt),
    sample: sampleFor(options),
    aboutWriter: aboutWriterFor(document, options),
  });
  const slug = story.slug.replace(/[^a-z0-9-]/gi, '-') || 'story';
  return { fileName: isSample ? `${slug}-sample.epub` : `${slug}.epub`, bytes };
}
