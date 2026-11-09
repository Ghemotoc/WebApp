/**
 * NewThreadPage: start a thread in a forum or subforum, at /forums/:forumSlug/new (bundle
 * FORUMS-1, part b; S1-E8-02; board 5.2's reply card, used for the first post).
 *
 * Who shows it: the router; "Start a thread" on a forum links here.
 * What it shows: the breadcrumb, a title field and the post editor, then "Post the thread". A
 * refusal is said in plain words under the field it is about, or above the buttons. On success
 * the reader lands on the new thread. Signed out, it says to log in; in a category it says to
 * pick one of its forums.
 * What it calls: useForumIndex (the forum and its path), NewThreadForm → start_forum_thread().
 * Liquid glass (bundle G8a; board ForumNew): the forum as an eyebrow, the large title, the form
 * in a glass card and the forum rules beside it.
 * A space's forum has no page here: /forums/space-<name>/new moves to the space's own
 * /spaces/<name>/new (FORUMS-2a, S1-E8-06). IDEAS-3f: "Discuss in the forums" in the chapter reader
 * opens this page with a passage in the router's state, which the post starts with
 * (IDEA-20261102-10).
 */
import { Link, Navigate, useLocation, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { initialBodyFrom } from '@/features/sharing/lib/passageThread';

import type { ForumEntry } from '../api/forumIndex';
import { useForumIndex } from '../hooks/useForumIndex';
import { forumPath } from '../lib/forumTree';
import { spaceSlugOfForum } from '../lib/spaceForums';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumBreadcrumb } from './ForumBreadcrumb';
import { ForumRulesCard } from './ForumRulesCard';
import { NewThreadForm } from './NewThreadForm';

/**
 * What goes in the card: the form, or why there is none.
 *
 * @param props.forum - the forum
 * @returns the form, the log-in note or the category note
 */
function NewThreadBody({ forum }: { forum: ForumEntry }) {
  const { t } = useForumsTranslation();
  const { userId, isKnown } = useSession();
  // A passage sent from the chapter reader starts the post (IDEAS-3f).
  const initialBody = initialBodyFrom(useLocation().state);
  if (!isKnown) return null;
  if (userId === null)
    return (
      <p className="m-0 text-base text-body">
        <Link to="/sign-in" className="text-link underline">
          {t('newThread.logIn')}
        </Link>
      </p>
    );
  if (forum.level === 0) return <Notice tone="info">{t('failures.category')}</Notice>;
  return (
    <NewThreadForm
      forumSlug={forum.slug}
      cancelTo={`/forums/${forum.slug}`}
      initialBody={initialBody}
    />
  );
}

/**
 * Renders the page.
 *
 * @returns the breadcrumb and the card, or a "not found" note
 */
export function NewThreadPage() {
  const { t } = useForumsTranslation();
  const { forumSlug = '' } = useParams();
  const { entries, loadFailed } = useForumIndex();
  const path = entries === null ? [] : forumPath(entries, forumSlug);
  const forum = path.at(-1);
  const spaceSlug = spaceSlugOfForum(forumSlug);
  if (spaceSlug !== null) return <Navigate to={`/spaces/${spaceSlug}/new`} replace />;
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {entries !== null && forum === undefined && (
        <h1 className="m-0 text-3xl font-extrabold">{t('forum.notFound')}</h1>
      )}
      {forum !== undefined && (
        <>
          <ForumBreadcrumb path={path} current={t('newThread.eyebrow')} />
          <header className="flex max-w-[860px] flex-col gap-3">
            <Eyebrow>{forum.name}</Eyebrow>
            <h1 className="page-title">{t('newThread.heading', { forum: forum.name })}</h1>
          </header>
          {/* The form in a glass card, the forum rules beside it (board ForumNew). */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <section
              aria-label={t('newThread.eyebrow')}
              className="flex min-w-0 flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-7"
            >
              <NewThreadBody forum={forum} />
            </section>
            <ForumRulesCard />
          </div>
        </>
      )}
    </PageContainer>
  );
}
