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
 * Not yet, as noted in docs/board-fixes.md: New thread (part b), search (part f), "Mark all as
 * read" and "New for you" (part d), Spaces (bundle FORUMS-2) and the ad slots (S1-E12-01).
 * What it calls: useForumIndex → forum_index(); lib/forumTree.ts puts it in order.
 */
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useForumIndex } from '../hooks/useForumIndex';
import { buildForumTree, type ForumCategory } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumCategorySection } from './ForumCategorySection';
import { ForumRulesCard } from './ForumRulesCard';

/** The heading block: the eyebrow with the count, the title and the intro. */
function ForumsHeader({ threadCount }: { threadCount: number }) {
  const { t } = useForumsTranslation();
  return (
    <header className="relative flex max-w-[640px] flex-col gap-2">
      <Eyebrow>{t('eyebrow', { count: threadCount })}</Eyebrow>
      <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-none font-extrabold tracking-[-0.025em]">
        {t('title')}
      </h1>
      <p className="m-0 text-base leading-relaxed text-body">{t('intro')}</p>
      <Doodle
        name="music-notes"
        kind="background"
        hideBelow="wide"
        className="absolute -top-4 -right-40 w-[72px] rotate-6"
      />
    </header>
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
      {groups.map((group) => (
        <ForumCategorySection key={group.category.id} group={group} />
      ))}
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ForumCategories groups={groups} loadFailed={loadFailed} />
        </div>
        <aside className="flex flex-col gap-6">
          <ForumRulesCard />
        </aside>
      </div>
    </PageContainer>
  );
}
