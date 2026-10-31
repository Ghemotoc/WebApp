/**
 * An entry's tags as the writer types them: words separated by commas (story S1-E17-18).
 *
 * Who calls it: BibleEntryEditor, which shows the tags as one box and saves them as a list. What
 * it calls: nothing. The database trims them and drops repeats again (clean_bible_tags()), so
 * this only decides what the writer meant.
 */

/**
 * Splits the typed text into tags.
 *
 * @param typed - the box's text, such as "city, north ,  harbour"
 * @returns the tags, trimmed, without empties, each kept once in the order typed
 */
export function parseTags(typed: string): string[] {
  const tags: string[] = [];
  for (const piece of typed.split(',')) {
    const tag = piece.trim();
    // A repeat with different capitals is still the same tag.
    const isRepeat = tags.some((kept) => kept.toLocaleLowerCase() === tag.toLocaleLowerCase());
    if (tag !== '' && !isRepeat) tags.push(tag);
  }
  return tags;
}

/**
 * Writes the tags back as the box's text.
 *
 * @param tags - the saved tags
 * @returns them joined with a comma and a space
 */
export function formatTags(tags: string[]): string {
  return tags.join(', ');
}
