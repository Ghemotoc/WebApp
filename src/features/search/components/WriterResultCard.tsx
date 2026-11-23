/**
 * WriterResultCard: one writer a search found: their avatar, the name, the username, the start of
 * the bio and how many stories, as one link to the writer's profile (story S1-E5-04; board
 * Search 3.2; the avatar since CALM-3: "writers in search" show their circle).
 *
 * Never shows a user ID (architecture 1.6): the profile address is by username.
 * Who uses it: SearchResults (a shelf) and SearchGroupPage (a grid). What it calls: PersonAvatar.
 */
import { Link } from 'react-router';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';

import type { FoundWriter } from '../api/search';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the card.
 *
 * @param props.writer - the writer
 * @returns the card
 */
export function WriterResultCard({ writer }: { writer: FoundWriter }) {
  const { t } = useSearchTranslation();
  return (
    <Link
      to={`/u/${encodeURIComponent(writer.handle)}`}
      className={`flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-4 text-ink-muted no-underline shadow-card hover:bg-tint w-full`}
    >
      {/* The avatar beside the name, 36 px as in every list (design system Avatar). */}
      <span className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={writer.displayName} handle={writer.handle} size="medium" />
        <span className="min-w-0 font-heading type-long leading-tight font-bold break-words text-ink-heading">
          {writer.displayName}
        </span>
      </span>
      <span className="type-body text-ink-muted">
        {t('results.writerHandle', { handle: writer.handle })}
      </span>
      {writer.bio !== '' && (
        <span className="line-clamp-3 type-body leading-normal">{writer.bio}</span>
      )}
      <span className="mt-auto type-body font-semibold text-ink-heading">
        {t('results.stories', { count: writer.storyCount })}
      </span>
    </Link>
  );
}
