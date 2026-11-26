/**
 * ClassInvitePanel: the class invite at /class/:code (story S1-E8-11 criterion 5; board
 * G02-ClassInvite, user story 8.2).
 *
 * Who shows it: JoinClassPage, when the address carries a code.
 * What it shows (board G02): one box running the column's width with "Class space" as the meta
 * line, the class's name as the page title, the line about the class and "Join the class" with
 * the text button "Not now" (back to Together); under it "What the class sees about you".
 * The board's school and teacher in the meta line and "Ms Ionescu invited you" are left out:
 * class_invite_preview() shows only the class's name before joining, so a code can never reveal
 * the school or the teacher (S1-E8-11; docs/board-fixes.md, G8e and BOOKS-8).
 * A signed-out visitor gets "Get in to join" and, while sign-up is by invitation, "Create an
 * account with this code" (IDEAS-3c); a pupil whose account isn't ready yet (a parent still to
 * agree) is told they are in and will read once it is. An ended or unknown code is said plainly.
 * What it calls: useClassInvitePreview → class_invite_preview(); useJoinClass →
 * join_class_space(); ClassJoinActions.
 */
import { useState } from 'react';

import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';

import { useClassInvitePreview, useJoinClass } from '../hooks/useClassSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassJoinActions } from './ClassJoinActions';

/** The box the invite sits in: the one box surface, 48 px inside on desktops (board G02). */
const panelClasses =
  'flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card md:p-8 lg:p-12';

/**
 * What the box says under the title: checking, ended, unknown, a load error, the "you're in"
 * note, or the line and the buttons.
 *
 * @param props.code - the code from the link
 * @returns the box's body
 */
function InviteBody({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const preview = useClassInvitePreview(code);
  const joining = useJoinClass();
  // Step 1: once a pupil who can't read yet has joined, say so (user story 8.2).
  if (joining.joined !== null && !joining.joined.canRead) {
    return <Notice tone="success">{t('joinClass.joinedWaiting')}</Notice>;
  }
  // Step 2: the preview's answer: an error, still checking, ended, unknown or valid.
  if (preview.isError) return <Notice tone="error">{t('joinClass.loadFailed')}</Notice>;
  if (preview.data === undefined) return <p className="m-0 text-ink-muted">{t('joinClass.checking')}</p>;
  if (preview.data.status === 'ended') return <Notice tone="info">{t('joinClass.ended')}</Notice>;
  if (preview.data.status === 'unknown') return <Notice tone="info">{t('joinClass.unknown')}</Notice>;
  return (
    <>
      <p className="m-0 type-body text-ink">{t('joinClass.invitedBody')}</p>
      <ClassJoinActions code={code} joining={joining} />
    </>
  );
}

/**
 * The box's title: the class's name once the code is known to work, otherwise "Join a class".
 * The name is remembered, because joining may use the code's last place and the preview then
 * says it ended while the box should still name the class.
 *
 * @param props.code - the code from the link
 * @returns the h1
 */
function InviteTitle({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const preview = useClassInvitePreview(code);
  const [className, setClassName] = useState<string | null>(null);
  const validName = preview.data?.status === 'valid' ? preview.data.space.name : null;
  if (validName !== null && validName !== className) setClassName(validName);
  return <h1 className="page-title m-0 break-words">{className ?? t('joinClass.title')}</h1>;
}

/**
 * Renders the invite and the privacy note under it.
 *
 * @param props.code - the code from the link
 * @returns the box and the "What the class sees about you" section
 */
export function ClassInvitePanel({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="class-invite-title" className={panelClasses}>
        <MetaLine facts={[{ text: t('joinClass.metaClassSpace'), kind: 'state' }]} />
        <div id="class-invite-title">
          <InviteTitle code={code} />
        </div>
        <InviteBody code={code} />
      </section>
      <section aria-labelledby="class-invite-seen" className="flex flex-col gap-2">
        <h2 id="class-invite-seen" className="m-0 type-subheading text-ink-heading">
          {t('joinClass.seenTitle')}
        </h2>
        <p className="m-0 type-body text-ink-muted">{t('joinClass.seenBody')}</p>
      </section>
    </div>
  );
}
