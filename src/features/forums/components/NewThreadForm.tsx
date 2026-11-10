/**
 * NewThreadForm: a title field, the post editor and "Post the thread" (bundle FORUMS-1, part b;
 * S1-E8-02; moved to its own file in FORUMS-2a so a space's new-thread page uses it too, S1-E8-06).
 *
 * A refusal is said in plain words under the field it is about, or above the buttons. On success
 * the reader lands on the new thread. IDEAS-3f lets the page fill the post in first: a passage
 * quoted from a chapter with its link (IDEA-20261102-10).
 * Who shows it: NewThreadPage (a forum) and SpaceNewThreadPage (a space).
 * What it calls: useStartThread → start_forum_thread().
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks. Before an under-18's first post,
 * RulesWalkthrough shows four short rules first (MUST-1c), keeping the words in the box.
 */
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';
import { RulesWalkthrough } from '@/features/safety/components/RulesWalkthrough';
import { useRulesBeforeSubmit } from '@/features/safety/hooks/useRulesWalkthrough';

import { useStartThread } from '../hooks/useForumWrites';
import { failureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { PostEditor } from './PostEditor';

/** What the form needs. */
export interface NewThreadFormProps {
  /** The forum the thread goes in (a space's forum included). */
  forumSlug: string;
  /** Where "Cancel" goes back to. */
  cancelTo: string;
  /** Words already in the post, such as a chapter passage (IDEAS-3f); empty when none. */
  initialBody?: string;
}

/**
 * Renders the form.
 *
 * @returns the title, the editor, the refusal and the buttons
 */
export function NewThreadForm({ forumSlug, cancelTo, initialBody = '' }: NewThreadFormProps) {
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(initialBody);
  const starting = useStartThread();
  const messages = failureMessages(starting.failure, t);

  // MUST-1b: asks "Post anyway?" before words that look like contact details go out.
  const gate = usePersonalDetailsGate({ text: `${title}\n${body}`, sendNow });
  // MUST-1c: the rules walkthrough before an under-18's first post, then the gate.
  const first = useRulesBeforeSubmit(gate.submit);

  /** Posts the thread, then opens it. */
  async function sendNow() {
    try {
      const threadNumber = await starting.run({ forumSlug, title, body });
      void navigate(`/forums/${forumSlug}/${threadNumber}`);
    } catch {
      // The refusal shows from starting.failure.
    }
  }

  return (
    <form onSubmit={first.submit} className="flex flex-col gap-5">
      <TextInput
        id={titleId}
        label={t('editor.title')}
        value={title}
        maxLength={120}
        onChange={(event) => gate.whileEditing(setTitle)(event.target.value)}
        errorMessage={messages.title}
      />
      <PostEditor
        id={bodyId}
        label={t('editor.body')}
        value={body}
        onChange={gate.whileEditing(setBody)}
        problem={messages.body}
      />
      <RulesWalkthrough
        walkthrough={first.rules}
        onClosed={() => document.getElementById(bodyId)?.focus()}
      />
      <PersonalDetailsGateNote gate={gate} isSending={starting.isRunning} />
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to={cancelTo}
          className="inline-flex h-11 items-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
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
