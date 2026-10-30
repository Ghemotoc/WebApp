/**
 * WriterResultCard: one writer a search found: the name, the username, the start of the bio and
 * how many stories, as one link to the writer's profile (story S1-E5-04; board Search 3.2).
 *
 * Never shows a user ID (architecture 1.6): the profile address is by username.
 * Who uses it: SearchResults (a shelf) and SearchGroupPage (a grid).
 */
import { Link } from 'react-router';

import type { FoundWriter } from '../api/search';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the card.
 *
 * @param props.writer - the writer
 * @param props.isFluid - fill the grid column instead of the shelf's 240 px
 * @returns the card
 */
export function WriterResultCard({
  writer,
  isFluid = false,
}: {
  writer: FoundWriter;
  isFluid?: boolean;
}) {
  const { t } = useSearchTranslation();
  return (
    <Link
      to={`/u/${encodeURIComponent(writer.handle)}`}
      className={`flex h-full flex-col gap-1.5 rounded-card border border-border bg-surface p-5 text-body no-underline shadow-card hover:bg-tint ${isFluid ? 'w-full' : 'w-[240px]'}`}
    >
      <span className="font-heading text-lg leading-tight font-bold break-words text-heading">
        {writer.displayName}
      </span>
      <span className="text-sm text-meta">
        {t('results.writerHandle', { handle: writer.handle })}
      </span>
      {writer.bio !== '' && (
        <span className="line-clamp-3 text-sm leading-normal">{writer.bio}</span>
      )}
      <span className="mt-auto text-sm font-semibold text-heading">
        {t('results.stories', { count: writer.storyCount })}
      </span>
    </Link>
  );
}
