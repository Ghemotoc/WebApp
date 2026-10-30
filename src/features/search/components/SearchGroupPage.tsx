/**
 * SearchGroupPage: every writer or every tag a search found, the See all page of those groups
 * (story S1-E5-04, fourth criterion; the stories group uses the shared story list page).
 *
 * Who shows it: the router, at /search/writers?q=… and /search/tags?q=… (each group's "View
 * more"). What it shows: a way back to the search, the title with the count, the cards in a grid
 * and "Load more". What it calls: useFoundWritersList() or useFoundTagsList().
 */
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';

import { useFoundTagsList, useFoundWritersList } from '../hooks/useSearchGroupList';
import { searchAddress } from '../lib/searchAddresses';
import { useSearchTranslation } from '../registerSearchTranslations';

import { TagResultCard } from './TagResultCard';
import { WriterResultCard } from './WriterResultCard';

/** What the shared layout needs from one group's list. */
interface GroupListView {
  title: string;
  eyebrow: string;
  total: number | null;
  cards: { key: string; content: ReactNode }[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  loadFailed: boolean;
}

/** The header, the grid and "Load more". */
function GroupListLayout({ term, view }: { term: string; view: GroupListView }) {
  const { t } = useSearchTranslation();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-14">
      <title>{`${view.title} · ${brand.productName}`}</title>
      <Link to={searchAddress(term)} className="w-fit text-sm text-link underline-offset-2">
        {t('seeAll.backToSearch')}
      </Link>
      <header className="flex flex-col gap-2">
        <Eyebrow>{view.eyebrow}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,5vw,52px)] leading-[1.05] font-extrabold break-words text-heading">
          {view.title}
        </h1>
        <p aria-live="polite" className="m-0 min-h-6 text-base text-body">
          {view.total === null ? '' : t('seeAll.count', { count: view.total })}
        </p>
      </header>
      {view.loadFailed && <Notice tone="error">{t('page.loadFailed')}</Notice>}
      {view.total === 0 && <p className="m-0 text-body">{t('seeAll.none')}</p>}
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 p-0">
        {view.cards.map((card) => (
          <li key={card.key}>{card.content}</li>
        ))}
      </ul>
      {view.hasMore && (
        <Button
          variant="secondary"
          className="self-center"
          disabled={view.isLoadingMore}
          onClick={view.loadMore}
        >
          {view.isLoadingMore ? t('seeAll.loadingMore') : t('seeAll.loadMore')}
        </Button>
      )}
    </PageContainer>
  );
}

/** Every writer a search found. */
function WritersPage({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  const list = useFoundWritersList(term);
  const cards = list.items.map((writer) => ({
    key: writer.handle,
    content: <WriterResultCard writer={writer} isFluid />,
  }));
  return (
    <GroupListLayout
      term={term}
      view={{
        ...list,
        cards,
        title: t('seeAll.writersTitle', { term }),
        eyebrow: t('seeAll.writersEyebrow'),
      }}
    />
  );
}

/** Every tag a search found. */
function TagsPage({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  const list = useFoundTagsList(term);
  const cards = list.items.map((tag) => ({
    key: tag.name,
    content: <TagResultCard tag={tag} isFluid />,
  }));
  return (
    <GroupListLayout
      term={term}
      view={{
        ...list,
        cards,
        title: t('seeAll.tagsTitle', { term }),
        eyebrow: t('seeAll.tagsEyebrow'),
      }}
    />
  );
}

/**
 * Renders the page for one group.
 *
 * @param props.group - writers or tags (the route decides)
 * @returns the page
 */
export function SearchGroupPage({ group }: { group: 'writers' | 'tags' }) {
  const [search] = useSearchParams();
  const term = (search.get('q') ?? '').trim();
  return group === 'writers' ? <WritersPage term={term} /> : <TagsPage term={term} />;
}
