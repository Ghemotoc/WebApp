/**
 * StoryAdSlot: the story page's one advert, in the side column (story S1-E12-01; since CALM-7c
 * under the writer, board New-Story's 300 × 250 box).
 *
 * The slot is chosen from the story's category and language only, never from the reader
 * (CLAUDE.md rule 7); the server leaves it out on a class-only story (Q70).
 * Who uses it: StorySideColumn. What it calls: PageAdSlot (pick_banner()).
 */
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

/**
 * The page's one ad slot, chosen from the story's category and language only (S1-E12-01); the
 * server leaves it out on a class-only story (Q70).
 *
 * @param props.story - the story the page shows
 * @returns the slot, or nothing
 */
export function StoryAdSlot({
  story,
}: {
  story: { slug: string; categorySlug: string; languageCode: string };
}) {
  return (
    <PageAdSlot
      pageKey="story"
      position={1}
      context={{
        storySlug: story.slug,
        category: story.categorySlug,
        language: story.languageCode,
      }}
    />
  );
}
