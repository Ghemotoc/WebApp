/**
 * Turns the data file's story and chapter rows into what the shared Word builder takes (story
 * S1-E13-02; the contents rule of S1-E11-09).
 *
 * The rules:
 * - every story the person still has gets a Word file, drafts and unpublished chapters included
 *   (S1-E11-09: "along with drafts and unpublished chapters"); stories and chapters they deleted
 *   are left out of the Word files but stay in the data file until they are purged;
 * - a chapter's text is its latest draft, the writer's newest words; the published copy stays in
 *   the data file (published_body) when the two differ;
 * - the byline is the pen name, or the username when there is none.
 * Who calls it: runDataExport(). What it calls: nothing; it is pure, so it is tested alone.
 */
import { pictureIdsIn } from '@/lib/chapter-pictures';
import type { WordChapter, WordEmbed, WordStory } from '@/lib/word/wordTypes';

import type {
  DataExportDocument,
  ExportedChapter,
  ExportedPicture,
  ExportedStory,
} from '../api/dataExport';

/** The words for each status, already translated. */
export interface StatusLabels {
  story: Record<ExportedStory['completion_status'], string>;
  chapter: Record<ExportedChapter['status'], string>;
}

/** One story ready for the builder, with the slug its file is named after. */
export interface StoryForWord {
  slug: string;
  story: WordStory;
}

/** Everything the Word files need from the data file. */
export interface WordInput {
  stories: StoryForWord[];
  /** The pictures the chapters show, to load before building. */
  pictures: ExportedPicture[];
  embeds: Map<string, WordEmbed>;
}

/** A chapter in the builder's shape. */
function chapterForWord(chapter: ExportedChapter, labels: StatusLabels): WordChapter {
  return {
    position: chapter.position,
    // The draft's title is the newest; an empty one falls back to the published title.
    title: chapter.draft_title.trim() !== '' ? chapter.draft_title : chapter.published_title,
    statusLabel: labels.chapter[chapter.status],
    createdAt: chapter.created_at,
    firstPublishedAt: chapter.first_published_at,
    lastPublishedAt: chapter.last_published_at,
    markdown: chapter.draft_body,
  };
}

/**
 * The stories, each with its chapters in order.
 *
 * @param document - the data file
 * @param labels - the status words
 * @returns the stories the person still has, oldest first
 */
function storiesOf(document: DataExportDocument, labels: StatusLabels): StoryForWord[] {
  const profile = document.account.profile;
  const writerName = profile?.pen_name ?? profile?.handle ?? '';
  const chapters = (document.tables.chapters ?? []).filter(
    (chapter) => chapter.deleted_at === null,
  );
  return (document.tables.stories ?? [])
    .filter((story) => story.deleted_at === null)
    .map((story) => ({
      slug: story.slug,
      story: {
        title: story.title,
        writerName,
        userId: document.user_id,
        languageCode: story.language_code,
        statusLabel: labels.story[story.completion_status],
        createdAt: story.created_at,
        firstPublishedAt: story.first_published_at,
        updatedAt: story.updated_at,
        chapters: chapters
          .filter((chapter) => chapter.story_id === story.id)
          .sort((first, second) => first.position - second.position)
          .map((chapter) => chapterForWord(chapter, labels)),
      },
    }));
}

/**
 * Everything the Word files need: the stories, the pictures their text points to and the music
 * and video cards.
 *
 * @param document - the data file
 * @param labels - the status words
 * @returns the builder's input
 */
export function wordInputFrom(document: DataExportDocument, labels: StatusLabels): WordInput {
  const stories = storiesOf(document, labels);
  // Only the pictures some chapter still shows are loaded.
  const shownPictureIds = new Set(
    stories.flatMap((entry) =>
      entry.story.chapters.flatMap((chapter) => pictureIdsIn(chapter.markdown)),
    ),
  );
  const pictures = (document.tables.picture_checks ?? []).filter((picture) =>
    shownPictureIds.has(picture.id),
  );
  const embeds = new Map<string, WordEmbed>(
    (document.tables.chapter_embeds ?? []).map((embed) => [
      embed.id,
      { title: embed.title ?? embed.source_url, url: embed.source_url },
    ]),
  );
  return { stories, pictures, embeds };
}

/**
 * A safe file name for a story's Word file inside the ZIP: its slug, which is already letters,
 * digits and dashes, with a number added when two would clash.
 *
 * @param slug - the story's slug
 * @param taken - the names used so far (one is added)
 * @returns "stories/<slug>.docx"
 */
export function wordFileName(slug: string, taken: Set<string>): string {
  const base = slug.replace(/[^a-z0-9-]/gi, '-') || 'story';
  let name = `stories/${base}.docx`;
  for (let copy = 2; taken.has(name); copy += 1) name = `stories/${base}-${copy}.docx`;
  taken.add(name);
  return name;
}

/**
 * The data file narrowed to one story and its chapters, so only that story's Word file and
 * pictures are made (Download my stories, S1-E13-05). Null keeps every story.
 *
 * @param document - the data file
 * @param storyId - the story's ID, or null for all of them
 * @returns the same document, with only that story's rows in stories and chapters
 */
export function documentForStory(
  document: DataExportDocument,
  storyId: string | null,
): DataExportDocument {
  if (storyId === null) return document;
  return {
    ...document,
    tables: {
      ...document.tables,
      stories: (document.tables.stories ?? []).filter((story) => story.id === storyId),
      chapters: (document.tables.chapters ?? []).filter((chapter) => chapter.story_id === storyId),
    },
  };
}
