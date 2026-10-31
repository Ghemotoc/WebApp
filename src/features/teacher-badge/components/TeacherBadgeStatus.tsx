/**
 * TeacherBadgeStatus: where the person's Teacher badge stands (story S1-E2-11, criteria 5 to 8):
 * granted, a link waiting to be opened, a request with our team ("Teacher badge · pending"), or
 * the last request turned down with the team's reason and how to try again.
 *
 * Who shows it: TeacherBadgeSection (Settings) and TeacherStep (onboarding), above the form.
 * Nothing shows before the first request.
 */
import { useTranslation } from 'react-i18next';

import { formatRomaniaDate } from '@/lib/romania-time';

import type { MyTeacherCheck } from '../api/teacherBadge';

import { TeacherBadgePill } from './TeacherBadgePill';

/** One status line, with the pill that goes with it. */
interface StatusLine {
  pill: 'teacher' | 'pending' | null;
  text: string;
}

/**
 * Picks the line for the badge and the latest request.
 *
 * @returns the line, or null when there is nothing to say yet
 */
function useStatusLine(teacherCheck: MyTeacherCheck): StatusLine | null {
  const { t, i18n } = useTranslation('account');
  const date = (moment: string | null) =>
    moment === null ? '' : formatRomaniaDate(new Date(moment), i18n.language);
  const latest = teacherCheck.latest;
  if (teacherCheck.isTeacher) {
    return {
      pill: 'teacher',
      text: t('teacherBadge.settings.have', { date: date(teacherCheck.badgeSince) }),
    };
  }
  if (latest === null) return null;
  if (latest.status === 'waiting_for_staff') {
    return { pill: 'pending', text: t('teacherBadge.settings.waitingForStaff') };
  }
  if (latest.status === 'link_sent') {
    const values = { domain: latest.schoolDomain ?? '', date: date(latest.linkExpiresAt) };
    return { pill: 'pending', text: t('teacherBadge.settings.linkWaiting', values) };
  }
  if (latest.status === 'rejected') {
    const rejected = t('teacherBadge.settings.rejected', { reason: latest.reason ?? '' });
    return { pill: null, text: `${rejected} ${t('teacherBadge.settings.tryAgain')}` };
  }
  // Approved once, no badge now: staff removed it (criterion 8).
  return { pill: null, text: t('teacherBadge.settings.removed') };
}

/**
 * Renders the status.
 *
 * @returns the line with its pill, or null
 */
export function TeacherBadgeStatus({ teacherCheck }: { teacherCheck: MyTeacherCheck }) {
  const line = useStatusLine(teacherCheck);
  if (line === null) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] bg-tint p-4">
      {line.pill !== null && <TeacherBadgePill isPending={line.pill === 'pending'} />}
      <p className="m-0 flex-[1_1_320px] text-[15px] leading-relaxed text-ink">{line.text}</p>
    </div>
  );
}
