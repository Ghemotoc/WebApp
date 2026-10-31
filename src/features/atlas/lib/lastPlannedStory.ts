/**
 * Remembers which story the writer had open in Story Atlas on this device (story S1-E17-02:
 * "Given I come back on the same device, when Story Atlas opens, then it opens the story I had
 * open last").
 *
 * Who calls it: StoryAtlasPage (saves the story on opening) and AtlasHomePage (/plan, which opens
 * it again). A per-device convenience only: the browser's storage, which can be empty, blocked or
 * throw, so every read and write is guarded and the page works without it.
 */

/** The storage key. It holds a story's address (slug), never anything private from the plan. */
const lastPlannedStoryKey = 'tmc-atlas-last-story';

/**
 * Saves the story the writer has open.
 *
 * @param slug - the story's address
 */
export function rememberPlannedStory(slug: string): void {
  try {
    window.localStorage.setItem(lastPlannedStoryKey, slug);
  } catch {
    // Storage is blocked (a private window, cleared site data): opening the newest story instead
    // is fine, so there is nothing to tell the writer.
  }
}

/**
 * Reads the story the writer had open last on this device.
 *
 * @returns the story's address, or null when there is none or storage can't be read
 */
export function lastPlannedStory(): string | null {
  try {
    return window.localStorage.getItem(lastPlannedStoryKey);
  } catch {
    return null;
  }
}

/**
 * Picks the story /plan opens: the one open last, while it is still one of the writer's live
 * stories, else the first in the list (the newest).
 *
 * @param liveSlugs - the writer's live stories' addresses, newest first
 * @param rememberedSlug - the story open last on this device, or null
 * @returns the address to open, or null when the writer has no stories yet
 */
export function storyToOpen(liveSlugs: string[], rememberedSlug: string | null): string | null {
  if (rememberedSlug !== null && liveSlugs.includes(rememberedSlug)) return rememberedSlug;
  return liveSlugs[0] ?? null;
}
