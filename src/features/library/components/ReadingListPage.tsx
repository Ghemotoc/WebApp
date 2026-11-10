/**
 * ReadingListPage: one reading list on its own page (bundle GAPS-6; the rows of "Your lists" on
 * design/boards/Library.dc.html lead here).
 *
 * Who shows it: the router, at /library/lists/:listId.
 * What it shows: the way back to the Library, the list's name, how many stories it holds and who
 * sees it; for the owner, ReadingListOwnerTools (rename, who sees it, remove a story, delete);
 * for anyone else looking at a public list, whose list it is and the Report action (CLAUDE.md
 * rule 6); then the stories as the same grid every story list uses.
 * A private list, a deleted one, one moderators took away and a mistyped address all show the
 * same "There is no such list", so nobody learns that a private list exists.
 * What it calls: useReadingList → reading_list(); useStoryList → browse_stories('reading_list'),
 * which leaves out what this reader may not see (ratings, blocks, moderation).
 */
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { StoryGrid } from '@/features/discovery/components/StoryGrid';
import { useStoryList } from '@/features/discovery/hooks/useStoryList';
import { plainList } from '@/features/discovery/lib/listAddresses';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ReadingListDetails } from '../api/readingLists';
import { useReadingList } from '../hooks/useReadingLists';
import { isReadingListId } from '../lib/readingListAddress';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ReadingListOwnerTools } from './ReadingListOwnerTools';

/** "There is no such list", with the way back to the Library. */
function UnknownReadingList() {
  const { t } = useLibraryTranslation();
  return (
    <EmptyState
      title={t('lists.page.unknown')}
      description={t('lists.page.unknownBody')}
      action={<Link to="/library">{t('lists.page.backToLibrary')}</Link>}
    />
  );
}

/** "Library / Rainy day reads": the way back, with the list's name as the current step. */
function ListBreadcrumb({ name }: { name: string }) {
  const { t } = useLibraryTranslation();
  return (
    <nav aria-label={t('lists.page.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-body">
        <li>
          <Link
            to="/library"
            className="inline-flex min-h-6 items-center text-link underline underline-offset-2"
          >
            {t('title')}
          </Link>
        </li>
        {/* max-w-full and min-w-0 let one long word wrap inside a phone screen (GAPS-6 break test). */}
        <li className="flex max-w-full min-w-0 items-center gap-2">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 break-words text-heading">
            {name}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/** Whose list it is and the Report action, for a reader looking at someone else's list. */
function OwnerLine({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex flex-wrap items-center gap-4 text-[15px] text-body">
      <span>
        {t('lists.page.madeBy')}{' '}
        <Link
          to={`/u/${encodeURIComponent(list.ownerHandle)}`}
          className="font-semibold text-link underline underline-offset-2"
        >
          {list.ownerName}
        </Link>
      </span>
      <ReportButton
        itemType="reading_list"
        itemReference={list.id}
        itemLabel={t('lists.page.reportLabel', { name: list.name })}
      />
    </div>
  );
}

/** The top of the page: breadcrumb, name, count and who sees it. */
function ListHeader({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  return (
    <header className="flex flex-col gap-4">
      <ListBreadcrumb name={list.name} />
      <h1 className="m-0 font-heading text-[clamp(36px,5vw,64px)] leading-[1.02] font-bold tracking-[-0.03em] break-words text-heading">
        {list.name}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <p aria-live="polite" className="m-0 text-[17px] text-body">
          {t('lists.count', { count: list.storyCount })}
        </p>
        <InfoPill tone={list.isPublic ? 'sky' : 'neutral'}>
          {t(list.isPublic ? 'lists.seenBy.public' : 'lists.seenBy.onlyYou')}
        </InfoPill>
      </div>
      {!list.isOwn && <OwnerLine list={list} />}
    </header>
  );
}

/** The list's stories, or the line that says how stories get there. */
function ListStories({ list }: { list: ReadingListDetails }) {
  const { t } = useLibraryTranslation();
  const stories = useStoryList(plainList('reading_list', list.id));
  if (stories.loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (!stories.isLoaded) return null;
  if (stories.stories.length === 0) {
    return (
      <EmptyState
        title={t('lists.page.emptyTitle')}
        description={t(list.isOwn ? 'lists.page.emptyOwn' : 'lists.page.emptyOther')}
        action={list.isOwn ? <Link to="/discover">{t('lists.page.discover')}</Link> : undefined}
      />
    );
  }
  return (
    <StoryGrid
      stories={stories.stories}
      hasMore={stories.hasMore}
      isLoadingMore={stories.isLoadingMore}
      onLoadMore={stories.loadMore}
    />
  );
}

/** The page once the address holds a well-formed ID. */
function KnownAddressPage({ listId }: { listId: string }) {
  const { t } = useLibraryTranslation();
  const { list, loadFailed } = useReadingList(listId);
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (list === undefined) return null;
  if (list === null) return <UnknownReadingList />;
  return (
    <>
      <title>
        {t('lists.page.documentTitle', { name: list.name, productName: brand.productName })}
      </title>
      <ListHeader list={list} />
      {list.isOwn && <ReadingListOwnerTools list={list} />}
      <ListStories list={list} />
    </>
  );
}

/**
 * Renders the page for the list the address names.
 *
 * @returns the list's page, or "There is no such list"
 */
export function ReadingListPage() {
  const { listId } = useParams();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-14">
      {isReadingListId(listId) ? (
        <KnownAddressPage key={listId} listId={listId} />
      ) : (
        <UnknownReadingList />
      )}
    </PageContainer>
  );
}
