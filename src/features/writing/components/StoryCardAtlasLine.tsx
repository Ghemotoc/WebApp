/**
 * StoryCardAtlasLine: the line under a story's actions on "Writing" (bundle CALM-9a, board D01,
 * approved by Robert on 22 Nov 2026 after "it's harder to find the relationship page, and add
 * characters"): "In the Atlas: Characters · Relationships · Story world · Storyline", each part a
 * link straight to that page of the story's Story Atlas.
 *
 * The parts are a real list, so a screen reader counts them; the middots are drawn between items
 * and hidden from screen readers.
 * Who uses it: WriterStoryCard. What it calls: nothing beyond the router's Link.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** The parts the line links to, with each one's address after /plan/s/<slug>. */
const atlasParts = [
  { key: 'characters', path: '/characters' },
  { key: 'relationships', path: '/connections' },
  { key: 'world', path: '/world' },
  { key: 'storyline', path: '/storyline' },
] as const;

/**
 * Renders the line.
 *
 * @param props.slug - the story's address
 * @returns the labelled list of four links
 */
export function StoryCardAtlasLine({ slug }: { slug: string }) {
  const { t } = useTranslation('writing');
  const labelId = `atlas-parts-${slug}`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 type-meta">
      <span id={labelId}>{t('storyCard.inAtlas')}</span>
      <ul aria-labelledby={labelId} className="m-0 flex list-none flex-wrap items-center p-0">
        {atlasParts.map((part, index) => (
          <li key={part.key} className="flex items-center">
            {/* A middot between parts, as in every meta line (MetaLine). */}
            {index > 0 && (
              <span aria-hidden="true" className="px-2">
                ·
              </span>
            )}
            <Link
              to={`/plan/s/${slug}${part.path}`}
              className="inline-flex min-h-6 items-center text-ink underline decoration-1 underline-offset-[3px] hover:decoration-2"
            >
              {t(`storyCard.atlasParts.${part.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
