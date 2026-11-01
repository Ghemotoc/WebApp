/**
 * NewThreadPage: start a thread in a forum or subforum, at /forums/:forumSlug/new (bundle
 * FORUMS-1, part b; S1-E8-02; board 5.2's reply card, used for the first post).
 *
 * Who shows it: the router; "Start a thread" on a forum links here.
 * What it shows: the breadcrumb, a title field and the post editor, then "Post the thread". A
 * refusal is said in plain words under the field it is about, or above the buttons. On success
 * the reader lands on the new thread. Signed out, it says to log in; in a category it says to
 * pick one of its forums.
 * What it calls: useForumIndex (the forum and its path), useStartThread → start_forum_thread().
 */
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { useSession } from '@/features/auth/hooks/useSession';

import type { ForumEntry } from '../api/forumIndex';
import { useForumIndex } from '../hooks/useForumIndex';
import { useStartThread } from '../hooks/useForumWrites';
import { failureMessages } from '../lib/forumFailures';
import { forumPath } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumBreadcrumb } from './ForumBreadcrumb';
import { PostEditor } from './PostEditor';

/**
 * The form, for a forum the reader may start a thread in.
 *
 * @param props.forum - the forum
 * @returns the title, the editor, the refusal and the buttons
 */
function NewThreadForm({ forum }: { forum: ForumEntry }) {
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const starting = useStartThread();
  const messages = failureMessages(starting.failure, t);

  /** Posts the thread, then opens it. */
  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      const threadNumber = await starting.run({ forumSlug: forum.slug, title, body });
      void navigate(`/forums/${forum.slug}/${threadNumber}`);
    } catch {
      // The refusal shows from starting.failure.
    }
  }

  return (
    <form onSubmit={(event) => void send(event)} className="flex flex-col gap-5">
      <TextInput
        id={titleId}
        label={t('editor.title')}
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
        errorMessage={messages.title}
      />
      <PostEditor
        id={bodyId}
        label={t('editor.body')}
        value={body}
        onChange={setBody}
        problem={messages.body}
      />
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to={`/forums/${forum.slug}`}
          className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('newThread.cancel')}
        </Link>
        <Button type="submit" disabled={starting.isRunning}>
          {t('newThread.post')}
        </Button>
      </div>
    </form>
  );
}

/**
 * What goes in the card: the form, or why there is none.
 *
 * @param props.forum - the forum
 * @returns the form, the log-in note or the category note
 */
function NewThreadBody({ forum }: { forum: ForumEntry }) {
  const { t } = useForumsTranslation();
  const { userId, isKnown } = useSession();
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
  return <NewThreadForm forum={forum} />;
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
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {entries !== null && forum === undefined && (
        <h1 className="m-0 text-3xl font-extrabold">{t('forum.notFound')}</h1>
      )}
      {forum !== undefined && (
        <>
          <ForumBreadcrumb path={path} current={t('newThread.eyebrow')} />
          <section className="flex max-w-[760px] flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-7">
            <div className="flex flex-col gap-1">
              <Eyebrow>{t('newThread.eyebrow')}</Eyebrow>
              <h1 className="m-0 font-heading text-[28px] leading-tight font-extrabold text-heading">
                {t('newThread.heading', { forum: forum.name })}
              </h1>
            </div>
            <NewThreadBody forum={forum} />
          </section>
        </>
      )}
    </PageContainer>
  );
}
