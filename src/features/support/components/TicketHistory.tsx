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

/**
 * One history line.
 *
 * @returns a list item
 */
function HistoryItem({ entry }: { entry: TicketHistoryEntry }) {
  const { t, i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(entry.at));
  const what = t(`staff.history.changes.${entry.change}`, {
    before: valueWords(entry.change, entry.before, t),
    after: valueWords(entry.change, entry.after, t),
  });
  const who = entry.actorHandle === null ? t('staff.history.system') : `@${entry.actorHandle}`;
  return (
    <li className="flex flex-col gap-0.5 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-body">{t('staff.history.line', { who, what })}</span>
      <span className="text-sm text-meta">{when}</span>
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
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="ticket-history-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
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
