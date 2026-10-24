/**
 * useChapterBanner: the sponsor banner for a chapter, if there is one (story S1-E4-01b; S1-E4-01
 * criterion "the banner slot sits only below the chapter text, never inside it").
 *
 * Today it always answers null: banners are chosen by pick_banner(context) in S1-E12-01 (after
 * March), so staging, production and the investor demo show no banner and no placeholder.
 * S1-E12-01 replaces the body of this hook with a call to pick_banner(); the slot and its place
 * on the page are already fixed by ChapterBannerSlot (docs/mocks.md).
 * Who calls it: ChapterReaderPage.
 */

/** A banner's content: who it is from and what it says. */
export interface ChapterBanner {
  /** 'sponsored' for a direct sponsor, 'ad' for the ad network (decided 16 Oct 2026). */
  labelKind: 'ad' | 'sponsored';
  /** The creative's text (S1-E12-01 adds the picture and the link). */
  text: string;
}

/**
 * Picks the banner for a chapter.
 *
 * @param storySlug - the story's address, the page context pick_banner() will use
 * @returns banner: null until S1-E12-01
 */
export function useChapterBanner(storySlug: string): { banner: ChapterBanner | null } {
  // Kept as a parameter so the call sites don't change when S1-E12-01 uses the context.
  void storySlug;
  return { banner: null };
}
