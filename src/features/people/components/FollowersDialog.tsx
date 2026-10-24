/**
 * FollowersDialog: "Your followers", the writer's own list (story S1-E6-05; Q50: follower lists
 * are visible to the writer only, to protect minors).
 *
 * Opened only from one's own profile; the database answers only the caller's own list
 * (my_followers()), so nobody can ask for someone else's. Each row links to the follower's
 * profile and says since when they follow.
 * Who uses it: ProfileStats. What it calls: useMyFollowers → my_followers().
 */
import { usePeopleTranslation } from '../registerPeopleTranslations';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';

import { useMyFollowers } from '../hooks/useMyFollowers';

import { PeopleDialog } from './PeopleDialog';

/** What the dialog needs. */
export interface FollowersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The list, its empty state or its error.
 *
 * @returns the dialog's body
 */
function FollowersList() {
  const { t, i18n } = usePeopleTranslation();
  const { followers, isLoaded, loadFailed } = useMyFollowers(true);
  if (loadFailed) return <Notice tone="error">{t('followers.loadFailed')}</Notice>;
  if (!isLoaded) return null;
  if (followers.length === 0) return <p className="m-0 text-body">{t('followers.empty')}</p>;
  return (
    <ul className="m-0 flex max-h-[50vh] list-none flex-col overflow-y-auto p-0">
      {followers.map((follower) => (
        <li
          key={follower.handle}
          className="flex flex-wrap items-baseline gap-x-2 border-b border-border py-3 last:border-b-0"
        >
          <Link
            to={`/u/${encodeURIComponent(follower.handle)}`}
            className="font-semibold text-link underline hover:text-link-hover"
          >
            {follower.displayName}
          </Link>
          <span className="text-[13px] text-meta">
            @{follower.handle} ·{' '}
            {t('followers.followedOn', {
              date: formatRomaniaDate(new Date(follower.followedAt), i18n.language),
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function FollowersDialog({ isOpen, onClose }: FollowersDialogProps) {
  const { t } = usePeopleTranslation();
  return (
    <PeopleDialog
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={t('followers.eyebrow')}
      title={t('followers.title')}
      closeLabel={t('followers.close')}
    >
      <FollowersList />
    </PeopleDialog>
  );
}
