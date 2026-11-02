/**
 * SpaceReplyNote: why a reader can't reply in a space's thread, with the way to the space
 * (bundle FORUMS-2, part a; story S1-E8-06).
 *
 * A space takes posts only from its members, or from anyone in its age group when the owner
 * chose "Anyone with an account". So instead of "Your account can't write yet" the reply card
 * says what to do: join the space, wait for the owner, or nothing (another age group).
 * Who shows it: ReplyForm, for a signed-in reader who can't reply in a thread in a space.
 * What it calls: useSpace → space_page(), for the reader's membership.
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { useSpace } from '@/features/spaces/hooks/useSpaces';

import type { ForumThreadSpace } from '../api/forumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Which note fits the reader: asked to join, may join, or can't join.
 *
 * @param viewer - the reader's membership and whether they may join, once the space has loaded
 * @returns the translation key under "reply"
 */
function noteKey(viewer: { membership: string | null; canJoin: boolean } | undefined): string {
  if (viewer?.membership === 'pending') return 'reply.pendingSpace';
  if (viewer === undefined || viewer.canJoin) return 'reply.joinSpace';
  return 'reply.otherAgeGroup';
}

/**
 * Renders the note.
 *
 * @param props.space - the thread's space
 * @returns one line with the space's name as a link
 */
export function SpaceReplyNote({ space }: { space: ForumThreadSpace }) {
  const { t } = useForumsTranslation();
  const read = useSpace(space.slug);
  const viewer = read.data?.viewer;
  return (
    <p className="m-0 text-base text-body">
      <Trans
        t={t}
        i18nKey={noteKey(viewer)}
        values={{ space: space.name }}
        components={{
          space: <Link to={`/spaces/${space.slug}`} className="text-link underline" />,
        }}
      />
    </p>
  );
}
