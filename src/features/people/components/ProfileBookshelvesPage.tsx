/**
 * ProfileBookshelvesPage: a person's public bookshelves, from "Also on" › Bookshelves on their
 * profile (bundle 3 of "Build: the full design as user stories", board C06; Robert, 25 Nov 2026,
 * 09:50 UTC: no widget missing between the canvas and the live site).
 *
 * Who shows it: the router, at /u/:handle/bookshelves.
 * What it shows: the profile's header (ProfileHeader, the same card as the profile), then one row
 * of covers per public bookshelf, the one changed last first: the bookshelf's name, "7 of 10
 * books · Public", "Open" to the bookshelf's own page (/library/lists/:id) and the covers, with
 * the shared arrows when the row is wider than the page. Private bookshelves never appear, even on
 * one's own: this is the public view. The board's dashed + places are left out: nobody can add to
 * someone else's bookshelf (docs/board-fixes.md). When the profile can't be shown the page says
 * "This profile isn't available", as the profile does.
 * What it calls: useWriterProfile → get_writer_profile() and useProfileBookshelves →
 * profile_bookshelves(), which answers null exactly when the profile isn't shown.
 */
import { Link, useParams } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Shelf } from '@/components/ui/Shelf';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';
import type { ReadingList } from '@/features/library/api/readingLists';
import { useBookshelfLimits } from '@/features/library/hooks/useBookshelfLimits';
import { useLibraryTranslation } from '@/features/library/registerLibraryTranslations';

import type { WriterProfile } from '../api/writerProfile';
import { useProfileBookshelves } from '../hooks/useProfileActivity';
import { useWriterProfile } from '../hooks/useWriterProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { ProfileHeader } from './ProfileHeader';
import { ProfileUnavailable } from './ProfileUnavailable';

/** One bookshelf: its name, "7 of 10 books · Public", Open, and its covers. */
function PublicBookshelf({ list }: { list: ReadingList }) {
  const { t } = usePeopleTranslation();
  const library = useLibraryTranslation();
  const { books } = useBookshelfLimits();
  const covers = designsForRow(list.covers);
  const facts = [
    { text: library.t('lists.books', { filled: list.storyCount, count: books }) },
    { text: library.t('lists.seenBy.public') },
  ];
  return (
    <Shelf
      title={list.name}
      toolbar={<MetaLine facts={facts} className="-mt-3" />}
      headerAction={
        <Link
          to={`/library/lists/${encodeURIComponent(list.id)}`}
          aria-label={t('bookshelves.openLabel', { name: list.name })}
          className="inline-flex min-h-11 items-center px-2 type-body font-semibold text-link underline"
        >
          {t('bookshelves.open')}
        </Link>
      }
      items={list.covers.map((story, index) => ({
        key: story.slug,
        content: (
          <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
        ),
      }))}
    />
  );
}

/** The bookshelves, or a line saying there is none to show. */
function PublicBookshelves({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const { data: lists, isError } = useProfileBookshelves(profile.handle);
  if (isError) return <Notice tone="error">{t('bookshelves.loadFailed')}</Notice>;
  if (lists === undefined) return null;
  if (lists === null || lists.length === 0) {
    return (
      <p className="m-0 type-body text-ink-muted">
        {t('bookshelves.none', { name: profile.displayName })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-12">
      {lists.map((list) => (
        <PublicBookshelf key={list.id} list={list} />
      ))}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the header and the bookshelves, a wait, or "not available"
 */
export function ProfileBookshelvesPage() {
  const { t } = usePeopleTranslation();
  const { handle = '' } = useParams();
  const { profile, isLoaded, loadFailed } = useWriterProfile(handle);
  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-6">
        <Notice tone="error">{t('profile.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (profile === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <ProfileUnavailable />
      </PageContainer>
    );
  }
  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-8 pb-6">
      <title>{t('bookshelves.documentTitle', { name: profile.displayName })}</title>
      <ProfileHeader profile={profile} />
      {!profile.iBlocked && <PublicBookshelves profile={profile} />}
    </PageContainer>
  );
}
