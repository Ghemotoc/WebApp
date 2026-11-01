/**
 * ForumPage: one forum or subforum, at /forums/:forumSlug (bundle FORUMS-1, part a; S1-E8-01).
 *
 * Who shows it: the router; the forum names on the index link here. Anyone can read it.
 * What it shows: the breadcrumb (Forums › category › forum), the forum's name and description,
 * the subforums inside it as rows like the index's, and its threads with "Start a thread"
 * (ThreadList, part b, S1-E8-02). A category's address shows its forums the same way; threads
 * live in the forums inside it. Part d adds "Mark as read" for the forum and those inside it
 * (MarkReadButton, S1-E8-04).
 * What it calls: useForumIndex (the same read as the index, so moving between them is instant);
 * lib/forumTree.ts finds the forum, its path and its children; ForumBreadcrumb and ThreadList.
 */
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ForumEntry } from '../api/forumIndex';
import { useForumIndex } from '../hooks/useForumIndex';
import { childrenOf, forumPath } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumBreadcrumb } from './ForumBreadcrumb';
import { MarkReadButton } from './MarkReadButton';
import { ForumRow } from './ForumRow';
import { ThreadList } from './ThreadList';

/**
 * The forums inside this one, as rows with their own subforums.
 *
 * @returns a card with a heading and the rows, or nothing when there are none
 */
function ForumChildren({ entries, forum }: { entries: ForumEntry[]; forum: ForumEntry }) {
  const { t } = useForumsTranslation();
  const children = childrenOf(entries, forum.id);
  if (children.length === 0) return null;
  return (
    <section
      aria-labelledby="forum-children-heading"
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <h2
        id="forum-children-heading"
        className="m-0 border-b border-border px-5 py-4 font-heading text-xl font-bold text-heading md:px-7"
      >
        {t('forum.inside')}
      </h2>
      <ul className="m-0 list-none p-0">
        {children.map((child) => (
          <ForumRow key={child.id} forum={child} subforums={childrenOf(entries, child.id)} />
        ))}
      </ul>
    </section>
  );
}

/**
 * One forum, once the index has loaded and the address names a live forum.
 *
 * @returns the breadcrumb, the heading, the forums inside it and the threads
 */
function ForumContent({ entries, path }: { entries: ForumEntry[]; path: ForumEntry[] }) {
  const { t } = useForumsTranslation();
  const forum = path.at(-1);
  if (forum === undefined) return null;
  return (
    <>
      <ForumBreadcrumb path={path} />
      <header className="flex max-w-[720px] flex-col gap-2">
        <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-tight font-extrabold">
          {forum.name}
        </h1>
        {forum.description !== '' && <p className="m-0 text-base text-body">{forum.description}</p>}
        <div>
          <MarkReadButton forumSlug={forum.slug} forumName={forum.name} />
        </div>
      </header>
      <ForumChildren entries={entries} forum={forum} />
      {forum.level > 0 && <ThreadList forumSlug={forum.slug} />}
      {forum.level === 0 && <p className="m-0 text-base text-body">{t('list.categoryNote')}</p>}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the forum, a "not found" note with the way back, or a load error
 */
export function ForumPage() {
  const { t } = useForumsTranslation();
  const { forumSlug = '' } = useParams();
  const { entries, loadFailed } = useForumIndex();
  const path = entries === null ? [] : forumPath(entries, forumSlug);
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {entries !== null && path.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <h1 className="m-0 text-3xl font-extrabold">{t('forum.notFound')}</h1>
          <Link to="/forums" className="inline-flex min-h-6 items-center text-link underline">
            {t('forum.back')}
          </Link>
        </div>
      )}
      {entries !== null && path.length > 0 && <ForumContent entries={entries} path={path} />}
    </PageContainer>
  );
}
