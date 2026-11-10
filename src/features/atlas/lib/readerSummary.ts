/**
 * What readers see of one character, in a few facts the Readers page turns into one line (story
 * S1-E17-32; bundle G10 ATLAS, part c4, board AtlasReaders: "Readers see it from Chapter 1 ·
 * Basics, Look and voice" or "Kept private").
 *
 * Who calls it: ReaderCharacterRow. What it calls: nothing.
 */
import type { CharacterField } from '../api/characters';
import { sheetParts, type ItemVisibility, type SheetPart } from '../api/readerView';

/** What the line says: kept private, or the chapter it waits for and the open parts. */
export type ReaderSummary =
  | { kind: 'private' }
  | {
      kind: 'shown';
      /** The chapter readers must reach first, or null for the start. */
      chapterNumber: number | null;
      /** The sheet's open groups, in the sheet's own order. */
      groups: SheetPart[];
      /** The names of the writer's own open fields, in the sheet's order. */
      fieldNames: string[];
    };

/** What the summary is worked out from. */
export interface ReaderSummaryInput {
  /** The character's switches, or undefined when none was ever set. */
  item: ItemVisibility | undefined;
  /** The open groups and the IDs of the open custom fields. */
  openParts: string[];
  /** The writer's own fields; a hidden field is never shown to readers. */
  fields: CharacterField[];
  chapters: { code: string; position: number }[];
}

/**
 * Works out the summary of one character.
 *
 * @param input - the character's switches, open parts, the story's fields and chapters
 * @returns "private", or the chapter number (null for the start) and the open parts
 */
export function readerSummaryOf(input: ReaderSummaryInput): ReaderSummary {
  // Step 1: "Keep private" wins over everything else.
  if (input.item?.isPrivate === true) return { kind: 'private' };
  // Step 2: the chapter the character waits for; a chapter that is gone counts as the start.
  const showFrom = input.item?.showFrom ?? null;
  const chapter = input.chapters.find((candidate) => candidate.code === showFrom);
  // Step 3: the open parts, in the order the sheet shows them.
  return {
    kind: 'shown',
    chapterNumber: chapter?.position ?? null,
    groups: sheetParts.filter((part) => input.openParts.includes(part)),
    fieldNames: input.fields
      .filter((field) => !field.isHidden && input.openParts.includes(field.id))
      .map((field) => field.name),
  };
}
