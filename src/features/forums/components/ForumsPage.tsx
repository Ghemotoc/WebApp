/**
 * ForumsPage: the forum index, screen 5.1 (bundle FORUMS-1, part a; story S1-E8-01;
 * design/boards/Forums.dc.html).
 *
 * Who shows it: the router, at /forums; the top bar's "Forums" link leads here. Anyone can read
 * it, signed out included.
 * What it shows, as on the board: the eyebrow with the number of threads, "Forums", the intro,
 * then each category (ForumCategorySection) in the order of Q45 (pinned categories first), the
 * line that threads never close on their own (S1-E8-01, third criterion), and beside them
 * "Forum rules in short".
 * Liquid glass (bundle G8a; board Forums): the large title, the actions at the heading's right
 * and a 340 px side column.
 * Part d (S1-E8-04) adds, for a signed-in reader, "Mark all as read", the dots' legend and the
 * "New for you" card.
 * Part f adds the search field under the heading (ForumSearchForm, S1-E8-10).
 * Bundle FORUMS-2, part a adds the Spaces card in the side column (SpacesCard, S1-E8-06).
 * The page's two ad slots (S1-E12-01): the wide one after the first category, as the board draws
 * it, and a side box in the side column.
 * What it calls: useForumIndex → forum_index(); lib/forumTree.ts puts it in order;
 * MarkReadButton, UnreadLegend and NewForYou.
 */
import { Fragment } from 'react';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useSession } from '@/features/auth/hooks/useSession';
import { SpacesCard } from '@/features/spaces/components/SpacesCard';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import { useForumIndex } from '../hooks/useForumIndex';
import { buildForumTree, type ForumCategory } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumCategorySection } from './ForumCategorySection';
import { ForumRulesCard } from './ForumRulesCard';
import { ForumSearchForm } from './ForumSearchForm';
import { MarkReadButton } from './MarkReadButton';
import { NewForYou } from './NewForYou';
import { UnreadCircle } from './UnreadDot';

/** The heading block: the eyebrow with the count, the title and the intro. */
function ForumsHeader({ threadCount }: { threadCount: number }) {
  const { t } = useForumsTranslation();
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-[680px] flex-col gap-3">
        <Eyebrow>{t('eyebrow', { count: threadCount })}</Eyebrow>
        <h1 className="page-title">{t('title')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('intro')}</p>
      </div>
      {/* The board puts the page's actions at the right of the heading on a wide screen. */}
      <div className="shrink-0">
        <MarkReadButton forumSlug={null} />
      </div>
    </header>
  );
}

/**
 * What the dots mean, for a signed-in reader (board 5.1's legend; S1-E8-04).
 *
 * @returns the two entries, or nothing for a visitor
 */
function UnreadLegend() {
  const { t } = useForumsTranslation();
  const { userId } = useSession();
  if (userId === null) return null;
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-body">
      <span className="inline-flex items-center gap-2">
        <UnreadCircle isNew />
        {t('unread.new')}
      </span>
      <span className="inline-flex items-center gap-2">
        <UnreadCircle isNew={false} />
        {t('unread.none')}
      </span>
    </p>
  );
}

/** The categories, or a note when there are none or they didn't load. */
function ForumCategories({
  groups,
  loadFailed,
}: {
  groups: ForumCategory[] | null;
  loadFailed: boolean;
}) {
  const { t } = useForumsTranslation();
  if (loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (groups === null) return null;
  if (groups.length === 0) return <p className="m-0 text-base text-body">{t('empty')}</p>;
  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.category.id}>
          <ForumCategorySection group={group} />
          {/* The wide ad sits after the first category, as on the board (S1-E12-01). */}
          {index === 0 && <PageAdSlot pageKey="forums" position={1} />}
        </Fragment>
      ))}
      <UnreadLegend />
      <p className="m-0 text-sm text-body">{t('neverClose')}</p>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the forum index
 */
export function ForumsPage() {
  const { entries, loadFailed } = useForumIndex();
  const groups = entries === null ? null : buildForumTree(entries);
  // The eyebrow counts the threads in every forum and subforum (categories hold none).
  const threadCount = (entries ?? []).reduce((total, entry) => total + entry.threadCount, 0);
  return (
    <PageContainer className="flex flex-col gap-8 py-10">
      <ForumsHeader threadCount={threadCount} />
      <ForumSearchForm />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ForumCategories groups={groups} loadFailed={loadFailed} />
        </div>
        <aside className="flex flex-col gap-6">
          <NewForYou />
          <SpacesCard />
          <ForumRulesCard />
          <PageAdSlot pageKey="forums" position={2} isSpaceReserved={false} />
        </aside>
      </div>
    </PageContainer>
  );
}
