/**
 * PostEditForm: changing one's own post in place, and on post #1 the thread's title too (bundle
 * FORUMS-1, part b; S1-E8-02 criterion 4).
 *
 * After saving, the post shows "Edited" and moderators can read the earlier version. A refusal
 * is said under the field it is about.
 * Who uses it: ForumPostCard. What it calls: useEditPost → edit_forum_post().
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { ForumPost } from '../api/forumThreads';
import { useEditPost } from '../hooks/useForumWrites';
import { failureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { PostEditor } from './PostEditor';

/** What the form needs. */
export interface PostEditFormProps {
  post: ForumPost;
  /** The thread's title, when this is post #1 (its title can change with it); otherwise null. */
  threadTitle: string | null;
  /** Called after saving and on Cancel. */
  onDone: () => void;
}

/**
 * Renders the form.
 *
 * @returns the title (post #1 only), the editor and Save and Cancel
 */
export function PostEditForm({ post, threadTitle, onDone }: PostEditFormProps) {
  const { t } = useForumsTranslation();
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState(threadTitle ?? '');
  const [body, setBody] = useState(post.body ?? '');
  const editing = useEditPost();
  const messages = failureMessages(editing.failure, t);

  /** Saves the change, then closes the form. */
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await editing.run({ postId: post.id, body, title: threadTitle === null ? null : title });
      onDone();
    } catch {
      // The refusal shows from editing.failure.
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
      {threadTitle !== null && (
        <TextInput
          id={titleId}
          label={t('editor.title')}
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          errorMessage={messages.title}
        />
      )}
      <PostEditor
        id={bodyId}
        label={t('editor.body')}
        value={body}
        onChange={setBody}
        problem={messages.body}
      />
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          {t('post.cancel')}
        </Button>
        <Button type="submit" disabled={editing.isRunning}>
          {t('post.save')}
        </Button>
      </div>
    </form>
  );
}
