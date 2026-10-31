/**
 * useOpenStorySlug: the address of the story open now, from the page's own address.
 *
 * Every Story Atlas page and the chapter editor sit under /plan/s/:storySlug or
 * /write/s/:storySlug, so the [[Name]] links (S1-E17-31) can find their story without every
 * component on the way passing it down.
 * Who calls it: CrossLinkText, CrossLinkChips and BibleMarkdown. What it calls: React Router.
 */
import { useParams } from 'react-router';

/**
 * Reads the open story's address.
 *
 * @returns the slug, or '' outside a story's pages (links then read "not found yet")
 */
export function useOpenStorySlug(): string {
  const { storySlug = '' } = useParams();
  return storySlug;
}
