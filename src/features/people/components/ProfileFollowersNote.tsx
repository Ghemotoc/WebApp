/**
 * ProfileFollowersNote: "Followers are counted publicly; only <name> sees who they are." under
 * the profile's buttons (story S1-E6-05, Q50: the count is public, the list is the writer's only;
 * board C04 draws the line there). On one's own profile it says "only you" and adds "See who
 * follows you", which opens the list (FollowersDialog).
 * Who uses it: ProfileHeader.
 */
import { useState } from 'react';

import type { WriterProfile } from '../api/writerProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { FollowersDialog } from './FollowersDialog';

/**
 * Renders the line.
 *
 * @param props.profile - the profile on the page
 * @returns the note, with the button on one's own profile
 */
export function ProfileFollowersNote({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const [isListOpen, setIsListOpen] = useState(false);
  if (!profile.isMe) {
    return (
      <p className="m-0 type-meta text-ink-muted">
        {t('profile.followersNote', { name: profile.displayName })}
      </p>
    );
  }
  // A <div>, not a <p>: the dialog inside it isn't allowed in a paragraph.
  return (
    <div className="type-meta text-ink-muted">
      {t('profile.followersNoteMine')}{' '}
      <button
        type="button"
        onClick={() => setIsListOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-6 cursor-pointer items-center border-0 bg-transparent p-0 type-meta font-semibold text-link underline hover:text-link-hover"
      >
        {t('profile.seeFollowers')}
      </button>
      <FollowersDialog isOpen={isListOpen} onClose={() => setIsListOpen(false)} />
    </div>
  );
}
