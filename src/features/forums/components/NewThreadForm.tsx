/**
 * NewThreadForm: the forum (when it is picked here), a title, the first post, "Post the thread",
 * "Preview" and "Cancel" (bundle FORUMS-1, part b; S1-E8-02; moved to its own file in FORUMS-2a
 * so a space's new-thread page uses it too, S1-E8-06; redrawn as board F04 in BOOKS-7, user
 * story 7.4).
 *
 * "Post the thread" is never greyed out: pressed with something missing, it says what beside the
 * field ("Pick a forum.", "Add a title.", "Write the first post.") and moves the focus to the
 * first one (design books item 9, useMissingField). "Preview" shows the post as it will look.
 * The words are kept on this device until posted (useThreadDraft); "Cancel" with words typed asks
 * "Leave without posting?" first (LeaveThreadDialog). A refusal from the database is said under
 * the field it is about, or above the buttons. On success the reader lands on the new thread.
 * IDEAS-3f lets the page fill the post in first: a passage quoted from a chapter with its link.
 * Who shows it: NewThreadPage (a forum) and SpaceNewThreadPage (a space).
 * What it calls: useStartThread → start_forum_thread().
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks. Before an under-18's first post,
 * RulesWalkthrough shows four short rules first (MUST-1c), keeping the words in the box.
 */
import { useId, useState } from 'react';
import { useNavigate } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import type { SelectOption } from '@/components/ui/Select';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';
import { RulesWalkthrough } from '@/features/safety/components/RulesWalkthrough';
import { useRulesBeforeSubmit } from '@/features/safety/hooks/useRulesWalkthrough';

import { useStartThread } from '../hooks/useForumWrites';
import { useNewThreadChecks } from '../hooks/useNewThreadChecks';
import { useThreadDraft } from '../hooks/useThreadDraft';
import { failureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { NewThreadButtons } from './NewThreadButtons';
import { NewThreadFields } from './NewThreadFields';
import { ReplyPreview } from './ReplyPreview';

/** What the form needs. */
export interface NewThreadFormProps {
  /** The forum the thread goes in (a space's forum included); '' while none is picked. */
  forumSlug: string;
  /** Where "Cancel" goes back to. */
  cancelTo: string;
  /** Words already in the post, such as a chapter passage (IDEAS-3f); empty when none. */
  initialBody?: string;
  /** The Forum drop-down's choices, when the forum is picked on this page (from Together). */
  forumChoice?: { options: SelectOption[]; onChange: (forumSlug: string) => void };
}

/**
 * Renders the form.
 *
 * @returns the fields, the preview, the refusal, the buttons and the leave dialog
 */
export function NewThreadForm(props: NewThreadFormProps) {
  const { forumSlug, cancelTo, initialBody = '', forumChoice } = props;
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const ids = { forum: useId(), title: useId(), body: useId() };
  const draft = useThreadDraft(forumSlug, initialBody);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const starting = useStartThread();
  const messages = failureMessages(starting.failure, t);
  // Design books item 9: each missing field is said beside it (user story 7.4).
  const hasForumChoice = forumChoice !== undefined;
  const checks = useNewThreadChecks({ ids, forumSlug, ...draft, hasForumChoice });
  // MUST-1b: asks "Post anyway?" before words that look like contact details go out.
  const gate = usePersonalDetailsGate({ text: `${draft.title}\n${draft.body}`, sendNow });
  // MUST-1c: the rules walkthrough before an under-18's first post, then the gate.
  const first = useRulesBeforeSubmit(gate.submit);

  /** Posts the thread, forgets the draft, then opens the thread. */
  async function sendNow() {
    try {
      const threadNumber = await starting.run({ forumSlug, ...draft });
      draft.forget();
      void navigate(`/forums/${forumSlug}/${threadNumber}`);
    } catch {
      // The refusal shows from starting.failure.
    }
  }

  /** Stops the send when a field is missing; otherwise the rules and the gate take over. */
  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (!checks.isReady()) {
      event.preventDefault();
      return;
    }
    first.submit(event);
  }

  /** Goes back; the draft stays on this device until the thread is posted (user story 7.4). */
  function leave() {
    void navigate(cancelTo);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <NewThreadFields
        ids={ids}
        draft={draft}
        forumSlug={forumSlug}
        forumChoice={forumChoice}
        whileEditing={gate.whileEditing}
        problems={checks.problemsFor(messages)}
      />
      <RulesWalkthrough
        walkthrough={first.rules}
        onClosed={() => document.getElementById(ids.body)?.focus()}
      />
      <PersonalDetailsGateNote gate={gate} isSending={starting.isRunning} />
      {isPreviewing && <ReplyPreview text={draft.body} />}
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <NewThreadButtons
        isSending={starting.isRunning}
        isPreviewing={isPreviewing}
        onTogglePreview={() => setIsPreviewing(!isPreviewing)}
        hasWords={draft.title.trim() !== '' || draft.body.trim() !== ''}
        onLeave={leave}
      />
    </form>
  );
}
