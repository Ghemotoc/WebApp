/**
 * SendInMessagesLink: "Send in Messages" under "Other ways" in the share dialogs (bundle GAPS-7,
 * part a; board 3.6 Share).
 *
 * It opens Messages with the link ready: the reader picks a chat (or starts one), the link sits
 * in the message box, and nothing is sent until they press Send. Only the story, chapter or
 * passage path travels in the address (lib/storyLinks.ts), never free text. A visitor doesn't see
 * it, because Messages needs an account; who may write to whom is still decided by the database
 * in the chat itself (S1-E9-03).
 * For a chapter, pressing it counts one share for the ranking, as copying the link does
 * (S1-E4-05, third criterion); a whole-story share isn't counted anywhere (IDEAS-1c).
 * Who uses it: ShareDialog and StoryShareDialog. What it calls: useSession, lib/storyLinks.ts
 * and, fetched on the press, lib/countShare.ts.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { useSession } from '@/features/auth/hooks/useSession';
import { messagesAddressForLink } from '@/lib/storyLinks';

import type { ChapterAddress } from '../api/sharing';

/** What the link needs. */
export interface SendInMessagesLinkProps {
  /** The full share link, as lib/shareLink.ts builds it. */
  link: string;
  /** The chapter whose share total goes up by one, or null for a whole story. */
  countedChapter: ChapterAddress | null;
}

/**
 * Renders the link for a signed-in reader.
 *
 * @returns the link, or nothing for a visitor or a link that isn't a story address
 */
export function SendInMessagesLink({ link, countedChapter }: SendInMessagesLinkProps) {
  const { t } = useTranslation('sharing');
  const { userId, isKnown } = useSession();
  const address = messagesAddressForLink(link);
  if (!isKnown || userId === null || address === null) return null;

  /** Counts the chapter share in the background; the counting code is fetched only now. */
  function countChapterShare() {
    if (countedChapter === null) return;
    void import('../lib/countShare').then((module) => module.countShare(countedChapter, 'message'));
  }

  return (
    <Link
      to={address}
      onClick={countChapterShare}
      className={buttonClassName({ variant: 'secondary' }, 'w-fit')}
    >
      <ActionIcon name="send" size={16} />
      {t('dialog.sendInMessages')}
    </Link>
  );
}
