/**
 * ProfileLibrary: "<name>'s library" on a profile, the stories on the person's Reading, Saved for
 * later and Finished shelves, when they let this reader see it (story S1-E13-01; board 6.3: "Who
 * can see your library"; CLAUDE.md rule 20: one scrolling line of at most 20, then "View more" to
 * /u/<username>/library).
 *
 * On one's own profile it also says who can see it, with Change to Settings › Privacy. Nothing is
 * drawn when the library is closed to this reader or holds no story they may see (the database
 * leaves out what their age, blocks or moderation hide).
 * Who uses it: WriterProfilePage. What it calls: useStoryShelf →
 * browse_stories('reader_library', <username>).
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { usePrivacyTranslation } from '@/features/privacy/registerPrivacyTranslations';

import type { WriterProfile } from '../api/writerProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** "Who can see this: Only me. Change", on one's own profile. */
function OwnLibraryNote({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const privacy = usePrivacyTranslation();
  if (profile.libraryAudience === null) return null;
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-3 text-sm text-body">
      {t('profile.libraryVisibleTo', {
        audience: privacy.t(`library.${profile.libraryAudience}`),
      })}
      <Link
        to="/settings#privacy"
        aria-label={t('profile.libraryChangeLabel')}
        className="inline-flex min-h-6 items-center font-semibold text-link underline"
      >
        {t('profile.libraryChange')}
      </Link>
    </p>
  );
}

/** The shelf itself, once the list is known and not empty. */
function LibraryShelf({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const request = plainList('reader_library', profile.handle);
  const { shelf: list } = useStoryShelf(request);
  if (list === null || list.stories.length === 0) return null;
  const covers = designsForRow(list.stories);
  return (
    <div className="flex flex-col gap-3">
      <Shelf
        eyebrow={t('profile.libraryEyebrow')}
        title={t('profile.libraryHeading', { name: profile.displayName })}
        seeAllHref={listAddress(request)}
        totalCount={list.total}
        items={list.stories.map((story, index) => ({
          key: story.slug,
          content: (
            <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
          ),
        }))}
      />
      {profile.isMe && <OwnLibraryNote profile={profile} />}
    </div>
  );
}

/**
 * Renders the section, or nothing when this reader may not see the library.
 *
 * @returns the shelf and, on one's own profile, the note
 */
export function ProfileLibrary({ profile }: { profile: WriterProfile }) {
  if (!profile.libraryOpen) return null;
  return <LibraryShelf profile={profile} />;
}
