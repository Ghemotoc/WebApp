/**
 * TicketHistory: a support ticket's history, oldest first: who changed what, from what to what
 * (story S1-E11-13 criterion 4; bundle ADMIN-2h1).
 *
 * Values are shown in the staff member's language (a status, a priority, a category, a username
 * or the tags). Who shows it: StaffSupportTicketPage.
 */
import type { TicketHistoryEntry } from '../api/staffSupportTickets';
import { valueWords } from '../lib/historyWords';
import { useSupportTranslation } from '../registerSupportTranslations';
import { dateLocaleFor } from '../../../lib/romania-time';

/**
 * One history line.
 *
 * @returns a list item
 */
function HistoryItem({ entry }: { entry: TicketHistoryEntry }) {
  const { t, i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(entry.at));
  const what = t(`staff.history.changes.${entry.change}`, {
    before: valueWords(entry.change, entry.before, t),
    after: valueWords(entry.change, entry.after, t),
  });
  const who = entry.actorHandle === null ? t('staff.history.system') : `@${entry.actorHandle}`;
  return (
    <li className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0">
      <span className="type-body text-ink-muted">{t('staff.history.line', { who, what })}</span>
      <span className="type-body text-ink-muted">{when}</span>
    </li>
  );
}

/**
 * Renders the history.
 *
 * @returns the section
 */
export function TicketHistory({ history }: { history: TicketHistoryEntry[] }) {
  const { t } = useSupportTranslation();
  return (
    <section
      aria-labelledby="ticket-history-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2
        id="ticket-history-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('staff.history.heading')}
      </h2>
      <ol className="m-0 flex list-none flex-col p-0">
        {history.map((entry, index) => (
          <HistoryItem key={`${entry.at}-${index}`} entry={entry} />
        ))}
      </ol>
    </section>
  );
}
