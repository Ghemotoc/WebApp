/**
 * What sharing a whole story needs to know about it (bundle IDEAS-1, part c; idea
 * IDEA-20261031-11), and how its chat preview looks.
 *
 * The story page fills it from its own data; it never holds a user ID. The preview here copies
 * what server/link-preview.ts really sends a chat app for the story's address (S1-E4-04): a
 * plain square in the drawn cover's background colour (plum for an automatic or uploaded cover),
 * the title, "by <pen name>" and the blurb. A 16+ or 18+ story shows only its title and rating,
 * on plum, as for chapters (S1-E4-11, criterion 4; Q6).
 * Who uses it: StoryShareButton and StoryShareDialog; StoryHeader builds it.
 */
import { coverPalette, type CoverColourKey } from '@/components/covers/coverDesigns';
import type { StoryRating } from '@/schemas/story';

/** One story, as sharing shows it. */
export interface SharedStory {
  slug: string;
  title: string;
  /** The writer's pen name, or their handle when they have none. */
  writerName: string;
  blurb: string;
  rating: StoryRating;
  /** The drawn cover's background colour, or null for an automatic or uploaded cover. */
  coverBackground: CoverColourKey | null;
}

/** The ratings' short labels, the same in both languages (as the link preview prints them). */
export const ratingLabels: Record<StoryRating, string> = {
  all_ages: 'All ages',
  '13_plus': '13+',
  '16_plus': '16+',
  '18_plus': '18+',
};

/**
 * Whether the story's preview may show only its title and rating (16+ and 18+).
 *
 * @param rating - the story's rating
 * @returns true for 16+ and 18+
 */
export function showsTitleOnly(rating: StoryRating): boolean {
  return rating === '16_plus' || rating === '18_plus';
}

/**
 * The colour of the preview's picture, as server/link-preview.ts's previewColour() picks it.
 *
 * @param story - the story
 * @returns a hex colour from the cover palette
 */
export function storyPreviewColour(story: SharedStory): string {
  if (showsTitleOnly(story.rating) || story.coverBackground === null) return coverPalette.plum;
  return coverPalette[story.coverBackground];
}
