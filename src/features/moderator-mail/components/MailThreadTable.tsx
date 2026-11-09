/**
 * MailThreadTable: a member's moderator mail threads as one glass table (story S1-E10-11; board
 * ModMail in the liquid glass redesign, bundle G8c).
 *
 * Three columns, as the board draws them: Subject (a link, with the reference and the linked
 * decision under it), Status (a pill) and Last update. On a phone the header row is kept for
 * screen readers only and each row stacks its three cells, so nothing scrolls sideways
 * (CLAUDE.md rule 21). Rows have a fine line between them (DoD label rows).
 * Who shows it: MyMailPage. What it calls: MailStatusPill.
 */
import { Link } from 'react-router';

import type { MailThreadSummary } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailStatusPill } from './MailStatusPill';

/**
 * The reference, and the decision when the thread is about one ("M-000231 · linked to S-000418").
 *
 * @returns the line's words
 */
function useReferenceLine(thread: MailThreadSummary): string {
  const { t } = useMailTranslation();
  if (thread.statementReference === null) return thread.reference;
  return t('list.referenceLinked', {
    reference: thread.reference,
    decision: thread.statementReference,
  });
}

/**
 * One thread.
 *
 * @returns a table row
 */
function ThreadRow({ thread }: { thread: MailThreadSummary }) {
  const { i18n } = useMailTranslation();
  const referenceLine = useReferenceLine(thread);
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(thread.lastMessageAt),
  );
  return (
    <tr className="flex flex-col gap-2 border-b border-hairline px-5 py-4 last:border-b-0 md:table-row md:px-0 md:py-0">
      <td className="md:py-4 md:pr-4 md:pl-6">
        <Link
          to={`/moderator-mail/${thread.reference}`}
          className="font-semibold break-words text-link underline"
        >
          {thread.subject}
        </Link>
        <p className="m-0 mt-1 text-[13px] text-meta">{referenceLine}</p>
      </td>
      <td className="md:px-4 md:py-4">
        <MailStatusPill status={thread.status} />
      </td>
      <td className="text-sm text-body md:py-4 md:pr-6 md:pl-4">{when}</td>
    </tr>
  );
}

/**
 * Renders the table.
 *
 * @param props.threads - the person's threads, latest first
 * @returns the glass card with the table
 */
export function MailThreadTable({ threads }: { threads: MailThreadSummary[] }) {
  const { t } = useMailTranslation();
  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
      <table className="w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">{t('list.title')}</caption>
        <thead className="max-md:sr-only">
          <tr className="border-b border-hairline text-[13px] font-semibold text-meta">
            <th scope="col" className="py-3 pr-4 pl-6 font-semibold">
              {t('list.subject')}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t('list.status')}
            </th>
            <th scope="col" className="py-3 pr-6 pl-4 font-semibold">
              {t('list.updated')}
            </th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {threads.map((thread) => (
            <ThreadRow key={thread.reference} thread={thread} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
