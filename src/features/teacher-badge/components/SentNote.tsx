/**
 * SentNote: what happens next, after either way is sent (story S1-E2-11; board Onboarding 2.5,
 * step 3: the "Teacher badge · pending" note).
 *
 * Who shows it: TeacherBadgeForm, inside its live region, so a screen reader hears it once sent.
 */
import { useTranslation } from 'react-i18next';

import { TeacherBadgePill } from './TeacherBadgePill';

/** What the note says: the link went to an address, or the proof arrived. */
export type SentNoteKind = { kind: 'link'; email: string } | { kind: 'proof' };

/**
 * Renders the note.
 *
 * @returns the pending pill and the sentence
 */
export function SentNote({ sent }: { sent: SentNoteKind }) {
  const { t } = useTranslation('account');
  const sentence =
    sent.kind === 'link'
      ? t('teacherBadge.linkSent', { email: sent.email })
      : t('teacherBadge.proofSent');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] bg-tint p-4">
      <TeacherBadgePill isPending />
      <p className="m-0 flex-[1_1_320px] text-[15px] leading-relaxed text-ink">{sentence}</p>
    </div>
  );
}
