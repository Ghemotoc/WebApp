/**
 * PostSpaceModeration: a space's owner and moderators hide a reply, show it again or move it to
 * another thread of the space (bundle GAPS-10; story S1-E8-07; design/boards/Space.dc.html:
 * moderators "hide and move posts").
 *
 * A "Moderate" button under the reply opens the tools in place: a reason (it goes in the space's
 * log), "Hide" or "Show again", and a field for the thread that takes the reply with "Move".
 * After a move the moderator lands on the reply in its new thread. The server decides who may do
 * any of this (space_hide_forum_post() and its siblings); the button showing is a convenience.
 * Who uses it: ForumPostCard, only when the post says the reader may moderate it.
 * What it calls: useModerateSpacePost → api/spacePostModeration.ts.
 */
import { useId, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { ForumPost } from '../api/forumThreads';
import type { SpacePostChange } from '../api/spacePostModeration';
import { useModerateSpacePost } from '../hooks/useSpacePostModeration';
import { postAddress, threadNumberFrom } from '../lib/forumAddresses';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the tools need. */
export interface PostSpaceModerationProps {
  post: ForumPost;
  /** The space's forum, for the reply's address after a move. */
  forumSlug: string;
}

/** What the open tools need on top. */
interface ToolsProps extends PostSpaceModerationProps {
  /** The region's id, which the "Moderate" button controls. */
  id: string;
  /** Closes the tools after a change the server took. */
  onDone: () => void;
}

/** What the move field needs. */
interface MoveFieldProps {
  id: string;
  /** What the moderator typed: a thread's number or address. */
  typed: string;
  onType: (text: string) => void;
  /** No reason or no thread yet, or a change is being saved: the button waits. */
  isWaiting: boolean;
  onMove: () => void;
}

/**
 * "Thread that takes the post" and "Move post".
 *
 * @returns the field and its button
 */
function MoveField({ id, typed, onType, isWaiting, onMove }: MoveFieldProps) {
  const { t } = useForumsTranslation();
  return (
    <>
      <TextInput
        id={id}
        label={t('spaceModeration.moveLabel')}
        hint={t('spaceModeration.moveHint')}
        inputMode="url"
        value={typed}
        onChange={(event) => onType(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={isWaiting} onClick={onMove}>
          {t('spaceModeration.move')}
        </Button>
      </div>
    </>
  );
}

/**
 * The reason, the hide or show button, and the move field.
 *
 * @returns the open tools
 */
function Tools({ post, forumSlug, id, onDone }: ToolsProps) {
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [typedThread, setTypedThread] = useState('');
  const moderating = useModerateSpacePost();
  const toThreadNumber = threadNumberFrom(typedThread);
  const isWaiting = reason.trim() === '' || moderating.isRunning;
  const isHidden = post.state === 'hidden';

  /** Makes one change with the reason typed; a moved reply takes the moderator with it. */
  async function change(action: SpacePostChange['action']) {
    try {
      const where = { action, postId: post.id, reason };
      const place = await moderating.run(
        toThreadNumber === null ? where : { ...where, toThreadNumber },
      );
      onDone();
      if (place !== null)
        void navigate(postAddress(forumSlug, place.threadNumber, place.postNumber));
    } catch {
      // The refusal shows from moderating.failure.
    }
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={t('spaceModeration.toggleLabel', { number: post.number })}
      className="flex w-full flex-col gap-3 border-t border-border pt-4"
    >
      <Textarea
        id={`${id}-reason`}
        label={t('spaceModeration.reason')}
        hint={t('spaceModeration.reasonHint')}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={isWaiting}
          onClick={() => void change(isHidden ? 'show' : 'hide')}
        >
          {t(isHidden ? 'spaceModeration.show' : 'spaceModeration.hide')}
        </Button>
      </div>
      <MoveField
        id={`${id}-thread`}
        typed={typedThread}
        onType={setTypedThread}
        isWaiting={isWaiting || toThreadNumber === null}
        onMove={() => void change('move')}
      />
      {moderating.failure !== null && (
        <Notice tone="error">{t(`spaceModeration.failures.${moderating.failure}`)}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the "Moderate" button and, once pressed, the tools.
 *
 * @returns the button and tools, or nothing for a reader who may not moderate this reply
 */
export function PostSpaceModeration({ post, forumSlug }: PostSpaceModerationProps) {
  const { t } = useForumsTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const regionId = useId();
  if (!post.canSpaceModerate) return null;
  return (
    <div className="flex flex-col items-end gap-3">
      <Button
        variant="secondary"
        aria-expanded={isOpen}
        aria-controls={regionId}
        aria-label={t('spaceModeration.toggleLabel', { number: post.number })}
        onClick={() => setIsOpen(!isOpen)}
      >
        {t('spaceModeration.toggle')}
      </Button>
      {isOpen && (
        <Tools post={post} forumSlug={forumSlug} id={regionId} onDone={() => setIsOpen(false)} />
      )}
    </div>
  );
}
