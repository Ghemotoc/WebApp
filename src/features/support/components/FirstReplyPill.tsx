/**
 * FirstReplyPill: the first-reply timer on an inbox row, "Answer by …" or "First answer overdue"
 * (story S1-E11-13 criterion 6; bundle ADMIN-2h3a). Shows nothing once staff answered.
 *
 * Who shows it: StaffSupportInboxPage. What it calls: lib/firstReplyTimer.ts.
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { StaffTicketSummary } from '../api/staffSupportTickets';
import { firstReplyTimer } from '../lib/firstReplyTimer';
import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the pill.
 *
 * @param props.ticket - the inbox row
 * @returns the pill, or nothing
 */
export function FirstReplyPill({ ticket }: { ticket: StaffTicketSummary }) {
  const { t, i18n } = useSupportTranslation();
  const timer = firstReplyTimer(ticket, new Date());
  if (timer === null) return null;
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timer.at);
  // Late is the one state staff must not miss, so it gets the warm tint and its own words.
  if (timer.kind === 'overdue') {
    return <InfoPill tone="blush">{t('staff.timer.overdue', { date: when })}</InfoPill>;
  }
  return <InfoPill tone="sky">{t('staff.timer.due', { date: when })}</InfoPill>;
}
