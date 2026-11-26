/**
 * ReadingListPage: one bookshelf on its own page (bundle GAPS-6; redrawn as board C02 for Robert,
 * 25 Nov 2026, 09:50 UTC: no widget missing between the canvas and the live site).
 *
 * Who shows it: the router, at /library/lists/:listId.
 * What it shows, top to bottom (board C02): the way back to the Library; a meta line saying how
 * full it is and who sees it ("3 of 10 books · Only you"); the name; for the owner, the row of
 * actions (ReadingListOwnerTools: Find stories, Rename, who sees it, Delete bookshelf); for
 * anyone else looking at a public bookshelf, whose it is and the Report action (CLAUDE.md rule
 * 6); then the books with their places (BookshelfBooks), and for the owner the note on what a
 * public bookshelf shows.
 * A private bookshelf, a deleted one, one moderators took away and a mistyped address all show
 * the same "There is no such bookshelf", so nobody learns that a private one exists.
 * What it calls: useReadingList → reading_list(), whose covers leave out what this reader may not
 * see (ratings, blocks, moderation); useBookshelfLimits for the places on a bookshelf.
 */
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ReadingListDetails } from '../api/readingLists';
import { useBookshelfLimits } from '../hooks/useBookshelfLimits';
import { useReadingList } from '../hooks/useReadingLists';
import { isReadingListId } from '../lib/readingListAddress';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { BookshelfBooks } from './BookshelfBooks';
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
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-body text-ink-muted">
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
          <span aria-current="page" className="min-w-0 break-words text-ink-heading">
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
    <div className="flex flex-wrap items-center gap-4 type-body text-ink-muted">
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

/**
 * The meta line above the name: how full the bookshelf is for the owner ("3 of 10 books"), or how
 * many stories it holds for anyone else, then who sees it.
 */
function ListFacts({ list, places }: { list: ReadingListDetails; places: number }) {
  const { t } = useLibraryTranslation();
  const howFull = list.isOwn
    ? t('lists.books', { filled: list.storyCount, count: places })
    : t('lists.count', { count: list.storyCount });
  const seenBy = t(list.isPublic ? 'lists.seenBy.public' : 'lists.seenBy.onlyYou');
  return (
    <div aria-live="polite">
      <MetaLine facts={[{ text: howFull }, { text: seenBy }]} />
    </div>
  );
}

/** The top of the page: breadcrumb, the meta line, the name and, for a visitor, whose it is. */
function ListHeader({ list, places }: { list: ReadingListDetails; places: number }) {
  return (
    <header className="flex flex-col gap-3">
      <ListBreadcrumb name={list.name} />
      <ListFacts list={list} places={places} />
      <h1 className="m-0 type-title lg:type-display break-words text-ink-heading">{list.name}</h1>
      {!list.isOwn && <OwnerLine list={list} />}
    </header>
  );
}

/** The note under the owner's books: what a public bookshelf shows (the drop-down's hint). */
function AudienceNote() {
  const { t } = useLibraryTranslation();
  return (
    <p
      id="reading-list-audience-hint"
      className="m-0 rounded-card border border-border bg-surface px-4 py-3 type-body text-ink-muted"
    >
      {t('lists.page.audienceHint')}
    </p>
  );
}

/** The page once the address holds a well-formed ID. */
function KnownAddressPage({ listId }: { listId: string }) {
  const { t } = useLibraryTranslation();
  const { list, loadFailed } = useReadingList(listId);
  const limits = useBookshelfLimits();
  if (loadFailed) return <Notice tone="error">{t('lists.loadFailed')}</Notice>;
  if (list === undefined) return null;
  if (list === null) return <UnknownReadingList />;
  return (
    <>
      <title>
        {t('lists.page.documentTitle', { name: list.name, productName: brand.productName })}
      </title>
      <ListHeader list={list} places={limits.books} />
      {list.isOwn && <ReadingListOwnerTools list={list} />}
      <BookshelfBooks list={list} places={limits.books} />
      {list.isOwn && <AudienceNote />}
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
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-12">
      {isReadingListId(listId) ? (
        <KnownAddressPage key={listId} listId={listId} />
      ) : (
        <UnknownReadingList />
      )}
    </PageContainer>
  );
}
