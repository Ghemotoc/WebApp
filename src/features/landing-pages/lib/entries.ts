/**
 * Editing the entries of a Cards or Steps block: add, remove and change one card or step, always
 * in both languages at once (story S1-E11-34; bundle CMS-2b).
 *
 * Why both languages at once: the page shows the same list in each language, and the database
 * refuses lists of different lengths (landing_block_extra_problems(), "entries:wrong_number").
 * Who calls it: EntryItemsFields (the editor) and newBlock() in blocks.ts. What it calls: nothing;
 * every helper returns a new block, so React sees the change.
 */
import {
  landingEntryCounts,
  type LandingBlock,
  type LandingEntry,
  type LandingEntryKind,
  type LandingLanguage,
} from '@/schemas/landingPages';

/**
 * Says whether a block is made of entries, and narrows its kind.
 *
 * @param kind - the block's kind
 * @returns true for Cards and Steps
 */
export function isEntryKind(kind: string): kind is LandingEntryKind {
  return kind in landingEntryCounts;
}

/**
 * The entries of a block in one language.
 *
 * @returns the list (empty when the block has none)
 */
export function entriesOf(block: LandingBlock, language: LandingLanguage): LandingEntry[] {
  return block[language].entries ?? [];
}

/**
 * The fewest entries a new Cards or Steps block starts with, all empty.
 *
 * @param kind - cards or steps
 * @returns the empty entries
 */
export function emptyEntries(kind: LandingEntryKind): LandingEntry[] {
  return Array.from({ length: landingEntryCounts[kind].fewest }, () => ({ title: '', body: '' }));
}

/**
 * Adds an empty entry at the end of both languages.
 *
 * @returns the new block
 */
export function addEntry(block: LandingBlock): LandingBlock {
  return {
    ...block,
    ro: { ...block.ro, entries: [...entriesOf(block, 'ro'), { title: '', body: '' }] },
    en: { ...block.en, entries: [...entriesOf(block, 'en'), { title: '', body: '' }] },
  };
}

/**
 * Removes one entry from both languages.
 *
 * @returns the new block
 */
export function removeEntry(block: LandingBlock, index: number): LandingBlock {
  const keep = (entries: LandingEntry[]) => entries.filter((_, position) => position !== index);
  return {
    ...block,
    ro: { ...block.ro, entries: keep(entriesOf(block, 'ro')) },
    en: { ...block.en, entries: keep(entriesOf(block, 'en')) },
  };
}

/** Which part of which entry, in which language. */
export interface EntryPlace {
  language: LandingLanguage;
  index: number;
  part: keyof LandingEntry;
}

/**
 * Changes the title or the words of one entry in one language.
 *
 * @param block - the Cards or Steps block
 * @param place - the language, the entry's place and "title" or "body"
 * @param value - the new words
 * @returns the new block
 */
export function withEntryPart(block: LandingBlock, place: EntryPlace, value: string): LandingBlock {
  const entries = entriesOf(block, place.language).map((entry, position) =>
    position === place.index ? { ...entry, [place.part]: value } : entry,
  );
  return { ...block, [place.language]: { ...block[place.language], entries } };
}
