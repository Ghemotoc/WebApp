/**
 * MailStatusPill: a moderator mail thread's status as an information pill (story S1-E10-11;
 * boards ModMail and ModMailOne in the liquid glass redesign, bundle G8c).
 *
 * "Waiting for the team" is gold (the board's warning tint), "Answered" is sage (its success
 * tint) and "Closed" is neutral. The words come from the statuses in mail.json, so the colour is
 * never the only sign (WCAG 1.4.1).
 * Who shows it: MailThreadTable and MailThreadPage. What it calls: InfoPill.
 */
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { MailStatus } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';

/** The pill tone for each status. */
const toneByStatus: Record<MailStatus, PillTone> = {
  open: 'gold',
  waiting: 'sage',
  closed: 'neutral',
};

/**
 * Renders the pill.
 *
 * @param props.status - the thread's status
 * @returns the pill
 */
export function MailStatusPill({ status }: { status: MailStatus }) {
  const { t } = useMailTranslation();
  return <InfoPill tone={toneByStatus[status]}>{t(`statuses.${status}`)}</InfoPill>;
}
