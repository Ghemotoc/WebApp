/**
 * The data file narrowed to what a Download my stories copy holds (story S1-E13-05; Robert, 1 Nov
 * 2026, 06:27 and 06:29: "download whatever they want", with a JSON copy as well).
 *
 * The rules:
 * - only the tables that are a story's own content stay: the story, its chapters and their
 *   cards, pictures and revisions, its tags and every Story Atlas part (STORY_TABLES and
 *   CHAPTER_TABLES); the account, comments, likes, messages and the rest stay in Download my
 *   data only;
 * - one story keeps only its own rows; chosen chapters keep only theirs, while the plan stays
 *   whole, because it belongs to the story, not to one chapter;
 * - the same narrowed file feeds the Word files, the plan and the JSON copy, so all three agree.
 * Who calls it: runStoriesExport.ts. What it calls: nothing; it is pure, so it is tested alone.
 * When a new table holds a story's content, add it here and to stories_fingerprint() (migration
 * S1-E13-05), so the copy holds it and an edit to it makes a new copy.
 */
import type { DataExportDocument } from '../api/dataExport';

/** The tables whose rows belong to a story, found by their story_id ("stories" by its id). */
export const STORY_TABLES = [
  'stories',
  'chapters',
  'picture_checks',
  'chapter_plans',
  'chapter_plan_characters',
  'chapter_scenes',
  'story_tags',
  'story_plans',
  'story_plan_acts',
  'story_characters',
  'story_character_fields',
  'story_character_relationships',
  'story_bible_sections',
  'story_bible_entries',
  'story_events',
  'story_ideas',
  'story_marketing',
] as const;

/** The tables whose rows belong to a chapter, found by their chapter_id. */
export const CHAPTER_TABLES = ['chapter_embeds', 'chapter_revisions'] as const;

/** The tables that follow the chosen chapters, not the whole story. */
const FOLLOWS_CHOSEN_CHAPTERS = new Set<string>([
  'chapters',
  'chapter_plans',
  'chapter_plan_characters',
  'chapter_scenes',
  ...CHAPTER_TABLES,
]);

/** What the writer chose: one story or all, and one story's chapters or every one. */
export interface StoriesChoice {
  storyId: string | null;
  chapterIds: string[] | null;
}

/** A data file row, read loosely: only its keys are looked at. */
type LooseRow = Record<string, unknown>;

/** The rows of one table, or none. */
function rowsOf(document: DataExportDocument, tableName: string): LooseRow[] {
  const rows = document.tables[tableName];
  return Array.isArray(rows) ? (rows as LooseRow[]) : [];
}

/** The live stories the choice covers, by ID. */
function chosenStoryIds(document: DataExportDocument, choice: StoriesChoice): Set<string> {
  const live = (document.tables.stories ?? []).filter((story) => story.deleted_at === null);
  const chosen = live.filter((story) => choice.storyId === null || story.id === choice.storyId);
  return new Set(chosen.map((story) => story.id));
}

/** The chapters the choice covers, by ID: the chosen ones, or every chapter of the stories. */
function chosenChapterIds(
  document: DataExportDocument,
  storyIds: Set<string>,
  choice: StoriesChoice,
): Set<string> {
  const chapters = (document.tables.chapters ?? []).filter((chapter) =>
    storyIds.has(chapter.story_id),
  );
  const picked = choice.chapterIds === null ? null : new Set(choice.chapterIds);
  return new Set(
    chapters
      .filter((chapter) => picked === null || picked.has(chapter.id))
      .map((chapter) => chapter.id),
  );
}

/** Whether a row belongs to the choice. */
function rowIsChosen(
  tableName: string,
  row: LooseRow,
  storyIds: Set<string>,
  chapterIds: Set<string>,
): boolean {
  if (tableName === 'stories') return storyIds.has(String(row.id));
  if (tableName === 'chapters') return chapterIds.has(String(row.id));
  if (FOLLOWS_CHOSEN_CHAPTERS.has(tableName)) return chapterIds.has(String(row.chapter_id));
  return storyIds.has(String(row.story_id));
}

/**
 * The data file narrowed to the choice.
 *
 * @param document - the whole data file (my_data_export()'s answer)
 * @param choice - the story (null for all) and the chapters (null for every one)
 * @returns a data file with only the chosen stories' own tables and rows, and only the profile's
 *   handle and pen name from the account
 */
export function documentForChoice(
  document: DataExportDocument,
  choice: StoriesChoice,
): DataExportDocument {
  // Step 1: which stories and chapters the copy covers.
  const storyIds = chosenStoryIds(document, choice);
  const chapterIds = chosenChapterIds(document, storyIds, choice);
  // Step 2: every story table, with only the chosen rows.
  const tables: Record<string, LooseRow[]> = {};
  for (const tableName of [...STORY_TABLES, ...CHAPTER_TABLES]) {
    tables[tableName] = rowsOf(document, tableName).filter((row) =>
      rowIsChosen(tableName, row, storyIds, chapterIds),
    );
  }
  // Step 3: the byline needs the profile; the rest of the account stays in Download my data.
  return {
    format: document.format,
    made_at: document.made_at,
    user_id: document.user_id,
    account: { profile: document.account.profile },
    tables: tables as DataExportDocument['tables'],
  };
}
